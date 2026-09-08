"""
train_dl.py — Deep Learning upgrade for IPL Predictor
Trains:
  1. FFNN  (Feed Forward Neural Network) — pre/post toss match predictor
  2. LSTM  (Long Short-Term Memory)      — live in-match predictor
  3. Model Comparison — RF vs XGBoost vs FFNN vs LSTM
"""

import os
import warnings
warnings.filterwarnings("ignore")
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

import numpy as np
import pandas as pd
import joblib
from collections import defaultdict, deque

from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score, log_loss
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

import tensorflow as tf
from tensorflow.keras.models import Sequential, Model
from tensorflow.keras.layers import (Dense, Dropout, LSTM, Input,
                                      BatchNormalization)
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
from tensorflow.keras.optimizers import Adam

# ─────────────────────────────────────────────
# 0.  Import existing feature engineering
# ─────────────────────────────────────────────
import sys
sys.path.insert(0, ".")
from src.features import clean_team_names, build_features

print("=" * 60)
print("  CricIQ — Deep Learning Training Pipeline")
print("=" * 60)

# ─────────────────────────────────────────────
# 1.  Load & prepare match-level features
# ─────────────────────────────────────────────
print("\n[1/6] Loading and building features...")

df = pd.read_csv("data/matches.csv")
df = df.dropna(subset=["winner"]).reset_index(drop=True)
df = clean_team_names(df)
df, final_states = build_features(df)

df["season"] = df["season"].astype(str).str[:4].astype(int)

FEATURES_PRE  = ["elo_diff", "form_diff", "venue_diff",
                  "batting_strength_diff", "bowling_strength_diff"]
FEATURES_POST = FEATURES_PRE + ["toss_impact", "toss_won"]
TARGET = "target"

# Data mirroring — removes team1/team2 positional bias
df_mirror = df.copy()
for f in FEATURES_POST:
    df_mirror[f] = -df_mirror[f]
df_mirror[TARGET] = 1 - df_mirror[TARGET]
df_combined = pd.concat([df, df_mirror], ignore_index=True)

train_df = df_combined[df_combined["season"] <= 2023]
test_df  = df_combined[df_combined["season"] >= 2024]

X_train_pre  = train_df[FEATURES_PRE].values
X_test_pre   = test_df[FEATURES_PRE].values
X_train_post = train_df[FEATURES_POST].values
X_test_post  = test_df[FEATURES_POST].values
y_train      = train_df[TARGET].values
y_test       = test_df[TARGET].values

print(f"  Train: {len(train_df)} samples | Test: {len(test_df)} samples")

os.makedirs("models", exist_ok=True)

# ─────────────────────────────────────────────
# 2.  Baseline — Random Forest (existing)
# ─────────────────────────────────────────────
print("\n[2/6] Training baseline Random Forest...")

rf_pre = RandomForestClassifier(n_estimators=200, max_depth=4,
                                 min_samples_leaf=10, random_state=42)
rf_pre.fit(X_train_pre, y_train)

rf_post = RandomForestClassifier(n_estimators=200, max_depth=4,
                                  min_samples_leaf=10, random_state=42)
rf_post.fit(X_train_post, y_train)

rf_pre_acc  = accuracy_score(y_test, rf_pre.predict(X_test_pre))
rf_post_acc = accuracy_score(y_test, rf_post.predict(X_test_post))
rf_pre_f1   = f1_score(y_test, rf_pre.predict(X_test_pre))
rf_post_f1  = f1_score(y_test, rf_post.predict(X_test_post))
rf_pre_ll   = log_loss(y_test, rf_pre.predict_proba(X_test_pre))
rf_post_ll  = log_loss(y_test, rf_post.predict_proba(X_test_post))

