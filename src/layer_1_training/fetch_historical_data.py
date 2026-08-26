import os
import sys
import fastf1
import pandas as pd
from pathlib import Path
from datetime import datetime

current_dir = Path(__file__).resolve().parent
project_root = current_dir.parent.parent
sys.path.append(str(project_root))

from src.common.config import YEAR

CACHE_DIR = project_root / 'data' / 'cache'
RAW_DIR = project_root / 'data' / 'raw'

os.makedirs(CACHE_DIR, exist_ok=True)
os.makedirs(RAW_DIR, exist_ok=True)

fastf1.Cache.enable_cache(str(CACHE_DIR))

def fetch_and_save_round_data(year, round_num, session_type):
    session_name = "Race" if session_type == 'R' else "Sprint"
    raw_file_path = RAW_DIR / f"f1_{year}_R{round_num}_{session_type}_raw_laps.csv"
    
    if raw_file_path.exists():
        print(f"[=] Round {round_num} ({session_type}) - already exists, skip.")
        return
    
    print(f"\n{'-'*50}")
    print(f"Fetching {session_name} Data | Year: {year} | Round: {round_num}")
    print(f"{'-'*50}")
    
    try:
        session = fastf1.get_session(year, round_num, session_type)
        session.load(telemetry=True, laps=True, weather=False)
        laps = session.laps
        laps.to_csv(raw_file_path, index=False)
        print(f"✅ Successfully saved {session_name} Laps data to: {raw_file_path}")
    except Exception as e:
        print(f"❌ Error fetching {session_name} data for Round {round_num}: {e}")

def main():
    print(f"🚀 Starting Historical Data Fetch for F1 {YEAR} Season (Completed races only)...")
    
    # 2026 year schedule
    schedule = fastf1.get_event_schedule(YEAR)
    now = pd.Timestamp.now()
    
    # before today races and not testing sessions
    past_events = schedule[(schedule['EventDate'] < now) & (schedule['EventFormat'] != 'testing')]
    
    print(f"📅 Found {len(past_events)} completed rounds so far.")

    for _, event in past_events.iterrows():
        round_num = event['RoundNumber']
        
        # 
        event_format = str(event.get('EventFormat', '')).lower()
        has_sprint = (event_format == 'sprint')
        
        # 
        for i in range(1, 6):
            session_key = f'Session{i}'
            if session_key in event and event[session_key] == 'Sprint':
                has_sprint = True
                break
        
        # sprint
        if has_sprint:
            print(f"⚡ Sprint weekend detected for Round {round_num}!")
            fetch_and_save_round_data(YEAR, round_num, 'S')
        
        # main race 
        fetch_and_save_round_data(YEAR, round_num, 'R')
        
    print("\n🎉 All historical data fetching completed!")

if __name__ == "__main__":
    main()