from livef1.adapters import RealF1Client
from datetime import datetime
import json

print("=" * 70)
print("LIVEF1 REAL-TIME TELEMETRY TEST")
print("=" * 70)

print("Starting LiveF1...")
print("Requested:")
print("  - CarData.z")
print("  - Position.z")
print("  - TimingData")
print("  - DriverList")
print("  - WeatherData")
print()
print("Press CTRL+C to stop.")
print("=" * 70)

client = RealF1Client(
    topics=[
        "CarData.z",
        "Position.z",
        "TimingData",
        "DriverList",
        "WeatherData",
    ],
    log_file_name="livef1_test.json"
)


@client.callback("telemetry_handler")
async def handle_data(records):

    for record in records:

        print("\n" + "-" * 70)
        print("TIME:", datetime.now().strftime("%H:%M:%S"))

        # Print the complete record first
        print("RECORD:")
        print(record)

        # Try to identify topic
        if isinstance(record, (list, tuple)) and len(record) >= 2:

            topic = record[0]
            data = record[1]

            print("\nTOPIC:", topic)

            if topic == "CarData.z":
                print(">>> CAR TELEMETRY RECEIVED <<<")

            elif topic == "Position.z":
                print(">>> POSITION DATA RECEIVED <<<")

            elif topic == "TimingData":
                print(">>> TIMING DATA RECEIVED <<<")

            elif topic == "DriverList":
                print(">>> DRIVER LIST RECEIVED <<<")

            elif topic == "WeatherData":
                print(">>> WEATHER DATA RECEIVED <<<")


try:
    client.run()

except KeyboardInterrupt:
    print("\n")
    print("=" * 70)
    print("TEST STOPPED")
    print("=" * 70)