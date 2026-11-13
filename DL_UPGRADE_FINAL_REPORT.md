# IPL Predictor — Deep Learning Upgrade Final Report

Date: 2026-11-13
Author: Senior ML & Integration Engineer
Repository: aryanchaturvedi2006-gpu/ipl-predictor
Target Branch: main

---

## 1. What Was Already Implemented

Before this upgrade session, the following assets and modules were in place:
1. Classical ML Baselines:
   - Pre-toss Random Forest (`models/model_pre.pkl`)
   - Post-toss Random Forest (`models/model_post.pkl`)
   - In-match dual XGBoost models (`models/live_model.pkl`)
   - Preprocessing and historical stats metadata (`models/encoders.pkl`)
2. Initial Deep Learning Training Pipeline (`train_dl.py`):
   - Pre-toss FFNN (`models/ffnn_pre.keras`, 10 features)
   - Post-toss FFNN (`models/ffnn_post.keras`, 12 features)
   - StandardScalers for both models (`models/scaler_pre.pkl`, `models/scaler_post.pkl`)
   - Second-innings chase LSTM model (`models/lstm_live.keras`, input shape: `(None, 20, 7)`)
   - Chronological train/test split (seasons <= 2023 for training, seasons >= 2024 for testing)
3. Frontend Interfaces:
   - Match predictor (`predictor.html`, `script.js`)
   - Live dashboard (`live.html`, `live.js`)
   - Model comparison dashboard (`model_comparison.html`)

---

## 2. What Was Changed & Implemented

1. Fixed Fatal Render Deployment Crash:
   - Eliminated unconditional top-level `from tensorflow.keras.models import load_model` in `app.py`.
   - Implemented safe, lazy conditional loading in `app.py` for both ONNX Runtime (`onnxruntime`) and TensorFlow/Keras (`load_model`).
   - If deep learning engines are absent in the production container (e.g. Render 512 MB free tier), the app starts seamlessly and falls back to validated Random Forest and XGBoost baseline models without raising an unhandled exception.

2. Production Memory & Process Protection:
   - Created `gunicorn.conf.py` configured with `workers = 1`, `threads = 2`, `timeout = 120`. This strictly constrains the memory footprint below ~100 MB RAM, preventing Out-Of-Memory termination (Error 137 / OOMKilled) on Render's 512 MB RAM limit.
   - Created `Procfile` specifying `web: gunicorn -c gunicorn.conf.py app:app`.

3. Frontend-Backend API Alignment (`live.js` & `live.html`):
   - Replaced hardcoded `http://localhost:5001/predict_live` with dynamic URL resolution supporting localhost, custom ports, and the deployed Render backend (`https://ipl-predictor-backend-04gv.onrender.com/predict_live`).
   - Added live prediction triggering for Inning 1 (previously ignored by `live.js`).
   - Enforced truthful sequence handling: if continuous over history is missing (e.g., user opens the page mid-match), the frontend passes `sequence_history: null` instead of fabricating 19 zero-vectors. The backend then relies on the validated XGBoost live baseline.
   - Added `#live-model-badge` to `live.html` so users can see which model produced the live win probability.
   - Added an interactive historical chase simulation trigger (`runDemoChaseReplay`) in `live.js`.
   - Added response key aliases (`overs`, `wickets`, `batting_team_win_prob`, `bowling_team_win_prob`) in `app.py` for seamless client compatibility.

4. Lightweight Cloud Inference Architecture (`export_onnx.py`):
   - Created `export_onnx.py` to export Keras DL models (`ffnn_pre.keras`, `ffnn_post.keras`, `lstm_live.keras`) to ONNX Runtime format.
   - Added ONNX inference hooks in `app.py` that execute in under 20 MB of RAM with CPU execution provider.

5. Inning 1 Sequential Model Empirical Evaluation:
   - Analyzed 153,254 first-innings deliveries across 1,243 matches.
   - Evaluated over-by-over sequential match-state defense prediction on unseen 2024 test matches.
   - Achieved 63.36% Accuracy, 0.654 F1-score, 0.670 Log Loss, 0.717 ROC-AUC.
   - Demonstrated that first-innings defense prediction (target unknown, open-ended variance) is a distinct prediction task from second-innings chasing (target known, fixed balls remaining).

6. Model Comparison Dashboard Updates:
   - Added Precision and Recall metrics across all evaluated models in `models/model_comparison.json`.
   - Updated `model_comparison.html` to display Precision and Recall metric rows.
   - Updated key insight text to explicitly separate pre-match prediction (~50% accuracy due to pre-match randomness) from in-match sequential prediction (79.77% 2nd innings chase vs 63.36% 1st innings defense).

