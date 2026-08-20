"""
    Gap_to_Ahead
    works in layer 1 and layer 2 (live telemetry) - both

    VERIFIED (real FastF1 2026 data): 'DistanceToDriverAhead'
"""


def calculate_gap_to_ahead(distance_to_ahead: float, speed_kmh: float) -> float:
    """
    Returns:
        Gap in seconds (no one ahead OR speed=0 then return => - 9999.0)
    """
    if speed_kmh <= 0:
        return 9999.0

    speed_ms = speed_kmh / 3.6  # km/h -> m/s
    gap_seconds = float(distance_to_ahead) / speed_ms

    return round(gap_seconds, 3)