import sys
import os
import time
import random

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from cassandra.cluster import Cluster
from cassandra.io.asyncioreactor import AsyncioConnection
from cassandra.policies import AddressTranslator

from src.common import soc_calculator, gap_calculator, feature_engineering
from src.ml_model import predict


SESSION_ID = "DUMMY_TEST_SESSION"

# Test ( punchi yuki into the grid (NOTE : for dutch GP))
DRIVERS = ["VER", "HAM", "LEC", "NOR", "PIA"]


class DockerLocalTranslator(AddressTranslator):
    def translate(self, addr):
        return '127.0.0.1'


def generate_dummy_telemetry(cycle: int):
    phase = cycle % 10

    if phase in (0, 1, 2):
        speed = random.uniform(280, 340)
        throttle = 100.0
        brake = 0.0
        acceleration = random.uniform(1.0, 2.5)
        distance_to_ahead = random.uniform(20, 100)

    elif phase in (3, 4):
        speed = random.uniform(90, 200)
        throttle = 0.0
        brake = 100.0
        acceleration = random.uniform(-4.0, -2.0)
        distance_to_ahead = random.uniform(5, 30)

    elif phase in (5, 6, 7):
        speed = random.uniform(100, 220)
        throttle = random.uniform(30, 65)
        brake = 0.0
        acceleration = random.uniform(-0.5, 1.0)
        distance_to_ahead = random.uniform(10, 60)

    else:
        speed = random.uniform(180, 280)
        throttle = random.uniform(70, 95)
        brake = 0.0
        acceleration = random.uniform(0.5, 2.0)
        distance_to_ahead = random.uniform(15, 80)

    if random.random() < 0.1:
        distance_to_ahead = random.uniform(0.5, 3.0)

    return {
        "Speed": round(speed, 1),
        "Throttle": round(throttle, 1),
        "Brake": brake,
        "RPM": int(8000 + (speed / 340) * 4000),
        "DistanceToDriverAhead": round(distance_to_ahead, 2),
        "Acceleration": round(acceleration, 2),
    }


def stream_live_data():
    cluster = Cluster(
        ['127.0.0.1'],
        port=9042,
        connection_class=AsyncioConnection,
        address_translator=DockerLocalTranslator()
    )
    session = cluster.connect('f1_live')

    print("🚀 Starting Live Streamer (dummy data mode, multi-driver)...")

    # Driver එකින් එකට වෙනම SoC state track කරන්න ඕන
    driver_soc = {d: 100.0 for d in DRIVERS}
    delta_time = 2.0
    cycle = 0

    insert_query = """
        INSERT INTO live_telemetry
        (driver, timestamp, speed, throttle, brake, rpm, overtake_prediction, estimated_soc, gap_to_ahead, session_id)
        VALUES (%s, toTimestamp(now()), %s, %s, %s, %s, %s, %s, %s, %s)
    """

    try:
        while True:
            for driver in DRIVERS:
                raw_data = generate_dummy_telemetry(cycle)

                driver_soc[driver] = soc_calculator.calculate_estimated_soc(
                    raw_data['Throttle'],
                    raw_data['Brake'],
                    raw_data['Acceleration'],
                    driver_soc[driver],
                    delta_time
                )
                driver_soc[driver] = max(0.0, min(100.0, driver_soc[driver]))

                gap = gap_calculator.calculate_gap_to_ahead(
                    raw_data['DistanceToDriverAhead'],
                    raw_data['Speed']
                )

                prediction = predict.predict_single(raw_data)

                session.execute(insert_query, (
                    driver,
                    raw_data['Speed'],
                    raw_data['Throttle'],
                    raw_data['Brake'],
                    raw_data['RPM'],
                    prediction,
                    driver_soc[driver],
                    gap,
                    SESSION_ID
                ))

                print(f"✅ {driver:>4} | Cycle {cycle:03d} | Speed: {raw_data['Speed']:.1f} | "
                      f"Throttle: {raw_data['Throttle']:.0f}% | Brake: {raw_data['Brake']:.0f}% | "
                      f"Gap: {gap:.3f}s | SOC: {driver_soc[driver]:.2f}% | Pred: {prediction}")

            cycle += 1
            time.sleep(delta_time)

    except KeyboardInterrupt:
        cluster.shutdown()
        print("\n🔌 Live Streamer stopped.")


if __name__ == "__main__":
    stream_live_data()