print(f"  RF Pre-toss  — Acc: {rf_pre_acc*100:.2f}%  F1: {rf_pre_f1:.3f}  LogLoss: {rf_pre_ll:.3f}")
print(f"  RF Post-toss — Acc: {rf_post_acc*100:.2f}%  F1: {rf_post_f1:.3f}  LogLoss: {rf_post_ll:.3f}")

# ─────────────────────────────────────────────
# 3.  Baseline — XGBoost (existing)
# ─────────────────────────────────────────────
print("\n[3/6] Training baseline XGBoost...")

xgb_pre = XGBClassifier(n_estimators=200, max_depth=3, learning_rate=0.05,
                         use_label_encoder=False, eval_metric="logloss",
                         random_state=42, verbosity=0)
xgb_pre.fit(X_train_pre, y_train)

xgb_post = XGBClassifier(n_estimators=200, max_depth=3, learning_rate=0.05,
                          use_label_encoder=False, eval_metric="logloss",
                          random_state=42, verbosity=0)
xgb_post.fit(X_train_post, y_train)

xgb_pre_acc  = accuracy_score(y_test, xgb_pre.predict(X_test_pre))
xgb_post_acc = accuracy_score(y_test, xgb_post.predict(X_test_post))
xgb_pre_f1   = f1_score(y_test, xgb_pre.predict(X_test_pre))
xgb_post_f1  = f1_score(y_test, xgb_post.predict(X_test_post))
xgb_pre_ll   = log_loss(y_test, xgb_pre.predict_proba(X_test_pre))
xgb_post_ll  = log_loss(y_test, xgb_post.predict_proba(X_test_post))

print(f"  XGB Pre-toss  — Acc: {xgb_pre_acc*100:.2f}%  F1: {xgb_pre_f1:.3f}  LogLoss: {xgb_pre_ll:.3f}")
print(f"  XGB Post-toss — Acc: {xgb_post_acc*100:.2f}%  F1: {xgb_post_f1:.3f}  LogLoss: {xgb_post_ll:.3f}")

# ─────────────────────────────────────────────
# 4.  FFNN — Feed Forward Neural Network
# ─────────────────────────────────────────────
print("\n[4/6] Training FFNN (Feed Forward Neural Network)...")

# Scale features — critical for neural networks
scaler_pre  = StandardScaler()
scaler_post = StandardScaler()

X_train_pre_sc  = scaler_pre.fit_transform(X_train_pre)
X_test_pre_sc   = scaler_pre.transform(X_test_pre)
X_train_post_sc = scaler_post.fit_transform(X_train_post)
X_test_post_sc  = scaler_post.transform(X_test_post)

def build_ffnn(input_dim, name="ffnn"):
    """
    Multi-layer Feed Forward Neural Network.
    Architecture: Input → 128 → 64 → 32 → 16 → Output(Sigmoid)
    BatchNorm + Dropout for regularization.
    """
    model = Sequential(name=name)
    model.add(Input(shape=(input_dim,)))

    model.add(Dense(128, activation="relu"))
    model.add(BatchNormalization())
    model.add(Dropout(0.3))

    model.add(Dense(64, activation="relu"))
    model.add(BatchNormalization())
    model.add(Dropout(0.3))

    model.add(Dense(32, activation="relu"))
    model.add(Dropout(0.2))

    model.add(Dense(16, activation="relu"))

    model.add(Dense(1, activation="sigmoid"))

    model.compile(
        optimizer=Adam(learning_rate=0.001),
        loss="binary_crossentropy",
        metrics=["accuracy"]
    )
    return model

callbacks = [
    EarlyStopping(monitor="val_loss", patience=15,
                  restore_best_weights=True, verbose=0),
    ReduceLROnPlateau(monitor="val_loss", factor=0.5,
                      patience=7, min_lr=1e-5, verbose=0)
]

# Pre-toss FFNN
ffnn_pre = build_ffnn(len(FEATURES_PRE), name="ffnn_pre")
ffnn_pre.fit(
    X_train_pre_sc, y_train,
    validation_split=0.15,
    epochs=150,
    batch_size=32,
    callbacks=callbacks,
    verbose=0
)

