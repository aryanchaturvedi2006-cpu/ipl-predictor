import pandas as pd
import numpy as np
import joblib
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.dummy import DummyClassifier
from sklearn.metrics import accuracy_score, f1_score, log_loss, roc_auc_score

from src.features import build_features

print("Starting baseline diagnostics...")

FEATURES_PRE = [
    'elo_diff', 'recent_win_rate_diff', 'venue_win_rate_diff',
    'batting_strength_diff', 'bowling_strength_diff',
    'recent_bat_run_rate_diff', 'recent_bowl_wkts_diff',
    'recent_runs_scored_avg_diff', 'recent_runs_conceded_avg_diff',
    'season_win_rate_diff'
]
TARGET = 'winner'

# 1. Load Data
df_raw = pd.read_csv('data/matches.csv')
df_raw = df_raw.dropna(subset=['winner']).reset_index(drop=True)
df, _ = build_features(df_raw)

# Map target
df['winner'] = (df['winner'] == df['team1']).astype(int)
df['season'] = df['season'].astype(str).str.extract(r'(\d{4})')[0].astype(int)

# Chronological split
train_df = df[df['season'] <= 2023].copy()
test_df = df[df['season'] >= 2024].copy()

# Mirror augmentation (Identical to train_dl.py to ensure exact same samples)
def augment_data(data):
    df_mirrored = data.copy()
    diff_cols = [c for c in data.columns if c.endswith('_diff')]
    for c in diff_cols:
        df_mirrored[c] = -df_mirrored[c]
    
    if 'toss_impact' in df_mirrored.columns:
        df_mirrored['toss_impact'] = -df_mirrored['toss_impact']
        
    df_mirrored[TARGET] = 1 - df_mirrored[TARGET]
    
    if 'toss_won' in df_mirrored.columns:
        df_mirrored['toss_won'] = 1 - df_mirrored['toss_won']
        
    return pd.concat([data, df_mirrored], ignore_index=True)

train_df = augment_data(train_df)
test_df = augment_data(test_df)

X_train = train_df[FEATURES_PRE].values
y_train = train_df[TARGET].values
X_test = test_df[FEATURES_PRE].values
y_test = test_df[TARGET].values

# Standardization
scaler = joblib.load('models/scaler_pre.pkl')
X_train_s = scaler.transform(X_train)
X_test_s = scaler.transform(X_test)

print("\n=======================================================")
print("Dataset Configuration")
print("=======================================================")
print(f"Features: {FEATURES_PRE}")
print(f"Train Samples: {X_train.shape[0]} | Test Samples: {X_test.shape[0]}")
print(f"Train Target Balance: 1={np.sum(y_train==1)}, 0={np.sum(y_train==0)}")
print(f"Test Target Balance: 1={np.sum(y_test==1)}, 0={np.sum(y_test==0)}")
print(f"Feature Standardization: Applied using saved scaler_pre.pkl")

print("\n=======================================================")
print("Baseline Evaluation (Pre-Toss)")
print("=======================================================")

results = []

def evaluate_model(name, model, supports_proba=False):
    model.fit(X_train_s, y_train)
    p_train = model.predict(X_train_s)
    p_test = model.predict(X_test_s)
    
    train_acc = accuracy_score(y_train, p_train)
    test_acc = accuracy_score(y_test, p_test)
    test_f1 = f1_score(y_test, p_test)
    
    test_ll = None
    test_auc = None
    
    if supports_proba:
        prob_test = model.predict_proba(X_test_s)[:, 1]
        test_ll = log_loss(y_test, prob_test)
        test_auc = roc_auc_score(y_test, prob_test)
    elif hasattr(model, "decision_function"):
        df_test = model.decision_function(X_test_s)
        test_auc = roc_auc_score(y_test, df_test)
        
    print(f"\n--- {name} ---")
    print(f"Train Acc: {train_acc:.4f} | Test Acc: {test_acc:.4f}")
    print(f"Test F1: {test_f1:.4f}")
    if test_ll is not None:
        print(f"Test Log Loss: {test_ll:.4f}")
    if test_auc is not None:
        print(f"Test AUC: {test_auc:.4f}")
        
evaluate_model("Dummy Classifier (Most Frequent)", DummyClassifier(strategy='most_frequent'), supports_proba=True)
evaluate_model("Logistic Regression", LogisticRegression(random_state=42), supports_proba=True)
evaluate_model("Linear SVM", LinearSVC(random_state=42, max_iter=10000, dual=False), supports_proba=False)

print("\nDiagnostics complete.")
