"""
train_dl.py — CricIQ Deep Learning Training Pipeline
=====================================================
Models:
  1. FFNN  — pre/post toss match predictor (tabular features)
  2. LSTM  — live in-match predictor (rolling over sequences)
  3. Baselines: Random Forest + XGBoost

Fixes applied vs previous version:
  - toss_won is {-1, 0, 1} in features.py — mirror now clamps to binary
    BEFORE mirroring instead of naively applying 1 - toss_won
  - FFNN architecture right-sized for small tabular data (5-7 features)
  - Phase 7 uses ACTUAL training history — no duplicate training
  - Global SEED at very top
  - LSTM rolling-prefix design preserved exactly
  - No fabricated features
"""

import os
import warnings
import random
warnings.filterwarnings("ignore")
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

import numpy as np
import pandas as pd
import joblib
import json
from collections import deque

# ── SEED — must be before any random/tf imports ───────────
SEED = 42
np.random.seed(SEED)
random.seed(SEED)

import tensorflow as tf
tf.random.set_seed(SEED)

from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (accuracy_score, f1_score,
                              log_loss, roc_auc_score)
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import (Dense, Dropout, LSTM as KerasLSTM,
                                      Input, BatchNormalization, Masking)
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.regularizers import l2

import sys
sys.path.insert(0, ".")
from src.features import clean_team_names, build_features

print("=" * 62)
print("  CricIQ — Deep Learning Training Pipeline")
print("=" * 62)

# ═══════════════════════════════════════════════════════════
# 1.  Load & build features
# ═══════════════════════════════════════════════════════════
print("\n[1/6] Loading and building features...")

df = pd.read_csv("data/matches.csv")
df = df.dropna(subset=["winner"]).reset_index(drop=True)
df = clean_team_names(df)
df, final_states = build_features(df)
df["season"] = df["season"].astype(str).str[:4].astype(int)

FEATURES_PRE  = [
    "elo_diff", "recent_win_rate_diff", "venue_win_rate_diff",
    "batting_strength_diff", "bowling_strength_diff",
    "recent_bat_run_rate_diff", "recent_bowl_wkts_diff",
    "recent_runs_scored_avg_diff", "recent_runs_conceded_avg_diff",
    "season_win_rate_diff"
]
print(f"  Old features: ['elo_diff', 'form_diff', 'venue_diff', 'batting_strength_diff', 'bowling_strength_diff']")
print(f"  New features: {FEATURES_PRE}")

FEATURES_POST = FEATURES_PRE + ["toss_impact", "toss_won"]
TARGET = "target"

# ── Inspect toss_won range ────────────────────────────────
tw_vals = df["toss_won"].unique()
print(f"  toss_won raw values: {sorted(tw_vals)}")
# features.py produces {-1, 0, 1}
# Convert to binary: 1 if team1 won toss, 0 otherwise
df["toss_won"] = (df["toss_won"] == 1).astype(int)
print(f"  toss_won after binarisation: {sorted(df['toss_won'].unique())}")

# ── Data mirroring (leak-free) ────────────────────────────
# Mirror = swap Team1 and Team2 perspective.
# Signed continuous features: negate.
# toss_won: now binary {0,1}, so flip with 1 - x.
# target: flip with 1 - x.
# Mirrored copies of train matches stay in train,
# mirrored copies of test matches stay in test.
df_mirror = df.copy()
for f in FEATURES_PRE:
    df_mirror[f] = -df_mirror[f]
df_mirror["toss_impact"] = -df_mirror["toss_impact"]
df_mirror["toss_won"]    = 1 - df_mirror["toss_won"]   # binary flip
df_mirror[TARGET]        = 1 - df_mirror[TARGET]

# Verify toss_won mirror
assert set(df_mirror["toss_won"].unique()).issubset({0, 1}), \
    "toss_won mirror produced unexpected values!"
print("  toss_won mirror check: PASSED (values {0, 1})")

