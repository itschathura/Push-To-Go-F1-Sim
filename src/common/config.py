# --- FastF1 Season Settings ---
YEAR = 2026
ROUNDS = range(1, 12)  # first 11 rounds of the seaoons -- UPDATE: 2026 season has 22 rounds, but we only have data for the first 11 rounds
SESSION_TYPE = "R"

# --- Cache Path ---
CACHE_DIR = "data/cache"

# --- Output Paths (Layer 1) ---
RAW_DATA_DIR = "data/raw"
PROCESSED_CSV_PATH = "data/processed/f1_2026_training_layer1.csv"

print("Configuration initialized ✈️")