# Post-toss FFNN
ffnn_post = build_ffnn(len(FEATURES_POST), name="ffnn_post")
ffnn_post.fit(
    X_train_post_sc, y_train,
    validation_split=0.15,
    epochs=150,
    batch_size=32,
    callbacks=callbacks,
    verbose=0
)

ffnn_pre_prob  = ffnn_pre.predict(X_test_pre_sc, verbose=0).flatten()
ffnn_post_prob = ffnn_post.predict(X_test_post_sc, verbose=0).flatten()

ffnn_pre_pred  = (ffnn_pre_prob  > 0.5).astype(int)
ffnn_post_pred = (ffnn_post_prob > 0.5).astype(int)

ffnn_pre_acc  = accuracy_score(y_test, ffnn_pre_pred)
ffnn_post_acc = accuracy_score(y_test, ffnn_post_pred)
ffnn_pre_f1   = f1_score(y_test, ffnn_pre_pred)
ffnn_post_f1  = f1_score(y_test, ffnn_post_pred)
ffnn_pre_ll   = log_loss(y_test, ffnn_pre_prob)
ffnn_post_ll  = log_loss(y_test, ffnn_post_prob)

print(f"  FFNN Pre-toss  — Acc: {ffnn_pre_acc*100:.2f}%  F1: {ffnn_pre_f1:.3f}  LogLoss: {ffnn_pre_ll:.3f}")
print(f"  FFNN Post-toss — Acc: {ffnn_post_acc*100:.2f}%  F1: {ffnn_post_f1:.3f}  LogLoss: {ffnn_post_ll:.3f}")

# Save FFNN models + scalers
ffnn_pre.save("models/ffnn_pre.keras")
ffnn_post.save("models/ffnn_post.keras")
joblib.dump(scaler_pre,  "models/scaler_pre.pkl")
joblib.dump(scaler_post, "models/scaler_post.pkl")
print("  FFNN models saved.")

# ─────────────────────────────────────────────
# 5.  LSTM — Live In-Match Predictor
# ─────────────────────────────────────────────
print("\n[5/6] Building LSTM sequences from ball-by-ball data...")

DELS_PATH = "data/deliveries.csv"
LSTM_FEATURES = ["score", "wickets", "current_rr",
                  "required_rr", "balls_left",
                  "last3_runs", "last3_wickets"]
SEQ_LEN = 20   # one entry per over (T20 = 20 overs max)

