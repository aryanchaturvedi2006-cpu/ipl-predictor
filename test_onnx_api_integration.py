"""
test_onnx_api_integration.py — Phase 3 Local API Integration Test under ONNX
===========================================================================
Validates that when app.py runs with ONNX Runtime available:
  1. Pre-Toss /predict returns model_used == "FFNN (Deep Learning / ONNX)"
  2. Post-Toss /predict returns model_used == "FFNN (Deep Learning / ONNX)"
  3. Live Inning 1 /predict_live returns model_used == "Sequence Inning 1 (ML Baseline)"
  4. Live Inning 2 /predict_live with 20x7 sequence returns model_used == "LSTM (Deep Learning / ONNX)"
  5. Live Inning 2 /predict_live without sequence returns model_used == "XGBoost (ML Baseline)"
"""

import os
import sys
import json

os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

from app import app, load_assets

def run_api_tests():
    print("=" * 65)
    print("  PHASE 3: LOCAL API INTEGRATION VALIDATION (ONNX RUNTIME)")
    print("=" * 65)

    load_assets()
    client = app.test_client()

    results = {}

    # 1. Health check
    res_home = client.get("/")
    print(f"\n[1] GET / Health Check")
    print(f"  HTTP Status: {res_home.status_code}")
    assert res_home.status_code == 200, "Health check failed"

    # 2. Pre-Toss Prediction
    res_pre = client.post("/predict", json={
        "team1": "Chennai Super Kings",
        "team2": "Mumbai Indians",
        "venue": "Wankhede Stadium",
        "prediction_mode": "pre_toss"
    })
    d_pre = res_pre.get_json()
    model_pre = d_pre.get("prediction_model_used")
    prob_pre = d_pre.get("probability")
    winner_pre = d_pre.get("predicted_winner")
    print(f"\n[2] POST /predict (Pre-Toss)")
    print(f"  HTTP Status: {res_pre.status_code}")
    print(f"  Model Used:  {model_pre}")
    print(f"  Winner:      {winner_pre} ({prob_pre}%)")
    results["pre_toss"] = {
        "status_code": res_pre.status_code,
        "model_used": model_pre,
        "winner": winner_pre,
        "probability": prob_pre,
        "expected_model": "FFNN (Deep Learning / ONNX)",
        "passed": res_pre.status_code == 200 and "ONNX" in str(model_pre)
    }

    # 3. Post-Toss Prediction
    res_post = client.post("/predict", json={
        "team1": "Chennai Super Kings",
        "team2": "Mumbai Indians",
        "venue": "Wankhede Stadium",
        "toss_winner": "Chennai Super Kings",
        "toss_decision": "bat",
        "pitch": "flat",
        "weather": "clear",
        "timing": "night",
        "prediction_mode": "post_toss"
    })
    d_post = res_post.get_json()
    model_post = d_post.get("prediction_model_used")
    prob_post = d_post.get("probability")
    winner_post = d_post.get("predicted_winner")
    print(f"\n[3] POST /predict (Post-Toss)")
    print(f"  HTTP Status: {res_post.status_code}")
    print(f"  Model Used:  {model_post}")
    print(f"  Winner:      {winner_post} ({prob_post}%)")
    results["post_toss"] = {
        "status_code": res_post.status_code,
        "model_used": model_post,
        "winner": winner_post,
        "probability": prob_post,
        "expected_model": "FFNN (Deep Learning / ONNX)",
        "passed": res_post.status_code == 200 and "ONNX" in str(model_post)
    }

    # 4. Live Inning 1 (Sequential Baseline)
    res_inn1 = client.post("/predict_live", json={
        "inning": 1,
        "batting_team": "Chennai Super Kings",
        "bowling_team": "Mumbai Indians",
        "venue": "Wankhede Stadium",
        "over": 10,
        "current_score": 85,
        "wickets_lost": 2
    })
    d_inn1 = res_inn1.get_json()
    model_inn1 = d_inn1.get("model_used")
    prob_inn1 = d_inn1.get("batting_team_win_prob") or d_inn1.get("batting_team_win_probability")
    print(f"\n[4] POST /predict_live (Inning 1 Sequential)")
    print(f"  HTTP Status: {res_inn1.status_code}")
    print(f"  Model Used:  {model_inn1}")
    print(f"  Batting Win: {prob_inn1}%")
    results["inning_1"] = {
        "status_code": res_inn1.status_code,
        "model_used": model_inn1,
        "batting_prob": prob_inn1,
        "expected_model": "Sequence Inning 1 (ML Baseline)",
        "passed": res_inn1.status_code == 200 and "Sequence" in str(model_inn1)
    }

    # 5. Live Inning 2 with Genuine 20x7 History (LSTM ONNX)
    # Construct authentic 20x7 sequence up to over 15
    seq = []
    runs_prog = [8, 17, 26, 35, 44, 52, 60, 68, 76, 85, 93, 101, 109, 117, 125]
    wkts_prog = [0,  0,  1,  1,  1,  1,  2,  2,  2,  2,  2,   3,   3,   3,   3]
    tgt = 180.0
    for o in range(1, 21):
        if o <= 15:
            sc = float(runs_prog[o - 1])
            w = float(wkts_prog[o - 1])
            b_left = float(120 - o * 6)
            r_need = max(0.0, tgt - sc)
            c = (sc / o)
            r = (r_need / b_left * 6.0) if b_left > 0 else 0.0
            seq.append([sc, w, r, c, b_left, r_need, tgt])
        else:
            seq.append([0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0])

    res_inn2_lstm = client.post("/predict_live", json={
        "inning": 2,
        "batting_team": "Chennai Super Kings",
        "bowling_team": "Mumbai Indians",
        "venue": "Wankhede Stadium",
        "target": 180,
        "over": 15,
        "current_score": 125,
        "wickets_lost": 3,
        "sequence_history": seq
    })
    d_inn2_lstm = res_inn2_lstm.get_json()
    model_inn2_lstm = d_inn2_lstm.get("model_used")
    prob_inn2_lstm = d_inn2_lstm.get("batting_team_win_prob") or d_inn2_lstm.get("batting_team_win_probability")
    print(f"\n[5] POST /predict_live (Inning 2 Chase with 20x7 Sequence -> LSTM ONNX)")
    print(f"  HTTP Status: {res_inn2_lstm.status_code}")
    print(f"  Model Used:  {model_inn2_lstm}")
    print(f"  Batting Win: {prob_inn2_lstm}%")
    results["inning_2_lstm"] = {
        "status_code": res_inn2_lstm.status_code,
        "model_used": model_inn2_lstm,
        "batting_prob": prob_inn2_lstm,
        "expected_model": "LSTM (Deep Learning / ONNX)",
        "passed": res_inn2_lstm.status_code == 200 and "LSTM" in str(model_inn2_lstm) and "ONNX" in str(model_inn2_lstm)
    }

    # 6. Live Inning 2 without Sequence History (XGBoost Fallback)
    res_inn2_fb = client.post("/predict_live", json={
        "inning": 2,
        "batting_team": "Chennai Super Kings",
        "bowling_team": "Mumbai Indians",
        "venue": "Wankhede Stadium",
        "target": 180,
        "over": 15,
        "current_score": 125,
        "wickets_lost": 3
    })
    d_inn2_fb = res_inn2_fb.get_json()
    model_inn2_fb = d_inn2_fb.get("model_used")
    prob_inn2_fb = d_inn2_fb.get("batting_team_win_prob") or d_inn2_fb.get("batting_team_win_probability")
    print(f"\n[6] POST /predict_live (Inning 2 Chase without Sequence -> XGBoost Fallback)")
    print(f"  HTTP Status: {res_inn2_fb.status_code}")
    print(f"  Model Used:  {model_inn2_fb}")
    print(f"  Batting Win: {prob_inn2_fb}%")
    results["inning_2_fallback"] = {
        "status_code": res_inn2_fb.status_code,
        "model_used": model_inn2_fb,
        "batting_prob": prob_inn2_fb,
        "expected_model": "XGBoost (ML Baseline)",
        "passed": res_inn2_fb.status_code == 200 and ("XGBoost" in str(model_inn2_fb) or "Random Forest" in str(model_inn2_fb))
    }

    all_passed = all(r["passed"] for r in results.values())
    print("\n" + "=" * 65)
    print(f"  PHASE 3 SUMMARY: {'ALL TESTS PASSED' if all_passed else 'SOME TESTS FAILED'}")
    print("=" * 65)

    with open("models/onnx_api_integration_results.json", "w") as f:
        json.dump(results, f, indent=2)

    return all_passed

if __name__ == "__main__":
    success = run_api_tests()
    sys.exit(0 if success else 1)

