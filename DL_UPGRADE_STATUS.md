# IPL Predictor - Deep Learning Upgrade Status Audit

Date: 2026-11-13
Audited By: Senior ML Engineer & Full-Stack Integration Engineer
Repository: aryanchaturvedi2006-gpu/ipl-predictor
Target Branch: main

---

## 1. Executive Summary

This audit verifies the exact implementation status of the Deep Learning upgrade across data pipelines, model artifacts, backend endpoints, frontend integration, and deployment infrastructure. Every item below has been verified directly against the underlying codebase and model files.

---

## 2. Completed Tasks

1. Baseline Models:
   - Pre-toss Random Forest: Saved at models/model_pre.pkl (10 tabular features).
   - Post-toss Random Forest: Saved at models/model_post.pkl (12 tabular features).
   - In-match baseline XGBoost: Saved at models/live_model.pkl (separate models for Inning 1 and Inning 2).
   - Feature metadata and lookup dicts: Saved at models/encoders.pkl (Elo ratings, recent form, venue stats, venue chasing bias, team performance).

2. FFNN Pre-Match & Post-Toss Models:
   - Architecture: Input -> Dense(64, ReLU, L2) -> Dropout(0.3) -> Dense(32, ReLU, L2) -> Dropout(0.2) -> Dense(16, ReLU, L2) -> Dropout(0.1) -> Dense(1, Sigmoid).
   - Saved Keras artifacts: models/ffnn_pre.keras (Input dimension: 10) and models/ffnn_post.keras (Input dimension: 12).
   - Preprocessing objects: models/scaler_pre.pkl and models/scaler_post.pkl (StandardScaler fitted on <= 2023 train seasons).
   - Data Leakage Prevention: Temporal split enforced (Train seasons <= 2023, Test seasons >= 2024).
   - Symmetrized inference: Symmetrized prediction logic implemented in app.py to enforce mathematical neutrality regardless of team order.

3. Second-Innings LSTM In-Match Model:
   - Architecture: Input(shape=(20, 7)) -> Masking(0.0) -> LSTM(64, return_sequences=True) -> Dropout(0.3) -> LSTM(32) -> Dropout(0.2) -> Dense(16, ReLU) -> Dense(1, Sigmoid).
   - Saved Keras artifact: models/lstm_live.keras.
   - Metadata: models/lstm_metadata.json recording sequence length (20), 7 features (score, wickets, current_rr, required_rr, balls_left, last3_runs, last3_wickets), temporal split, and checkpoint accuracies (Over 5: 71.36%, Over 10: 79.15%, Over 15: 86.00%, Over 20: 91.51%).
   - Backend Integration: app.py /predict_live accepts sequence_history and invokes LSTM when a valid 20x7 sequence is provided.

4. Model Comparison Evaluation & Static Dashboard:
   - Evaluation metrics computed and stored in models/model_comparison.json.
   - Training curves and confusion matrices generated in models/plots/.
   - Webpage model_comparison.html created with interactive tab navigation, metric comparisons, and confusion matrix galleries.

---

## 3. Partially Completed Tasks

1. Live Match Integration (live.js & app.py):
   - Sequence generation exists in live.js (buildPaddedSequence), but it only accumulates overs dynamically if the user keeps the tab open for the entire innings.
   - Opening live.html mid-match creates a sequence with only 1 real step and 19 zero-padded steps, causing severe distribution shift against the model trained on full over histories.
   - API endpoint routing in live.js is hardcoded to localhost:5001.

2. Pitch, Weather, and Dew Modeling:
   - Pitch type, weather condition, wind, and day/night timing are received as optional parameters in app.py /predict.
   - These are NOT trained features in the FFNN or baseline models.
   - Instead, arbitrary heuristic probability adjustments (e.g., +0.015 shift) are manually added to model outputs in app.py, which distorts probability calibration.

3. Model Comparison Dashboard:
   - model_comparison.json stores Accuracy, F1-Score, Log Loss, and ROC-AUC.
   - Precision and Recall are missing from the JSON schema and comparison table.
   - Live LSTM metrics (79.77% on in-match states) are displayed alongside pre-match predictions (48-51%) without sufficient distinction that these represent fundamentally different prediction tasks.

---

## 4. Pending Tasks

1. Individual Player-Level Features:
   - The primary dataset used for training (data/deliveries.csv) contains only: ['match_id', 'innings', 'batting_team', 'bowling_team', 'over', 'ball', 'total_runs', 'is_wicket'].
   - Striker, bowler, and dismissal details were stripped out when deliveries.csv was compiled.
   - Rich ball-by-ball data exists in data/temp_cricsheet/all_matches.csv (with columns 'striker', 'non_striker', 'bowler', 'runs_off_bat', 'wicket_type', etc.), but has not been connected to the feature pipeline.