def build_lstm_sequences():
    """
    Builds over-by-over sequences from ball-by-ball Cricsheet data.
    Each sequence = 20 time steps (one per over).
    Each time step = 7 features.
    Label = 1 if batting team (2nd innings) won, 0 otherwise.
    """
    if not os.path.exists(DELS_PATH):
        print("  deliveries.csv not found — skipping LSTM training.")
        return None, None, None, None

    from src.features import TEAM_MAPPING

    dels = pd.read_csv(DELS_PATH, low_memory=False)
    dels["batting_team"] = dels["batting_team"].apply(
        lambda x: TEAM_MAPPING.get(str(x).strip(), str(x).strip()))
    dels["bowling_team"] = dels["bowling_team"].apply(
        lambda x: TEAM_MAPPING.get(str(x).strip(), str(x).strip()))
    dels["is_wicket"] = dels["is_wicket"].fillna(False).astype(bool)

    matches_df = pd.read_csv("data/matches.csv")
    matches_df = matches_df.dropna(subset=["winner"]).reset_index(drop=True)
    matches_df = clean_team_names(matches_df)
    matches_df["season"] = matches_df["season"].astype(str).str[:4].astype(int)

    winner_map = dict(zip(matches_df["match_id"], matches_df["winner"]))
    season_map = dict(zip(matches_df["match_id"], matches_df["season"]))

    sequences, labels, seasons = [], [], []

    for match_id, grp in dels.groupby("match_id"):
        if match_id not in winner_map:
            continue

        winner  = winner_map[match_id]
        season  = season_map.get(match_id, 2020)

        # Only use 2nd innings for live prediction
        innings2 = grp[grp["innings"] == 2]
        if innings2.empty:
            continue

        batting_team = innings2["batting_team"].iloc[0]
        batting_won  = 1 if winner == batting_team else 0

        # Compute target (1st innings total)
        innings1 = grp[grp["innings"] == 1]
        target   = innings1["total_runs"].sum() + 1
        if target < 50:
            continue

        # Build over-by-over snapshot
        seq = []
        cumulative_score   = 0
        cumulative_wickets = 0
        last3_runs    = deque(maxlen=3)
        last3_wickets = deque(maxlen=3)

        for over_num in range(1, 21):
            over_balls = innings2[innings2["over"] == over_num]
            if over_balls.empty:
                # Match ended before over 20
                balls_left   = max(0, (20 - over_num) * 6)
                runs_needed  = max(0, target - cumulative_score)
                required_rr  = (runs_needed / (balls_left / 6)) if balls_left > 0 else 99.0
                current_rr   = (cumulative_score / over_num) if over_num > 0 else 0.0
                l3r = sum(last3_runs) if last3_runs else 0
                l3w = sum(last3_wickets) if last3_wickets else 0
                # Repeat last known state for remaining overs
                step = [
                    cumulative_score / 300.0,
                    cumulative_wickets / 10.0,
                    min(current_rr, 20.0) / 20.0,
                    min(required_rr, 30.0) / 30.0,
                    balls_left / 120.0,
                    l3r / 60.0,
                    l3w / 3.0
                ]
                seq.append(step)
                continue

            over_runs    = over_balls["total_runs"].sum()
            over_wickets = over_balls["is_wicket"].sum()
            cumulative_score   += over_runs
            cumulative_wickets += over_wickets
            last3_runs.append(over_runs)
            last3_wickets.append(over_wickets)

            balls_delivered = len(over_balls)
            balls_left      = max(0, 120 - (over_num * 6))
            runs_needed     = max(0, target - cumulative_score)
            current_rr      = cumulative_score / over_num
            required_rr     = (runs_needed / (balls_left / 6)) if balls_left > 0 else 99.0

            step = [
                cumulative_score   / 300.0,
                cumulative_wickets / 10.0,
                min(current_rr,  20.0) / 20.0,
                min(required_rr, 30.0) / 30.0,
                balls_left / 120.0,
                sum(last3_runs)    / 60.0,
                sum(last3_wickets) / 3.0
            ]
            seq.append(step)

        if len(seq) == SEQ_LEN:
            sequences.append(seq)
            labels.append(batting_won)
            seasons.append(season)

    if not sequences:
        return None, None, None, None

    X = np.array(sequences, dtype=np.float32)   # (N, 20, 7)
    y = np.array(labels,    dtype=np.float32)
    s = np.array(seasons)

    train_mask = s <= 2023
    test_mask  = s >= 2024

    return X[train_mask], X[test_mask], y[train_mask], y[test_mask]

X_lstm_train, X_lstm_test, y_lstm_train, y_lstm_test = build_lstm_sequences()

