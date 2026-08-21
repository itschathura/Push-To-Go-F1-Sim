from cassandra.cluster import Cluster

def setup_database():
    print("==========================================")
    print(" F1 Live - ScyllaDB Database Setup " )
    print("==========================================")
    
    print(" Connecting to ScyllaDB (Localhost)...")
    cluster = Cluster(['127.0.0.1'], port=9042) 
    session = cluster.connect()

    print("📦 Creating Keyspace ('f1_live')...")
    # Changed from SimpleStrategy to NetworkTopologyStrategy for ScyllaDB tablets support
    session.execute("""
        CREATE KEYSPACE IF NOT EXISTS f1_live
        WITH replication = {'class': 'NetworkTopologyStrategy', 'replication_factor': '1'}
    """)

    session.set_keyspace('f1_live')

    print("📊 Creating Live Telemetry Table...")
    session.execute("""
        CREATE TABLE IF NOT EXISTS live_telemetry (
            driver text,
            timestamp timestamp,
            speed float,
            throttle float,
            brake float,
            rpm int,
            drs int,
            estimated_soc float,
            gap_to_ahead float,
            distance_to_ahead float,
            overtake_prediction int,
            session_id text,
            PRIMARY KEY (driver, timestamp)
        ) WITH CLUSTERING ORDER BY (timestamp DESC)
    """)

    print("✅ Database Setup Complete! ScyllaDB is ready for Live Data.")
    cluster.shutdown()

if __name__ == "__main__":
    setup_database()