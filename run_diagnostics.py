import os
import json
import numpy as np
import pandas as pd
import joblib
from tensorflow.keras.models import load_model
from sklearn.metrics import accuracy_score, f1_score, log_loss, roc_auc_score
from sklearn.inspection import permutation_importance
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

from src.features import build_features

print("Starting diagnostics...")
os.makedirs("models/plots/diagnostics", exist_ok=True)

FEATURES_PRE = [
    'elo_diff', 'recent_win_rate_diff', 'venue_win_rate_diff',
    'batting_strength_diff', 'bowling_strength_diff',
    'recent_bat_run_rate_diff', 'recent_bowl_wkts_diff',
    'recent_runs_scored_avg_diff', 'recent_runs_conceded_avg_diff',
    'season_win_rate_diff'
]
FEATURES_POST = FEATURES_PRE + ['toss_impact', 'toss_won']
TARGET = 'winner'

# 1. Load Data
df_raw = pd.read_csv('data/matches.csv')
df_raw = df_raw.dropna(subset=['winner']).reset_index(drop=True)
df, _ = build_features(df_raw)
df['winner'] = (df['winner'] == df['team1']).astype(int)

# Chronological split
df['season'] = df['season'].astype(str).str.extract(r'(\d{4})')[0].astype(int)
train_df = df[df['season'] <= 2023].copy()
test_df = df[df['season'] >= 2024].copy()

# Mirror augmentation
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

X_train_pre = train_df[FEATURES_PRE].values
X_test_pre = test_df[FEATURES_PRE].values
y_train = train_df[TARGET].values
y_test = test_df[TARGET].values

X_train_post = train_df[FEATURES_POST].values
X_test_post = test_df[FEATURES_POST].values

# Load Scalers and Models
scaler_pre = joblib.load('models/scaler_pre.pkl')
scaler_post = joblib.load('models/scaler_post.pkl')
X_train_pre_s = scaler_pre.transform(X_train_pre)
X_test_pre_s = scaler_pre.transform(X_test_pre)
X_train_post_s = scaler_post.transform(X_train_post)
X_test_post_s = scaler_post.transform(X_test_post)

model_pre = load_model('models/ffnn_pre.keras')
model_post = load_model('models/ffnn_post.keras')

print("\n=======================================================")
print("1 & 9. Feature Statistics & Sensibility (Test Set unscaled)")
print("=======================================================")
df_pre_test = pd.DataFrame(X_test_pre, columns=FEATURES_PRE)
stats = []
for col in FEATURES_PRE:
    s = df_pre_test[col]
    stats.append({
        "Feature": col,
        "Min": s.min(),
        "Max": s.max(),
        "Mean": s.mean(),
        "Median": s.median(),
        "Std": s.std(),
        "Missing": s.isna().sum(),
        "Zeroes": (s == 0).sum()
    })
stats_df = pd.DataFrame(stats)
print(stats_df.to_string(index=False, float_format=lambda x: f"{x:7.2f}"))

print("\n=======================================================")
print("2. Correlation with Target (Pearson & Spearman - Train Set)")
print("=======================================================")
corr_pearson = train_df[FEATURES_PRE + [TARGET]].corr(method='pearson')[TARGET].drop(TARGET)
corr_spearman = train_df[FEATURES_PRE + [TARGET]].corr(method='spearman')[TARGET].drop(TARGET)
corr_df = pd.DataFrame({'Pearson': corr_pearson, 'Spearman': corr_spearman})
print(corr_df.sort_values(by='Pearson', ascending=False).to_string(float_format=lambda x: f"{x:6.3f}"))

print("\n=======================================================")
print("3. Permutation Importance (Test Set)")
print("=======================================================")
from sklearn.base import BaseEstimator, ClassifierMixin
class KerasWrapper(BaseEstimator, ClassifierMixin):
    def __init__(self, model=None):
        self.model = model
    def predict(self, X):
        return (self.model.predict(X, verbose=0) > 0.5).astype(int).flatten()
    def fit(self, X, y=None):
        self.classes_ = np.array([0, 1])
        return self

wrapper_pre = KerasWrapper(model_pre)
wrapper_post = KerasWrapper(model_post)

