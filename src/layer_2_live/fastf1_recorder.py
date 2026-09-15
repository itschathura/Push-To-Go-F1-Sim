import logging
import os
import time

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s: %(message)s"
)

print("="*60)
print("  FastF1 Recorder - Live Session Recorder")
print("="*60)
print("1. This script will stay connected indefinitely (timeout=0).")
print("2. Live data will be saved to 'live_session_data.txt'.")
print("3. Press CTRL+C to stop the recording.")
print("="*60)

# Always write to the project root regardless of CWD
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.abspath(os.path.join(_SCRIPT_DIR, "..", ".."))
FILENAME = os.path.join(_PROJECT_ROOT, "live_session_data.txt")
print(f"Recording to: {FILENAME}")

# ── Monkey-patch FastF1 to fix signalrcore 1.0.2 incompatibility ──────────────
# FastF1 passes `"access_token_factory": None` when no_auth=True.
# signalrcore 1.0.2 raises TypeError if the key is present but not callable.
# Fix: remove the key entirely when its value is None.
from fastf1.livetiming.client import SignalRClient
import fastf1.livetiming.client as _f1client
import requests as _requests
from signalrcore.hub_connection_builder import HubConnectionBuilder as _HCB

_original_run = SignalRClient._run

def _patched_run(self):
    self._output_file = open(self.filename, self.filemode)

    # Pre-negotiate to get AWSALBCORS header token
    r = _requests.options(self._negotiate_url, headers=self.headers)
    if 'AWSALBCORS' in r.cookies:
        self.headers.update({"Cookie": f"AWSALBCORS={r.cookies['AWSALBCORS']}"})

    # Build options - OMIT access_token_factory if no_auth=True
    options = {
        "verify_ssl": True,
        "headers": self.headers
    }
    if not self._no_auth:
        # Only add auth factory when authentication is actually needed
        from fastf1.livetiming.client import get_auth_token
        options["access_token_factory"] = get_auth_token

    print(f"[Recorder] no_auth={self._no_auth}, auth_key_in_options={'access_token_factory' in options}")

    self._connection = _HCB() \
        .with_url(self._connection_url, options=options) \
        .configure_logging(logging.INFO) \
        .build()

    self._connection.on_open(self._on_connect)
    self._connection.on_close(self._on_close)
    self._connection.on('feed', self._on_message)

    self._connection.start()

    # Wait for connection to be established
    while not self._is_connected:
        time.sleep(0.1)

    self._connection.send(
        "Subscribe", [self.topics], on_invocation=self._on_message
    )

SignalRClient._run = _patched_run
print("[Patch] Applied signalrcore compatibility fix for no_auth=True")
# ─────────────────────────────────────────────────────────────────────────────

client = SignalRClient(
    filename=FILENAME,
    filemode='a',
    timeout=0,   # Stay connected indefinitely
    no_auth=True  # Use free public F1 timing stream (no F1TV login required)
)

print("\nConnecting to Live Timing client...")

while True:
    try:
        print(f"\n[{time.strftime('%H:%M:%S')}] Connecting to FastF1 Live Timing...")
        client.start()
        print("\nConnection closed by server. Retrying in 5 seconds...")
        time.sleep(5)
    except KeyboardInterrupt:
        print("\nRecording stopped by user.")
        break
    except Exception as e:
        print(f"[{time.strftime('%H:%M:%S')}] Connection error ({type(e).__name__}: {e})")
        print("Waiting 10 seconds before retrying...")
        try:
            time.sleep(10)
        except KeyboardInterrupt:
            print("\nRecording stopped by user.")
            break
