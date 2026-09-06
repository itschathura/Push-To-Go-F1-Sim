import subprocess
import sys
import os
import time
import webbrowser

def main():
    print("=" * 60)
    print("  🏎️ PUSH TO GO - OFFLINE REPLAY RUNNER")
    print("=" * 60)
    
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    sys.path.insert(0, root_dir)

    python_exec = sys.executable

    # Define the scripts to run
    streamer_script = os.path.join(root_dir, "src", "layer_2_live", "tail_streamer.py")
    server_script = os.path.join(root_dir, "src", "dashboard", "server.py")

    processes = []

    try:
        print("Starting FastAPI Dashboard Server...")
        proc_server = subprocess.Popen([python_exec, server_script])
        processes.append(proc_server)
        time.sleep(1)

        print("Starting Tail Streamer (Replaying live_session_data.txt)...")
        # Ensure we read from start for an offline replay, with replay delay
        proc_streamer = subprocess.Popen([python_exec, streamer_script, "--from-start", "--replay"])
        processes.append(proc_streamer)

        print("=" * 60)
        print("✅ Offline replay started successfully!")
        print("🌍 Dashboard is available at: http://localhost:8000")
        print("Press Ctrl+C to stop.")
        print("=" * 60)
        
        # Automatically open the dashboard in the default browser
        print("Opening dashboard in browser...")
        webbrowser.open("http://localhost:8000")

        # Wait indefinitely
        while True:
            time.sleep(1)

    except KeyboardInterrupt:
        print("\nStopping offline replay...")
    finally:
        for p in processes:
            p.terminate()
            p.wait()
        print("Shutdown complete.")

if __name__ == "__main__":
    main()