if X_lstm_train is not None:
    print(f"  LSTM sequences — Train: {len(X_lstm_train)} | Test: {len(X_lstm_test)}")

    def build_lstm_model():
        """
        Stacked LSTM network for sequence-to-outcome prediction.
        Architecture: LSTM(64) → LSTM(32) → Dense(16) → Output(Sigmoid)
        """
        model = Sequential(name="lstm_live")
        model.add(Input(shape=(SEQ_LEN, len(LSTM_FEATURES))))

        model.add(LSTM(64, return_sequences=True))
        model.add(Dropout(0.3))

        model.add(LSTM(32, return_sequences=False))
        model.add(Dropout(0.2))

        model.add(Dense(16, activation="relu"))
        model.add(Dense(1,  activation="sigmoid"))

        model.compile(
            optimizer=Adam(learning_rate=0.001),
            loss="binary_crossentropy",
            metrics=["accuracy"]
        )
        return model

    lstm_model = build_lstm_model()
    lstm_callbacks = [
        EarlyStopping(monitor="val_loss", patience=20,
                      restore_best_weights=True, verbose=0),
        ReduceLROnPlateau(monitor="val_loss", factor=0.5,
                          patience=8, min_lr=1e-5, verbose=0)
    ]

    lstm_model.fit(
        X_lstm_train, y_lstm_train,
        validation_split=0.15,
        epochs=200,
        batch_size=64,
        callbacks=lstm_callbacks,
        verbose=0
    )

    lstm_prob = lstm_model.predict(X_lstm_test, verbose=0).flatten()
    lstm_pred = (lstm_prob > 0.5).astype(int)

    lstm_acc = accuracy_score(y_lstm_test, lstm_pred)
    lstm_f1  = f1_score(y_lstm_test, lstm_pred)
    lstm_ll  = log_loss(y_lstm_test, lstm_prob)

    print(f"  LSTM Live    — Acc: {lstm_acc*100:.2f}%  F1: {lstm_f1:.3f}  LogLoss: {lstm_ll:.3f}")

    lstm_model.save("models/lstm_live.keras")
    print("  LSTM model saved.")
else:
    lstm_acc = lstm_f1 = lstm_ll = None
    print("  LSTM skipped — deliveries.csv missing.")

# ─────────────────────────────────────────────
# 6.  Model Comparison — save JSON for frontend
# ─────────────────────────────────────────────
print("\n[6/6] Saving model comparison results...")

import json

comparison = {
    "pre_toss": [
        {
            "model": "Random Forest",
            "accuracy": round(rf_pre_acc * 100, 2),
            "f1":       round(rf_pre_f1,        3),
            "log_loss": round(rf_pre_ll,         3),
            "type":     "ML Baseline"
        },
        {
            "model": "XGBoost",
            "accuracy": round(xgb_pre_acc * 100, 2),
            "f1":       round(xgb_pre_f1,         3),
            "log_loss": round(xgb_pre_ll,          3),
            "type":     "ML Baseline"
        },
        {
            "model": "FFNN",
            "accuracy": round(ffnn_pre_acc * 100, 2),
            "f1":       round(ffnn_pre_f1,          3),
            "log_loss": round(ffnn_pre_ll,           3),
            "type":     "Deep Learning"
        }
    ],
    "post_toss": [
        {
            "model": "Random Forest",
            "accuracy": round(rf_post_acc * 100, 2),
            "f1":       round(rf_post_f1,         3),
            "log_loss": round(rf_post_ll,          3),
            "type":     "ML Baseline"
        },
        {
            "model": "XGBoost",
            "accuracy": round(xgb_post_acc * 100, 2),
            "f1":       round(xgb_post_f1,          3),
            "log_loss": round(xgb_post_ll,           3),
            "type":     "ML Baseline"
        },
        {
            "model": "FFNN",
            "accuracy": round(ffnn_post_acc * 100, 2),
            "f1":       round(ffnn_post_f1,           3),
            "log_loss": round(ffnn_post_ll,            3),
            "type":     "Deep Learning"
        }
    ]
}

if lstm_acc is not None:
    comparison["live_match"] = [
        {
            "model":    "LSTM",
            "accuracy": round(lstm_acc * 100, 2),
            "f1":       round(lstm_f1,         3),
            "log_loss": round(lstm_ll,          3),
            "type":     "Deep Learning"
        }
    ]

with open("models/model_comparison.json", "w") as f:
    json.dump(comparison, f, indent=2)

