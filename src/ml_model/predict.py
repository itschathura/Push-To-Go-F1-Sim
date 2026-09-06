"""
predict.py
----------
Loads the trained XGBoost model (saved_model.pkl) and runs real-time
overtake predictions for the live telemetry pipeline.

Model expects 10 features (in order):
  Speed, Throttle, Brake, RPM, DRS,
  Acceleration, Estimated_SoC, Gap_to_Ahead,
  TyreLife, Compound_Encoded
"""

import os
import joblib
import numpy as np

# ── Load saved XGBoost model once at import time ──
_MODEL_PATH = os.path.join(os.path.dirname(__file__), "saved_model.pkl")
_model = None

try:
    _model = joblib.load(_MODEL_PATH)
    print(f"[OK] XGBoost model loaded from {_MODEL_PATH}")
except Exception as e:
    print(f"[WARN] Could not load model ({e}). Predictions will fall back to rule-based heuristic.")


# Feature order must match train_model.py exactly
FEATURE_COLS = [
    "Speed", "Throttle", "Brake", "RPM", "DRS",
    "Acceleration", "Estimated_SoC", "Gap_to_Ahead",
    "TyreLife", "Compound_Encoded"
]

# Sensible defaults for features that may not be available from all callers
FEATURE_DEFAULTS = {
    "Speed": 0.0,
    "Throttle": 0.0,
    "Brake": 0.0,
    "RPM": 0,
    "DRS": 0,              # 0 = not active (under 2026 regs, maps to Straight Mode / Overtake Mode)
    "Acceleration": 0.0,
    "Estimated_SoC": 50.0,  # assume mid-charge if unknown
    "Gap_to_Ahead": 5.0,    # 5s gap = unlikely overtake if unknown
    "TyreLife": 10,          # mid-stint default
    "Compound_Encoded": 3,   # SOFT (most common race compound)
}


def predict_single(data: dict) -> int:
    """
    Predict whether an overtake is likely (1) or not (0).

    Args:
        data: dict with any subset of the 10 feature keys.
              Missing keys are filled with sensible defaults.

    Returns:
        0 (No Overtake) or 1 (Overtake Likely)
    """
    # Build feature vector in the exact order the model expects
    features = []
    for col in FEATURE_COLS:
        val = data.get(col, FEATURE_DEFAULTS[col])
        try:
            features.append(float(val) if val is not None else float(FEATURE_DEFAULTS[col]))
        except (ValueError, TypeError):
            features.append(float(FEATURE_DEFAULTS[col]))

    if _model is not None:
        # Real XGBoost prediction
        X = np.array([features])
        prediction = int(_model.predict(X)[0])
        return prediction
    else:
        # Rule-based fallback if model failed to load
        speed = features[0]       # Speed
        gap = features[7]         # Gap_to_Ahead
        soc = features[6]         # Estimated_SoC
        throttle = features[1]    # Throttle

        # Heuristic: overtake likely when close, fast, with battery charge
        if gap < 1.0 and speed > 280 and soc > 30 and throttle > 90:
            return 1
        return 0