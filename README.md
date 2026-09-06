# Calculate Battery SOC


>Run

1. Setup Environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install fastf1 pandas numpy plotly joblib


2. Start ScyllaDB (Docker required)
powershell
docker run --name scylladb -d -p 9042:9042 scylladb/scylla
# Wait ~30s for it to be ready, then:
python src/layer_2_live/db_setup.py


3. Layer 1 — Build Training Data (offline/historical)
powershell
# Step A: Fetch historical race data from FastF1 API
python src/layer_1_training/fetch_historical_data.py
# Step B: Process raw data into a training CSV with engineered features
python src/layer_1_training/build_training_csv.py


4. Train the ML Model
powershell
python src/ml_model/train_model.py


5. Layer 2 — Live Data Streaming (pick one approach)
Option A — LiveF1 real-time client (connects directly to F1 live timing):

powershell
python src/layer_2_live/livef1_client.py
Option B — Tail streamer (replays from a recorded live_session_data.txt file):

powershell
python src/layer_2_live/tail_streamer.py --from-start --session "2026_Dutch_GP_Q"

>RUN
.\.venv\Scripts\Activate.ps1
streamlit run src/dashboard/app.py

.\.venv\Scripts\python.exe -m streamlit run src/dashboard/app.py
