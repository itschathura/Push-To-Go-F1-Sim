"""
soc_calculator.py
------------------
 import Layer 1 (training CSV), Layer 2 (live streamer) shared logic. based on FIA 2026 Power Unit Technical Regulations

VERIFIED CONSTANTS (cited: FIA 2026 Technical Regulations, ESPN, Raceteq):
  - Battery usable capacity (SoC window): 4 MJ = 4000 kJ
  - MGU-K max power (both deploy AND harvest): 350 kW
  - Base rate = (350 kW / 4000 kJ) × 100 = 8.75 %/second
  - Verified against: 4MJ full deployment = ~11.4s (matches published
    "4MJ bursts = 11.5s of full ERS-K power" figure)

⚠️ CORRECTION NOTE: "Super Clipping" is a CHARGING event, not draining.
   At full throttle but not accelerating (drag-limited top speed), the
   ICE has surplus power beyond what the wheels need - that surplus is
   diverted to the battery via MGU-K.
"""

BATTERY_CAPACITY_KJ = 4000.0  # 4 MJ - FIA "Maximum delta SoC"
MGU_K_POWER_KW = 350.0
BASE_RATE_PER_SECOND = (MGU_K_POWER_KW / BATTERY_CAPACITY_KJ) * 100  # = 8.75 %/s


def calculate_estimated_soc(
    throttle: float,
    brake: float,
    acceleration: float,
    previous_soc: float,
    delta_time: float,
    drs_active: int = 0,
) -> float:
    """
    Args:
        throttle: 0-100 අතර throttle %
        brake: 0-100 අතර brake % (>0 means braking/regen active)
        acceleration: m/s^2
        previous_soc: previous row soc(0-100)
        delta_time: dt (seconds) - time difference between current and previous row
        drs_active: DRS/Overtake Mode active ද (0/1)

    Returns:
       new battery soc(0-100)
    """
    if delta_time <= 0 or delta_time > 2.0:
        return previous_soc

    current_soc = previous_soc

    if brake > 0:
        # Braking - MGU-K harvesting (regenerative braking)
        current_soc = min(100.0, current_soc + (BASE_RATE_PER_SECOND * delta_time))

    elif throttle == 100 and acceleration > 0:
        # Full throttle, accelerating - MGU-K deploying (draining)
        deploy_multiplier = 1.0 if drs_active else 0.7
        current_soc = max(0.0, current_soc - (BASE_RATE_PER_SECOND * deploy_multiplier * delta_time))

    elif throttle == 100 and acceleration <= 0:
        # Super Clipping = CHARGING (surplus ICE power -> battery)
        current_soc = min(100.0, current_soc + (BASE_RATE_PER_SECOND * 0.5 * delta_time))

    return current_soc