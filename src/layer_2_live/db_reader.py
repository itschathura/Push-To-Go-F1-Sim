import pandas as pd
import time
import os
from cassandra.cluster import Cluster

def monitor_live_telemetry(limit=5, refresh_rate=2):
    # 1. Connect to ScyllaDB
    cluster = Cluster(['127.0.0.1'], port=9042)
    session = cluster.connect('f1_live')
    
    query = f"""
        SELECT driver, timestamp, speed, throttle, brake, rpm, 
               estimated_soc, gap_to_ahead, overtake_prediction 
        FROM live_telemetry 
        LIMIT {limit}
    """
    
    try:
        while True:
            # (Clear terminal)
            os.system('cls' if os.name == 'nt' else 'clear')
            
            print("==========================================")
            print(" 📡 F1 Live - Real-Time ScyllaDB Monitor ")
            print("==========================================")
            print(f"🔄 Auto-refreshing every {refresh_rate} seconds... (Press Ctrl+C to stop)\n")

            # 2. Query the latest data
            rows = session.execute(query)
            df = pd.DataFrame(list(rows))
            
            if df.empty:
                print("⚠️ No data found in the 'live_telemetry' table yet.")
            else:
                print(df.to_string(index=False))
            
            # 3. 
            time.sleep(refresh_rate)
            
    except KeyboardInterrupt:
        print("\n\n🛑 Live Monitor stopped by user.")
        
    except Exception as e:
        print(f"\n❌ Error reading from database: {e}")
        
    finally:
        # 4. Close connection
        if 'cluster' in locals():
            cluster.shutdown()
            print("🔌 Database connection closed.")

if __name__ == "__main__":
 # 2s by 2s
    monitor_live_telemetry(limit=5, refresh_rate=2)