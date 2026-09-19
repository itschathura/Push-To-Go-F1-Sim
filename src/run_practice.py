import subprocess
import sys
import os
import time
import signal
import webbrowser

def main():
    print("=" * 60)
    print("  >> PUSH TO GO - LIVE PRACTICE RUNNER")
    print("=" * 60)
    
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    sys.path.insert(0, root_dir)

    python_exec = sys.executable

    # Define the scripts to run
    recorder_script = os.path.join(root_dir, "src", "layer_2_live", "fastf1_recorder.py")
    streamer_script = os.path.join(root_dir, "src", "layer_2_live", "tail_streamer.py")
    server_script = os.path.join(root_dir, "src", "dashboard", "server.py")

    processes = []

    try:
        print("Starting FastAPI Dashboard Server...")
        proc_server = subprocess.Popen([python_exec, server_script])
        processes.append(proc_server)
        time.sleep(1)

        print("Starting FastF1 Recorder (SignalR)...")
        proc_recorder = subprocess.Popen([python_exec, recorder_script])
        processes.append(proc_recorder)
        print("Waiting for SignalR stream connection...")
        time.sleep(5)

        print("Starting Tail Streamer (live tail mode - Madrid GP Race)...")
        # NOTE: No --from-start here. We tail ONLY new live data the recorder appends.
        # Using --from-start would replay the entire Madrid GP file and skip DB writes during catch-up.
        proc_streamer = subprocess.Popen([python_exec, streamer_script, "--session", "2026_Madrid_GP_R"])
        processes.append(proc_streamer)

        print("[OK] All services started successfully!")
        print("[DASHBOARD] http://localhost:8000")
        print("Press Ctrl+C to stop all services.")
        print("=" * 60)
        
        # Automatically open the dashboard in the default browser
        print("Opening dashboard in browser...")
        webbrowser.open("http://localhost:8000")

        # Wait indefinitely
        while True:
            time.sleep(1)

    except KeyboardInterrupt:
        print("\nStopping all services...")
    finally:
        for p in processes:
            p.terminate()
            p.wait()
        print("Shutdown complete.")

if __name__ == "__main__":
    main()
