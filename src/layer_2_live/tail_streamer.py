import time
import os
import sys
import json
import ast
import zlib
import base64
import random
import datetime
from cassandra.cluster import Cluster
from cassandra.io.asyncioreactor import AsyncioConnection
from cassandra.policies import AddressTranslator
import asyncio

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from src.common import soc_calculator
from src.ml_model import predict

class DockerLocalTranslator(AddressTranslator):
    def translate(self, addr):
        return '127.0.0.1'

DRIVER_MAP = {
    '12': 'ANT', '44': 'HAM', '63': 'RUS', '16': 'LEC', '1': 'NOR',
    '3': 'VER', '81': 'PIA', '30': 'LAW', '10': 'GAS',
    '22': 'TSU', '43': 'COL', '87': 'BEA', '5': 'BOR', '55': 'SAI',
    '23': 'ALB', '31': 'OCO', '27': 'HUL', '14': 'ALO', '18': 'STR',
    '77': 'BOT', '11': 'PER', '41': 'LIN'
}

driver_state = {}
car_data_received = False

# ── Extra state for dashboard JSON ──
live_extra = {
    "weather": {},
    "flags": [],
    "session_status": "Waiting",
    "driver_meta": {},
    "positions": {},
    "best_laps": {},
    "last_laps": {},
    "sectors": {},
    "speeds": {},
    "tires": {},
    "num_laps": {},
    "gaps_to_leader": {},
    "gaps_to_ahead": {},
    "car_data_received": False,
    "last_update": "",
    "records_processed": 0
}

def save_state():
    live_extra["last_update"] = datetime.datetime.now().isoformat()
    try:
        with open("live_state.tmp", 'w') as f:
            json.dump(live_extra, f)
        os.replace("live_state.tmp", "live_state.json")
    except Exception:
        pass

def parse_data(data_str):
    """Handle both dict (delta) and string (key-frame) data formats"""
    if isinstance(data_str, dict):
        return data_str
    try:
        return json.loads(data_str)
    except Exception:
        return None

def get_state(driver_no):
    if driver_no not in driver_state:
        driver_state[driver_no] = {
            "speed": 0.0, "throttle": 0.0, "brake": 0.0, "rpm": 0,
            "gap_seconds": 0.0, "soc": 100.0, "has_telemetry": False
        }
    return driver_state[driver_no]

def parse_gap_seconds(value):
    if value is None or value == "":
        return None
    try:
        cleaned = str(value).replace("+", "").replace("LAP", "999").strip()
        if 'L' in cleaned:
             return 999.0
        return float(cleaned)
    except Exception:
        return None

def process_and_insert(driver_no, state, session, insert_query, session_id):
    global live_extra
    src_tag = "REAL" if state["has_telemetry"] else "SIM"
    if not state["has_telemetry"]:
        state["speed"] = 300 + random.uniform(-10, 20)
        state["throttle"] = 100 if random.random() > 0.1 else random.uniform(50, 100)
        state["brake"] = 0
        state["rpm"] = random.randint(10500, 12000)

    driver_code = DRIVER_MAP.get(driver_no, f"UNK_{driver_no}")
    
    state["soc"] = soc_calculator.calculate_estimated_soc(
        state["throttle"], state["brake"], 0.0, state["soc"], delta_time=0.27
    )
    state["soc"] = max(0.0, min(100.0, state["soc"]))

    prediction = predict.predict_single({
        "Speed": state["speed"],
        "Throttle": state["throttle"],
        "Brake": state["brake"]
    })

    session.execute(insert_query, (
        driver_code, state["speed"], state["throttle"], state["brake"],
        state["rpm"], prediction, state["soc"], state["gap_seconds"], session_id
    ))
    
    live_extra["records_processed"] += 1
    print(f"[{src_tag}] {driver_code:>4} | Speed:{state['speed']:>6.1f} | Thr:{state['throttle']:>5.1f} | Brk:{state['brake']:>5.1f} | RPM:{state['rpm']:>5} | Gap:{state['gap_seconds']:>6.3f}s | Pred:{prediction}", flush=True)

