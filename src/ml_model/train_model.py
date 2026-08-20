import sys
import os
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import joblib

# Project root directory > add to sys.path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from src.common import config

def train_xgboost_model():
    print("==================================================")
    print("🚀 F1 Overtake Predictor - Model Training Started!")
    print("==================================================")

    # 1. Load dataset
    print(f"\n[i] Loading dataset: {config.PROCESSED_CSV_PATH}")
    try:
        df = pd.read_csv(config.PROCESSED_CSV_PATH)
    except FileNotFoundError:
        print("❌ Dataset not found! Please run build_training_csv.py first.")
        return

    # 2. Separate Features (X) and Target (y)
    # Remove Driver and TrackStatus columns, as they are not input features for the model
    feature_cols = [
        "Speed", "Throttle", "Brake", "RPM", "DRS",
        "Acceleration", "Estimated_SoC", "Gap_to_Ahead",
        "TyreLife", "Compound_Encoded"
    ]
    
    X = df[feature_cols]
    y = df["Overtake_Success"]

    print(f"[i] All Data Rows Count: {len(df)}")

    # 3. Calculate Scale Pos Weight for imbalanced classes
    neg_count = (y == 0).sum()
    pos_count = (y == 1).sum()
    spw = neg_count / pos_count
    print(f"[i] Non-Overtakes (0): {neg_count}")
    print(f"[i] Overtakes (1): {pos_count}")
    print(f"[i] Calculated scale_pos_weight: {spw:.2f}")

    # 4. Train/Test Split (80% train, 20% test)
    print("\n[i] Train/Test Split (80/20)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # 5. Create XGBoost Classifier model and train it
    print("[i] XGBoost Model Training Started (Please wait)...")
    model = xgb.XGBClassifier(
        scale_pos_weight=spw,     # Imbalance fixing
        learning_rate=0.1,        # Speed of learning
        max_depth=6,              # Tree depth
        n_estimators=100,         # Number of trees
        random_state=42,
        eval_metric='aucpr',      # Precision-Recall AUC for imbalanced datasets
        n_jobs=-1                 # Use all available CPU cores
    )

    model.fit(X_train, y_train)
    print("✅ Training Completed Successfully!")

    # 6. Evaluate the model on the test set
    print("\n[i] Evaluating the model on the test set...")
    y_pred = model.predict(X_test)
    
    print("\n--- Confusion Matrix ---")
    print(confusion_matrix(y_test, y_pred))
    
    print("\n--- Classification Report ---")
    print(classification_report(y_test, y_pred))

    # 7. Save the trained model to a file
    model_save_path = os.path.join(os.path.dirname(__file__), "saved_model.pkl")
    joblib.dump(model, model_save_path)
    print(f"\n🎉 Model saved successfully -> {model_save_path}")


if __name__ == "__main__":
    train_xgboost_model()