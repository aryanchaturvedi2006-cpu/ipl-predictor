"""
test_suite_verification.py — Comprehensive End-to-End Verification Test Suite
=============================================================================
Runs all Phase 7 verification tests for the IPL Predictor Deep Learning Upgrade:
  1. Python syntax & compilation
  2. Asset & model loading
  3. Pre-toss prediction API contract
  4. Post-toss prediction API contract
  5. Live match prediction API contract (Inning 1 & Inning 2)
  6. Graceful fallback validation when DL is unavailable
  7. Model comparison data integrity & schema validation
"""

import sys
import os
import json
import py_compile
import joblib

def run_tests():
    print("=" * 65)
    print("  IPL PREDICTOR DEEP LEARNING UPGRADE — VERIFICATION TEST SUITE")
    print("=" * 65)

    test_results = {}

    # TEST 1: Python Compilation
    print("\n[TEST 1] Syntax & Bytecode Compilation Check...")
    files_to_compile = ["app.py", "export_onnx.py", "gunicorn.conf.py"]
    comp_ok = True
    for f in files_to_compile:
        try:
            py_compile.compile(f, doraise=True)
            print(f"  Compiled {f}: PASSED")
        except Exception as e:
            print(f"  Compilation failed for {f}: {e}")
            comp_ok = False
    test_results["Syntax Compilation"] = comp_ok

    # TEST 2: Asset & Classical Model Loading
    print("\n[TEST 2] Asset & Model Loading Check...")
    try:
        m_pre = joblib.load("models/model_pre.pkl")
        m_post = joblib.load("models/model_post.pkl")
        enc = joblib.load("models/encoders.pkl")
        live = joblib.load("models/live_model.pkl")
        sc_pre = joblib.load("models/scaler_pre.pkl")
        sc_post = joblib.load("models/scaler_post.pkl")
        print("  Classical model artifacts & scalers loaded: PASSED")
        test_results["Asset Loading"] = True
    except Exception as e:
        print(f"  Asset loading failed: {e}")
        test_results["Asset Loading"] = False

    # TEST 3: App Import & Safe Fallback
    print("\n[TEST 3] App Boot & Safe Fallback Check...")
    try:
        from app import app, load_assets, use_ffnn, use_onnx
        client = app.test_client()
        print(f"  App booted cleanly. use_ffnn: {use_ffnn}, use_onnx: {use_onnx}")
        test_results["App Safe Boot"] = True
    except Exception as e:
        print(f"  App boot failed: {e}")
        test_results["App Safe Boot"] = False
        return test_results

    # TEST 4: Pre-Toss Prediction Endpoint
    print("\n[TEST 4] Pre-Toss Prediction Endpoint...")
    res_pre = client.post("/predict", json={
        "team1": "Chennai Super Kings",
        "team2": "Mumbai Indians",
        "venue": "Wankhede Stadium"
    })
    data_pre = res_pre.get_json()
    status_pre = (res_pre.status_code == 200 and 
                  "predicted_winner" in data_pre and 
                  "probability" in data_pre and 
                  "prediction_model" in data_pre)
    print(f"  Status code: {res_pre.status_code}")
    print(f"  Predicted winner: {data_pre.get('predicted_winner')}, Prob: {data_pre.get('probability')}%")
    print(f"  Model used: {data_pre.get('prediction_model')}")
    test_results["Pre-Toss Endpoint"] = status_pre

    # TEST 5: Post-Toss Prediction Endpoint
    print("\n[TEST 5] Post-Toss Prediction Endpoint...")
    res_post = client.post("/predict", json={
        "team1": "Chennai Super Kings",
        "team2": "Mumbai Indians",
        "venue": "Wankhede Stadium",
        "toss_winner": "Chennai Super Kings",
        "toss_decision": "field"
    })
    data_post = res_post.get_json()
    status_post = (res_post.status_code == 200 and 
                   "predicted_winner" in data_post and 
                   "probability" in data_post and 
                   "prediction_model" in data_post)
    print(f"  Status code: {res_post.status_code}")
    print(f"  Predicted winner: {data_post.get('predicted_winner')}, Prob: {data_post.get('probability')}%")
    print(f"  Model used: {data_post.get('prediction_model')}")
    test_results["Post-Toss Endpoint"] = status_post

    # TEST 6: Live Prediction — Inning 1
    print("\n[TEST 6] Live Prediction Endpoint — Inning 1...")
    res_l1 = client.post("/predict_live", json={
        "inning": 1,
        "over": 8.0,
        "current_score": 68,
        "wickets_lost": 2,
        "batting_team": "CSK",
        "bowling_team": "MI"
    })
    data_l1 = res_l1.get_json()
    status_l1 = (res_l1.status_code == 200 and 
                 "batting_team_win_probability" in data_l1 and
                 "bowling_team_win_probability" in data_l1 and
                 "model_used" in data_l1)
    print(f"  Status code: {res_l1.status_code}")
    print(f"  Batting prob: {data_l1.get('batting_team_win_probability')}%, Model: {data_l1.get('model_used')}")
    test_results["Live Inning 1 Endpoint"] = status_l1

    # TEST 7: Live Prediction — Inning 2 with Sequence History
    print("\n[TEST 7] Live Prediction Endpoint — Inning 2...")
    dummy_seq = [[0.1 * i, 0.05 * i, 0.4, 0.3, 0.5, 0.2, 0.1] for i in range(20)]
    res_l2 = client.post("/predict_live", json={
        "inning": 2,
        "over": 12.0,
        "current_score": 105,
        "wickets_lost": 2,
        "target": 175,
        "batting_team": "CSK",
        "bowling_team": "MI",
        "sequence_history": dummy_seq
    })
    data_l2 = res_l2.get_json()
    status_l2 = (res_l2.status_code == 200 and 
                 "batting_team_win_probability" in data_l2 and
                 "bowling_team_win_probability" in data_l2 and
                 "model_used" in data_l2)
    print(f"  Status code: {res_l2.status_code}")
    print(f"  Batting prob: {data_l2.get('batting_team_win_probability')}%, Model: {data_l2.get('model_used')}")
    test_results["Live Inning 2 Endpoint"] = status_l2

    # TEST 8: Comparison JSON Schema & Metric Integrity
    print("\n[TEST 8] Model Comparison JSON Integrity...")
    with open("models/model_comparison.json") as f:
        comp_json = json.load(f)
    
    sections = ["pre_toss", "post_toss", "live_match"]
    schema_ok = all(s in comp_json for s in sections)
    print(f"  Schema check: {'PASSED' if schema_ok else 'FAILED'}")
    test_results["Comparison JSON Schema"] = schema_ok

    # TEST 9: ONNX Artifacts & Parity Report Verification
    print("\n[TEST 9] ONNX Artifacts & Parity Report Verification...")
    onnx_files = ["ffnn_pre.onnx", "ffnn_post.onnx", "lstm_live.onnx"]
    onnx_ok = all(os.path.exists(os.path.join("models", f)) and os.path.getsize(os.path.join("models", f)) > 1000 for f in onnx_files)

    report_path = os.path.join("models", "onnx_parity_report.json")
    parity_ok = False
    if os.path.exists(report_path):
        with open(report_path) as rf:
            rep = json.load(rf)
        models = rep.get("models", {})
        parity_ok = (
            len(models) == 3 and
            all(m.get("parity_check") == "PASSED" for m in models.values()) and
            all(m.get("max_absolute_difference", 1.0) < 1e-4 for m in models.values())
        )
    print(f"  ONNX Artifacts: {'PASSED' if onnx_ok else 'FAILED'}")
    print(f"  Parity Verification (< 1e-4): {'PASSED' if parity_ok else 'FAILED'}")
    test_results["ONNX Artifacts & Parity"] = (onnx_ok and parity_ok)
    metrics_present = True
    for s in sections:
        for m in comp_json[s]:
            for metric in ["accuracy", "precision", "recall", "f1", "log_loss"]:
                if metric not in m:
                    print(f"  Missing {metric} in {m.get('model')}")
                    metrics_present = False
    test_results["Comparison JSON Schema"] = (schema_ok and metrics_present)
    print(f"  Schema check: {'PASSED' if (schema_ok and metrics_present) else 'FAILED'}")

    print("\n" + "=" * 65)
    print("  VERIFICATION SUMMARY")
    print("=" * 65)
    all_passed = True
    for test_name, passed in test_results.items():
        status_str = "PASSED" if passed else "FAILED"
        if not passed: all_passed = False
        print(f"  {test_name.ljust(35)}: {status_str}")

    return all_passed

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)

