import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from livef1.adapters import RealF1Client
from cassandra.cluster import Cluster
from cassandra.io.asyncioreactor import AsyncioConnection
from cassandra.policies import AddressTranslator   # ← ADD THIS

from src.common import soc_calculator, gap_calculator, feature_engineering
from src.ml_model import predict

DRIVER_MAP = {
    '12': 'ANT', '44': 'HAM', '63': 'RUS', '16': 'LEC', '1': 'NOR',
    '3': 'VER', '81': 'PIA', '6': 'HAD', '30': 'LAW', '10': 'GAS',
    '22': 'TSU', '43': 'COL', '87': 'BEA', '5': 'BOR', '55': 'SAI',
    '23': 'ALB', '31': 'OCO', '27': 'HUL', '14': 'ALO', '18': 'STR',
    '77': 'BOT', '11': 'PER'
}

# driver TSU : 22 update

SESSION_ID = "2026_Dutch_GP_SQ"

driver_state = {}


class DockerLocalTranslator(AddressTranslator):   # ← ADD THIS CLASS
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


cluster = Cluster(
    ['127.0.0.1'],
    port=9042,
    connection_class=AsyncioConnection,
    address_translator=DockerLocalTranslator()   # ← ADD THIS
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

    state["soc"] = soc_calculator.calculate_estimated_soc(
        state["throttle"], state["brake"], 0.0, state["soc"], delta_time=0.27
    )
    state["soc"] = max(0.0, min(100.0, state["soc"]))

    raw_data = {
        "Speed": state["speed"],
        "Throttle": state["throttle"],
        "Brake": state["brake"]
    }
    prediction = predict.predict_single(raw_data)

    db_session.execute(INSERT_QUERY, (
        driver_code,
        state["speed"], state["throttle"], state["brake"], state["rpm"],
        prediction, state["soc"], state["gap_seconds"], SESSION_ID
    ))

    print(f"{driver_code:>4} | Speed:{state['speed']:>6.1f} | "
          f"Gap:{state['gap_seconds']:>6.3f}s | SOC:{state['soc']:>5.1f}% | "
          f"Pred:{prediction}")


client = RealF1Client(
    topics=["CarData.z", "Position.z", "TimingData"],
    log_file_name="sq_live_backup.json"
)


@client.callback("main_handler")
async def handle_data(records):
    for record in records:
        driver_no = record.get("DriverNo")
        if driver_no is None:
            continue

        state = get_state(driver_no)

        if "RPM" in record:
            if not is_valid_car_data(record):
                continue
            state["speed"] = record.get("Speed")
            state["throttle"] = record.get("Throttle")
            state["brake"] = record.get("Brake")
            state["rpm"] = record.get("RPM")

        elif "IntervalToPositionAhead_Value" in record:
            gap = parse_gap_seconds(record.get("IntervalToPositionAhead_Value"))
            if gap is not None:
                state["gap_seconds"] = gap

        process_driver(driver_no)


if __name__ == "__main__":
    print("Starting Live Client...")
    print(f"Session ID: {SESSION_ID}")
    try:
        client.run()
    except KeyboardInterrupt:
        cluster.shutdown()
        print("\nLive client stopped.")