df_combined = pd.concat([df, df_mirror], ignore_index=True)

train_df = df_combined[df_combined["season"] <= 2023]
test_df  = df_combined[df_combined["season"] >= 2024]

# Leakage check: no season overlap
assert train_df["season"].max() <= 2023
assert test_df["season"].min()  >= 2024
print(f"  Leakage check: PASSED (train <=2023, test >=2024)")

X_train_pre  = train_df[FEATURES_PRE].values
X_test_pre   = test_df[FEATURES_PRE].values
X_train_post = train_df[FEATURES_POST].values
X_test_post  = test_df[FEATURES_POST].values
y_train      = train_df[TARGET].values
y_test       = test_df[TARGET].values

print(f"  Train: {len(train_df)} samples | Test: {len(test_df)} samples")
print(f"  Train target balance: {dict(pd.Series(y_train).value_counts())}")
print(f"  Test  target balance: {dict(pd.Series(y_test).value_counts())}")

os.makedirs("models", exist_ok=True)

# ═══════════════════════════════════════════════════════════
# 2.  Baseline — Random Forest
# ═══════════════════════════════════════════════════════════
print("\n[2/6] Training baseline Random Forest...")

rf_pre = RandomForestClassifier(n_estimators=200, max_depth=4,
                                 min_samples_leaf=10, random_state=SEED)
rf_pre.fit(X_train_pre, y_train)

rf_post = RandomForestClassifier(n_estimators=200, max_depth=4,
                                  min_samples_leaf=10, random_state=SEED)
rf_post.fit(X_train_post, y_train)

rf_pre_acc  = accuracy_score(y_test, rf_pre.predict(X_test_pre))
rf_post_acc = accuracy_score(y_test, rf_post.predict(X_test_post))
rf_pre_f1   = f1_score(y_test, rf_pre.predict(X_test_pre))
rf_post_f1  = f1_score(y_test, rf_post.predict(X_test_post))
rf_pre_ll   = log_loss(y_test, rf_pre.predict_proba(X_test_pre))
rf_post_ll  = log_loss(y_test, rf_post.predict_proba(X_test_post))
rf_pre_auc  = roc_auc_score(y_test, rf_pre.predict_proba(X_test_pre)[:,1])
rf_post_auc = roc_auc_score(y_test, rf_post.predict_proba(X_test_post)[:,1])

print(f"  RF Pre-toss  — Acc:{rf_pre_acc*100:6.2f}%  F1:{rf_pre_f1:.3f}  LL:{rf_pre_ll:.3f}  AUC:{rf_pre_auc:.3f}")
print(f"  RF Post-toss — Acc:{rf_post_acc*100:6.2f}%  F1:{rf_post_f1:.3f}  LL:{rf_post_ll:.3f}  AUC:{rf_post_auc:.3f}")

# ═══════════════════════════════════════════════════════════
# 3.  Baseline — XGBoost
# ═══════════════════════════════════════════════════════════
print("\n[3/6] Training baseline XGBoost...")

xgb_pre = XGBClassifier(n_estimators=200, max_depth=3, learning_rate=0.05,
                         eval_metric="logloss", random_state=SEED, verbosity=0)
xgb_pre.fit(X_train_pre, y_train)

xgb_post = XGBClassifier(n_estimators=200, max_depth=3, learning_rate=0.05,
                          eval_metric="logloss", random_state=SEED, verbosity=0)
xgb_post.fit(X_train_post, y_train)

xgb_pre_acc  = accuracy_score(y_test, xgb_pre.predict(X_test_pre))
xgb_post_acc = accuracy_score(y_test, xgb_post.predict(X_test_post))
xgb_pre_f1   = f1_score(y_test, xgb_pre.predict(X_test_pre))
xgb_post_f1  = f1_score(y_test, xgb_post.predict(X_test_post))
xgb_pre_ll   = log_loss(y_test, xgb_pre.predict_proba(X_test_pre))
xgb_post_ll  = log_loss(y_test, xgb_post.predict_proba(X_test_post))
xgb_pre_auc  = roc_auc_score(y_test, xgb_pre.predict_proba(X_test_pre)[:,1])
xgb_post_auc = roc_auc_score(y_test, xgb_post.predict_proba(X_test_post)[:,1])

