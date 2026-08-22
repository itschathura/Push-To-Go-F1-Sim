import logging
from fastf1.livetiming.client import SignalRClient

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(levelname)s: %(message)s"
)

print("="*60)
print("  FastF1 Recorder - Live Session Recorder")
print("="*60)
print("1. When this runs, it may open a browser window to log in (if needed).")
print("2. This script will stay connected indefinitely (timeout=0) to wait")
print("   for the session to start.")
print("3. Live data will be saved to 'live_session_data.txt'.")
print("4. Press CTRL+C to stop the recording.")
print("="*60)

FILENAME = "live_session_data.txt"

client = SignalRClient(
    filename=FILENAME,
    filemode='a',
    timeout=0, # Set to 0 to disable timeout
    no_auth=False
)

import time

print("\nConnecting to Live Timing client...")

while True:
    try:
        print(f"\n[{time.strftime('%H:%M:%S')}] Connecting to FastF1 Live Timing...")
        client.start()
        print("\n⚠️ Connection closed by server. Retrying in 5 seconds...")
        time.sleep(5)
    except KeyboardInterrupt:
        print("\n✅ Recording stopped by user.")
        break
    except Exception as e:
        print(f"[{time.strftime('%H:%M:%S')}] Connection error ({e})")
        print("Waiting 10 seconds before retrying...")
        try:
            time.sleep(10)
        except KeyboardInterrupt:
            print("\n✅ Recording stopped by user.")
            break
