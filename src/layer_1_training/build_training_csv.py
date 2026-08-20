import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

import pandas as pd
import numpy as np

from src.common.soc_calculator import calculate_estimated_soc
from src.common.feature_engineering import calculate_acceleration, encode_compound
from src.common import config

# Process all rounds from 1 to 11
ROUNDS = range(1, 12)  
SESSION_TYPE = "R"   # Sprint (S) skipped - only Race data used for training

OVERTAKE_LOOKAHEAD_ROWS = 20   # ~3 seconds, based on avg delta_time ~0.15s
OVERTAKE_GAP_THRESHOLD = 1.0   # Gap must be under this (seconds) to count as an overtake attempt


def load_and_prepare(round_num, session_type):
    """Load raw laps + telemetry CSVs, convert Time to seconds, compute per-driver delta_time."""
    laps_path = f"data/raw/f1_2026_R{round_num}_{session_type}_raw_laps.csv"
    telemetry_path = f"data/raw/f1_2026_R{round_num}_{session_type}_raw_telemetry.csv"
    
    if not os.path.exists(laps_path) or not os.path.exists(telemetry_path):
        raise FileNotFoundError(f"Missing data for Round {round_num}")

    laps = pd.read_csv(laps_path)
    telemetry = pd.read_csv(telemetry_path)

    laps["Time"] = pd.to_timedelta(laps["Time"])
    telemetry["Time"] = pd.to_timedelta(telemetry["Time"])
    telemetry["Time_Sec"] = telemetry["Time"].dt.total_seconds()

    # Sort per-driver before computing delta_time, to avoid cross-driver time jumps
    telemetry = telemetry.sort_values(["Driver", "Time_Sec"]).reset_index(drop=True)
    telemetry["Delta_Time"] = telemetry.groupby("Driver")["Time_Sec"].diff().fillna(0)

    return laps, telemetry


def merge_lap_info(laps, telemetry):
    """Attach lap-level fields (Compound, TyreLife, TrackStatus, Position) onto each telemetry row."""
    lap_cols = ["Time", "Driver", "Compound", "TyreLife", "TrackStatus", "Position"]
    lap_subset = laps[lap_cols].sort_values("Time")

    merged = pd.merge_asof(
        telemetry.sort_values("Time"),
        lap_subset,
        on="Time",
        by="Driver",
        direction="backward",
    )
    return merged


def filter_racing_conditions(df):
    """
    Drop rows recorded during Safety Car / VSC / Red / Yellow Flag periods.
    """
    # Normalize TrackStatus formatting
    df["TrackStatus"] = df["TrackStatus"].fillna("1").astype(str).str.replace(".0", "", regex=False)
    
    before = len(df)
    df = df[df["TrackStatus"] == "1"].copy()
    print(f"  [i] Dropped {before - len(df)} caution-period rows ({before} -> {len(df)})")
    return df


def process_driver(driver_df):
    """For a single driver's data (sorted by Time), compute Acceleration, Gap_to_Ahead,
    Estimated_SoC, Compound_Encoded, and the Overtake_Success label."""
    driver_df = driver_df.sort_values("Time_Sec").reset_index(drop=True)

    # 1. Acceleration (vectorized)
    driver_df["Acceleration"] = calculate_acceleration(driver_df["Speed"], driver_df["Time_Sec"])

    # 2. Gap_to_Ahead (vectorized - DistanceToDriverAhead / speed)
    speed_ms = (driver_df["Speed"] / 3.6).replace(0, np.nan)
    driver_df["Gap_to_Ahead"] = (driver_df["DistanceToDriverAhead"] / speed_ms).fillna(9999.0)

    # 3. Estimated_SoC (sequential)
    # OPTIMIZATION: Convert Pandas Series to NumPy arrays before looping (much faster than .iloc)
    throttles = driver_df["Throttle"].values
    brakes = driver_df["Brake"].values
    accelerations = driver_df["Acceleration"].values
    delta_times = driver_df["Delta_Time"].values
    drs_actives = driver_df["DRS"].values

    soc_values = [100.0]
    for i in range(1, len(driver_df)):
        soc_values.append(
            calculate_estimated_soc(
                throttle=throttles[i],
                brake=int(brakes[i]),
                acceleration=accelerations[i],
                previous_soc=soc_values[-1],
                delta_time=delta_times[i],
                drs_active=int(drs_actives[i] > 0),
            )
        )
    driver_df["Estimated_SoC"] = soc_values

    # 4. Tyre compound encoding
    driver_df["Compound_Encoded"] = driver_df["Compound"].apply(encode_compound)

    # 5. Overtake_Success label (row-count lookahead window)
    position = driver_df["Position"].values
    gap = driver_df["Gap_to_Ahead"].values
    n = len(driver_df)
    labels = np.zeros(n, dtype=int)

    for i in range(n):
        window_end = min(i + OVERTAKE_LOOKAHEAD_ROWS, n)
        future_positions = position[i + 1:window_end]
        if len(future_positions) == 0:
            continue
        position_improved = (future_positions < position[i]).any()
        close_to_ahead = gap[i] < OVERTAKE_GAP_THRESHOLD
        if position_improved and close_to_ahead:
            labels[i] = 1

    driver_df["Overtake_Success"] = labels
    return driver_df


def build_round_csv(round_num, session_type):
    print(f"\n[+] Round {round_num} ({session_type}) - loading...")
    laps, telemetry = load_and_prepare(round_num, session_type)
    print(f"  Laps: {laps.shape}, Telemetry: {telemetry.shape}")

    print("  [i] Merging lap info onto telemetry...")
    merged = merge_lap_info(laps, telemetry)

    print("  [i] Filtering out caution periods...")
    merged = filter_racing_conditions(merged)

    print("  [i] Computing features per driver...")
    processed_frames = []
    for driver_code, driver_df in merged.groupby("Driver"):
        processed_frames.append(process_driver(driver_df))

    result = pd.concat(processed_frames, ignore_index=True)
    return result


if __name__ == "__main__":
    all_rounds_data = []
    
    # Loop through all configured rounds
    for current_round in ROUNDS:
        try:
            round_df = build_round_csv(current_round, SESSION_TYPE)
            all_rounds_data.append(round_df)
        except FileNotFoundError as e:
            print(f"  [!] {e} - Skipping round...")
            continue
            
    # Concatenate data from all successful rounds
    final_df = pd.concat(all_rounds_data, ignore_index=True)

    output_cols = [
        "Driver", "Speed", "Throttle", "Brake", "RPM", "DRS",
        "Acceleration", "Estimated_SoC", "Gap_to_Ahead",
        "TyreLife", "Compound_Encoded", "Overtake_Success",
    ]
    final_df = final_df[output_cols]

    final_df.to_csv(config.PROCESSED_CSV_PATH, index=False)
    print(f"\n--- DONE! {len(final_df)} total rows -> {config.PROCESSED_CSV_PATH} ---")
    print(f"Overtake_Success distribution:\n{final_df['Overtake_Success'].value_counts()}")