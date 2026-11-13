# ONNX Inference Integration & End-to-End Validation Report

## 1. Executive Summary

Phase 3 of the Deep Learning upgrade has successfully activated, validated, and benchmarked local ONNX inference across all three converted neural network models:
1. `models/ffnn_pre.onnx` (Pre-Toss Feed-Forward Neural Network)
2. `models/ffnn_post.onnx` (Post-Toss Feed-Forward Neural Network)
3. `models/lstm_live.onnx` (Second-Innings Rolling Sequence LSTM)

Both isolated model inference and end-to-end Flask API endpoints were executed within the ONNX-enabled environment (`.venv-onnx`), confirming that:
- Pre-toss predictions route to `FFNN (Deep Learning / ONNX)`.
- Post-toss predictions route to `FFNN (Deep Learning / ONNX)`.
- Inning 1 live predictions route to `Sequence Inning 1 (ML Baseline)` (the dedicated sequential model).
- Inning 2 live predictions with genuine 20x7 match sequence history route to `LSTM (Deep Learning / ONNX)`.
- Inning 2 live predictions without continuous sequence history safely route to the classical `XGBoost (ML Baseline)`.

Simultaneously, fallback testing in an environment without ONNX Runtime confirmed that the entire application boots cleanly, loads all classical models, and processes all prediction scenarios without errors. Production `requirements.txt` remains unaltered and memory-safe.

---

## 2. Root Cause Analysis: Why `use_onnx` Was `False`

In the previous production-readiness audit, the test suite reported:
```text
Loaded Inning 1 sequence model successfully.
DL engines unavailable. Using Random Forest and XGBoost baseline models.
  App booted cleanly. use_ffnn: False, use_onnx: False
```

### Technical Root Cause
1. **Host Interpreter vs Isolated Conversion Environment:**
   The host machine's default Python interpreter is Python 3.14.3 (`C:\Users\DELL\AppData\Local\Programs\Python\Python314\python.exe`). No wheel for `onnxruntime` or `tensorflow` exists for Python 3.14 on Windows.
2. **Dynamic Fallback Architecture in `app.py`:**
   Lines 17-22 in `app.py` implement safe lazy loading:
   ```python
   try:
       import onnxruntime as ort
       ONNX_AVAILABLE = True
   except (ImportError, Exception):
       ort = None
       ONNX_AVAILABLE = False
   ```
   When `test_suite_verification.py` was executed with `python test_suite_verification.py`, it invoked Python 3.14, where `import onnxruntime` raised `ModuleNotFoundError`. Consequently, `ONNX_AVAILABLE` was set to `False`, `use_onnx` remained `False`, and `app.py` safely engaged its Tier 3 classical ML fallback.
3. **Validation Under `.venv-onnx`:**
   When `app.py` runs inside `.venv-onnx` (Python 3.12.4 with `onnxruntime 1.19.2`), `ONNX_AVAILABLE` is `True`, all three ONNX sessions load, `use_onnx` is set to `True`, and all API predictions immediately utilize ONNX Runtime.

---

## 3. ONNX Runtime Session Initialization Results

All three ONNX sessions initialize with `CPUExecutionProvider` within milliseconds:

| Model ID | Artifact Path | Physical Size | Session Init Time | Input Tensor Name | Input Shape & Type | Output Tensor Name | Output Shape & Type | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `ffnn_pre` | `models/ffnn_pre.onnx` | 15,417 bytes | 14.08 ms | `input_layer` | `['unk__6', 10]` float32 | `Identity:0` | `['unk__7', 1]` float32 | INITIALIZED |
| `ffnn_post` | `models/ffnn_post.onnx` | 16,018 bytes | 3.91 ms | `input_layer_post` | `['unk__11', 12]` float32 | `Identity:0` | `['unk__12', 1]` float32 | INITIALIZED |
| `lstm_live` | `models/lstm_live.onnx` | 157,666 bytes | 19.85 ms | `input_layer_lstm` | `['unk__783', 20, 7]` float32 | `Identity:0` | `['unk__784', 1]` float32 | INITIALIZED |

Total initialization time for all three deep learning sessions is **37.84 ms**, introducing virtually zero cold-start latency.

---

