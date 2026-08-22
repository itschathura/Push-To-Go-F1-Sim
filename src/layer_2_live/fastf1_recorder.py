import logging
from fastf1.livetiming.client import SignalRClient

logging.basicConfig(
    level=logging.INFO,
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
    filemode='w',
    timeout=0, # Set to 0 to disable timeout, so you can start it early!
    no_auth=False # Will automatically use get_auth_token()
)

import time

print("\nSince there is no active session right now, the server will reject connections (403).")
print("This script will keep trying every 60 seconds until the Sprint Race goes live at 4 PM!")

while True:
    try:
        print(f"\n[{time.strftime('%H:%M:%S')}] Attempting to connect to Live Timing...")
        client.start()
        print("\n🏁 Session ended or connection closed.")
        break
    except KeyboardInterrupt:
        print("\n✅ Recording stopped by user.")
        break
    except Exception as e:
        print(f"[{time.strftime('%H:%M:%S')}] Server is offline (Error: {e})")
        print("Waiting 60 seconds before retrying...")
        try:
            time.sleep(60)
        except KeyboardInterrupt:
            print("\n✅ Recording stopped by user.")
            break