pi_pre = permutation_importance(wrapper_pre, X_test_pre_s, y_test, n_repeats=5, random_state=42, scoring='accuracy')
pi_post = permutation_importance(wrapper_post, X_test_post_s, y_test, n_repeats=5, random_state=42, scoring='accuracy')

pi_pre_df = pd.DataFrame({'Feature': FEATURES_PRE, 'Importance': pi_pre.importances_mean}).sort_values(by='Importance', ascending=False)
pi_post_df = pd.DataFrame({'Feature': FEATURES_POST, 'Importance': pi_post.importances_mean}).sort_values(by='Importance', ascending=False)
print("--- PRE-TOSS Importance ---")
print(pi_pre_df.to_string(index=False, float_format=lambda x: f"{x:6.4f}"))
print("\n--- POST-TOSS Importance ---")
print(pi_post_df.to_string(index=False, float_format=lambda x: f"{x:6.4f}"))

print("\n=======================================================")
print("4 & 5 & 6. Probability Distributions (Test Set)")
print("=======================================================")
probs_pre = model_pre.predict(X_test_pre_s, verbose=0).flatten()
probs_post = model_post.predict(X_test_post_s, verbose=0).flatten()

def print_prob_stats(name, probs, y_true):
    print(f"\n--- {name} ---")
    print(f"Min: {probs.min():.4f} | Max: {probs.max():.4f} | Mean: {probs.mean():.4f} | Median: {np.median(probs):.4f} | Std: {probs.std():.4f}")
    print(f"Avg Prob when Team 1 actually WON (y=1): {probs[y_true == 1].mean():.4f}")
    print(f"Avg Prob when Team 2 actually WON (y=0): {probs[y_true == 0].mean():.4f}")
    print(f"% of predictions between 0.45 and 0.55: {((probs >= 0.45) & (probs <= 0.55)).mean() * 100:.2f}%")

print_prob_stats("FFNN Pre-toss", probs_pre, y_test)
print_prob_stats("FFNN Post-toss", probs_post, y_test)

plt.figure(figsize=(10, 4))
plt.hist(probs_pre, bins=30, alpha=0.5, label='Pre-toss', color='blue')
plt.hist(probs_post, bins=30, alpha=0.5, label='Post-toss', color='orange')
plt.title('Prediction Probability Distribution (Test Set)')
plt.legend()
plt.savefig('models/plots/diagnostics/prob_dist.png')
plt.close()

print("\n=======================================================")
print("7. Train vs Test Performance (Overfitting Check)")
print("=======================================================")
def get_metrics(model, X_train, y_train, X_test, y_test):
    p_train = model.predict(X_train, verbose=0).flatten()
    p_test = model.predict(X_test, verbose=0).flatten()
    c_train = (p_train > 0.5).astype(int)
    c_test = (p_test > 0.5).astype(int)
    
    return {
        "Train Acc": accuracy_score(y_train, c_train),
        "Test Acc": accuracy_score(y_test, c_test),
        "Train F1": f1_score(y_train, c_train),
        "Test F1": f1_score(y_test, c_test),
        "Train LL": log_loss(y_train, p_train),
        "Test LL": log_loss(y_test, p_test),
        "Train AUC": roc_auc_score(y_train, p_train),
        "Test AUC": roc_auc_score(y_test, p_test)
    }

metrics_pre = get_metrics(model_pre, X_train_pre_s, y_train, X_test_pre_s, y_test)
metrics_post = get_metrics(model_post, X_train_post_s, y_train, X_test_post_s, y_test)

m_df = pd.DataFrame([metrics_pre, metrics_post], index=['FFNN Pre', 'FFNN Post']).T
print(m_df.to_string(float_format=lambda x: f"{x:6.4f}"))

print("\n=======================================================")
print("8. Target Mirroring / Augmentation Check (Test Set Pre-toss)")
print("=======================================================")
n_orig = len(test_df) // 2
probs_orig = probs_pre[:n_orig]
probs_mirror = probs_pre[n_orig:]

diff_from_1 = np.abs((probs_orig + probs_mirror) - 1.0)
print(f"Symmetry strictness:")
print(f"Mean deviation from P + P_mirror = 1.0: {diff_from_1.mean():.4f}")
print(f"Max deviation: {diff_from_1.max():.4f}")

print("\nDiagnostics complete!")