## 4. Isolated Realistic Inference & Keras Comparison

Inference tests were performed on realistic IPL match situations using genuine preprocessing pipelines:

### Test Case 1: Pre-Toss Match (Chennai Super Kings vs Mumbai Indians at Wankhede)
- **Input Features (10):** Elo diff (+15.2), recent win rate diff (+0.20), venue win rate diff (-0.10), batting strength diff (+0.35), bowling strength diff (-0.25), recent batting run rate diff (+0.18), recent bowling wickets diff (+0.30), recent runs scored avg diff (-5.0), recent runs conceded avg diff (+8.0), season win rate diff (+0.15).
- **Preprocessing:** Normalized via `scaler_pre.pkl` (`StandardScaler`).
- **Keras Prediction:** `0.453028`
- **ONNX Prediction:** `0.453028`
- **Absolute Difference:** $2.980232 \times 10^{-8}$ (Tolerance $< 1.0 \times 10^{-4}$)
- **Status:** **PASSED**

### Test Case 2: Post-Toss Match (Chennai Super Kings vs Mumbai Indians, CSK Won Toss & Bat)
- **Input Features (12):** 10 Pre-toss features + toss impact (+0.05) + toss won (1.0).
- **Preprocessing:** Normalized via `scaler_post.pkl` (`StandardScaler`).
- **Keras Prediction:** `0.512879`
- **ONNX Prediction:** `0.512879`
- **Absolute Difference:** $5.960464 \times 10^{-8}$ (Tolerance $< 1.0 \times 10^{-4}$)
- **Status:** **PASSED**

### Test Case 3: Live Inning 2 Rolling Sequence (Chase of 180, Over 15, 125/3)
- **Input Features (20x7):** Sequence of 20 overs with 7 features per over `[current_score, wickets, req_rr, crr, balls_remaining, runs_needed, target]`. Overs 1-15 contain authentic cumulative scoring progression; overs 16-20 are zero-masked.
- **Keras Prediction:** `0.713859` (71.4% batting win probability)
- **ONNX Prediction:** `0.713859` (71.4% batting win probability)
- **Absolute Difference:** $0.000000 \times 10^{0}$ (Exact floating-point match)
- **Status:** **PASSED**

---

## 5. Local Flask API Endpoint Results

The Flask application was tested via its internal test client under `.venv-onnx` with all assets loaded:

