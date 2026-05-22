import os
import pandas as pd
import numpy as np
import xgboost as xgb
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from src.live_features import build_live_snapshots

def main():
    print("=== LIVE MATCH ML PIPELINE ===")
    
    # 1. Load Data
    print("Loading datasets...")
    try:
        matches = pd.read_csv("data/matches.csv", low_memory=False)
        deliveries = pd.read_csv("data/deliveries.csv", low_memory=False)
    except FileNotFoundError:
        print("Error: data/matches.csv or data/deliveries.csv not found.")
        return

    # 2. Build Snapshots
    df_live = build_live_snapshots(matches, deliveries)
    
    # We will train two separate models:
    # Model 1: 1st Innings (predicts batting team win probability based on projected score)
    # Model 2: 2nd Innings (predicts chasing team win probability based on target and runs needed)
    
    print("\nPreparing training data...")
    
    # Base features for both innings
    base_features = ['over', 'current_score', 'wickets_lost', 'crr']
    
    # Innings 1 data
    df_inn1 = df_live[df_live['inning'] == 1].copy()
    X_inn1 = df_inn1[base_features]
    y_inn1 = df_inn1['batting_won']
    
    # Innings 2 data
    df_inn2 = df_live[df_live['inning'] == 2].copy()
    features_inn2 = base_features + ['target', 'runs_needed', 'balls_remaining', 'req_rr']
    X_inn2 = df_inn2[features_inn2]
    y_inn2 = df_inn2['batting_won']
    
    # Train Innings 1 Model
    print("\nTraining Innings 1 Model (Batting First)...")
    X1_train, X1_test, y1_train, y1_test = train_test_split(X_inn1, y_inn1, test_size=0.2, random_state=42)
    model_inn1 = xgb.XGBClassifier(
        n_estimators=100,
        learning_rate=0.05,
        max_depth=5,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        eval_metric='logloss'
    )
    model_inn1.fit(X1_train, y1_train)
    y1_pred = model_inn1.predict(X1_test)
    print("Innings 1 Accuracy:", accuracy_score(y1_test, y1_pred))
    
    # Train Innings 2 Model
    print("\nTraining Innings 2 Model (Chasing)...")
    X2_train, X2_test, y2_train, y2_test = train_test_split(X_inn2, y_inn2, test_size=0.2, random_state=42)
    model_inn2 = xgb.XGBClassifier(
        n_estimators=100,
        learning_rate=0.05,
        max_depth=5,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        eval_metric='logloss'
    )
    model_inn2.fit(X2_train, y2_train)
    y2_pred = model_inn2.predict(X2_test)
    print("Innings 2 Accuracy:", accuracy_score(y2_test, y2_pred))
    
    # 3. Save Models
    print("\nSerializing Live Models...")
    os.makedirs('models', exist_ok=True)
    
    live_models = {
        'inn1_model': model_inn1,
        'inn2_model': model_inn2,
        'features_inn1': base_features,
        'features_inn2': features_inn2
    }
    
    joblib.dump(live_models, 'models/live_model.pkl')
    print("Successfully saved models/live_model.pkl")

if __name__ == "__main__":
    main()
