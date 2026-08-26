import os
import fastf1
import pandas as pd

fastf1.Cache.enable_cache('data/cache')

YEAR = 2026
ROUNDS = range(1, 13)          # Round 1 - 12
SESSION_TYPES = ['R', 'S']     # Race + Sprint


def fetch_telemetry_for_session(round_num, session_type):
    output_path = f"data/raw/f1_2026_R{round_num}_{session_type}_raw_telemetry.csv"
    if os.path.exists(output_path):
        print(f"[=] {output_path} - skip.")
        return

    try:
        session = fastf1.get_session(YEAR, round_num, session_type)
        session.load(telemetry=True, laps=True, weather=False)
    except Exception as e:
        print(f"[-] Round {round_num} ({session_type}) -NO session or No load : {e}")
        return

    all_telemetry = []
    for driver_number in session.drivers:
        driver_laps = session.laps.pick_drivers(driver_number)
        if driver_laps.empty:
            continue
        telemetry = driver_laps.get_telemetry()
        if telemetry.empty:
            continue

        telemetry = telemetry.copy()
        telemetry["Driver"] = driver_laps["Driver"].iloc[0]
        all_telemetry.append(telemetry)

    if not all_telemetry:
        print(f"[-] Round {round_num} ({session_type}) - NO Data from any drivers.")
        return

    combined = pd.concat(all_telemetry, ignore_index=True)
    combined.to_csv(output_path, index=False)
    print(f"[+] Round {round_num} ({session_type}): {len(combined)} rows -> {output_path}")


if __name__ == "__main__":
    for round_num in ROUNDS:
        for session_type in SESSION_TYPES:
            fetch_telemetry_for_session(round_num, session_type)

    print("\n--- Telemetry fetch ✅! ---")