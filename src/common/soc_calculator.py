"""
soc_calculator.py
------------------
Shared logic across Layer 1 (training CSV) and Layer 2 (live streamer),
grounded in the FIA 2026 Power Unit Technical Regulations.

VERIFIED 2026 TECHNICAL ARCHITECTURE:
  - Battery usable capacity (SoC window): 4 MJ = 4000 kJ (FIA Maximum Delta SoC)
  - MGU-K peak power: 350 kW (~469 hp), compared with 120 kW previously
  - ICE output falls to ~400 kW (~536 hp), shifting electrical contribution
    to roughly half (~47%) of total power unit output (~750 kW total)
  - Deployment: Regulated up to 350 kW in key straight/overtake zones and
    250 kW baseline, smoothly governed by energy management rather than binary switches
  - 4 Energy Recovery Streams:
    1. Braking (kinetic harvesting up to 350 kW)
    2. Lift-Off / Coasting (pre-braking regeneration)
    3. Part-Throttle (diverting excess ICE torque while cornering)
    4. Super-Clipping (harvesting surplus ICE power at V-max drag-limited straights)
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
    Simulates 2026 F1 Power Unit 350 kW MGU-K Battery State of Charge (SoC).
    
    Energy Recovery Sources (2026 Regulations):
    1. 🛑 Braking: Kinetic energy converted by MGU-K into electrical energy
    2. 🚗 Lift-Off / Coasting: Kinetic recovery during lift-and-coast before braking zones
    3. ⚡ Part-Throttle: ICE torque diverted via MGU-K to recharge while cornering
    4. 🏎️ Super Clipping: High-speed straight line where ICE surplus power recharges battery
    5. 🚀 Deployment: Full throttle acceleration deploying up to 350 kW to rear wheels
    """
    if delta_time <= 0 or delta_time > 2.0:
        return previous_soc

    current_soc = previous_soc

    # 1. 🛑 BRAKING: Primary kinetic energy harvesting via MGU-K
    if brake > 0:
        current_soc = min(100.0, current_soc + (BASE_RATE_PER_SECOND * delta_time))

    # 2. 🚗 LIFT-OFF / COASTING: Zero/minimal throttle without brake pedal
    elif throttle < 10.0:
        # Kinetic harvesting during lift-and-coast phase before braking
        current_soc = min(100.0, current_soc + (BASE_RATE_PER_SECOND * 0.55 * delta_time))

    # 3. ⚡ PART-THROTTLE HARVESTING: Cornering & traction modulation
    elif throttle < 80.0:
        # ICE produces surplus torque beyond tire traction limit; MGU-K harvests it
        harvest_ratio = ((80.0 - throttle) / 80.0) * 0.40
        current_soc = min(100.0, current_soc + (BASE_RATE_PER_SECOND * harvest_ratio * delta_time))

    # 4. 🏎️ SUPER CLIPPING: Full throttle at high speed, drag-limited acceleration
    elif throttle >= 80.0 and acceleration <= 0.8:
        # End of straights: car is near V-max. ICE surplus power is diverted directly to battery
        current_soc = min(100.0, current_soc + (BASE_RATE_PER_SECOND * 0.65 * delta_time))

    # 5. 🚀 DEPLOYMENT: Full throttle with positive acceleration
    elif throttle >= 80.0 and acceleration > 0.8:
        # Full electrical power deployment (up to 350 kW / 469 hp)
        deploy_multiplier = 1.0 if drs_active else 0.75
        current_soc = max(0.0, current_soc - (BASE_RATE_PER_SECOND * deploy_multiplier * delta_time))

    return current_soc


def calculate_available_mguk_power(soc: float, is_overtake_zone: bool = True) -> float:
    """
    Calculates sustainable MGU-K electrical power output (kW) based on current SoC
    and regulatory zone limits.
    
    FIA 2026 Technical Regulations:
    - Maximum peak power: 350 kW in key overtake / straight acceleration zones
    - Baseline race power: 250 kW in standard traction zones
    - Scaled smoothly as SoC declines (continuous de-escalation rather than crude binary cutoffs)
    """
    max_zone_power = 350.0 if is_overtake_zone else 250.0
    if soc >= 50.0:
        return max_zone_power
    elif soc >= 15.0:
        # Proportional continuous scaling between 15% and 50% SoC
        ratio = (soc - 15.0) / (50.0 - 15.0)
        return 120.0 + ratio * (max_zone_power - 120.0)
    else:
        # Low energy reserve: power output is restricted to protect cell voltage
        return max(0.0, (soc / 15.0) * 120.0)