"""
Acceleration, Tyre compound encoding, Track status handling
Lyer 1 (training CSV) and Layer 2 (live telemetry) both.

"""

import pandas as pd

def calculate_acceleration(speed_kmh_series: pd.Series, time_seconds_series: pd.Series) -> pd.Series:
    """
    use Speed (km/h) and Time (seconds) series
    calculate acceleration (a = dv/dt, m/s^2).

    Args:
        speed_kmh_series: Speed column එක (km/h)
        time_seconds_series: time colum to seconds (seconds) - telemetry > 'Time' column 

    Returns:
        Acceleration series (m/s^2)
    """
    speed_ms = speed_kmh_series / 3.6
    acceleration = speed_ms.diff() / time_seconds_series.diff()
    return acceleration.replace([float("inf"), float("-inf")], 0).fillna(0)


def encode_compound(compound: str) -> int:
    """
    'SOFT'/'MEDIUM'/'HARD'/'INTERMEDIATE'/'WET' string to number encoding (1-5) for model training and live telemetry.
    Args:
        compound: FastF1 Compound column value (e.g. 'SOFT')

    Returns:
        1 (HARD) - 5 (WET) , unknown compound = 0
    """
    encoding = {
        "HARD": 1,
        "MEDIUM": 2,
        "SOFT": 3,
        "INTERMEDIATE": 4,
        "WET": 5,
    }
    return encoding.get(compound, 0)