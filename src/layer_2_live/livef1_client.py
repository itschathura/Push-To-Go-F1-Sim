import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from livef1.adapters import RealF1Client
from cassandra.cluster import Cluster
from cassandra.io.asyncioreactor import AsyncioConnection
from cassandra.policies import AddressTranslator

from src.common import soc_calculator, gap_calculator, feature_engineering
from src.ml_model import predict


# ============================================================
# 2026 Season Driver Number -> Driver Code Mapping
# ============================================================
DRIVER_MAP = {
    '12': 'ANT', '44': 'HAM', '63': 'RUS', '16': 'LEC', '1': 'NOR',
    '3': 'VER', '81': 'PIA', '30': 'LAW', '10': 'GAS',
    '22': 'TSU', '43': 'COL', '87': 'BEA', '5': 'BOR', '55': 'SAI',
    '23': 'ALB', '31': 'OCO', '27': 'HUL', '14': 'ALO', '18': 'STR',
    '77': 'BOT', '11': 'PER', '41': 'LIN'
}

# ⚠️ Updated for Monza GP Race - 2026-09-06
SESSION_ID = "2026_Italian_GP_R"

driver_state = {}


class DockerLocalTranslator(AddressTranslator):
    def translate(self, addr):
        return '127.0.0.1'


def get_state(driver_no):
    if driver_no not in driver_state:
        driver_state[driver_no] = {
            "speed": None, "throttle": None, "brake": None, "rpm": None,
            "gap_seconds": None, "soc": 100.0
        }
    return driver_state[driver_no]


def is_valid_car_data(record):
    throttle = record.get("Throttle", 0) or 0
    brake = record.get("Brake", 0) or 0
    return throttle <= 100 and brake <= 100


def parse_gap_seconds(value):
    if value is None or value == "":
        return None
    try:
        cleaned = str(value).replace("+", "").replace("LAP", "999")
        return float(cleaned)
    except ValueError:
        return None


def safe_float(val, default=0.0):
    """Safely convert a value to float, returning default if None or invalid."""
    if val is None:
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def safe_int(val, default=0):
    """Safely convert a value to int, returning default if None or invalid."""
    if val is None:
        return default
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


cluster = Cluster(
    ['127.0.0.1'],
    port=9042,
    connection_class=AsyncioConnection,
    address_translator=DockerLocalTranslator()
)
db_session = cluster.connect('f1_live')

INSERT_QUERY = """
    INSERT INTO live_telemetry
    (driver, timestamp, speed, throttle, brake, rpm, overtake_prediction, estimated_soc, gap_to_ahead, session_id)
    VALUES (%s, toTimestamp(now()), %s, %s, %s, %s, %s, %s, %s, %s)
"""


def process_driver(driver_no):
    state = get_state(driver_no)
    if state["speed"] is None or state["gap_seconds"] is None:
        return

    driver_code = DRIVER_MAP.get(driver_no, f"UNK_{driver_no}")

    # Safe float conversion before passing to soc_calculator
    throttle = safe_float(state["throttle"])
    brake = safe_float(state["brake"])
    speed = safe_float(state["speed"])
    rpm = safe_int(state["rpm"])
    gap = safe_float(state["gap_seconds"])

    state["soc"] = soc_calculator.calculate_estimated_soc(
        throttle, brake, 0.0, state["soc"], delta_time=0.27
    )
    state["soc"] = max(0.0, min(100.0, state["soc"]))

    raw_data = {
        "Speed": speed,
        "Throttle": throttle,
        "Brake": brake
    }
    prediction = predict.predict_single(raw_data)

    db_session.execute(INSERT_QUERY, (
        driver_code,
        speed, throttle, brake, rpm,
        prediction, state["soc"], gap, SESSION_ID
    ))

    print(f"{driver_code:>4} | Speed:{speed:>6.1f} | "
          f"Gap:{gap:>6.3f}s | SOC:{state['soc']:>5.1f}% | "
          f"Pred:{prediction}")


client = RealF1Client(
    topics=["CarData.z", "Position.z", "TimingData"],
    log_file_name="italian_gp_live_backup.json"
)


@client.callback("main_handler")
async def handle_data(records):
    # ─────────────────────────────────────────────────────────
    # livef1 delivers data as a dict: {topic_name: [records]}
    # e.g. {"CarData.z": [{DriverNo: "1", Speed: 315, ...}, ...]}
    # We must iterate .items() to get the actual record dicts.
    # ─────────────────────────────────────────────────────────
    for topic_name, record_list in records.items():
        for record in record_list:
            try:
                driver_no = record.get("DriverNo")
                if driver_no is None:
                    continue

                state = get_state(driver_no)

                # CarData.z records have RPM, Speed, Throttle, Brake
                if "RPM" in record:
                    if not is_valid_car_data(record):
                        continue
                    state["speed"] = record.get("Speed")
                    state["throttle"] = record.get("Throttle")
                    state["brake"] = record.get("Brake")
                    state["rpm"] = record.get("RPM")

                # TimingData records have IntervalToPositionAhead_Value
                elif "IntervalToPositionAhead_Value" in record:
                    gap = parse_gap_seconds(record.get("IntervalToPositionAhead_Value"))
                    if gap is not None:
                        state["gap_seconds"] = gap

                process_driver(driver_no)

            except Exception as e:
                print(f"[WARN] Error processing record (topic={topic_name}): {e}")


if __name__ == "__main__":
    print("=" * 60)
    print("  Push to Go - Live F1 Client")
    print("=" * 60)
    print(f"  Session ID : {SESSION_ID}")
    print(f"  Topics     : CarData.z, Position.z, TimingData")
    print(f"  Drivers    : {len(DRIVER_MAP)} mapped")
    print("=" * 60)
    try:
        client.run()
    except KeyboardInterrupt:
        cluster.shutdown()
        print("\nLive client stopped.")