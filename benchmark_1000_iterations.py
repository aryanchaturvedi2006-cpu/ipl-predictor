"""
benchmark_1000_iterations.py — Comprehensive 1000-Iteration Latency & Timing Breakdown
====================================================================================
Measures:
  1. Component Breakdown: Preprocessing vs Raw Model Inference vs End-to-End API
  2. Statistical Rigor: 50 warmups + 1000 measurement iterations
  3. Metrics: Mean, Median (p50), 95th Percentile (p95), Min, Max (in milliseconds)
  4. Comparison across ONNX Runtime, Keras, and Classical ML baselines
"""

import os
import sys
import time
import json
import joblib
import numpy as np
import pandas as pd

os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

import onnxruntime as ort
import tensorflow as tf

from app import app, load_assets
import app as app_module

def run_1000_benchmarks():
    print("=" * 65)
    print("  PHASE 4: 1000-ITERATION BENCHMARK & TIMING BREAKDOWN")
    print("=" * 65)

    base_dir = os.path.dirname(os.path.abspath(__file__))
    models_dir = os.path.join(base_dir, "models")

    # Load assets & initialize ONNX sessions
    load_assets()
    client = app.test_client()

    p_pre = os.path.join(models_dir, "ffnn_pre.onnx")
    p_post = os.path.join(models_dir, "ffnn_post.onnx")
    p_lstm = os.path.join(models_dir, "lstm_live.onnx")
    s_pre = ort.InferenceSession(p_pre, providers=["CPUExecutionProvider"])
    s_post = ort.InferenceSession(p_post, providers=["CPUExecutionProvider"])
    s_lstm = ort.InferenceSession(p_lstm, providers=["CPUExecutionProvider"])

    scaler_pre = joblib.load(os.path.join(models_dir, "scaler_pre.pkl"))
    scaler_post = joblib.load(os.path.join(models_dir, "scaler_post.pkl"))
    k_pre = tf.keras.models.load_model(os.path.join(models_dir, "ffnn_pre.keras"))
    k_post = tf.keras.models.load_model(os.path.join(models_dir, "ffnn_post.keras"))
    k_lstm = tf.keras.models.load_model(os.path.join(models_dir, "lstm_live.keras"))

    rf_pre = joblib.load(os.path.join(models_dir, "model_pre.pkl"))
    live_models = joblib.load(os.path.join(models_dir, "live_model.pkl"))
    rf_inn2 = live_models["inn2_model"]

    def measure(fn, warmups=50, iters=1000):
        for _ in range(warmups):
            fn()
        times = []
        for _ in range(iters):
            t0 = time.perf_counter()
            fn()
            times.append((time.perf_counter() - t0) * 1000.0) # ms
        return {
            "mean_ms": float(np.mean(times)),
            "p50_ms": float(np.median(times)),
            "p95_ms": float(np.percentile(times, 95)),
            "min_ms": float(np.min(times)),
            "max_ms": float(np.max(times))
        }

    # 1. TABULAR PRE-TOSS BENCHMARKS
    raw_pre = np.array([[15.2, 0.20, -0.10, 0.35, -0.25, 0.18, 0.30, -5.0, 8.0, 0.15]], dtype=np.float32)
    norm_pre = scaler_pre.transform(raw_pre).astype(np.float32)
    in_name_pre = s_pre.get_inputs()[0].name

    # Preprocessing timing
    time_prep_pre = measure(lambda: scaler_pre.transform(raw_pre).astype(np.float32))
    # Raw model inference timing
    time_inf_onnx_pre = measure(lambda: s_pre.run(None, {in_name_pre: norm_pre}))
    time_inf_rf_pre = measure(lambda: rf_pre.predict_proba(raw_pre))
    time_inf_keras_pre = measure(lambda: k_pre.predict(norm_pre, verbose=0), warmups=10, iters=200) # Keras is much slower

    # End-to-end API timing
    pre_payload = {"team1": "Chennai Super Kings", "team2": "Mumbai Indians", "venue": "Wankhede Stadium", "prediction_mode": "pre_toss"}
    time_api_onnx_pre = measure(lambda: client.post("/predict", json=pre_payload), warmups=20, iters=500)

    # 2. SEQUENTIAL INNING 2 LSTM BENCHMARKS
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

    seq_arr = np.array([seq], dtype=np.float32)
    in_name_lstm = s_lstm.get_inputs()[0].name

    # Raw model inference timing
    time_inf_onnx_lstm = measure(lambda: s_lstm.run(None, {in_name_lstm: seq_arr}))
    raw_inn2_df = pd.DataFrame([{
        "over": 15.0, "current_score": 125.0, "wickets_lost": 3.0, "crr": 125.0/15.0,
        "target": 180.0, "runs_needed": 55.0, "balls_remaining": 30.0, "req_rr": 11.0
    }])[live_models["features_inn2"]]
    time_inf_rf_inn2 = measure(lambda: rf_inn2.predict_proba(raw_inn2_df))
    time_inf_keras_lstm = measure(lambda: k_lstm.predict(seq_arr, verbose=0), warmups=10, iters=200)

    # End-to-end API timing
    lstm_payload = {
        "inning": 2, "batting_team": "Chennai Super Kings", "bowling_team": "Mumbai Indians",
        "venue": "Wankhede Stadium", "target": 180, "over": 15, "current_score": 125,
        "wickets_lost": 3, "sequence_history": seq
    }
    time_api_onnx_lstm = measure(lambda: client.post("/predict_live", json=lstm_payload), warmups=20, iters=500)

    print("\n--- Pre-Toss Prediction Latency Breakdown ---")
    print(f"  Preprocessing (StandardScaler)       : mean = {time_prep_pre['mean_ms']:.3f} ms | p50 = {time_prep_pre['p50_ms']:.3f} ms")
    print(f"  Raw Inference — ONNX Runtime (CPU)   : mean = {time_inf_onnx_pre['mean_ms']:.3f} ms | p50 = {time_inf_onnx_pre['p50_ms']:.3f} ms | p95 = {time_inf_onnx_pre['p95_ms']:.3f} ms")
    print(f"  Raw Inference — Random Forest (CPU)  : mean = {time_inf_rf_pre['mean_ms']:.3f} ms | p50 = {time_inf_rf_pre['p50_ms']:.3f} ms | p95 = {time_inf_rf_pre['p95_ms']:.3f} ms")
    print(f"  Raw Inference — Keras / TF (CPU)     : mean = {time_inf_keras_pre['mean_ms']:.3f} ms | p50 = {time_inf_keras_pre['p50_ms']:.3f} ms | p95 = {time_inf_keras_pre['p95_ms']:.3f} ms")
    print(f"  End-to-End API via HTTP (ONNX)       : mean = {time_api_onnx_pre['mean_ms']:.3f} ms | p50 = {time_api_onnx_pre['p50_ms']:.3f} ms | p95 = {time_api_onnx_pre['p95_ms']:.3f} ms")

    print("\n--- Live Match Inning 2 LSTM Latency Breakdown ---")
    print(f"  Raw Inference — ONNX LSTM (CPU)      : mean = {time_inf_onnx_lstm['mean_ms']:.3f} ms | p50 = {time_inf_onnx_lstm['p50_ms']:.3f} ms | p95 = {time_inf_onnx_lstm['p95_ms']:.3f} ms")
    print(f"  Raw Inference — XGBoost / RF (CPU)   : mean = {time_inf_rf_inn2['mean_ms']:.3f} ms | p50 = {time_inf_rf_inn2['p50_ms']:.3f} ms | p95 = {time_inf_rf_inn2['p95_ms']:.3f} ms")
    print(f"  Raw Inference — Keras LSTM (CPU)     : mean = {time_inf_keras_lstm['mean_ms']:.3f} ms | p50 = {time_inf_keras_lstm['p50_ms']:.3f} ms | p95 = {time_inf_keras_lstm['p95_ms']:.3f} ms")
    print(f"  End-to-End API via HTTP (ONNX LSTM)  : mean = {time_api_onnx_lstm['mean_ms']:.3f} ms | p50 = {time_api_onnx_lstm['p50_ms']:.3f} ms | p95 = {time_api_onnx_lstm['p95_ms']:.3f} ms")

    bench_summary = {
        "tabular_pretoss": {
            "preprocessing": time_prep_pre,
            "raw_onnx": time_inf_onnx_pre,
            "raw_random_forest": time_inf_rf_pre,
            "raw_keras": time_inf_keras_pre,
            "end_to_end_api": time_api_onnx_pre
        },
        "sequential_lstm": {
            "raw_onnx_lstm": time_inf_onnx_lstm,
            "raw_xgboost_rf": time_inf_rf_inn2,
            "raw_keras_lstm": time_inf_keras_lstm,
            "end_to_end_api": time_api_onnx_lstm
        }
    }

    out_file = os.path.join(models_dir, "benchmark_1000_results.json")
    with open(out_file, "w") as f:
        json.dump(bench_summary, f, indent=2)

    return bench_summary

if __name__ == "__main__":
    run_1000_benchmarks()

