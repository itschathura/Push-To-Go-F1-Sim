import sys
from cassandra.cluster import Cluster

try:
    c = Cluster(['127.0.0.1'], port=9042)
    session = c.connect()
    print('Connected')
except Exception as e:
    import traceback
    traceback.print_exc()