print(f"  XGB Pre-toss  — Acc:{xgb_pre_acc*100:6.2f}%  F1:{xgb_pre_f1:.3f}  LL:{xgb_pre_ll:.3f}  AUC:{xgb_pre_auc:.3f}")
print(f"  XGB Post-toss — Acc:{xgb_post_acc*100:6.2f}%  F1:{xgb_post_f1:.3f}  LL:{xgb_post_ll:.3f}  AUC:{xgb_post_auc:.3f}")

# ═══════════════════════════════════════════════════════════
# 4.  FFNN — right-sized for 5-7 tabular features
# ═══════════════════════════════════════════════════════════
print("\n[4/6] Training FFNN (Feed Forward Neural Network)...")
print("  Note: FFNN architecture right-sized for small tabular data.")
print("  Features available:", FEATURES_PRE)

# ── Scale features ────────────────────────────────────────
scaler_pre  = StandardScaler()
scaler_post = StandardScaler()

X_train_pre_sc  = scaler_pre.fit_transform(X_train_pre)
X_test_pre_sc   = scaler_pre.transform(X_test_pre)
X_train_post_sc = scaler_post.fit_transform(X_train_post)
X_test_post_sc  = scaler_post.transform(X_test_post)

def build_ffnn(input_dim, name="ffnn"):
    """
    Right-sized FFNN for small tabular data (5-7 features, ~2000 samples).
    Smaller than previous version — avoids overfitting on limited data.
    Architecture: Input → 64 → 32 → 16 → Output(sigmoid)
    L2 regularization added; BatchNorm removed (harmful for very small tabular).
    """
    reg = l2(1e-4)
    model = Sequential(name=name)
    model.add(Input(shape=(input_dim,)))

    model.add(Dense(64, activation="relu", kernel_regularizer=reg))
    model.add(Dropout(0.3))

    model.add(Dense(32, activation="relu", kernel_regularizer=reg))
    model.add(Dropout(0.2))

    model.add(Dense(16, activation="relu", kernel_regularizer=reg))
    model.add(Dropout(0.1))

    model.add(Dense(1, activation="sigmoid"))

    model.compile(
        optimizer=Adam(learning_rate=0.001),
        loss="binary_crossentropy",
        metrics=["accuracy"]
    )
    return model

ffnn_callbacks = [
    EarlyStopping(monitor="val_loss", patience=20,
                  restore_best_weights=True, verbose=0),
    ReduceLROnPlateau(monitor="val_loss", factor=0.5,
                      patience=8, min_lr=1e-6, verbose=0)
]

# ── Pre-toss FFNN ─────────────────────────────────────────
ffnn_pre = build_ffnn(len(FEATURES_PRE), name="ffnn_pre")
hist_pre = ffnn_pre.fit(
    X_train_pre_sc, y_train,
    validation_split=0.15,
    epochs=200, batch_size=32,
    callbacks=ffnn_callbacks, verbose=0
)

# ── Post-toss FFNN ────────────────────────────────────────
ffnn_post = build_ffnn(len(FEATURES_POST), name="ffnn_post")
hist_post = ffnn_post.fit(
    X_train_post_sc, y_train,
    validation_split=0.15,
    epochs=200, batch_size=32,
    callbacks=ffnn_callbacks, verbose=0
)

ffnn_pre_prob  = ffnn_pre.predict(X_test_pre_sc,   verbose=0).flatten()
ffnn_post_prob = ffnn_post.predict(X_test_post_sc,  verbose=0).flatten()