| Endpoint | Test Scenario | HTTP Status | Model Used Header / Payload | Win Probability | Expected Routing | Routing Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET /` | Root Health Check | 200 OK | Static HTML served | N/A | Static File | PASSED |
| `POST /predict` | Pre-Toss Match Prediction | 200 OK | `FFNN (Deep Learning / ONNX)` | 50.72% | FFNN ONNX | PASSED |
| `POST /predict` | Post-Toss Match Prediction | 200 OK | `FFNN (Deep Learning / ONNX)` | 50.12% | FFNN ONNX | PASSED |
| `POST /predict_live` | Inning 1 Live State (Over 10, 85/2) | 200 OK | `Sequence Inning 1 (ML Baseline)` | 54.1% | Inning 1 Sequential Baseline | PASSED |
| `POST /predict_live` | Inning 2 Chase with 20x7 History | 200 OK | `LSTM (Deep Learning / ONNX)` | 71.4% | LSTM ONNX | PASSED |
| `POST /predict_live` | Inning 2 Chase without History | 200 OK | `XGBoost (ML Baseline)` | 65.8% | XGBoost ML Baseline | PASSED |

Every endpoint returned HTTP 200 with calibrated probabilities and the expected `model_used` identifiers.

---

## 6. Classical Fallback Verification (Environment without ONNX Runtime)

To prove that the application does not depend on ONNX Runtime for core availability, the test suite was executed in the host environment lacking `onnxruntime`:

1. **Boot Behavior:**
   - `app.py` catches `ImportError` on `import onnxruntime`.
   - `use_onnx` is safely initialized to `False`.
   - Classical artifacts load successfully (`model_pre.pkl`, `model_post.pkl`, `live_model.pkl`, `inn1_sequence_model.pkl`).
2. **API Behavior:**
   - `POST /predict` (Pre-Toss): HTTP 200, `model_used: "Random Forest (ML Baseline)"`.
   - `POST /predict` (Post-Toss): HTTP 200, `model_used: "Random Forest (ML Baseline)"`.
   - `POST /predict_live` (Inning 1): HTTP 200, `model_used: "Sequence Inning 1 (ML Baseline)"`.
   - `POST /predict_live` (Inning 2): HTTP 200, `model_used: "XGBoost (ML Baseline)"`.
3. **Production Safety:**
   - Production `requirements.txt` contains zero references to TensorFlow, tf2onnx, or ONNX Runtime.
   - The live Render deployment remains immune to memory exhaustion and package build timeouts.

---

## 7. Latency and Memory Performance Benchmarks

Performance was evaluated over 100 repeated inferences on CPU under identical conditions:

### Inference Latency Benchmark (100 Iterations)

| Prediction Task | Runtime Engine | Mean Latency | Median (p50) | 95th Percentile (p95) | Speedup vs Keras |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tabular Pre-Toss (10 feats)** | **ONNX Runtime CPU** | **0.010 ms** | **0.009 ms** | **0.011 ms** | **4,200x faster** |
| | Keras / TensorFlow CPU | 41.946 ms | 41.711 ms | 43.451 ms | Baseline |
| | Random Forest Classifier | 8.220 ms | 8.137 ms | 8.922 ms | 5.1x faster |
| **Sequential Inning 2 (20x7 seq)** | **ONNX LSTM CPU** | **0.865 ms** | **0.828 ms** | **1.062 ms** | **50x faster** |
| | Keras LSTM CPU | 43.852 ms | 42.735 ms | 44.936 ms | Baseline |
| | XGBoost / RF Over Model | 0.801 ms | 0.777 ms | 0.872 ms | 54x faster |

### Memory Consumption Profile (Resident Set Size - RSS)

| Runtime State | Measured Resident Memory | Memory Headroom on Render 512 MB Free Tier |
| :--- | :--- | :--- |
| **Classical ML Baseline (Production)** | **48.20 MB** | 463.80 MB free (90.6% headroom) |
| **Pure ONNX Runtime (3 models loaded + active inference)** | **63.36 MB** | 448.64 MB free (87.6% headroom) |
| **TensorFlow Full Runtime (Historical crashed state)** | **556.29 MB** | -44.29 MB (Out of Memory - Crash 137) |

ONNX Runtime requires only **15.16 MB** of additional RAM over the classical baseline, while delivering 50x to 4,200x faster execution than TensorFlow.

---

## 8. Frontend Badging Verification

Inspection of [script.js](file:///c:/Users/DELL/Desktop/ipl-predictor/script.js), [live.js](file:///c:/Users/DELL/Desktop/ipl-predictor/live.js), [index.html](file:///c:/Users/DELL/Desktop/ipl-predictor/index.html), and [live.html](file:///c:/Users/DELL/Desktop/ipl-predictor/live.html) confirmed:
- **`script.js` line 629:** Dynamically renders `Powered by ${r.prediction_model}`. When ONNX is active, the user sees `Powered by FFNN (Deep Learning / ONNX)`.
- **`live.js` lines 183-192:** Contains `showModelBadge(modelUsed)`. When ONNX LSTM is active, it renders `Powered by LSTM (Deep Learning / ONNX) — Deep Learning` with Deep Learning indigo styling. When classical models run, it displays `Powered by Sequence Inning 1 (ML Baseline)` or `Powered by XGBoost (ML Baseline)` with subtle gray styling.
- No static or misleading model badge markup exists in the HTML files.

---

## 9. Remaining Blockers & Next Actions

- **Local Validation Status:** 100% COMPLETE. Local ONNX inference, parity, routing, latency, and memory safety have been demonstrated.
- **Production Render Deployment Status:** As instructed, ONNX inference has **not** been pushed to the live Render deployment. The live Render service continues to run cleanly on commit `7b09ba6` using the lightweight classical fallback.
- **Recommended Path to Production:**
  If the user chooses to activate ONNX inference on Render in a future phase, adding `onnxruntime==1.19.2` to `requirements.txt` is memory-safe (peak RAM: 63.36 MB vs 512 MB ceiling), whereas TensorFlow must remain strictly excluded.

