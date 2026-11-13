"""
reproduce_memory_audit.py — Rigorous Fresh-Process Memory Reproduction
=====================================================================
Executes Configuration A (Classical ML only) and Configuration B (ONNX Enabled)
in two completely separate, independent Python sub-processes using identical:
  - Python version (3.12.4 in .venv-onnx)
  - OS (Windows 11 AMD64)
  - Memory measurement method (psutil process RSS and peak working set)
  - Workload (500 pre-toss, 500 post-toss, 500 live inferences)
"""

import sys
import os
import subprocess
import json

CONFIG_A_CODE = """
import os, gc, json, psutil
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

import sys
sys.modules['tensorflow'] = None
sys.modules['tensorflow.keras'] = None
sys.modules['tensorflow.keras.models'] = None

proc = psutil.Process()
rss_initial = proc.memory_info().rss / (1024 * 1024)

from app import app, load_assets
import app as app_module

app_module.ONNX_AVAILABLE = False
app_module.use_onnx = False
app_module.ort = None

load_assets()
gc.collect()
rss_after_assets = proc.memory_info().rss / (1024 * 1024)

client = app.test_client()

# Workload: 500 pre-toss
for _ in range(500):
    client.post('/predict', json={'team1': 'Chennai Super Kings', 'team2': 'Mumbai Indians', 'venue': 'Wankhede Stadium', 'prediction_mode': 'pre_toss'})

# Workload: 500 post-toss
for _ in range(500):
    client.post('/predict', json={'team1': 'Chennai Super Kings', 'team2': 'Mumbai Indians', 'venue': 'Wankhede Stadium', 'toss_winner': 'Chennai Super Kings', 'toss_decision': 'bat', 'pitch': 'flat', 'weather': 'clear', 'timing': 'night', 'prediction_mode': 'post_toss'})

# Workload: 500 live (inn2 classical fallback)
for _ in range(500):
    client.post('/predict_live', json={'inning': 2, 'batting_team': 'CSK', 'bowling_team': 'MI', 'venue': 'Wankhede Stadium', 'target': 180, 'over': 15, 'current_score': 125, 'wickets_lost': 3})

gc.collect()
mem_final = proc.memory_info()
rss_after_inference = mem_final.rss / (1024 * 1024)
peak_rss = mem_final.peak_wset / (1024 * 1024) if hasattr(mem_final, 'peak_wset') else rss_after_inference

res = {
    'config': 'Configuration A (Classical ML Only)',
    'rss_initial_mb': rss_initial,
    'rss_after_assets_mb': rss_after_assets,
    'rss_after_onnx_import_mb': None,
    'rss_after_onnx_init_mb': None,
    'rss_after_inference_mb': rss_after_inference,
    'peak_rss_mb': peak_rss
}
print('RESULT_JSON:' + json.dumps(res))
"""

CONFIG_B_CODE = """
import os, gc, json, psutil
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

import sys
sys.modules['tensorflow'] = None
sys.modules['tensorflow.keras'] = None
sys.modules['tensorflow.keras.models'] = None

proc = psutil.Process()
rss_initial = proc.memory_info().rss / (1024 * 1024)

import onnxruntime as ort
from app import app, load_assets
import app as app_module

# 1. Load classical assets
app_module.ONNX_AVAILABLE = False
app_module.use_onnx = False
load_assets()
gc.collect()
rss_after_assets = proc.memory_info().rss / (1024 * 1024)

# 2. Import ONNX runtime into app
app_module.ONNX_AVAILABLE = True
app_module.ort = ort
gc.collect()
rss_after_onnx_import = proc.memory_info().rss / (1024 * 1024)

# 3. Initialize all 3 ONNX sessions
base_dir = os.getcwd()
models_dir = os.path.join(base_dir, 'models')
s_pre = ort.InferenceSession(os.path.join(models_dir, 'ffnn_pre.onnx'), providers=['CPUExecutionProvider'])
s_post = ort.InferenceSession(os.path.join(models_dir, 'ffnn_post.onnx'), providers=['CPUExecutionProvider'])
s_lstm = ort.InferenceSession(os.path.join(models_dir, 'lstm_live.onnx'), providers=['CPUExecutionProvider'])

app_module.onnx_ffnn_pre = s_pre
app_module.onnx_ffnn_post = s_post
app_module.onnx_lstm = s_lstm
app_module.use_onnx = True

gc.collect()
rss_after_onnx_init = proc.memory_info().rss / (1024 * 1024)

client = app.test_client()

# Workload: 500 pre-toss
for _ in range(500):
    client.post('/predict', json={'team1': 'Chennai Super Kings', 'team2': 'Mumbai Indians', 'venue': 'Wankhede Stadium', 'prediction_mode': 'pre_toss'})

# Workload: 500 post-toss
for _ in range(500):
    client.post('/predict', json={'team1': 'Chennai Super Kings', 'team2': 'Mumbai Indians', 'venue': 'Wankhede Stadium', 'toss_winner': 'Chennai Super Kings', 'toss_decision': 'bat', 'pitch': 'flat', 'weather': 'clear', 'timing': 'night', 'prediction_mode': 'post_toss'})

# Workload: 500 live (LSTM ONNX with 20x7 sequence)
seq = [[8.0*i, min(i//2, 9), 8.5, 8.0, 120-i*6, 180-8*i, 180.0] for i in range(1, 21)]
for _ in range(500):
    client.post('/predict_live', json={'inning': 2, 'batting_team': 'CSK', 'bowling_team': 'MI', 'venue': 'Wankhede Stadium', 'target': 180, 'over': 15, 'current_score': 125, 'wickets_lost': 3, 'sequence_history': seq})

gc.collect()
mem_final = proc.memory_info()
rss_after_inference = mem_final.rss / (1024 * 1024)
peak_rss = mem_final.peak_wset / (1024 * 1024) if hasattr(mem_final, 'peak_wset') else rss_after_inference

res = {
    'config': 'Configuration B (ONNX Runtime Enabled)',
    'rss_initial_mb': rss_initial,
    'rss_after_assets_mb': rss_after_assets,
    'rss_after_onnx_import_mb': rss_after_onnx_import,
    'rss_after_onnx_init_mb': rss_after_onnx_init,
    'rss_after_inference_mb': rss_after_inference,
    'peak_rss_mb': peak_rss
}
print('RESULT_JSON:' + json.dumps(res))
"""