ffnn_pre_pred  = (ffnn_pre_prob  > 0.5).astype(int)
ffnn_post_pred = (ffnn_post_prob > 0.5).astype(int)

ffnn_pre_acc  = accuracy_score(y_test, ffnn_pre_pred)
ffnn_post_acc = accuracy_score(y_test, ffnn_post_pred)
ffnn_pre_f1   = f1_score(y_test, ffnn_pre_pred)
ffnn_post_f1  = f1_score(y_test, ffnn_post_pred)
ffnn_pre_ll   = log_loss(y_test, ffnn_pre_prob)
ffnn_post_ll  = log_loss(y_test, ffnn_post_prob)
ffnn_pre_auc  = roc_auc_score(y_test, ffnn_pre_prob)
ffnn_post_auc = roc_auc_score(y_test, ffnn_post_prob)

print(f"  FFNN Pre-toss  — Acc:{ffnn_pre_acc*100:6.2f}%  F1:{ffnn_pre_f1:.3f}  LL:{ffnn_pre_ll:.3f}  AUC:{ffnn_pre_auc:.3f}")
print(f"  FFNN Post-toss — Acc:{ffnn_post_acc*100:6.2f}%  F1:{ffnn_post_f1:.3f}  LL:{ffnn_post_ll:.3f}  AUC:{ffnn_post_auc:.3f}")

# ── Symmetry check ────────────────────────────────────────
print("\n  FFNN Symmetry check (P(x) + P(mirror_x) ~= 1):")
# Use first 10 test samples
sym_ok = True
for i in range(min(10, len(X_test_pre_sc))):
    x     = X_test_pre_sc[i:i+1]
    x_mir = -x   # signed features only (pre-toss has no binary toss_won)
    p     = float(ffnn_pre.predict(x,     verbose=0)[0][0])
    p_mir = float(ffnn_pre.predict(x_mir, verbose=0)[0][0])
    total = p + p_mir
    ok    = abs(total - 1.0) < 0.05
    if not ok:
        sym_ok = False
    print(f"    Sample {i}: P={p:.4f}  P_mirror={p_mir:.4f}  Sum={total:.4f}  {'OK' if ok else 'WARN'}")
print(f"  Symmetry: {'PASSED (within 5%)' if sym_ok else 'NOTE: gap >5% — see methodology note'}")
print("  Note: Mirrored training encourages but does NOT mathematically guarantee")
print("        exact symmetry. At inference: team2_prob = 1 - team1_prob (binary).")

# ── Save FFNN ─────────────────────────────────────────────
ffnn_pre.save("models/ffnn_pre.keras")
ffnn_post.save("models/ffnn_post.keras")
joblib.dump(scaler_pre,  "models/scaler_pre.pkl")
joblib.dump(scaler_post, "models/scaler_post.pkl")

# Save inference metadata (encoders.pkl) to keep app.py synchronized
final_states["all_teams"] = list(final_states["team_perf"].keys())
joblib.dump(final_states, "models/encoders.pkl")

print("\n  FFNN models, scalers, and inference metadata saved.")

# ═══════════════════════════════════════════════════════════
# 5.  LSTM — rolling-prefix live predictor (preserved)
# ═══════════════════════════════════════════════════════════
print("\n[5/6] Building LSTM sequences from ball-by-ball data...")

DELS_PATH     = "data/deliveries.csv"
LSTM_FEATURES = ["score", "wickets", "current_rr",
                  "required_rr", "balls_left",
                  "last3_runs", "last3_wickets"]
SEQ_LEN = 20

hist_lstm  = None
lstm_acc   = lstm_f1 = lstm_ll = None
lstm_pred  = None

