import logging
from fastf1.livetiming.client import SignalRClient

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s: %(message)s"
)

print("="*60)
print("  FastF1 Recorder - Authentication Test")
print("="*60)
print("1. When this runs, it may open a browser window.")
print("2. Log in with your FREE F1 account.")
print("3. Check this terminal to see if it says 'connected'.")
print("   (Since no race is happening right now, it will just idle)")
print("4. Press CTRL+C to stop the test.")
print("="*60)

# Connects to F1 and records the raw text feed to this file
client = SignalRClient("live_stream_data.txt")

try:
    client.start()
except KeyboardInterrupt:
    print("\nTest stopped.")
