import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))

import livef1

session = livef1.get_session(
    season=2026,
    meeting_identifier="Hungarian",
    session_identifier="Race"
)

driver_map = {}
for entry in session.driverStandings:
    driver_obj = entry['Driver']
    driver_no = driver_obj.RacingNumber
    driver_code = driver_obj.Tla
    driver_map[driver_no] = driver_code

print(driver_map)