import sys
import asyncio
from cassandra.cluster import Cluster
from cassandra.policies import AddressTranslator
from cassandra.io.asyncioreactor import AsyncioConnection

class DockerLocalTranslator(AddressTranslator):
    def translate(self, addr):
        return '127.0.0.1'

def main():
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    try:
        print("Trying with AsyncioConnection...")
        c1 = Cluster(
            ['127.0.0.1'], 
            port=9042, 
            connection_class=AsyncioConnection,
            address_translator=DockerLocalTranslator()
        )
        s1 = c1.connect()
        print("AsyncioConnection successful!")
    except Exception as e:
        print(f"AsyncioConnection failed: {e}")

    try:
        print("\nTrying with Default Connection...")
        c2 = Cluster(
            ['127.0.0.1'], 
            port=9042, 
            address_translator=DockerLocalTranslator()
        )
        s2 = c2.connect()
        print("Default Connection successful!")
    except Exception as e:
        print(f"Default Connection failed: {e}")

if __name__ == '__main__':
    main()
