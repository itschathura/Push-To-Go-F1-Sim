# 🏎️ Push to Go — F1 Overtake Prediction Simulation

A real-time Formula 1 overtake prediction system that ingests live telemetry from the F1 SignalR stream, runs an ML model on every data point, and displays results on a premium live dashboard.

---

## Architecture

```
Live F1 SignalR Stream
        │
        ▼
fastf1_recorder.py   ─── appends raw lines to live_session_data.txt
        │
        ▼
tail_streamer.py     ─── reads file tail, computes SoC + prediction, writes to ScyllaDB
        │                  also saves live_state.json every 100ms
        ▼
server.py (FastAPI)  ─── serves /api/telemetry (reads live_state.json)
        │
        ▼
React Dashboard      ─── polls /api/telemetry every 100ms, renders live UI
```

---

## Quick Start

### 1. Setup Environment

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install fastf1 pandas numpy plotly joblib cassandra-driver fastapi uvicorn
```

### 2. Start ScyllaDB (Docker required)

```powershell
docker run --name scylladb -d -p 9042:9042 scylladb/scylla
# Wait ~30s for it to be ready, then:
python src/layer_2_live/db_setup.py
```

### 3. Layer 1 — Build Training Data (offline/historical)

```powershell
# Fetch historical race telemetry from FastF1 API
python src/layer_1_training/fetch_telemetry.py

# Train the ML overtake prediction model
python src/ml_model/train_model.py
```

> A pre-trained `saved_model.pkl` is already included — skip this step to use it.

### 4. Build the Frontend

```powershell
cd src/dashboard/frontend
npm install
npm run build
cd ../../..
```

> The built assets are output to `src/dashboard/static/` and served by FastAPI.

### 5. Run Everything

```powershell
# Single command — starts recorder, streamer, and dashboard server together
python src/run_practice.py
```

Then open **http://localhost:8000** in your browser.

---

## Manual Service Control

Run each service individually if you need more control:

```powershell
# Dashboard server only
python src/dashboard/server.py

# Live SignalR recorder (connects to F1 timing feed)
python src/layer_2_live/fastf1_recorder.py

# Tail streamer — replays from recorded file (offline testing)
python src/layer_2_live/tail_streamer.py --from-start --session "2026_Madrid_GP_R"

# Tail streamer — live tail mode (production)
python src/layer_2_live/tail_streamer.py --session "2026_Madrid_GP_R"
```

---

## Dashboard Features

| Panel | Description |
|-------|-------------|
| **Header** | Session status, lap counter, track temperature, live data indicator |
| **Battle Comparison** | Select any 2 drivers; shows overtake probability ring, closing speed, energy advantage |
| **Full Field Table** | All 20 drivers sorted by position; live speed, RPM, throttle/brake bars, tyre compound + age, overtake prediction badge |

---

## ML Model

- **Algorithm:** XGBoost (binary classification)
- **Features:** Speed, Throttle, Brake, RPM, Acceleration, Estimated SoC, Gap to Ahead
- **Label:** Overtake likely (1) / not likely (0)
- **Training data:** 2026 FastF1 race telemetry (Rounds 1–13)