def build_lstm_sequences():
    if not os.path.exists(DELS_PATH):
        print("  deliveries.csv not found — skipping LSTM.")
        return None, None, None, None, None

    from src.features import TEAM_MAPPING
    from tensorflow.keras.preprocessing.sequence import pad_sequences

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

    sequences, labels, seasons, over_nums = [], [], [], []

    for match_id, grp in dels.groupby("match_id"):
        if match_id not in winner_map:
            continue

        winner = winner_map[match_id]
        season = season_map.get(match_id, 2020)

        innings2 = grp[grp["innings"] == 2]
        if innings2.empty:
            continue

        batting_team = innings2["batting_team"].iloc[0]
        batting_won  = 1 if winner == batting_team else 0

        innings1 = grp[grp["innings"] == 1]
        target   = innings1["total_runs"].sum() + 1
        if target < 50:
            continue

        seq_so_far         = []
        cumulative_score   = 0
        cumulative_wickets = 0
        last3_runs         = deque(maxlen=3)
        last3_wickets      = deque(maxlen=3)

        max_over = int(innings2["over"].max())

        for over_num in range(1, max_over + 1):
            over_balls = innings2[innings2["over"] == over_num]
            if over_balls.empty:
                continue

            over_runs          = over_balls["total_runs"].sum()
            over_wkts          = over_balls["is_wicket"].sum()
            cumulative_score   += over_runs
            cumulative_wickets += over_wkts
            last3_runs.append(over_runs)
            last3_wickets.append(over_wkts)

            balls_left  = max(0, 120 - (over_num * 6))
            runs_needed = max(0, target - cumulative_score)
            current_rr  = cumulative_score / over_num
            required_rr = (runs_needed / (balls_left / 6)) if balls_left > 0 else 99.0

            step = [
                cumulative_score   / 300.0,
                cumulative_wickets / 10.0,
                min(current_rr,  20.0) / 20.0,
                min(required_rr, 30.0) / 30.0,
                balls_left         / 120.0,
                sum(last3_runs)    / 60.0,
                sum(last3_wickets) / 3.0
            ]

            seq_so_far.append(step)
            sequences.append(list(seq_so_far))
            labels.append(batting_won)
            seasons.append(season)
            over_nums.append(over_num)

    if not sequences:
        return None, None, None, None, None

    X = pad_sequences(sequences, maxlen=SEQ_LEN, dtype="float32",
                      padding="pre", value=0.0)
    y = np.array(labels,    dtype=np.float32)
    s = np.array(seasons)
    o = np.array(over_nums)

    train_mask = s <= 2023
    test_mask  = s >= 2024

    assert np.all(s[train_mask] <= 2023)
    assert np.all(s[test_mask]  >= 2024)
    print("  LSTM leakage check: PASSED")

    return X[train_mask], X[test_mask], y[train_mask], y[test_mask], o[test_mask]


X_lstm_train, X_lstm_test, y_lstm_train, y_lstm_test, over_nums_test = \
    build_lstm_sequences()

