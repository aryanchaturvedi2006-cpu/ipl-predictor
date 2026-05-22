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
train_df = df[df["season"] <= 2023]
test_df = df[df["season"] >= 2024]

features = ["elo_diff", "form_diff", "venue_diff"]
target = "target"

X_train = train_df[features]
y_train = train_df[target]
X_test = test_df[features]
y_test = test_df[target]

print("Dataset Split Summary:")
print(f"Training matches (2008-2023): {len(train_df)}")
print(f"Testing matches (2024-2025): {len(test_df)}")

# 6. Model Training
# Initialize XGBoost Classifier with tuned regularization settings
# Using simple shallow trees (max_depth=3) and small learning rate to avoid overfitting
model = XGBClassifier(
    n_estimators=100,
    learning_rate=0.03,
    max_depth=3,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=42,
    eval_metric="logloss"
)

model.fit(X_train, y_train)

# 7. Model Evaluation
# Predict target (1 if team1 wins, 0 if team2 wins)
y_train_pred = model.predict(X_train)
y_test_pred = model.predict(X_test)

train_acc = accuracy_score(y_train, y_train_pred)
test_acc = accuracy_score(y_test, y_test_pred)

print(f"\nModel Performance:")
print(f"Training Accuracy: {train_acc * 100:.2f}%")
print(f"Testing Accuracy (2024-2025): {test_acc * 100:.2f}%")

print("\nClassification Report (Test Data):")
print(classification_report(y_test, y_test_pred))

# 8. Serialization
# Ensure models folder exists and save the trained classifier
os.makedirs("models", exist_ok=True)
joblib.dump(model, "models/model.pkl")

# Bundle the team list, encoder, and latest running statistics (Elo, recent form list, venue stats)
# This bundle is required by the API at inference time to compute difference features on the fly
metadata = {
    "team_encoder": team_encoder,
    "all_teams": all_teams,
    "elo": final_states["elo"],
    "recent_form": final_states["recent_form"],
    "venue_stats": final_states["venue_stats"]
}
joblib.dump(metadata, "models/encoders.pkl")

print("\nModel assets successfully serialized and saved to the 'models/' directory.")