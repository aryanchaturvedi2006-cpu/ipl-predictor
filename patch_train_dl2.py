with open("train_dl.py", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update FEATURES_PRE
old_features = """FEATURES_PRE  = ["elo_diff", "form_diff", "venue_diff",
                  "batting_strength_diff", "bowling_strength_diff"]"""
new_features = """FEATURES_PRE  = [
    "elo_diff", "recent_win_rate_diff", "venue_win_rate_diff",
    "batting_strength_diff", "bowling_strength_diff",
    "recent_bat_run_rate_diff", "recent_bowl_wkts_diff",
    "recent_runs_scored_avg_diff", "recent_runs_conceded_avg_diff",
    "season_win_rate_diff"
]
print(f"  Old features: ['elo_diff', 'form_diff', 'venue_diff', 'batting_strength_diff', 'bowling_strength_diff']")
print(f"  New features: {FEATURES_PRE}")
"""
content = content.replace(old_features, new_features)

# 2. Add Verification Test at the end
verification_code = """
# ═══════════════════════════════════════════════════════════
# 8.  Verification Test
# ═══════════════════════════════════════════════════════════
print("\\n[8/8] Inference Feature Verification Test...")
try:
    saved_scaler = joblib.load("models/scaler_pre.pkl")
    print(f"  Scaler n_features_in_: {saved_scaler.n_features_in_}")
    assert saved_scaler.n_features_in_ == len(FEATURES_PRE), f"Mismatch: {saved_scaler.n_features_in_} != {len(FEATURES_PRE)}"
    
    # Test one sample
    sample_df = pd.DataFrame([np.zeros(len(FEATURES_PRE))], columns=FEATURES_PRE)
    X_sample = saved_scaler.transform(sample_df)
    ffnn_pre.predict(X_sample, verbose=0)
    print("  Verification test passed: Feature count matches expectations and predict runs.")
except Exception as e:
    print(f"  Verification test failed: {e}")

print("\\n✅ Training Complete.")
"""

content = content.replace("print(\"\\n✅ Training Complete.\")", verification_code)

with open("train_dl.py", "w", encoding="utf-8") as f:
    f.write(content)
print("train_dl.py patched successfully.")
