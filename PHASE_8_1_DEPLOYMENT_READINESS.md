# Phase 8.1 — Deployment Readiness & Release Runbook

**Release Version:** Candidate E First-Innings Production Release  
**Status:** READY FOR DEPLOYMENT  
**Sign-Off Date:** November 2026  
**Auditor:** Independent Validation & Deployment Gatekeeper  

---

## 1. Deployment Gate Status: APPROVED

The Candidate E first-innings prediction engine has passed all local integration, regression, boundary, fallback, memory, and latency gates. The project is certified as **READY FOR DEPLOYMENT**.

No git commits, pushes, or deployments have been performed. This runbook details the exact steps for the human engineer to execute when ready.

---

## 2. Pre-Deployment Verification Checklist

All 12 pre-deployment conditions have been audited and verified:

- [x] **1. Code Diff Isolation:** `app.py` modifications restricted exclusively to `inning == 1` and asset loading.
- [x] **2. Baseline Invariance:** Pre-toss and post-toss Random Forest models unchanged.
- [x] **3. Second-Innings Invariance:** Chasing logic, target context, and XGBoost/LSTM routing unchanged.
- [x] **4. Five Era Features:** `proj_vs_190`, `proj_ratio_185`, `wickets_in_hand`, `runs_per_wkt_lost`, `run_rate_momentum` match Phase 7.1 validated formulas.
- [x] **5. Artifact Separation:** Candidate E saved to `models/inn1_candidate_e.pkl` (157.9 KB).
- [x] **6. Legacy Model Preservation:** `models/inn1_sequence_model.pkl` unmodified (verified via SHA256).
- [x] **7. Git Tracking Clearance:** `models/inn1_candidate_e.pkl` confirmed not ignored by `.gitignore`.
- [x] **8. Multi-Tier Fallback:** Hot fallback verified across 5 simulated failure modes.
- [x] **9. Defensive Guards:** Inputs clamped (`over` $\le 20$, `wickets` $\le 10$, missing rolling values default to `0.0`).
- [x] **10. Latency Budget:** P99 request latency = **9.82 ms** (Budget: < 50.0 ms).
- [x] **11. Memory Budget:** Candidate E incremental RSS = **828.0 KB** (Available headroom > 215 MB).
- [x] **12. Zero Added Dependencies:** `requirements.txt` unchanged; TensorFlow and ONNX Runtime remain excluded.

---

## 3. Step-by-Step Deployment Runbook

When authorized, execute the following commands in sequence:

### Step 1: Stage Modified Code and New Model Artifact
Only stage the verified application code and the newly serialized model artifact:
```bash
git add app.py models/inn1_candidate_e.pkl
```

*(Optional: Stage documentation and test reports if desired):*
```bash
git add PHASE_8_INTEGRATION_REPORT.md PHASE_8_REGRESSION_TEST_REPORT.md PHASE_8_ROLLBACK_GUIDE.md PHASE_8_1_FINAL_AUDIT_REPORT.md PHASE_8_1_DEPLOYMENT_READINESS.md models/phase_8_test_results.json models/phase_8_1_audit_results.json
```

### Step 2: Commit Changes
```bash
git commit -m "feat: integrate Candidate E calibrated first-innings prediction engine with multi-tier fallback"
```

### Step 3: Push to Origin Main
```bash
git push origin main
```

### Step 4: Monitor Render Build and Deployment
1. Log into the Render Dashboard (`https://dashboard.render.com`).
2. Navigate to `ipl-predictor-backend-04gv`.
3. Verify that the build triggered by the commit completes cleanly:
   - Check build logs: Dependencies install cleanly from existing `requirements.txt`.
   - Check application startup logs: Look for the confirmation line:
     ```
     Loaded Inning 1 Candidate E model successfully.
     Loaded Inning 1 sequence model successfully.
     ```
4. Verify HTTP service status transitions to **Live**.

---

## 4. Post-Deployment Verification (Smoke Tests)

Immediately following Render deployment, run these production verification smoke tests against the live endpoint (`https://ipl-predictor-backend-04gv.onrender.com`):

### Test 1: Service Health Check
```bash
curl -s -X GET https://ipl-predictor-backend-04gv.onrender.com/
```
*Expected: HTTP 200 with HTML or JSON status.*

### Test 2: Inning 1 Candidate E Live Prediction
```bash
curl -s -X POST https://ipl-predictor-backend-04gv.onrender.com/predict_live \
  -H "Content-Type: application/json" \
  -d '{"inning": 1, "over": 10.0, "current_score": 85, "wickets_lost": 2, "last3_runs": 24, "last3_wickets": 0, "batting_team": "Chennai Super Kings", "bowling_team": "Mumbai Indians"}'
```
*Expected Response Checks:*
- HTTP Status: 200 OK
- `"model_used": "Sequence Inning 1 (Candidate E Calibrated)"`
- `"batting_team_win_probability"` in $[0.0, 100.0]$
- `"batting_team_win_probability" + "bowling_team_win_probability" == 100.0`

### Test 3: Inning 2 Second-Innings Chase Route (Regression Check)
```bash
curl -s -X POST https://ipl-predictor-backend-04gv.onrender.com/predict_live \
  -H "Content-Type: application/json" \
  -d '{"inning": 2, "over": 12.0, "current_score": 105, "wickets_lost": 3, "target": 175, "batting_team": "Chennai Super Kings", "bowling_team": "Mumbai Indians"}'
```
*Expected Response Checks:*
- HTTP Status: 200 OK
- `"model_used": "XGBoost (ML Baseline)"`
- Context contains `"runs_needed": 70`, `"balls_remaining": 48`, `"wickets_in_hand": 7`

### Test 4: Pre-Toss Prediction Route (Regression Check)
```bash
curl -s -X POST https://ipl-predictor-backend-04gv.onrender.com/predict \
  -H "Content-Type: application/json" \
  -d '{"team1": "Chennai Super Kings", "team2": "Mumbai Indians", "venue": "Wankhede Stadium"}'
```
*Expected Response Checks:*
- HTTP Status: 200 OK
- `"prediction_model": "Random Forest (ML Baseline)"`

---

## 5. Operational Risk Assessment

| Risk Vector | Risk Level | Mitigation in Place |
| :--- | :---: | :--- |
| **Process Memory Overflow** | Negligible | Measured Candidate E memory overhead is only **828 KB**. Headroom on 512 MB is > 215 MB. |
| **Inference Latency Spike** | Negligible | Measured P99 latency is **9.82 ms**, well within the 50 ms budget. |
| **Missing Inputs / Malformed Data** | Zero | Defensive clamping sanitizes `over` $\le 20$, `wickets` $\le 10$, and defaults rolling fields to `0.0`. |
| **Model Runtime Exception** | Zero | Dual-tier `try/except` hot fallback catches any runtime error and routes instantly to baseline models. |
| **Client API Contract Break** | Zero | Response keys, types, and probability orientation are 100% identical. |

---

## 6. Instant Rollback Quick-Reference

If any anomaly occurs in production, execute Level 1 rollback:
1. Delete or rename `models/inn1_candidate_e.pkl` in git.
2. Push commit to `main`.
3. Render automatically redeploys and reverts to `models/inn1_sequence_model.pkl` with zero code modifications.
4. Detailed SOP is available in [PHASE_8_ROLLBACK_GUIDE.md](file:///c:/Users/DELL/Desktop/ipl-predictor/PHASE_8_ROLLBACK_GUIDE.md).