print("  model_comparison.json saved.")

# ─────────────────────────────────────────────
# Final Summary
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("  FINAL MODEL COMPARISON")
print("=" * 60)
print(f"\n  {'Model':<22} {'Stage':<12} {'Accuracy':>10} {'F1':>8} {'LogLoss':>10}")
print("  " + "-" * 62)
print(f"  {'Random Forest':<22} {'Pre-toss':<12} {rf_pre_acc*100:>9.2f}% {rf_pre_f1:>8.3f} {rf_pre_ll:>10.3f}")
print(f"  {'Random Forest':<22} {'Post-toss':<12} {rf_post_acc*100:>9.2f}% {rf_post_f1:>8.3f} {rf_post_ll:>10.3f}")
print(f"  {'XGBoost':<22} {'Pre-toss':<12} {xgb_pre_acc*100:>9.2f}% {xgb_pre_f1:>8.3f} {xgb_pre_ll:>10.3f}")
print(f"  {'XGBoost':<22} {'Post-toss':<12} {xgb_post_acc*100:>9.2f}% {xgb_post_f1:>8.3f} {xgb_post_ll:>10.3f}")
print(f"  {'FFNN (DL)':<22} {'Pre-toss':<12} {ffnn_pre_acc*100:>9.2f}% {ffnn_pre_f1:>8.3f} {ffnn_pre_ll:>10.3f}")
print(f"  {'FFNN (DL)':<22} {'Post-toss':<12} {ffnn_post_acc*100:>9.2f}% {ffnn_post_f1:>8.3f} {ffnn_post_ll:>10.3f}")
if lstm_acc:
    print(f"  {'LSTM (DL)':<22} {'Live Match':<12} {lstm_acc*100:>9.2f}% {lstm_f1:>8.3f} {lstm_ll:>10.3f}")

print("\n" + "=" * 60)
print("  Files saved in models/:")
print("    ffnn_pre.keras      — FFNN pre-toss model")
print("    ffnn_post.keras     — FFNN post-toss model")
print("    scaler_pre.pkl      — Feature scaler (pre-toss)")
print("    scaler_post.pkl     — Feature scaler (post-toss)")
if lstm_acc:
    print("    lstm_live.keras     — LSTM live match model")
print("    model_comparison.json — Results for frontend")
print("=" * 60)

# ─────────────────────────────────────────────
# PHASE 7 — Training Curves + Confusion Matrix
# ─────────────────────────────────────────────
print("\n[PHASE 7] Generating training curves and confusion matrices...")

try:
    import matplotlib
    matplotlib.use('Agg')  # non-interactive backend — works without display
    import matplotlib.pyplot as plt
    from sklearn.metrics import confusion_matrix, ConfusionMatrixDisplay, roc_auc_score
    PLOTS_AVAILABLE = True
except ImportError:
    PLOTS_AVAILABLE = False
    print("  matplotlib not found — install with: pip install matplotlib")

os.makedirs("models/plots", exist_ok=True)