if X_lstm_train is not None:
    print(f"  Train sequences: {len(X_lstm_train)}")
    print(f"  Test  sequences: {len(X_lstm_test)}")

    def build_lstm_model():
        model = Sequential(name="lstm_live")
        model.add(Input(shape=(SEQ_LEN, len(LSTM_FEATURES))))
        model.add(Masking(mask_value=0.0))
        model.add(KerasLSTM(64, return_sequences=True))
        model.add(Dropout(0.3))
        model.add(KerasLSTM(32, return_sequences=False))
        model.add(Dropout(0.2))
        model.add(Dense(16, activation="relu"))
        model.add(Dense(1,  activation="sigmoid"))
        model.compile(optimizer=Adam(learning_rate=0.001),
                      loss="binary_crossentropy", metrics=["accuracy"])
        return model

    lstm_model = build_lstm_model()
    lstm_cb = [
        EarlyStopping(monitor="val_loss", patience=20,
                      restore_best_weights=True, verbose=0),
        ReduceLROnPlateau(monitor="val_loss", factor=0.5,
                          patience=8, min_lr=1e-5, verbose=0)
    ]

    print("  Training LSTM (rolling-prefix sequences)...")
    hist_lstm = lstm_model.fit(
        X_lstm_train, y_lstm_train,
        validation_split=0.15,
        epochs=200, batch_size=64,
        callbacks=lstm_cb, verbose=0
    )

    lstm_prob = lstm_model.predict(X_lstm_test, verbose=0).flatten()
    lstm_pred = (lstm_prob > 0.5).astype(int)

    lstm_acc = accuracy_score(y_lstm_test, lstm_pred)
    lstm_f1  = f1_score(y_lstm_test, lstm_pred)
    lstm_ll  = log_loss(y_lstm_test, lstm_prob)

    chk_acc = {}
    for ov in [5, 10, 15, 20]:
        mask = (over_nums_test == ov)
        chk_acc[ov] = accuracy_score(y_lstm_test[mask], lstm_pred[mask]) \
                      if np.sum(mask) > 0 else 0.0

    print(f"\n  LSTM Overall — Acc:{lstm_acc*100:6.2f}%  F1:{lstm_f1:.3f}  LL:{lstm_ll:.3f}")
    for ov in [5, 10, 15, 20]:
        print(f"  Over {ov:2d} accuracy: {chk_acc[ov]*100:.2f}%")

    lstm_model.save("models/lstm_live.keras")
    print("  LSTM model saved.")

    lstm_metadata = {
        "model_type":        "LSTM_Rolling_Prefix",
        "sequence_length":   SEQ_LEN,
        "feature_names":     LSTM_FEATURES,
        "training_seasons":  "<= 2023",
        "test_seasons":      ">= 2024",
        "methodology":       "Rolling prefix — no future-over leakage",
        "random_seed":       SEED,
        "overall_metrics": {
            "accuracy":  float(lstm_acc),
            "f1":        float(lstm_f1),
            "log_loss":  float(lstm_ll)
        },
        "checkpoint_accuracy": {str(k): float(v) for k, v in chk_acc.items()}
    }
    with open("models/lstm_metadata.json", "w") as f:
        json.dump(lstm_metadata, f, indent=2)
else:
    print("  LSTM skipped — deliveries.csv missing.")

# ═══════════════════════════════════════════════════════════
# 6.  Model comparison JSON
# ═══════════════════════════════════════════════════════════
print("\n[6/6] Saving model comparison results...")

comparison = {
    "pre_toss": [
        {"model": "Random Forest", "type": "ML Baseline",
         "accuracy": round(rf_pre_acc*100,2),  "f1": round(rf_pre_f1,3),
         "log_loss": round(rf_pre_ll,3),        "roc_auc": round(rf_pre_auc,3)},
        {"model": "XGBoost",       "type": "ML Baseline",
         "accuracy": round(xgb_pre_acc*100,2), "f1": round(xgb_pre_f1,3),
         "log_loss": round(xgb_pre_ll,3),       "roc_auc": round(xgb_pre_auc,3)},
        {"model": "FFNN",          "type": "Deep Learning",
         "accuracy": round(ffnn_pre_acc*100,2),"f1": round(ffnn_pre_f1,3),
         "log_loss": round(ffnn_pre_ll,3),      "roc_auc": round(ffnn_pre_auc,3)},
    ],
    "post_toss": [
        {"model": "Random Forest", "type": "ML Baseline",
         "accuracy": round(rf_post_acc*100,2),  "f1": round(rf_post_f1,3),
         "log_loss": round(rf_post_ll,3),        "roc_auc": round(rf_post_auc,3)},
        {"model": "XGBoost",       "type": "ML Baseline",
         "accuracy": round(xgb_post_acc*100,2), "f1": round(xgb_post_f1,3),
         "log_loss": round(xgb_post_ll,3),       "roc_auc": round(xgb_post_auc,3)},
        {"model": "FFNN",          "type": "Deep Learning",
         "accuracy": round(ffnn_post_acc*100,2),"f1": round(ffnn_post_f1,3),
         "log_loss": round(ffnn_post_ll,3),      "roc_auc": round(ffnn_post_auc,3)},
    ],
}

