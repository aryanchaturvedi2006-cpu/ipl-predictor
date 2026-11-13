"""
test_onnx_inference.py — Phase 2 Isolated ONNX Inference & Latency Benchmarks
=============================================================================
Runs inside .venv-onnx to validate:
  1. ONNX Runtime session initialization & memory footprint
  2. Input/output tensor names, shapes, and data types
  3. Realistic IPL inference with genuine preprocessing
  4. Strict numerical parity between Keras and ONNX Runtime
  5. Latency benchmarking (100 iterations: mean, p50, p95)
"""

import os
import sys
import time
import json
import joblib
import numpy as np

os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

import onnxruntime as ort
import tensorflow as tf

def test_inference_and_benchmarks():
    print("=" * 65)
    print("  PHASE 2: ISOLATED ONNX INFERENCE & NUMERICAL VALIDATION")
    print("=" * 65)

    base_dir = os.path.dirname(os.path.abspath(__file__))
    models_dir = os.path.join(base_dir, "models")

    # 1. Measure session initialization time
    t0 = time.perf_counter()
    session_pre = ort.InferenceSession(os.path.join(models_dir, "ffnn_pre.onnx"), providers=["CPUExecutionProvider"])
    init_time_pre = (time.perf_counter() - t0) * 1000

    t0 = time.perf_counter()
    session_post = ort.InferenceSession(os.path.join(models_dir, "ffnn_post.onnx"), providers=["CPUExecutionProvider"])
    init_time_post = (time.perf_counter() - t0) * 1000

    t0 = time.perf_counter()
    session_lstm = ort.InferenceSession(os.path.join(models_dir, "lstm_live.onnx"), providers=["CPUExecutionProvider"])
    init_time_lstm = (time.perf_counter() - t0) * 1000

    print(f"ONNX Session Init Times:")
    print(f"  ffnn_pre.onnx : {init_time_pre:.2f} ms")
    print(f"  ffnn_post.onnx: {init_time_post:.2f} ms")
    print(f"  lstm_live.onnx: {init_time_lstm:.2f} ms")

    # 2. Inspect tensor metadata
    print("\nTensor Metadata:")
    models_meta = [
        ("FFNN Pre-Toss", session_pre, "ffnn_pre.keras"),
        ("FFNN Post-Toss", session_post, "ffnn_post.keras"),
        ("LSTM Live", session_lstm, "lstm_live.keras")
    ]
    for name, sess, k_name in models_meta:
        inp = sess.get_inputs()[0]
        out = sess.get_outputs()[0]
        print(f"  {name}:")
        print(f"    Input Name:  {inp.name}, Shape: {inp.shape}, Type: {inp.type}")
        print(f"    Output Name: {out.name}, Shape: {out.shape}, Type: {out.type}")

    # 3. Load genuine preprocessors & Keras models
    scaler_pre = joblib.load(os.path.join(models_dir, "scaler_pre.pkl"))
    scaler_post = joblib.load(os.path.join(models_dir, "scaler_post.pkl"))
    keras_pre = tf.keras.models.load_model(os.path.join(models_dir, "ffnn_pre.keras"))
    keras_post = tf.keras.models.load_model(os.path.join(models_dir, "ffnn_post.keras"))
    keras_lstm = tf.keras.models.load_model(os.path.join(models_dir, "lstm_live.keras"))

    # Also load classical models for comparison
    model_pre_rf = joblib.load(os.path.join(models_dir, "model_pre.pkl"))
    live_models = joblib.load(os.path.join(models_dir, "live_model.pkl"))
    rf_inn2 = live_models["inn2_model"]

    # 4. Realistic IPL Test Case 1: Pre-Toss (CSK vs MI)
    # 10 features: elo_diff, recent_win_rate_diff, venue_win_rate_diff, batting_strength_diff,
    # bowling_strength_diff, recent_bat_run_rate_diff, recent_bowl_wkts_diff,
    # recent_runs_scored_avg_diff, recent_runs_conceded_avg_diff, season_win_rate_diff
    raw_pre_sample = np.array([[15.2, 0.20, -0.10, 0.35, -0.25, 0.18, 0.30, -5.0, 8.0, 0.15]], dtype=np.float32)
    norm_pre_sample = scaler_pre.transform(raw_pre_sample).astype(np.float32)

    k_pred_pre = float(keras_pre.predict(norm_pre_sample, verbose=0).flatten()[0])
    in_name_pre = session_pre.get_inputs()[0].name
    onnx_pred_pre = float(session_pre.run(None, {in_name_pre: norm_pre_sample})[0].flatten()[0])
    diff_pre = abs(k_pred_pre - onnx_pred_pre)

    print("\nRealistic Test 1: Pre-Toss FFNN (CSK vs MI)")
    print(f"  Keras Prediction:     {k_pred_pre:.6f}")
    print(f"  ONNX Prediction:      {onnx_pred_pre:.6f}")
    print(f"  Absolute Difference:  {diff_pre:.6e}")
    print(f"  Parity Check (<1e-4): {'PASSED' if diff_pre < 1e-4 else 'FAILED'}")

    # 5. Realistic Test Case 2: Post-Toss (CSK vs MI, CSK won toss & bat)
    # 12 features: 10 pre features + toss_impact + toss_won
    raw_post_sample = np.array([[15.2, 0.20, -0.10, 0.35, -0.25, 0.18, 0.30, -5.0, 8.0, 0.15, 0.05, 1.0]], dtype=np.float32)
    norm_post_sample = scaler_post.transform(raw_post_sample).astype(np.float32)

    k_pred_post = float(keras_post.predict(norm_post_sample, verbose=0).flatten()[0])
    in_name_post = session_post.get_inputs()[0].name
    onnx_pred_post = float(session_post.run(None, {in_name_post: norm_post_sample})[0].flatten()[0])
    diff_post = abs(k_pred_post - onnx_pred_post)

    print("\nRealistic Test 2: Post-Toss FFNN (CSK vs MI, Toss Won)")
    print(f"  Keras Prediction:     {k_pred_post:.6f}")
    print(f"  ONNX Prediction:      {onnx_pred_post:.6f}")
    print(f"  Absolute Difference:  {diff_post:.6e}")
    print(f"  Parity Check (<1e-4): {'PASSED' if diff_post < 1e-4 else 'FAILED'}")

    # 6. Realistic Test Case 3: Inning 2 Live Sequence (Chase of 180, Over 15, 125/3)
    # Reconstruct authentic 20x7 progression:
    # [current_score, wickets, req_rr, crr, balls_remaining, runs_needed, target]
    seq_steps = []
    # Overs 1 to 15: realistic scoring
    cum_runs = [8, 17, 26, 35, 44, 52, 60, 68, 76, 85, 93, 101, 109, 117, 125]
    cum_wkts = [0,  0,  1,  1,  1,  1,  2,  2,  2,  2,  2,   3,   3,   3,   3]
    target = 180.0
    for o in range(1, 21):
        if o <= 15:
            score = float(cum_runs[o - 1])
            wkts = float(cum_wkts[o - 1])
            balls_left = float(120 - o * 6)
            runs_need = max(0.0, target - score)
            crr = (score / o)
            rrr = (runs_need / balls_left * 6.0) if balls_left > 0 else 0.0
            seq_steps.append([score, wkts, rrr, crr, balls_left, runs_need, target])
        else:
            # Future unplayed overs masked with zeros
            seq_steps.append([0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0])

    seq_array = np.array([seq_steps], dtype=np.float32)
    k_pred_lstm = float(keras_lstm.predict(seq_array, verbose=0).flatten()[0])
    in_name_lstm = session_lstm.get_inputs()[0].name
    onnx_pred_lstm = float(session_lstm.run(None, {in_name_lstm: seq_array})[0].flatten()[0])
    diff_lstm = abs(k_pred_lstm - onnx_pred_lstm)

    print("\nRealistic Test 3: Second-Innings LSTM (Over 15, 125/3 chasing 180)")
    print(f"  Keras Prediction:     {k_pred_lstm:.6f} ({k_pred_lstm*100:.1f}% batting win prob)")
    print(f"  ONNX Prediction:      {onnx_pred_lstm:.6f} ({onnx_pred_lstm*100:.1f}% batting win prob)")
    print(f"  Absolute Difference:  {diff_lstm:.6e}")
    print(f"  Parity Check (<1e-4): {'PASSED' if diff_lstm < 1e-4 else 'FAILED'}")

    # 7. Latency Benchmarking (100 iterations)
    print("\n" + "=" * 65)
    print("  LATENCY BENCHMARKS (100 repeated inferences)")
    print("=" * 65)

    def benchmark(fn, n=100):
        # Warmup
        for _ in range(5):
            fn()
        latencies = []
        for _ in range(n):
            t_start = time.perf_counter()
            fn()
            latencies.append((time.perf_counter() - t_start) * 1000)
        return {
            "mean": float(np.mean(latencies)),
            "p50": float(np.median(latencies)),
            "p95": float(np.percentile(latencies, 95)),
            "min": float(np.min(latencies)),
            "max": float(np.max(latencies))
        }

    bench_onnx_pre = benchmark(lambda: session_pre.run(None, {in_name_pre: norm_pre_sample}))
    bench_keras_pre = benchmark(lambda: keras_pre.predict(norm_pre_sample, verbose=0))
    bench_rf_pre = benchmark(lambda: model_pre_rf.predict_proba(raw_pre_sample))

    bench_onnx_lstm = benchmark(lambda: session_lstm.run(None, {in_name_lstm: seq_array}))
    bench_keras_lstm = benchmark(lambda: keras_lstm.predict(seq_array, verbose=0))
    raw_inn2_sample = pd.DataFrame([{
        "over": 15.0, "current_score": 125.0, "wickets_lost": 3.0, "crr": 125.0/15.0,
        "target": 180.0, "runs_needed": 55.0, "balls_remaining": 30.0, "req_rr": 11.0
    }])[live_models["features_inn2"]]
    bench_rf_inn2 = benchmark(lambda: rf_inn2.predict_proba(raw_inn2_sample))

    print(f"Pre-Toss Inferences:")
    print(f"  ONNX Runtime CPU : mean = {bench_onnx_pre['mean']:.3f} ms | p50 = {bench_onnx_pre['p50']:.3f} ms | p95 = {bench_onnx_pre['p95']:.3f} ms")
    print(f"  Keras / TF CPU   : mean = {bench_keras_pre['mean']:.3f} ms | p50 = {bench_keras_pre['p50']:.3f} ms | p95 = {bench_keras_pre['p95']:.3f} ms")
    print(f"  Random Forest    : mean = {bench_rf_pre['mean']:.3f} ms | p50 = {bench_rf_pre['p50']:.3f} ms | p95 = {bench_rf_pre['p95']:.3f} ms")

    print(f"\nLive Match Inferences (Inning 2 Chase):")
    print(f"  ONNX LSTM CPU    : mean = {bench_onnx_lstm['mean']:.3f} ms | p50 = {bench_onnx_lstm['p50']:.3f} ms | p95 = {bench_onnx_lstm['p95']:.3f} ms")
    print(f"  Keras LSTM CPU   : mean = {bench_keras_lstm['mean']:.3f} ms | p50 = {bench_keras_lstm['p50']:.3f} ms | p95 = {bench_keras_lstm['p95']:.3f} ms")
    print(f"  XGBoost / RF     : mean = {bench_rf_inn2['mean']:.3f} ms | p50 = {bench_rf_inn2['p50']:.3f} ms | p95 = {bench_rf_inn2['p95']:.3f} ms")

    # 8. Memory measurement
    import psutil
    proc = psutil.Process()
    mem_info = proc.memory_info()
    rss_mb = mem_info.rss / (1024 * 1024)
    print(f"\nProcess Peak Resident Memory (RSS): {rss_mb:.2f} MB")

    results = {
        "init_times_ms": {
            "ffnn_pre": init_time_pre,
            "ffnn_post": init_time_post,
            "lstm_live": init_time_lstm
        },
        "realistic_diffs": {
            "ffnn_pre": diff_pre,
            "ffnn_post": diff_post,
            "lstm_live": diff_lstm
        },
        "benchmarks": {
            "onnx_pre": bench_onnx_pre,
            "keras_pre": bench_keras_pre,
            "rf_pre": bench_rf_pre,
            "onnx_lstm": bench_onnx_lstm,
            "keras_lstm": bench_keras_lstm,
            "rf_inn2": bench_rf_inn2
        },
        "rss_memory_mb": rss_mb
    }

    with open(os.path.join(models_dir, "onnx_inference_benchmark.json"), "w") as f:
        json.dump(results, f, indent=2)

    return results

if __name__ == "__main__":
    import pandas as pd
    test_inference_and_benchmarks()