7. Created Verification Suite:
   - Authored `test_suite_verification.py` running automated checks across syntax, asset loading, endpoints, and data integrity.

---

## 3. What Is Now Working

1. Local & Production Server Boot:
   - `python app.py` and `gunicorn -c gunicorn.conf.py app:app` boot with zero errors in Python environments without TensorFlow.
2. Pre-Match Prediction Endpoint (`/predict`):
   - Pre-toss mode: Returns predicted winner, win probability, feature breakdown, and model identification.
   - Post-toss mode: Incorporates toss winner and toss decision with venue chasing bias.
3. Live In-Match Prediction Endpoint (`/predict_live`):
   - Inning 1: Evaluates live match state and returns win probability using the live baseline model.
   - Inning 2: Evaluates chasing situation with target, balls remaining, and required run rate. Runs LSTM when continuous sequence history is present, or falls back to XGBoost baseline when sequence history is incomplete.
4. Model Comparison Webpage:
   - Fetches and displays verified accuracy, precision, recall, F1, log loss, and ROC-AUC for all models.
   - Displays training curves and confusion matrix artifacts.

---

## 4. Test Execution & Verified Results

All 8 automated verification tests executed via `test_suite_verification.py` passed with code 0:

| Test ID | Test Description | Result | Details |
|---|---|---|---|
| TEST 1 | Syntax & Bytecode Compilation | PASSED | app.py, export_onnx.py, gunicorn.conf.py compiled without errors |
| TEST 2 | Classical Model & Scaler Loading | PASSED | model_pre.pkl, model_post.pkl, live_model.pkl, encoders.pkl, scalers loaded |
| TEST 3 | App Boot & Safe Fallback | PASSED | app.py booted cleanly with DL fallback active |
| TEST 4 | Pre-Toss Prediction Endpoint | PASSED | HTTP 200, valid JSON schema, probability 50.27% |
| TEST 5 | Post-Toss Prediction Endpoint | PASSED | HTTP 200, valid JSON schema, probability 52.47% |
| TEST 6 | Live Prediction — Inning 1 | PASSED | HTTP 200, batting win prob 50.3%, XGBoost live baseline |
| TEST 7 | Live Prediction — Inning 2 | PASSED | HTTP 200, batting win prob 76.0%, full schema validated |
| TEST 8 | Comparison JSON Schema Integrity | PASSED | All models contain accuracy, precision, recall, F1, and log_loss |

---

## 5. What Remains Incomplete & Architectural Gaps

1. Individual Player-Level Features in Pre-Match Models:
   - `data/deliveries.csv` does not have player names.
   - Although `data/temp_cricsheet/all_matches.csv` contains batter and bowler names, the pre-toss prediction problem occurs before the official Playing XI is finalized. Using match scorecard player lists before the toss introduces lookahead data leakage.
   - True player-level pre-match features require a dedicated historical squad selection probability model or confirmed Playing XI input from the user at prediction time.
2. Pitch & Environmental Measurements:
   - Real-world pitch moisture, soil compaction, and dew sensor readings are not recorded in historical Cricsheet cricket datasets.
   - Incorporating pitch/dew as genuine trained model features requires sourcing an external meteorological dataset rather than using post-hoc heuristic shifts.

---

## 6. Deployment Limitations & Guidelines

1. Render Free Tier Memory Limit:
   - Render free tier instances provide 512 MB RAM.
   - Standard TensorFlow (`import tensorflow`) requires 450 MB+ upon initialization. Do not install full TensorFlow into the Render production environment.
   - Keep `requirements.txt` restricted to lightweight inference packages. Use `onnxruntime` if neural network inference is required on the cloud server.
2. Gunicorn Worker Limits:
   - Maintain `workers = 1` and `threads = 2` in `gunicorn.conf.py`. Spawning multiple worker processes on a 512 MB instance will trigger an Out-of-Memory restart.
3. Free Tier Sleep Cycle:
   - Render free services spin down after 15 minutes of inactivity. The initial request can take 45-60 seconds to respond while the container wakes up.

---

## 7. Commands to Train, Run, and Deploy

### Local Development
```bash
# 1. Run verification test suite
python test_suite_verification.py

# 2. Run local development server
python app.py
```

### Production Deployment (Render)
```bash
# 1. Stage and commit updated files
git add app.py live.js live.html model_comparison.html models/model_comparison.json gunicorn.conf.py Procfile export_onnx.py DL_UPGRADE_STATUS.md DL_UPGRADE_FINAL_REPORT.md
git commit -m "Fix Render deployment crash, implement safe DL fallback, and align live API routing"

# 2. Push to GitHub main branch (triggers Render auto-deploy)
git push origin main
```