if lstm_acc is not None:
    comparison["live_match"] = [
        {"model": "LSTM", "type": "Deep Learning",
         "accuracy": round(lstm_acc*100,2), "f1": round(lstm_f1,3),
         "log_loss": round(lstm_ll,3)}
    ]

with open("models/model_comparison.json", "w") as f:
    json.dump(comparison, f, indent=2)
print("  model_comparison.json saved.")

# ═══════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════
print("\n" + "=" * 62)
print("  FINAL MODEL COMPARISON")
print("=" * 62)
print(f"\n  {'Model':<22} {'Stage':<12} {'Acc':>8} {'F1':>7} {'LL':>8} {'AUC':>7}")
print("  " + "-" * 65)
print(f"  {'Random Forest':<22} {'Pre-toss':<12} {rf_pre_acc*100:>7.2f}% {rf_pre_f1:>7.3f} {rf_pre_ll:>8.3f} {rf_pre_auc:>7.3f}")
print(f"  {'Random Forest':<22} {'Post-toss':<12} {rf_post_acc*100:>7.2f}% {rf_post_f1:>7.3f} {rf_post_ll:>8.3f} {rf_post_auc:>7.3f}")
print(f"  {'XGBoost':<22} {'Pre-toss':<12} {xgb_pre_acc*100:>7.2f}% {xgb_pre_f1:>7.3f} {xgb_pre_ll:>8.3f} {xgb_pre_auc:>7.3f}")
print(f"  {'XGBoost':<22} {'Post-toss':<12} {xgb_post_acc*100:>7.2f}% {xgb_post_f1:>7.3f} {xgb_post_ll:>8.3f} {xgb_post_auc:>7.3f}")
print(f"  {'FFNN (DL)':<22} {'Pre-toss':<12} {ffnn_pre_acc*100:>7.2f}% {ffnn_pre_f1:>7.3f} {ffnn_pre_ll:>8.3f} {ffnn_pre_auc:>7.3f}")
print(f"  {'FFNN (DL)':<22} {'Post-toss':<12} {ffnn_post_acc*100:>7.2f}% {ffnn_post_f1:>7.3f} {ffnn_post_ll:>8.3f} {ffnn_post_auc:>7.3f}")
if lstm_acc:
    print(f"  {'LSTM (DL)':<22} {'Live Match':<12} {lstm_acc*100:>7.2f}% {lstm_f1:>7.3f} {lstm_ll:>8.3f} {'N/A':>7}")
print("=" * 62)
print("\n  Note: LSTM ~80% accuracy is for LIVE in-match sequence")
print("  prediction — a different task from pre-match (~50%).")
print("  Pre-match ~50% reflects cricket's genuine unpredictability.")

# ═══════════════════════════════════════════════════════════
# PHASE 7 — Training Curves + Confusion Matrix
# Uses ACTUAL hist_pre / hist_post / hist_lstm — NO retraining
# ═══════════════════════════════════════════════════════════
print("\n[PHASE 7] Generating training curves and confusion matrices...")
print("  Using actual training histories — no duplicate training.")

try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from sklearn.metrics import confusion_matrix, ConfusionMatrixDisplay
    PLOTS_AVAILABLE = True
except ImportError:
    PLOTS_AVAILABLE = False
    print("  matplotlib not found — pip install matplotlib")

os.makedirs("models/plots", exist_ok=True)

