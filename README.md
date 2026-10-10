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

## 🏁 2026 Season Grand Prix Coverage (Rounds 1–16)

The project ingests historical and live data from the 2026 Formula 1 championship. Below is the complete status of all Grand Prix rounds held up to the current race weekend (**Round 17: Singapore Grand Prix**):

| Round | Grand Prix | Circuit / Location | Event Date | Format | Raw Laps | Raw Telemetry | Sprint Data | Status |
|:-----:|:-----------|:-------------------|:----------:|:------:|:--------:|:-------------:|:-----------:|:------:|
| **R01** | Australian Grand Prix | Melbourne, Australia | 2026-03-08 | Conventional | ✅ Saved | ✅ Saved | — | Ingested |
| **R02** | Chinese Grand Prix | Shanghai, China | 2026-03-15 | Sprint | ✅ Saved | ✅ Saved | ✅ Saved | Ingested |
| **R03** | Japanese Grand Prix | Suzuka, Japan | 2026-03-29 | Conventional | ✅ Saved | ✅ Saved | — | Ingested |
| **R04** | Miami Grand Prix | Miami Gardens, United States | 2026-05-03 | Sprint | ✅ Saved | ✅ Saved | ✅ Saved | Ingested |
| **R05** | Canadian Grand Prix | Montréal, Canada | 2026-05-24 | Sprint | ✅ Saved | ✅ Saved | ✅ Saved | Ingested |
| **R06** | Monaco Grand Prix | Monte Carlo, Monaco | 2026-06-07 | Conventional | ✅ Saved | ✅ Saved | — | Ingested |
| **R07** | Barcelona Grand Prix | Barcelona, Spain | 2026-06-14 | Conventional | ✅ Saved | ✅ Saved | — | Ingested |
| **R08** | Austrian Grand Prix | Spielberg, Austria | 2026-06-28 | Conventional | ✅ Saved | ✅ Saved | — | Ingested |
| **R09** | British Grand Prix | Silverstone, United Kingdom | 2026-07-05 | Sprint | ✅ Saved | ✅ Saved | ✅ Saved | Ingested |
| **R10** | Belgian Grand Prix | Spa-Francorchamps, Belgium | 2026-07-19 | Conventional | ✅ Saved | ✅ Saved | — | Ingested |
| **R11** | Hungarian Grand Prix | Budapest, Hungary | 2026-07-26 | Conventional | ✅ Saved | ✅ Saved | — | Ingested |
| **R12** | Dutch Grand Prix | Zandvoort, Netherlands | 2026-08-23 | Sprint | ✅ Saved | ✅ Saved | ✅ Saved | Ingested |
| **R13** | Italian Grand Prix | Monza, Italy | 2026-09-06 | Conventional | ✅ Saved | ✅ Saved | — | Ingested |
| **R14** | Spanish Grand Prix | Madrid, Spain | 2026-09-13 | Conventional | ✅ Saved | ✅ Saved | — | Ingested |
| **R15** | Azerbaijan Grand Prix | Baku, Azerbaijan | 2026-09-26 | Conventional | ✅ Saved | ⏳ Processing | — | Laps Ingested |
| **R16** | Bahrain Grand Prix | Sakhir, Bahrain | 2026-10-04 | Conventional | ✅ Saved | ✅ Saved | — | Ingested |
| **R17** | Singapore Grand Prix | Marina Bay, Singapore | 2026-10-10 | Conventional | 🔴 Live / Active | 🔴 Live / Active | — | Current Target | - underway

> **Data Pipeline Note:** Telemetry and lap timing files are downloaded via FastF1 into `data/raw/` and processed into `data/processed/f1_2026_training_layer1.csv` for machine learning feature extraction and model training.

---

## ML Model

- **Algorithm:** XGBoost (binary classification)
- **Features:** Speed, Throttle, Brake, RPM, Acceleration, Estimated SoC, Gap to Ahead, TyreLife, Compound_Encoded
- **Label:** Overtake likely (1) / not likely (0)
- **Training data:** 2026 FastF1 race telemetry (Rounds 1–14/15, 10M+ rows processed)

