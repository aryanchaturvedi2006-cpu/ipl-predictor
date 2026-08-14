import pandas as pd
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report
from xgboost import XGBClassifier
import joblib
import os

# Import the modular feature engineering and cleaning functions
from src.features import clean_team_names, build_features

# 1. Load Dataset
# The raw dataset contains all match records from 2008 to 2025
df = pd.read_csv("data/matches.csv")

# 2. Preprocessing
# Remove matches with no winner (abandoned, no result matches)
# Since we are predicting the winner, these rows lack target outcomes
df = df.dropna(subset=["winner"]).reset_index(drop=True)

# Standardize historical and alternate team names to keep data consistent with data.js
df = clean_team_names(df)

# 3. Chronological Feature Engineering
# Compute pre-match Elo rating difference, recent form difference, and venue win pct difference
df, final_states = build_features(df)

# 4. Global Label Encoder
# Create and fit a label encoder on all unique cleaned team names
# This serves to standardize the team list and mappings for future scalability
all_teams = sorted(list(set(df["team1"].dropna().unique()) | set(df["team2"].dropna().unique())))
team_encoder = LabelEncoder()
team_encoder.fit(all_teams)

# 5. Chronological Train-Test Split
# We train on historical seasons (2008-2023) and validate on future seasons (2024-2025)
# This mimics actual deployment scenario and prevents data leakage
df["season"] = df["season"].astype(str).str[:4].astype(int)
train_df = df[df["season"] <= 2023]
test_df = df[df["season"] >= 2024]

features_pre = ["elo_diff", "form_diff", "venue_diff", "batting_strength_diff", "bowling_strength_diff"]
features_post = features_pre + ["toss_impact", "toss_won"]
target = "target"

# Double-stacking (Data Mirroring) to ensure symmetry and prevent team1 positional bias
df_mirrored = df.copy()
for f in features_post:
    df_mirrored[f] = -df_mirrored[f]
df_mirrored[target] = 1 - df_mirrored[target]
df_combined = pd.concat([df, df_mirrored], ignore_index=True)

train_df = df_combined[df_combined["season"] <= 2023]
test_df = df_combined[df_combined["season"] >= 2024]

y_train = train_df[target]
y_test = test_df[target]

print("Dataset Split Summary:")
print(f"Training matches (2008-2023): {len(train_df)}")
print(f"Testing matches (2024-2025): {len(test_df)}")

from sklearn.ensemble import RandomForestClassifier
import os

os.makedirs("models", exist_ok=True)

# ----------------- PRE-TOSS MODEL -----------------
X_train_pre = train_df[features_pre]
X_test_pre = test_df[features_pre]

model_pre = RandomForestClassifier(
    n_estimators=200, 
    max_depth=4, 
    min_samples_leaf=10,
    random_state=42
)
model_pre.fit(X_train_pre, y_train)

y_train_pred_pre = model_pre.predict(X_train_pre)
y_test_pred_pre = model_pre.predict(X_test_pre)

print("\n--- Pre-Toss Model Performance ---")
print(f"Training Accuracy: {accuracy_score(y_train, y_train_pred_pre) * 100:.2f}%")
print(f"Testing Accuracy: {accuracy_score(y_test, y_test_pred_pre) * 100:.2f}%")
joblib.dump(model_pre, "models/model_pre.pkl")


# ----------------- POST-TOSS MODEL -----------------
X_train_post = train_df[features_post]
X_test_post = test_df[features_post]

model_post = RandomForestClassifier(
    n_estimators=200, 
    max_depth=4, 
    min_samples_leaf=10,
    random_state=42
)
model_post.fit(X_train_post, y_train)

y_train_pred_post = model_post.predict(X_train_post)
y_test_pred_post = model_post.predict(X_test_post)

print("\n--- Post-Toss Model Performance ---")
print(f"Training Accuracy: {accuracy_score(y_train, y_train_pred_post) * 100:.2f}%")
print(f"Testing Accuracy: {accuracy_score(y_test, y_test_pred_post) * 100:.2f}%")
joblib.dump(model_post, "models/model_post.pkl")

# Bundle the team list, encoder, and latest running statistics (Elo, recent form list, venue stats)
# This bundle is required by the API at inference time to compute difference features on the fly
metadata = {
    "team_encoder": team_encoder,
    "all_teams": all_teams,
    "elo": final_states["elo"],
    "recent_form": final_states["recent_form"],
    "venue_stats": final_states["venue_stats"],
    "venue_overall": final_states.get("venue_overall", {}),
    "h2h_stats": final_states.get("h2h_stats", {}),
    "team_perf": final_states.get("team_perf", {})
}
joblib.dump(metadata, "models/encoders.pkl")

print("\nModel assets successfully serialized and saved to the 'models/' directory.")