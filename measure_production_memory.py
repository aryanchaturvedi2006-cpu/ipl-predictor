"""
measure_production_memory.py — Production Memory Profiling across Stages A to F
=============================================================================
Measures exact Process Resident Set Size (RSS) in MB across:
  Stage A: Classical ML only (app.py with use_onnx=False)
  Stage B: ONNX Runtime package imported, but sessions unloaded
  Stage C: All three ONNX sessions initialized (ffnn_pre, ffnn_post, lstm_live)
  Stage D: Repeated Pre-Toss predictions (500 iterations)
  Stage E: Repeated Post-Toss predictions (500 iterations)
  Stage F: Repeated LSTM Inning 2 predictions (500 iterations)
"""

import os
import sys
import gc
import json
import psutil

os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

proc = psutil.Process()

def get_rss_mb():
    return proc.memory_info().rss / (1024 * 1024)

def run_memory_profiling():
    print("=" * 65)
    print("  PHASE 4: PRODUCTION MEMORY PROFILING (STAGES A TO F)")
    print("=" * 65)

    mem_results = {}

    # Initial baseline
    gc.collect()
    rss_start = get_rss_mb()
    print(f"Initial Process Memory: {rss_start:.2f} MB")

    # STAGE A: Classical ML Only
    # Import app and load classical assets with ONNX disabled
    from app import app, load_assets
    import app as app_module
    
    # Force classical ML only
    app_module.ONNX_AVAILABLE = False
    app_module.use_onnx = False
    app_module.ort = None
    load_assets()
    gc.collect()
    rss_stage_a = get_rss_mb()
    delta_a = rss_stage_a - rss_start
    print(f"\n[STAGE A] Classical ML Loaded (Random Forest + XGBoost):")
    print(f"  Current RSS: {rss_stage_a:.2f} MB (Delta: +{delta_a:.2f} MB)")
    mem_results["Stage_A_Classical_ML"] = {
        "rss_mb": rss_stage_a,
        "delta_from_start_mb": delta_a
    }

    # STAGE B: Import ONNX Runtime, but sessions unloaded
    import onnxruntime as ort
    app_module.ONNX_AVAILABLE = True
    app_module.ort = ort
    gc.collect()
    rss_stage_b = get_rss_mb()
    delta_b = rss_stage_b - rss_stage_a
    print(f"\n[STAGE B] ONNX Runtime Imported (Sessions Unloaded):")
    print(f"  Current RSS: {rss_stage_b:.2f} MB (Delta from Stage A: +{delta_b:.2f} MB)")
    mem_results["Stage_B_ONNX_Imported_Unloaded"] = {
        "rss_mb": rss_stage_b,
        "delta_from_stage_a_mb": delta_b
    }

    # STAGE C: Initialize all three ONNX sessions
    base_dir = os.path.dirname(os.path.abspath(__file__))
    models_dir = os.path.join(base_dir, "models")
    p_pre = os.path.join(models_dir, "ffnn_pre.onnx")
    p_post = os.path.join(models_dir, "ffnn_post.onnx")
    p_lstm = os.path.join(models_dir, "lstm_live.onnx")

    onnx_pre = ort.InferenceSession(p_pre, providers=["CPUExecutionProvider"])
    onnx_post = ort.InferenceSession(p_post, providers=["CPUExecutionProvider"])
    onnx_lstm = ort.InferenceSession(p_lstm, providers=["CPUExecutionProvider"])

    # Attach to app
    app_module.onnx_ffnn_pre = onnx_pre
    app_module.onnx_ffnn_post = onnx_post
    app_module.onnx_lstm = onnx_lstm
    app_module.use_onnx = True

    gc.collect()
    rss_stage_c = get_rss_mb()
    delta_c = rss_stage_c - rss_stage_b
    print(f"\n[STAGE C] All 3 ONNX Sessions Initialized (Pre, Post, LSTM):")
    print(f"  Current RSS: {rss_stage_c:.2f} MB (Init Overhead: +{delta_c:.2f} MB)")
    mem_results["Stage_C_ONNX_Sessions_Initialized"] = {
        "rss_mb": rss_stage_c,
        "init_overhead_mb": delta_c
    }

    client = app.test_client()

    # STAGE D: Repeated Pre-Toss Predictions (500 iterations)
    pre_payload = {
        "team1": "Chennai Super Kings",
        "team2": "Mumbai Indians",
        "venue": "Wankhede Stadium",
        "prediction_mode": "pre_toss"
    }
    for i in range(500):
        res = client.post("/predict", json=pre_payload)
        assert res.status_code == 200

    gc.collect()
    rss_stage_d = get_rss_mb()
    delta_d = rss_stage_d - rss_stage_c
    print(f"\n[STAGE D] 500 Pre-Toss Inferences Completed:")
    print(f"  Current RSS: {rss_stage_d:.2f} MB (Inference Delta: +{delta_d:.2f} MB)")
    mem_results["Stage_D_500_PreToss_Inferences"] = {
        "rss_mb": rss_stage_d,
        "delta_from_init_mb": delta_d
    }

    # STAGE E: Repeated Post-Toss Predictions (500 iterations)
    post_payload = {
        "team1": "Chennai Super Kings",
        "team2": "Mumbai Indians",
        "venue": "Wankhede Stadium",
        "toss_winner": "Chennai Super Kings",
        "toss_decision": "bat",
        "pitch": "flat",
        "weather": "clear",
        "timing": "night",
        "prediction_mode": "post_toss"
    }
    for i in range(500):
        res = client.post("/predict", json=post_payload)
        assert res.status_code == 200

    gc.collect()
    rss_stage_e = get_rss_mb()
    delta_e = rss_stage_e - rss_stage_d
    print(f"\n[STAGE E] 500 Post-Toss Inferences Completed:")
    print(f"  Current RSS: {rss_stage_e:.2f} MB (Inference Delta: +{delta_e:.2f} MB)")
    mem_results["Stage_E_500_PostToss_Inferences"] = {
        "rss_mb": rss_stage_e,
        "delta_from_pre_mb": delta_e
    }

    # STAGE F: Repeated LSTM Predictions (500 iterations with 20x7 sequence)
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

    lstm_payload = {
        "inning": 2,
        "batting_team": "Chennai Super Kings",
        "bowling_team": "Mumbai Indians",
        "venue": "Wankhede Stadium",
        "target": 180,
        "over": 15,
        "current_score": 125,
        "wickets_lost": 3,
        "sequence_history": seq
    }
    for i in range(500):
        res = client.post("/predict_live", json=lstm_payload)
        assert res.status_code == 200

    gc.collect()
    rss_stage_f = get_rss_mb()
    delta_f = rss_stage_f - rss_stage_e
    print(f"\n[STAGE F] 500 LSTM Sequence Inferences Completed:")
    print(f"  Current RSS: {rss_stage_f:.2f} MB (Inference Delta: +{delta_f:.2f} MB)")
    mem_results["Stage_F_500_LSTM_Inferences"] = {
        "rss_mb": rss_stage_f,
        "delta_from_post_mb": delta_f
    }

    # Summary
    print("\n" + "=" * 65)
    print("  PRODUCTION MEMORY SUMMARY (MB)")
    print("=" * 65)
    print(f"  Stage A (Classical ML Only)             : {rss_stage_a:.2f} MB")
    print(f"  Stage B (ONNX Imported, Unloaded)       : {rss_stage_b:.2f} MB (+{delta_b:.2f} MB)")
    print(f"  Stage C (3 ONNX Sessions Initialized)   : {rss_stage_c:.2f} MB (+{delta_c:.2f} MB init)")
    print(f"  Stage D (After 500 Pre-Toss Inferences) : {rss_stage_d:.2f} MB (+{delta_d:.2f} MB)")
    print(f"  Stage E (After 500 Post-Toss Inferences): {rss_stage_e:.2f} MB (+{delta_e:.2f} MB)")
    print(f"  Stage F (After 500 LSTM Inferences)     : {rss_stage_f:.2f} MB (+{delta_f:.2f} MB)")
    print(f"  Peak Resident Memory (RSS)              : {rss_stage_f:.2f} MB")
    print(f"  Render Free Tier Limit                  : 512.00 MB")
    print(f"  Render Safety Margin                    : {512.00 - rss_stage_f:.2f} MB ({((512.00 - rss_stage_f)/512.00)*100:.1f}% free)")

    out_path = os.path.join(models_dir, "production_memory_stages.json")
    with open(out_path, "w") as f:
        json.dump(mem_results, f, indent=2)

    return mem_results

if __name__ == "__main__":
    run_memory_profiling()

