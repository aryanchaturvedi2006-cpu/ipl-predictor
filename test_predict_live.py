import sys
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

# Assert baseline tests pass
assert resp_a.status_code == 200, f"TEST A failed with status {resp_a.status_code}"
assert resp_b.status_code == 200, f"TEST B failed with status {resp_b.status_code}"

# ============================================================
# REGRESSION TESTS: TARGET PARAMETER HANDLING (ISSUE 1 & FIX 1)
# ============================================================
print("\n" + "=" * 60)
print("  REGRESSION SUITE: TARGET PARAMETER SAFETY (/predict_live)")
print("=" * 60)

target_tests = [
    # Preserved 13 baseline test cases
    ("Inning 1 - Missing target", 1, "OMIT", 200, None),
    ("Inning 1 - Explicit null target", 1, None, 200, None),
    ("Inning 1 - Valid integer target", 1, 180, 200, 180),
    ("Inning 1 - Invalid string target", 1, "invalid_abc", 400, None),
    ("Inning 1 - Invalid boolean target", 1, True, 400, None),
    ("Inning 2 - Missing target", 2, "OMIT", 400, None),
    ("Inning 2 - Explicit null target", 2, None, 400, None),
    ("Inning 2 - Valid integer target", 2, 175, 200, 175),
    ("Inning 2 - Valid float target", 2, 175.0, 200, 175),
    ("Inning 2 - Valid numeric string target", 2, "175", 200, 175),
    ("Inning 2 - Invalid non-numeric target", 2, "abc", 400, None),
    ("Inning 2 - Invalid zero target", 2, 0, 400, None),
    ("Inning 2 - Invalid negative target", 2, -10, 400, None),

    # New strict robustness test cases (FIX 2)
    ("Inning 2 - Fractional float target (175.5)", 2, 175.5, 400, None),
    ("Inning 2 - Fractional numeric string ('175.5')", 2, "175.5", 400, None),
    ("Inning 1 - Fractional float target (180.25)", 1, 180.25, 400, None),
    ("Inning 2 - NaN float target", 2, float("nan"), 400, None),
    ("Inning 2 - NaN string target ('NaN')", 2, "NaN", 400, None),
    ("Inning 2 - Infinity float target", 2, float("inf"), 400, None),
    ("Inning 2 - Infinity string target ('Infinity')", 2, "Infinity", 400, None),
    ("Inning 2 - Negative Infinity float target", 2, float("-inf"), 400, None),
    ("Inning 2 - Negative Infinity string ('-Infinity')", 2, "-Infinity", 400, None),
    ("Inning 2 - Overflow string target ('1e309')", 2, "1e309", 400, None),
]

all_passed = True
passed_count = 0
failed_count = 0

for name, inn, t_val, exp_status, exp_resp_target in target_tests:
    body = {
        "inning": inn,
        "over": 8.0,
        "current_score": 65,
        "wickets_lost": 2,
        "batting_team": "CSK",
        "bowling_team": "MI"
    }
    if t_val != "OMIT":
        body["target"] = t_val

    res = client.post("/predict_live", json=body)
    status_ok = (res.status_code == exp_status)
    json_data = res.get_json() or {}

    target_ok = True
    if exp_status == 200:
        actual_target = json_data.get("target")
        target_ok = (actual_target == exp_resp_target)

    test_ok = status_ok and target_ok
    if test_ok:
        passed_count += 1
    else:
        failed_count += 1
        all_passed = False

    flag = "PASS" if test_ok else "FAIL"
    print(f"[{flag}] {name:48} | Status: {res.status_code} (exp {exp_status}) | Resp target: {json_data.get('target', 'N/A')}")

print("-" * 60)
print(f"Target Regression Summary: {passed_count} passed, {failed_count} failed out of {len(target_tests)} tests.")

if not all_passed:
    print("FAILED: Some target regression tests did not pass.")
    sys.exit(1)
else:
    print(f"ALL {len(target_tests)} TARGET REGRESSION TESTS PASSED.")
    sys.exit(0)
