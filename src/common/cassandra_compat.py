import sys
import asyncio
import types

# Cassandra driver on Python 3.12+ compatibility helper
if sys.platform == 'win32':
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    except Exception:
        pass

# Python 3.12+ removed asyncore. Fake it so cassandra.cluster auto-detection doesn't crash.
if "asyncore" not in sys.modules:
    fake_asyncore = types.ModuleType("asyncore")
    class _FakeDispatcher:
        pass
    fake_asyncore.dispatcher = _FakeDispatcher
    sys.modules["asyncore"] = fake_asyncore
