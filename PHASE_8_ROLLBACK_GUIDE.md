# Phase 8 — Production Rollback Guide & Incident SOP

**Document Purpose:** Standard Operating Procedure (SOP) for rolling back Candidate E first-innings integration  
**System:** IPL Predictor Web Application (`app.py`)  
**Production Host:** Render Free Tier (512 MB RAM Ceiling)  
**Legacy Fallback Model:** `models/inn1_sequence_model.pkl`  

---

## 1. Rollback Criteria & Triggers

Initiate a rollback immediately if any of the following operational conditions occur in staging or production:
1. **HTTP Error Rate:** Any increase in HTTP 500 internal server errors on `/predict_live`.
2. **Inference Latency Spike:** Average response time on `/predict_live` exceeds 50 ms over a sustained 5-minute window.
3. **Memory Exhaustion:** Process RSS on Render exceeds 400 MB (Render Free Tier limit is 512 MB).
4. **Probability Anomalies:** Output probabilities diverge significantly from cricket reality (e.g. erratic shifts on single singles, non-monotonic death over behavior).

---

## 2. Rollback Procedures

Three rollback levels are available depending on the operational scenario:

### Level 1: Zero Code Change Artifact Rollback (Fastest — Under 1 Minute)

Because `app.py` was architected with a dual-model loader, removing or renaming the Candidate E artifact automatically forces the application to load and execute the legacy baseline model on restart.

#### Execution Steps:
1. Access the deployment environment or local repository.
2. Rename or delete `models/inn1_candidate_e.pkl`:
   ```bash
   # On Linux / Render shell:
   mv models/inn1_candidate_e.pkl models/inn1_candidate_e.pkl.disabled

   # On Windows PowerShell:
   Rename-Item -Path "models\inn1_candidate_e.pkl" -NewName "inn1_candidate_e.pkl.disabled"
   ```
3. Restart the web process or trigger a restart on Render:
   - In Render Dashboard: Click **Manual Deploy** > **Restart Web Service**.
4. Confirm application boot log:
   ```
   Loaded Inning 1 sequence model successfully.
   ```
   *(Note: The log line "Loaded Inning 1 Candidate E model successfully" will be absent).*

---

### Level 2: In-Memory Hot Fallback (Zero Downtime / Instantaneous)

If the server cannot be immediately restarted, the built-in exception handler guarantees continuous uptime without manual intervention:
- If Candidate E throws any runtime exception during inference, the `try/except` block inside `/predict_live` catches the exception, logs a warning via `app.logger.warning(...)`, and instantly evaluates the prediction using `inn1_sequence_model.pkl` (`Sequence Inning 1 (ML Baseline)`).
- If `inn1_sequence_model.pkl` is also compromised, inference drops to `live_models['inn1_model']` (`XGBoost (ML Baseline)`).
- Users never experience an HTTP 500 error during model failure.

---

### Level 3: Full Git Working Tree Rollback

If a clean rollback to the pre-Phase 8 commit is required:

#### Execution Steps:
1. Verify working tree status:
   ```bash
   git status
   ```
2. Revert `app.py` to its previous state:
   ```bash
   git checkout origin/main -- app.py
   ```
3. Remove the Candidate E artifact:
   ```bash
   rm models/inn1_candidate_e.pkl
   ```
4. Verify compilation:
   ```bash
   python -m py_compile app.py
   ```
5. Run the verification test suite:
   ```bash
   python test_suite_verification.py
   ```

---

## 3. Post-Rollback Verification Checklist

Immediately following any rollback, execute the following verification steps:

- [ ] **Health Check:** `GET /` returns HTTP 200.
- [ ] **Pre-Toss Prediction:** `POST /predict` returns HTTP 200 with `Random Forest (ML Baseline)`.
- [ ] **First-Innings Live Prediction:** `POST /predict_live` with `inning: 1` returns HTTP 200 with:
  ```json
  "model_used": "Sequence Inning 1 (ML Baseline)"
  ```
- [ ] **Second-Innings Live Prediction:** `POST /predict_live` with `inning: 2` returns HTTP 200 with:
  ```json
  "model_used": "XGBoost (ML Baseline)"
  ```
- [ ] **Memory Check:** Ensure Render memory RSS stays below 150 MB.
- [ ] **Error Logs:** Confirm no recurring warnings in Render application logs.

---

## 4. Preservation of Model Assets

The legacy baseline model file:
```
models/inn1_sequence_model.pkl
```
is a permanent, version-controlled production asset.

**Important Safety Rules:**
- Never delete `models/inn1_sequence_model.pkl`.
- Never overwrite `models/inn1_sequence_model.pkl` with experimental models.
- Any future model candidate must be saved under a distinct filename (e.g., `models/inn1_candidate_<name>.pkl`).
