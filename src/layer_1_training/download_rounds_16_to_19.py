import os
import sys
import pandas as pd
from pathlib import Path
from fastf1.ergast import Ergast

project_root = Path(__file__).resolve().parent.parent.parent
raw_dir = project_root / "data" / "raw"
raw_dir.mkdir(parents=True, exist_ok=True)

ergast = Ergast()
YEAR = 2026
ROUNDS = [16, 17, 18, 19]

def fetch_and_save_laps(year, round_num, session_type="R"):
    file_name = f"f1_{year}_R{round_num}_{session_type}_raw_laps.csv"
    output_path = raw_dir / file_name

    print(f"\n{'='*50}")
    print(f"Fetching Round {round_num} ({session_type}) -> {file_name}")
    print(f"{'='*50}")

    # 1. Fetch race results for driver mappings
    if session_type == "R":
        results_resp = ergast.get_race_results(season=year, round=round_num)
    else:
        results_resp = ergast.get_sprint_results(season=year, round=round_num)

    if not results_resp.content:
        print(f"[-] No results found for Round {round_num} ({session_type})")
        return

    results_df = results_resp.content[0]
    driver_map = {}
    for _, row in results_df.iterrows():
        driver_map[row["driverId"]] = {
            "Driver": row.get("driverCode", row["driverId"][:3].upper()),
            "DriverNumber": row.get("driverNumber", row["number"]),
            "Team": row.get("constructorName", "")
        }

    # 2. Fetch pit stops for stint tracking (Race only)
    pit_stops_by_driver = {}
    if session_type == "R":
        try:
            pit_resp = ergast.get_pit_stops(season=year, round=round_num)
            if pit_resp.content:
                pit_df = pit_resp.content[0]
                for _, p_row in pit_df.iterrows():
                    d_id = p_row["driverId"]
                    lap = int(p_row["lap"])
                    if d_id not in pit_stops_by_driver:
                        pit_stops_by_driver[d_id] = []
                    pit_stops_by_driver[d_id].append(lap)
        except Exception as e:
            print(f"[!] Warning fetching pit stops: {e}")

    # 3. Paginate all lap times
    all_laps = []
    offset = 0
    limit = 100
    while True:
        try:
            laps_resp = ergast.get_lap_times(season=year, round=round_num, limit=limit, offset=offset)
            if not laps_resp.content or laps_resp.content[0].empty:
                break
            batch = laps_resp.content[0]
            all_laps.append(batch)
            if len(batch) < limit:
                break
            offset += limit
        except Exception as e:
            print(f"[!] Error fetching laps at offset {offset}: {e}")
            break

    if not all_laps:
        print(f"[-] No lap times found for Round {round_num}")
        return

    combined_laps = pd.concat(all_laps, ignore_index=True)
    combined_laps["number"] = combined_laps["number"].astype(int)
    combined_laps["position"] = combined_laps["position"].astype(int)
    combined_laps = combined_laps.sort_values(["driverId", "number"]).reset_index(drop=True)

    # Convert to schema compatible with FastF1 laps CSV
    rows = []
    for d_id, group in combined_laps.groupby("driverId"):
        d_info = driver_map.get(d_id, {"Driver": d_id[:3].upper(), "DriverNumber": "0", "Team": ""})
        pit_laps = sorted(pit_stops_by_driver.get(d_id, []))
        
        cumulative_time = pd.Timedelta(seconds=0)
        stint = 1
        tyre_life = 1.0

        for _, lap_row in group.iterrows():
            lap_num = lap_row["number"]
            lap_time = lap_row["time"]
            if pd.isna(lap_time):
                continue
            cumulative_time += lap_time

            # Update stint on pit stop
            if lap_num - 1 in pit_laps:
                stint += 1
                tyre_life = 1.0
            else:
                tyre_life += 1.0

            rows.append({
                "Time": cumulative_time,
                "Driver": d_info["Driver"],
                "DriverNumber": d_info["DriverNumber"],
                "LapTime": lap_time,
                "LapNumber": float(lap_num),
                "Stint": float(stint),
                "PitOutTime": None,
                "PitInTime": None,
                "Sector1Time": None,
                "Sector2Time": None,
                "Sector3Time": None,
                "Sector1SessionTime": None,
                "Sector2SessionTime": None,
                "Sector3SessionTime": None,
                "SpeedI1": None,
                "SpeedI2": None,
                "SpeedFL": None,
                "SpeedST": None,
                "IsPersonalBest": False,
                "Compound": "MEDIUM" if stint % 2 == 1 else "HARD",
                "TyreLife": tyre_life,
                "FreshTyre": True if tyre_life == 1.0 else False,
                "Team": d_info["Team"],
                "LapStartTime": cumulative_time - lap_time,
                "LapStartDate": None,
                "TrackStatus": "1",
                "Position": float(lap_row["position"]),
                "Deleted": False,
                "DeletedReason": "",
                "FastF1Generated": False,
                "IsAccurate": True
            })

    df = pd.DataFrame(rows)
    df.to_csv(output_path, index=False)
    print(f"✅ Successfully saved {len(df)} laps -> {output_path}")

if __name__ == "__main__":
    for r in ROUNDS:
        if r == 17:
            # Singapore sprint
            try:
                fetch_and_save_laps(YEAR, r, "S")
            except Exception as e:
                print(f"[!] Sprint R17 error: {e}")
        fetch_and_save_laps(YEAR, r, "R")
    print("\n🏁 Finished downloading all requested rounds into data/raw!")

