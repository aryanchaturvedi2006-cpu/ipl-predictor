"""
train_inn1_sequence.py — Train and serialize 1st-innings sequential match model
==============================================================================
Trained on seasons <= 2023, evaluated on seasons >= 2024.
Features: ['over', 'cum_score', 'cum_wickets', 'crr', 'balls_left', 'last3_runs', 'last3_wickets', 'projected_score']
Target: batting_won (1 if 1st innings batting team wins match, 0 otherwise)
"""

import os
import joblib
import pandas as pd
import numpy as np
from collections import deque
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, log_loss, roc_auc_score

def train_and_save():
    print("Building Inning 1 sequential dataset...")
    matches = pd.read_csv("data/matches.csv").dropna(subset=["winner"]).reset_index(drop=True)
    matches["season"] = matches["season"].astype(str).str[:4].astype(int)
    winner_map = dict(zip(matches["match_id"], matches["winner"]))
    season_map = dict(zip(matches["match_id"], matches["season"]))

    dels = pd.read_csv("data/deliveries.csv")
    dels["is_wicket"] = dels["is_wicket"].fillna(False).astype(bool)

    records = []
    for match_id, grp in dels.groupby("match_id"):
        if match_id not in winner_map:
            continue
        winner = winner_map[match_id]
        season = season_map.get(match_id, 2020)
        inn1 = grp[grp["innings"] == 1]
        if inn1.empty:
            continue
        batting_team = inn1["batting_team"].iloc[0]
        batting_won = 1 if winner == batting_team else 0
        
        cum_score = 0
        cum_wickets = 0
        last3_runs = deque(maxlen=3)
        last3_wkts = deque(maxlen=3)
        max_over = int(inn1["over"].max())
        
        for ov in range(1, max_over + 1):
            ov_balls = inn1[inn1["over"] == ov]
            if ov_balls.empty:
                continue
            r = int(ov_balls["total_runs"].sum())
            w = int(ov_balls["is_wicket"].sum())
            cum_score += r
            cum_wickets += w
            last3_runs.append(r)
            last3_wkts.append(w)
            balls_left = max(0, 120 - ov * 6)
            crr = cum_score / ov
            proj = cum_score + (balls_left / 6.0) * crr
            
            records.append({
                "match_id": match_id,
                "season": season,
                "over": ov,
                "cum_score": cum_score,
                "cum_wickets": cum_wickets,
                "crr": crr,
                "balls_left": balls_left,
                "last3_runs": sum(last3_runs),
                "last3_wickets": sum(last3_wkts),
                "projected_score": proj,
                "target": batting_won
            })

    df = pd.DataFrame(records)
    train_df = df[df["season"] <= 2023]
    test_df = df[df["season"] >= 2024]
    
    features = [
        "over", "cum_score", "cum_wickets", "crr",
        "balls_left", "last3_runs", "last3_wickets", "projected_score"
    ]
    
    X_train, y_train = train_df[features], train_df["target"]
    X_test, y_test = test_df[features], test_df["target"]

    print(f"Training on {len(train_df)} samples (<=2023), testing on {len(test_df)} samples (>=2024)...")
    clf = XGBClassifier(
        n_estimators=150,
        max_depth=4,
        learning_rate=0.05,
        random_state=42,
        eval_metric="logloss"
    )
    clf.fit(X_train, y_train)

    preds = clf.predict(X_test)
    probs = clf.predict_proba(X_test)[:, 1]

    acc = accuracy_score(y_test, preds)
    prec = precision_score(y_test, preds)
    rec = recall_score(y_test, preds)
    f1 = f1_score(y_test, preds)
    ll = log_loss(y_test, probs)
    auc = roc_auc_score(y_test, probs)

    print(f"Inning 1 Test Evaluation:")
    print(f"  Accuracy:  {acc*100:.2f}%")
    print(f"  Precision: {prec:.3f}")
    print(f"  Recall:    {rec:.3f}")
    print(f"  F1-Score:  {f1:.3f}")
    print(f"  Log Loss:  {ll:.3f}")
    print(f"  ROC-AUC:   {auc:.3f}")

    # Serialize model artifact and metadata
    artifact = {
        "model": clf,
        "features": features,
        "metrics": {
            "accuracy": round(acc * 100, 2),
            "precision": round(prec, 3),
            "recall": round(rec, 3),
            "f1": round(f1, 3),
            "log_loss": round(ll, 3),
            "roc_auc": round(auc, 3)
        }
    }
    
    os.makedirs("models", exist_ok=True)
    out_path = "models/inn1_sequence_model.pkl"
    joblib.dump(artifact, out_path)
    print(f"Saved artifact to {out_path}")
    return True

if __name__ == "__main__":
    train_and_save()