def main():
    global car_data_received
    import argparse
    parser = argparse.ArgumentParser(description="Tail F1 live data and stream to Cassandra")
    parser.add_argument("--from-start", action="store_true", help="Process from beginning of file")
    parser.add_argument("--session", type=str, default="2026_Dutch_GP_Q", help="Session ID tag")
    args = parser.parse_args()
    session_id = args.session
    print(f"Session ID: {session_id}")

    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

    cluster = Cluster(['127.0.0.1'], port=9042, address_translator=DockerLocalTranslator(), connection_class=AsyncioConnection)
    session = cluster.connect('f1_live')

    insert_query = """
        INSERT INTO live_telemetry
        (driver, timestamp, speed, throttle, brake, rpm, overtake_prediction, estimated_soc, gap_to_ahead, session_id)
        VALUES (%s, toTimestamp(now()), %s, %s, %s, %s, %s, %s, %s, %s)
    """

    filename = "live_session_data.txt"
    print(f"Tailing {filename}...")
    
    last_save = 0

    with open(filename, 'r', encoding='utf-8') as f:
        if not args.from_start and os.path.exists(filename):
            size = os.path.getsize(filename)
            if size > 30000:
                print(f"Fast-forwarding to end of file ({size / 1024 / 1024:.2f} MB)...")
                f.seek(size - 25000)
                f.readline()

        while True:
            line = f.readline()
            if not line:
                time.sleep(0.2)
                f.seek(f.tell())
                continue
            
            try:
                record = ast.literal_eval(line.strip())
                if len(record) < 2: continue
                topic = record[0]
                data_str = record[1]

                # ── TimingData ──
                if topic == 'TimingData':
                    data = parse_data(data_str)
                    if not data: continue
                    lines = data.get('Lines', {})
                    for driver_no, info in lines.items():
                        if driver_no.startswith('_'): continue
                        driver_code = DRIVER_MAP.get(driver_no, f"UNK_{driver_no}")
                        state = get_state(driver_no)
                        updated = False
                        
                        if 'Position' in info:
                            live_extra["positions"][driver_code] = info['Position']
                        if 'GapToLeader' in info:
                            live_extra["gaps_to_leader"][driver_code] = str(info['GapToLeader'])
                        if 'IntervalToPositionAhead' in info:
                            itpa = info['IntervalToPositionAhead']
                            gap_str = itpa.get('Value', '') if isinstance(itpa, dict) else str(itpa)
                            live_extra["gaps_to_ahead"][driver_code] = gap_str
                            gap = parse_gap_seconds(gap_str)
                            if gap is not None:
                                state['gap_seconds'] = gap
                                updated = True
                        if 'BestLapTime' in info:
                            blt = info['BestLapTime']
                            if isinstance(blt, dict) and 'Value' in blt:
                                live_extra["best_laps"][driver_code] = blt['Value']
                        if 'LastLapTime' in info:
                            llt = info['LastLapTime']
                            if isinstance(llt, dict) and 'Value' in llt:
                                live_extra["last_laps"][driver_code] = llt['Value']
                        if 'NumberOfLaps' in info:
                            live_extra["num_laps"][driver_code] = info['NumberOfLaps']
                        if 'Sectors' in info:
                            if driver_code not in live_extra["sectors"]:
                                live_extra["sectors"][driver_code] = {}
                            for s_idx, s_data in info['Sectors'].items():
                                if isinstance(s_data, dict) and 'Value' in s_data:
                                    live_extra["sectors"][driver_code][s_idx] = s_data['Value']

                        speeds = info.get('Speeds', {})
                        if speeds:
                            if driver_code not in live_extra["speeds"]:
                                live_extra["speeds"][driver_code] = {}
                            for s_key in ('FL', 'ST', 'I1', 'I2'):
                                if s_key in speeds and isinstance(speeds[s_key], dict) and speeds[s_key].get('Value'):
                                    live_extra["speeds"][driver_code][s_key] = speeds[s_key]['Value']
                                    try:
                                        state['speed'] = float(speeds[s_key]['Value'])
                                        state['has_telemetry'] = True
                                        updated = True
                                    except ValueError:
                                        pass
                        if updated:
                            process_and_insert(driver_no, state, session, insert_query, session_id)

                # ── CarData.z ──
                elif topic == 'CarData.z':
                    if not car_data_received:
                        car_data_received = True
                        live_extra["car_data_received"] = True
                        print("\n" + "="*60, flush=True)
                        print("  ✅✅✅ CarData.z RECEIVED! REAL TELEMETRY! ✅✅✅", flush=True)
                        print("="*60 + "\n", flush=True)
                    decompressed = json.loads(zlib.decompress(base64.b64decode(data_str), -zlib.MAX_WBITS).decode('utf-8'))
                    for entry in decompressed.get('Entries', []):
                        for driver_no, car_info in entry.get('Cars', {}).items():
                            channels = car_info.get('Channels', {})
                            state = get_state(driver_no)
                            state["has_telemetry"] = True
                            if '2' in channels: state['speed'] = float(channels['2'])
                            if '4' in channels: state['throttle'] = float(channels['4'])
                            if '5' in channels: state['brake'] = float(channels['5'])
                            if '0' in channels: state['rpm'] = int(channels['0'])
                            process_and_insert(driver_no, state, session, insert_query, session_id)

                # ── WeatherData ──
                elif topic == 'WeatherData':
                    w = parse_data(data_str)
                    if w:
                        live_extra["weather"] = {
                            "air_temp": w.get("AirTemp", ""), "track_temp": w.get("TrackTemp", ""),
                            "humidity": w.get("Humidity", ""), "wind_speed": w.get("WindSpeed", ""),
                            "wind_dir": w.get("WindDirection", ""), "rain": w.get("Rainfall", "0"),
                            "pressure": w.get("Pressure", "")
                        }

                # ── RaceControlMessages ──
                elif topic == 'RaceControlMessages':
                    rcm = parse_data(data_str)
                    if rcm:
                        for msg_id, msg in rcm.get("Messages", {}).items():
                            if isinstance(msg, dict):
                                live_extra["flags"].append({
                                    "time": msg.get("Utc", ""),
                                    "message": msg.get("Message", ""),
                                    "flag": msg.get("Flag", ""),
                                })
                        live_extra["flags"] = live_extra["flags"][-20:]

                # ── DriverList ──
                elif topic == 'DriverList':
                    dl = parse_data(data_str)
                    if dl:
                        for num, info in dl.items():
                            if not isinstance(info, dict): continue
                            tla = info.get("Tla", DRIVER_MAP.get(num, ""))
                            if not tla: continue
                            live_extra["driver_meta"][tla] = {
                                "full_name": info.get("FullName", ""),
                                "team": info.get("TeamName", ""),
                                "team_color": "#" + info.get("TeamColour", "FFFFFF"),
                                "number": info.get("RacingNumber", num),
                            }

                # ── SessionStatus ──
                elif topic == 'SessionStatus':
                    ss = parse_data(data_str)
                    if ss:
                        live_extra["session_status"] = ss.get("Status", "Unknown")

                # ── TimingAppData (tires) ──
                elif topic == 'TimingAppData':
                    tad = parse_data(data_str)
                    if tad:
                        for driver_no, info in tad.get('Lines', {}).items():
                            if not isinstance(info, dict): continue
                            dc = DRIVER_MAP.get(driver_no, "")
                            if not dc: continue
                            stints = info.get('Stints', {})
                            if stints:
                                latest = max(stints.keys(), key=lambda x: int(x)) if stints else None
                                if latest and isinstance(stints[latest], dict):
                                    sd = stints[latest]
                                    live_extra["tires"][dc] = {
                                        "compound": sd.get("Compound", ""),
                                        "new": sd.get("New", ""),
                                        "laps": sd.get("TotalLaps", 0)
                                    }

                # Save state every 0.5s max
                now = time.time()
                if now - last_save > 0.5:
                    save_state()
                    last_save = now

            except Exception as e:
                pass

if __name__ == '__main__':
    main()