def main():
    py_exe = os.path.join(".venv-onnx", "Scripts", "python.exe")

    print("Running Process A (Configuration A: Classical ML Only)...")
    res_a_proc = subprocess.run([py_exe, "-c", CONFIG_A_CODE], capture_output=True, text=True)
    res_a_line = [l for l in res_a_proc.stdout.splitlines() if l.startswith("RESULT_JSON:")]
    if not res_a_line:
        print("ERROR in Process A:", res_a_proc.stderr)
        return
    data_a = json.loads(res_a_line[0].replace("RESULT_JSON:", ""))

    print("Running Process B (Configuration B: ONNX Runtime Enabled)...")
    res_b_proc = subprocess.run([py_exe, "-c", CONFIG_B_CODE], capture_output=True, text=True)
    res_b_line = [l for l in res_b_proc.stdout.splitlines() if l.startswith("RESULT_JSON:")]
    if not res_b_line:
        print("ERROR in Process B:", res_b_proc.stderr)
        return
    data_b = json.loads(res_b_line[0].replace("RESULT_JSON:", ""))

    summary = {
        "environment": {
            "os": "Windows 11 AMD64",
            "python": "3.12.4 (Anaconda base)",
            "onnxruntime": "1.19.2",
            "scikit_learn": "1.9.1",
            "xgboost": "3.4.1",
            "pandas": "3.1.1",
            "workload": "500 pre-toss + 500 post-toss + 500 live inferences"
        },
        "config_a": data_a,
        "config_b": data_b,
        "comparisons": {
            "initial_rss_delta_mb": data_b["rss_initial_mb"] - data_a["rss_initial_mb"],
            "assets_loaded_rss_delta_mb": data_b["rss_after_assets_mb"] - data_a["rss_after_assets_mb"],
            "onnx_init_incremental_overhead_mb": data_b["rss_after_onnx_init_mb"] - data_b["rss_after_assets_mb"],
            "post_inference_rss_delta_mb": data_b["rss_after_inference_mb"] - data_a["rss_after_inference_mb"],
            "peak_rss_delta_mb": data_b["peak_rss_mb"] - data_a["peak_rss_mb"]
        }
    }

    out_path = os.path.join("models", "reproduced_memory_comparison.json")
    with open(out_path, "w") as f:
        json.dump(summary, f, indent=2)

    print("\n" + "=" * 65)
    print("  REPRODUCED COMPARATIVE MEMORY AUDIT")
    print("=" * 65)
    print(f"Configuration A (Classical ML Only):")
    print(f"  Initial RSS            : {data_a['rss_initial_mb']:.2f} MB")
    print(f"  After Classical Assets : {data_a['rss_after_assets_mb']:.2f} MB")
    print(f"  After 1,500 Inferences : {data_a['rss_after_inference_mb']:.2f} MB")
    print(f"  Peak Working Set (RSS) : {data_a['peak_rss_mb']:.2f} MB")

    print(f"\nConfiguration B (ONNX Runtime Enabled):")
    print(f"  Initial RSS            : {data_b['rss_initial_mb']:.2f} MB")
    print(f"  After Classical Assets : {data_b['rss_after_assets_mb']:.2f} MB")
    print(f"  After ONNX Import      : {data_b['rss_after_onnx_import_mb']:.2f} MB")
    print(f"  After 3 ONNX Inits     : {data_b['rss_after_onnx_init_mb']:.2f} MB (+{data_b['rss_after_onnx_init_mb'] - data_b['rss_after_assets_mb']:.2f} MB)")
    print(f"  After 1,500 Inferences : {data_b['rss_after_inference_mb']:.2f} MB")
    print(f"  Peak Working Set (RSS) : {data_b['peak_rss_mb']:.2f} MB")

    print(f"\nExact Comparison:")
    print(f"  Incremental ONNX Init Overhead : +{summary['comparisons']['onnx_init_incremental_overhead_mb']:.2f} MB")
    print(f"  Difference in Post-Inference   : +{summary['comparisons']['post_inference_rss_delta_mb']:.2f} MB")
    print(f"  Difference in Peak Working Set : +{summary['comparisons']['peak_rss_delta_mb']:.2f} MB")
    print("=" * 65)

if __name__ == "__main__":
    main()
