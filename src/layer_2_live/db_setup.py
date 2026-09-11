import sys
import asyncio

# IMPORTANT: Set event loop policy BEFORE importing cassandra
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')

# cassandra/cluster.py tries to auto-detect a connection class at module level.
# On Python 3.12+, asyncore was removed and libev isn't built by default on Windows.
# Workaround: Create a fake asyncore module so the import detection doesn't crash,
# then override the connection class explicitly in the Cluster constructor.
import types
fake_asyncore = types.ModuleType("asyncore")

class _FakeDispatcher:
    pass

fake_asyncore.dispatcher = _FakeDispatcher
sys.modules.setdefault("asyncore", fake_asyncore)


from cassandra.io.asyncioreactor import AsyncioConnection
from cassandra.cluster import Cluster
from cassandra.policies import AddressTranslator

class DockerLocalTranslator(AddressTranslator):
    def translate(self, addr):
        return '127.0.0.1'

def setup_database():
    print("==========================================")
    print(" F1 Live - ScyllaDB Database Setup " )
    print("==========================================")
    
    print(" Connecting to ScyllaDB (Localhost)...")
    # AsyncioConnection is required for Python 3.12+ (asyncore was removed)
    cluster = Cluster(
        ['127.0.0.1'],
        port=9042,
        address_translator=DockerLocalTranslator(),
        connection_class=AsyncioConnection,
        connect_timeout=30,
        control_connection_timeout=30
    )
    session = cluster.connect()
    session.default_timeout = 60.0


    print("[+] Creating Keyspace ('f1_live')...")
    # Changed from SimpleStrategy to NetworkTopologyStrategy for ScyllaDB tablets support
    session.execute("""
        CREATE KEYSPACE IF NOT EXISTS f1_live
        WITH replication = {'class': 'NetworkTopologyStrategy', 'datacenter1': '1'}
    """)

    session.set_keyspace('f1_live')

    print("[+] Creating Live Telemetry Table...")
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

    print("[SUCCESS] Database Setup Complete! ScyllaDB is ready for Live Data.")
    cluster.shutdown()

if __name__ == "__main__":
    # AsyncioConnection requires a running event loop (Python 3.12+ removed asyncore)
    # Run setup_database in a thread executor so the asyncio loop stays alive for heartbeats
    import traceback
    import concurrent.futures

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        with concurrent.futures.ThreadPoolExecutor() as pool:
            future = loop.run_in_executor(pool, setup_database)
            loop.run_until_complete(future)
    except Exception:
        traceback.print_exc()
        sys.exit(1)
    finally:
        loop.close()