if PLOTS_AVAILABLE:

    def save_curves(history, title, filename):
        """Save training/validation accuracy and loss curves."""
        fig, axes = plt.subplots(1, 2, figsize=(12, 4))
        fig.suptitle(title, fontsize=14, fontweight="bold")
        axes[0].plot(history.history["accuracy"],     color="#f97316", label="Train")
        axes[0].plot(history.history["val_accuracy"], color="#818cf8", label="Val")
        axes[0].set_title("Accuracy per Epoch")
        axes[0].set_xlabel("Epoch"); axes[0].set_ylabel("Accuracy")
        axes[0].legend(); axes[0].grid(True, alpha=0.3)
        axes[1].plot(history.history["loss"],     color="#f97316", label="Train")
        axes[1].plot(history.history["val_loss"], color="#818cf8", label="Val")
        axes[1].set_title("Loss per Epoch")
        axes[1].set_xlabel("Epoch"); axes[1].set_ylabel("Binary Cross-Entropy")
        axes[1].legend(); axes[1].grid(True, alpha=0.3)
        plt.tight_layout()
        plt.savefig(f"models/plots/{filename}", dpi=150, bbox_inches="tight")
        plt.close()
        print(f"  Saved: models/plots/{filename}")

    # Use actual histories captured during training above
    save_curves(hist_pre,  "FFNN Pre-Toss — Training Curves  (actual run)", "ffnn_pre_curves.png")
    save_curves(hist_post, "FFNN Post-Toss — Training Curves (actual run)", "ffnn_post_curves.png")
    if hist_lstm is not None:
        save_curves(hist_lstm, "LSTM Live Match — Training Curves (actual run)", "lstm_curves.png")

    def save_cm(y_true, y_pred, title, filename):
        cm  = confusion_matrix(y_true, y_pred)
        cmd = ConfusionMatrixDisplay(cm, display_labels=["Team2 Wins", "Team1 Wins"])
        fig, ax = plt.subplots(figsize=(5, 4))
        cmd.plot(ax=ax, colorbar=False, cmap="Blues")
        ax.set_title(title, fontweight="bold")
        plt.tight_layout()
        plt.savefig(f"models/plots/{filename}", dpi=150, bbox_inches="tight")
        plt.close()
        print(f"  Saved: models/plots/{filename}")

    save_cm(y_test, rf_pre.predict(X_test_pre),   "RF Pre-Toss",    "cm_rf_pre.png")
    save_cm(y_test, rf_post.predict(X_test_post),  "RF Post-Toss",   "cm_rf_post.png")
    save_cm(y_test, ffnn_pre_pred,                  "FFNN Pre-Toss",  "cm_ffnn_pre.png")
    save_cm(y_test, ffnn_post_pred,                 "FFNN Post-Toss", "cm_ffnn_post.png")
    if lstm_acc is not None and lstm_pred is not None:
        save_cm(y_lstm_test, lstm_pred, "LSTM Live Match", "cm_lstm.png")

    manifest = {
        "training_curves": {
            "ffnn_pre":  "models/plots/ffnn_pre_curves.png",
            "ffnn_post": "models/plots/ffnn_post_curves.png",
            "lstm":      "models/plots/lstm_curves.png" if hist_lstm else None
        },
        "confusion_matrices": {
            "rf_pre":    "models/plots/cm_rf_pre.png",
            "rf_post":   "models/plots/cm_rf_post.png",
            "ffnn_pre":  "models/plots/cm_ffnn_pre.png",
            "ffnn_post": "models/plots/cm_ffnn_post.png",
            "lstm":      "models/plots/cm_lstm.png" if lstm_acc else None
        }
    }
    with open("models/plots/manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)
    print("  models/plots/manifest.json saved.")

else:
    print("  Skipped — matplotlib not available.")

print("\n" + "=" * 62)
print("  PHASE 7 COMPLETE — curves from actual training runs")
print("=" * 62)

print("\n  Saved files:")
for fn in ["models/ffnn_pre.keras", "models/ffnn_post.keras",
           "models/scaler_pre.pkl", "models/scaler_post.pkl",
           "models/lstm_live.keras", "models/lstm_metadata.json",
           "models/model_comparison.json"]:
    status = "✓" if os.path.exists(fn) else "✗ MISSING"
    print(f"    {status}  {fn}")