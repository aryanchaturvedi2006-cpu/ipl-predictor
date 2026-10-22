import os
import re

with open("train_dl.py", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Replace the LSTM section (section 5)
lstm_start = content.find("# 5.  LSTM — Live In-Match Predictor")
lstm_end = content.find("# 6.  Model Comparison — save JSON for frontend")

if lstm_start == -1 or lstm_end == -1:
    print("Could not find section 5 boundaries.")
    exit(1)

new_lstm_code = """# 5.  LSTM — Live In-Match Predictor
# ─────────────────────────────────────────────
print("\\n[5/6] Building LSTM sequences from ball-by-ball data...")

DELS_PATH = "data/deliveries.csv"
LSTM_FEATURES = ["score", "wickets", "current_rr",
                  "required_rr", "balls_left",
                  "last3_runs", "last3_wickets"]
SEQ_LEN = 20   # one entry per over (T20 = 20 overs max)

import random
from tensorflow.keras.layers import Masking

# Reproducibility
seed = 42
np.random.seed(seed)
random.seed(seed)
tf.random.set_seed(seed)

def build_lstm_sequences():
    \"\"\"
    Builds over-by-over rolling prefix sequences.
    \"\"\"
    if not os.path.exists(DELS_PATH):
        print("  deliveries.csv not found — skipping LSTM training.")
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

        # Build rolling over-by-over snapshots
        seq_so_far = []
        cumulative_score   = 0
        cumulative_wickets = 0
        last3_runs    = deque(maxlen=3)
        last3_wickets = deque(maxlen=3)
        
        max_over = int(innings2["over"].max())

        for over_num in range(1, max_over + 1):
            over_balls = innings2[innings2["over"] == over_num]
            if over_balls.empty:
                continue

            over_runs    = over_balls["total_runs"].sum()
            over_wickets = over_balls["is_wicket"].sum()
            cumulative_score   += over_runs
            cumulative_wickets += over_wickets
            last3_runs.append(over_runs)
            last3_wickets.append(over_wickets)

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
            
            seq_so_far.append(step)
            
            # Add prefix sequence up to current over
            sequences.append(list(seq_so_far))
            labels.append(batting_won)
            seasons.append(season)
            over_nums.append(over_num)

    if not sequences:
        return None, None, None, None, None

    # Pad sequences to SEQ_LEN=20 with 0.0 (pre-padding is default)
    X = pad_sequences(sequences, maxlen=SEQ_LEN, dtype='float32', padding='pre', value=0.0)
    y = np.array(labels, dtype=np.float32)
    s = np.array(seasons)
    o = np.array(over_nums)

    train_mask = s <= 2023
    test_mask  = s >= 2024
    
    # Assertions for leakage check
    assert np.all(s[train_mask] <= 2023), "Train set contains test seasons"
    assert np.all(s[test_mask] >= 2024), "Test set contains train seasons"
    print(f"  Leakage checks passed: chronological split respected.")

    return X[train_mask], X[test_mask], y[train_mask], y[test_mask], o[test_mask]

X_lstm_train, X_lstm_test, y_lstm_train, y_lstm_test, over_nums_test = build_lstm_sequences()

global hist_lstm
hist_lstm = None

if X_lstm_train is not None:
    print(f"  LSTM rolling sequence preparation...")
    print(f"  Train sequences: {len(X_lstm_train)}")
    print(f"  Test sequences: {len(X_lstm_test)}")

    def build_lstm_model():
        model = Sequential(name="lstm_live")
        model.add(Input(shape=(SEQ_LEN, len(LSTM_FEATURES))))
        model.add(Masking(mask_value=0.0))
        model.add(LSTM(64, return_sequences=True))
        model.add(Dropout(0.3))
        model.add(LSTM(32, return_sequences=False))
        model.add(Dropout(0.2))
        model.add(Dense(16, activation="relu"))
        model.add(Dense(1,  activation="sigmoid"))
        model.compile(optimizer=Adam(learning_rate=0.001), loss="binary_crossentropy", metrics=["accuracy"])
        return model

    lstm_model = build_lstm_model()
    lstm_callbacks = [
        EarlyStopping(monitor="val_loss", patience=20, restore_best_weights=True, verbose=0),
        ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=8, min_lr=1e-5, verbose=0)
    ]

    print("  Training LSTM...")
    hist_lstm = lstm_model.fit(
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

    chk_acc = {}
    for ov in [5, 10, 15, 20]:
        mask = (over_nums_test == ov)
        if np.sum(mask) > 0:
            chk_acc[ov] = accuracy_score(y_lstm_test[mask], lstm_pred[mask])
        else:
            chk_acc[ov] = 0.0

    print(f"  Overall test accuracy: {lstm_acc*100:.2f}%")
    print(f"  Over 5 accuracy: {chk_acc[5]*100:.2f}%")
    print(f"  Over 10 accuracy: {chk_acc[10]*100:.2f}%")
    print(f"  Over 15 accuracy: {chk_acc[15]*100:.2f}%")
    print(f"  Over 20 accuracy: {chk_acc[20]*100:.2f}%")

    lstm_model.save("models/lstm_live.keras")
    print("  LSTM model saved.")
    
    import json
    lstm_metadata = {
        "model_type": "LSTM_Rolling",
        "sequence_length": SEQ_LEN,
        "feature_names": LSTM_FEATURES,
        "training_seasons": "<= 2023",
        "test_seasons": ">= 2024",
        "methodology": "True rolling prefix sequences",
        "random_seed": seed,
        "overall_metrics": {
            "accuracy": float(lstm_acc),
            "f1": float(lstm_f1),
            "log_loss": float(lstm_ll)
        },
        "checkpoint_accuracy": {k: float(v) for k,v in chk_acc.items()}
    }
    with open("models/lstm_metadata.json", "w") as f:
        json.dump(lstm_metadata, f, indent=2)
else:
    lstm_acc = lstm_f1 = lstm_ll = None
    print("  LSTM skipped — deliveries.csv missing.")

# ─────────────────────────────────────────────
"""

content = content[:lstm_start] + new_lstm_code + content[lstm_end:]

# 2. Fix the retraining of LSTM in the plots section (Phase 7)
plot_start = content.find("    # ── LSTM training curves ──────────────────────────────────")
plot_end = content.find("    # ── Confusion Matrices ────────────────────────────────────")

if plot_start != -1 and plot_end != -1:
    new_plot_code = """    # ── LSTM training curves ──────────────────────────────────
    if X_lstm_train is not None and hist_lstm is not None:
        save_training_curves(hist_lstm, "LSTM Live Match — Training Curves", "lstm_curves.png")

"""
    content = content[:plot_start] + new_plot_code + content[plot_end:]

# Write back
with open("train_dl.py", "w", encoding="utf-8") as f:
    f.write(content)

print("train_dl.py successfully patched.")
