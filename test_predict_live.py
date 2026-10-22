from app import app, load_assets

load_assets()

client = app.test_client()

# Create a dummy 20x7 sequence
valid_seq = [[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7] for _ in range(20)]

# TEST A: Valid Sequence
payload_a = {
    "inning": 2,
    "over": 10.0,
    "current_score": 80,
    "wickets_lost": 2,
    "target": 180,
    "batting_team": "CSK",
    "bowling_team": "MI",
    "sequence_history": valid_seq
}

# TEST B: Missing sequence / fallback
payload_b = {
    "inning": 2,
    "over": 10.0,
    "current_score": 80,
    "wickets_lost": 2,
    "target": 180,
    "batting_team": "CSK",
    "bowling_team": "MI"
}

print("\n--- TEST A: VALID SEQUENCE ---")
resp_a = client.post("/predict_live", json=payload_a)
data_a = resp_a.get_json()
print(f"Model Used: {data_a.get('model_used')}")
print(f"Batting Win Prob: {data_a.get('batting_team_win_probability')}")
print(f"Bowling Win Prob: {data_a.get('bowling_team_win_probability')}")

print("\n--- TEST B: XGBOOST FALLBACK ---")
resp_b = client.post("/predict_live", json=payload_b)
data_b = resp_b.get_json()
print(f"Model Used: {data_b.get('model_used')}")
print(f"Batting Win Prob: {data_b.get('batting_team_win_probability')}")
print(f"Bowling Win Prob: {data_b.get('bowling_team_win_probability')}")
