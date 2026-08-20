# inspect_backup_json.py
import json

with open("fp1_live_backup.json", "r") as f:
    content = f.read()

print(f"File size: {len(content)} characters\n")

# Try 1: Single JSON array
try:
    data = json.loads(content)
    print(f"✅ Valid single JSON. Type: {type(data)}")
    if isinstance(data, list):
        print(f"Total records: {len(data)}")
        print(f"\nFirst record:\n{json.dumps(data[0], indent=2, default=str)}")
except json.JSONDecodeError as e:
    print(f"❌ Not a single JSON blob: {e}")
    
    # Try 2: JSON Lines (one JSON object per line)
    lines = content.strip().split("\n")
    print(f"\nTrying JSON Lines format... {len(lines)} lines found")
    try:
        first_line_data = json.loads(lines[0])
        print(f"✅ JSON Lines format confirmed.")
        print(f"\nFirst line record:\n{json.dumps(first_line_data, indent=2, default=str)}")
    except json.JSONDecodeError as e2:
        print(f"❌ Not JSON Lines either: {e2}")
        print(f"\nRaw first 500 chars:\n{content[:500]}")