2. First-Innings In-Match Sequential Model:
   - The current LSTM model is strictly trained on 2nd innings run chases (requires target, required run rate, and balls left).
   - Inning 1 live predictions currently rely entirely on the classical XGBoost baseline (inn1_model).
   - A dedicated 1st-innings sequential model (predicting final projected score range and win probability) is not yet implemented.

3. Cloud Deployment Optimization (ONNX Export):
   - All DL models exist only in Keras v3 format (.keras).
   - No ONNX models or onnxruntime inference handlers currently exist.

4. Production Memory Profiling:
   - Gunicorn configuration is not formally defined via a configuration file or Procfile, defaulting to multiple sync workers which can exceed Render's 512 MB RAM ceiling.

---

## 5. Identified Bugs & Vulnerabilities

1. BUG 1 (Fatal Deployment Crash - Active):
   - Location: app.py, Line 15.
   - Code: from tensorflow.keras.models import load_model.
   - Impact: requirements.txt does not contain tensorflow. Render crashes during gunicorn app:app with ModuleNotFoundError: No module named 'tensorflow'. This is the root cause of the latest failed deployments (commits 06e044a and 1ec50b5).

2. BUG 2 (Render Free Tier 512MB RAM Ceiling):
   - Location: Dependency management / deployment architecture.
   - Impact: Adding tensorflow to requirements.txt causes build timeouts or runtime Out-Of-Memory termination (Error 137) because TensorFlow's base memory footprint exceeds 450MB.

3. BUG 3 (Hardcoded Localhost API in Frontend):
   - Location: live.js, Line 2.
   - Code: const PREDICT_API = "http://localhost:5001/predict_live";
   - Impact: When deployed on Render or accessed remotely, live prediction fails due to network connection rejection.

4. BUG 4 (First-Innings In-Play Requests Bypassed):
   - Location: live.js, Line 99.
   - Code: if (isSecondInnings && target) { ... await getLivePrediction(...) }
   - Impact: Live predictions are never requested during the first innings, leaving the first innings live dashboard completely non-functional.

5. BUG 5 (Manual Heuristic Probability Shifts Overriding ML Predictions):
   - Location: app.py, Lines 341-361.
   - Impact: Post-hoc +/-0.015 probability shifts applied based on pitch and weather inputs override calibrated model probabilities and can push predictions into uncalibrated states.

---

## 6. Recommended Implementation Order

1. Phase 1: Deployment & Safe Fallback Architecture
   - Implement safe lazy loading and conditional imports in app.py so the server runs cleanly even if TensorFlow or ONNX is unavailable.
   - Configure requirements.txt and gunicorn execution with a single worker and dual threads for strict memory management.

2. Phase 2: Frontend-Backend API Harmonization & Live Routing
   - Update live.js with dynamic API URL resolution.
   - Support both Inning 1 and Inning 2 live requests.
   - Add a historical sequence reconstruction / replay mode so mid-match lookups do not inject artificial 19-zero vectors into the LSTM.

3. Phase 3: ONNX Conversion & Lightweight Cloud Inference
   - Export ffnn_pre.keras, ffnn_post.keras, and lstm_live.keras to ONNX format.
   - Validate numerical parity between Keras and ONNX outputs within 1e-4 tolerance.
   - Implement onnxruntime inference in app.py with local Keras fallback.

4. Phase 4: First-Innings In-Match Sequence Modeling
   - Construct an over-by-over sequence dataset for first innings matches from deliveries.csv.
   - Train and evaluate a dedicated Inning 1 sequential model.
   - Validate metrics and save separate metadata.

5. Phase 5: Player-Level Feature Pipeline Feasibility & Integration
   - Assess data/temp_cricsheet/all_matches.csv for player career and head-to-head aggregation.
   - Determine whether player features yield measurable statistical lift without introducing data leakage.

6. Phase 6: Model Comparison Dashboard Updates
   - Add Precision, Recall, and calibration metrics to model_comparison.json.
   - Update model_comparison.html to explicitly clarify the evaluation differences between pre-match tabular models and in-play sequential models.

7. Phase 7: Verification & Final Documentation
   - Execute all verification tests (syntax, model loading, prediction parity, API response contracts, fallback behavior).
   - Produce DL_UPGRADE_FINAL_REPORT.md.