if PLOTS_AVAILABLE:

    # ── Re-train FFNN with history capture ───────────────────
    # We need history objects — retrain briefly to capture curves
    # (Uses same data/scaler already computed above)
    print("  Capturing FFNN training history (fast retrain for curves)...")

    ffnn_pre_v2  = build_ffnn(len(FEATURES_PRE),  name="ffnn_pre_curves")
    ffnn_post_v2 = build_ffnn(len(FEATURES_POST), name="ffnn_post_curves")

    cb = [
        EarlyStopping(monitor="val_loss", patience=15,
                      restore_best_weights=True, verbose=0),
        ReduceLROnPlateau(monitor="val_loss", factor=0.5,
                          patience=7, min_lr=1e-5, verbose=0)
    ]

    hist_pre = ffnn_pre_v2.fit(
        X_train_pre_sc, y_train,
        validation_split=0.15,
        epochs=150, batch_size=32,
        callbacks=cb, verbose=0
    )
    hist_post = ffnn_post_v2.fit(
        X_train_post_sc, y_train,
        validation_split=0.15,
        epochs=150, batch_size=32,
        callbacks=cb, verbose=0
    )

    def save_training_curves(history, title, filename):
        fig, axes = plt.subplots(1, 2, figsize=(12, 4))
        fig.suptitle(title, fontsize=14, fontweight='bold')

        # Accuracy
        axes[0].plot(history.history['accuracy'],     label='Train Accuracy', color='#f97316')
        axes[0].plot(history.history['val_accuracy'], label='Val Accuracy',   color='#818cf8')
        axes[0].set_title('Accuracy per Epoch')
        axes[0].set_xlabel('Epoch')
        axes[0].set_ylabel('Accuracy')
        axes[0].legend()
        axes[0].grid(True, alpha=0.3)

        # Loss
        axes[1].plot(history.history['loss'],     label='Train Loss', color='#f97316')
        axes[1].plot(history.history['val_loss'], label='Val Loss',   color='#818cf8')
        axes[1].set_title('Loss per Epoch')
        axes[1].set_xlabel('Epoch')
        axes[1].set_ylabel('Binary Cross-Entropy')
        axes[1].legend()
        axes[1].grid(True, alpha=0.3)

        plt.tight_layout()
        plt.savefig(f"models/plots/{filename}", dpi=150, bbox_inches='tight')
        plt.close()
        print(f"  Saved: models/plots/{filename}")

    save_training_curves(hist_pre,  "FFNN Pre-Toss — Training Curves",  "ffnn_pre_curves.png")
    save_training_curves(hist_post, "FFNN Post-Toss — Training Curves", "ffnn_post_curves.png")

    # ── LSTM training curves ──────────────────────────────────
    if X_lstm_train is not None:
        print("  Capturing LSTM training history...")
        lstm_v2 = build_lstm_model()
        lstm_cb = [
            EarlyStopping(monitor="val_loss", patience=20,
                          restore_best_weights=True, verbose=0),
            ReduceLROnPlateau(monitor="val_loss", factor=0.5,
                              patience=8, min_lr=1e-5, verbose=0)
        ]
        hist_lstm = lstm_v2.fit(
            X_lstm_train, y_lstm_train,
            validation_split=0.15,
            epochs=200, batch_size=64,
            callbacks=lstm_cb, verbose=0
        )
        save_training_curves(hist_lstm, "LSTM Live Match — Training Curves", "lstm_curves.png")

    # ── Confusion Matrices ────────────────────────────────────
    def save_confusion_matrix(y_true, y_pred, title, filename):
        cm  = confusion_matrix(y_true, y_pred)
        cmd = ConfusionMatrixDisplay(cm, display_labels=["Team 2 Wins", "Team 1 Wins"])
        fig, ax = plt.subplots(figsize=(5, 4))
        cmd.plot(ax=ax, colorbar=False, cmap='Blues')
        ax.set_title(title, fontweight='bold')
        plt.tight_layout()
        plt.savefig(f"models/plots/{filename}", dpi=150, bbox_inches='tight')
        plt.close()
        print(f"  Saved: models/plots/{filename}")

    # RF baseline
    save_confusion_matrix(
        y_test, rf_pre.predict(X_test_pre),
        "Random Forest Pre-Toss — Confusion Matrix",
        "cm_rf_pre.png"
    )
    save_confusion_matrix(
        y_test, rf_post.predict(X_test_post),
        "Random Forest Post-Toss — Confusion Matrix",
        "cm_rf_post.png"
    )
    # FFNN
    save_confusion_matrix(
        y_test, ffnn_pre_pred,
        "FFNN Pre-Toss — Confusion Matrix",
        "cm_ffnn_pre.png"
    )
    save_confusion_matrix(
        y_test, ffnn_post_pred,
        "FFNN Post-Toss — Confusion Matrix",
        "cm_ffnn_post.png"
    )
    # LSTM
    if lstm_acc is not None:
        save_confusion_matrix(
            y_lstm_test, lstm_pred,
            "LSTM Live Match — Confusion Matrix",
            "cm_lstm.png"
        )

    # ── ROC-AUC ───────────────────────────────────────────────
    try:
        auc_rf_pre    = roc_auc_score(y_test, rf_pre.predict_proba(X_test_pre)[:, 1])
        auc_rf_post   = roc_auc_score(y_test, rf_post.predict_proba(X_test_post)[:, 1])
        auc_xgb_pre   = roc_auc_score(y_test, xgb_pre.predict_proba(X_test_pre)[:, 1])
        auc_xgb_post  = roc_auc_score(y_test, xgb_post.predict_proba(X_test_post)[:, 1])
        auc_ffnn_pre  = roc_auc_score(y_test, ffnn_pre_prob)
        auc_ffnn_post = roc_auc_score(y_test, ffnn_post_prob)

        print(f"\n  ROC-AUC Scores:")
        print(f"  RF Pre-toss:    {auc_rf_pre:.3f}")
        print(f"  RF Post-toss:   {auc_rf_post:.3f}")
        print(f"  XGB Pre-toss:   {auc_xgb_pre:.3f}")
        print(f"  XGB Post-toss:  {auc_xgb_post:.3f}")
        print(f"  FFNN Pre-toss:  {auc_ffnn_pre:.3f}")
        print(f"  FFNN Post-toss: {auc_ffnn_post:.3f}")

        # Add ROC-AUC to comparison JSON
        for entry in comparison["pre_toss"]:
            if entry["model"] == "Random Forest": entry["roc_auc"] = round(auc_rf_pre, 3)
            elif entry["model"] == "XGBoost":     entry["roc_auc"] = round(auc_xgb_pre, 3)
            elif entry["model"] == "FFNN":         entry["roc_auc"] = round(auc_ffnn_pre, 3)
        for entry in comparison["post_toss"]:
            if entry["model"] == "Random Forest": entry["roc_auc"] = round(auc_rf_post, 3)
            elif entry["model"] == "XGBoost":     entry["roc_auc"] = round(auc_xgb_post, 3)
            elif entry["model"] == "FFNN":         entry["roc_auc"] = round(auc_ffnn_post, 3)

        # Re-save with ROC-AUC
        with open("models/model_comparison.json", "w") as f:
            json.dump(comparison, f, indent=2)
        print("  model_comparison.json updated with ROC-AUC.")

    except Exception as e:
        print(f"  ROC-AUC skipped: {e}")

    # ── Save plot paths to JSON for frontend ──────────────────
    plots_manifest = {
        "training_curves": {
            "ffnn_pre":  "models/plots/ffnn_pre_curves.png",
            "ffnn_post": "models/plots/ffnn_post_curves.png",
            "lstm":      "models/plots/lstm_curves.png" if X_lstm_train is not None else None
        },
        "confusion_matrices": {
            "rf_pre":    "models/plots/cm_rf_pre.png",
            "rf_post":   "models/plots/cm_rf_post.png",
            "ffnn_pre":  "models/plots/cm_ffnn_pre.png",
            "ffnn_post": "models/plots/cm_ffnn_post.png",
            "lstm":      "models/plots/cm_lstm.png" if lstm_acc is not None else None
        }
    }
    with open("models/plots/manifest.json", "w") as f:
        json.dump(plots_manifest, f, indent=2)
    print("  models/plots/manifest.json saved.")

    print("\n  All training curves and confusion matrices saved in models/plots/")

else:
    print("  Skipped — matplotlib not available.")

print("\n" + "=" * 60)
print("  PHASE 7 COMPLETE")
print("=" * 60)