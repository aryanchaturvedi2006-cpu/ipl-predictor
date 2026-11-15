# Phase 8 — Candidate E Controlled Production Integration Report

**Document Date:** November 2026  
**Integration Status:** COMPLETED LOCALLY (Pending Deployment Authorization)  
**Integrated Model:** Candidate E (Regularized & Platt-Calibrated XGBoost with Era Features)  
**Fallback Engine:** Candidate A (Legacy Sequence Inning 1 Model `models/inn1_sequence_model.pkl`)  
**Secondary Fallback:** Classical Baseline Inning 1 Model (`live_models['inn1_model']`)  
**Target Backend:** Render Free Tier (Linux x86_64, 512 MB RAM, Python 3.12 / 3.14)  

---

## 1. Executive Summary

In accordance with the approved recommendations from Phase 7.1, Candidate E has been integrated into the local production codebase as the primary first-innings prediction engine for live match requests.

All mandatory pre-integration safety requirements have been met:
1. **Artifact Separation:** Candidate E has been serialized exclusively to `models/inn1_candidate_e.pkl` (158.0 KB). The legacy production model `models/inn1_sequence_model.pkl` was left completely untouched.
2. **Defensive Feature Extraction:** Missing rolling values default to `0.0`, `wickets_lost` is clamped to $[0, 10]$, and `over` is clamped to $[0.0, 20.0]$.
3. **Multi-Tier Safe Fallback:** If Candidate E is missing or throws any runtime exception, inference instantly falls back to the legacy sequence model (`Sequence Inning 1 (ML Baseline)`), and if that is unavailable, to the classical XGBoost model (`XGBoost (ML Baseline)`).
4. **API Contract Invariance:** All endpoints, request formats, response JSON keys, probability orientations, and second-innings prediction routes are 100% preserved.
5. **No Additional Dependencies:** TensorFlow and ONNX Runtime remain excluded. Candidate E runs entirely inside existing `scikit-learn` and `xgboost` production dependencies.

---

## 2. Pre-Integration Inspection & Schema Audit

Prior to making any modifications, the local codebase, git status, and existing model artifacts were inspected:
- **Git Branch:** `main`, working tree clean on tracked files.
- **Legacy Artifact:** `models/inn1_sequence_model.pkl` confirmed to be an `XGBClassifier` expecting 8 features: `['over', 'cum_score', 'cum_wickets', 'crr', 'balls_left', 'last3_runs', 'last3_wickets', 'projected_score']`.
- **Target Artifact:** Candidate E is a `CalibratedClassifierCV(method='sigmoid')` wrapping an `XGBClassifier(max_depth=3, n_estimators=100, lr=0.03, reg_alpha=1.0, reg_lambda=2.0)` expecting 13 features.
- **Probability Orientation:** In both models, index 1 corresponds to `batting_team_won == 1`. Probability orientation is preserved identically:
  $$ \text{batting\_win\_prob} = \text{round}(P(\text{class}=1) \times 100.0, 1) $$
  $$ \text{bowling\_win\_prob} = \text{round}(100.0 - \text{batting\_win\_prob}, 1) $$

---

## 3. Artifact Separation & Serialization

Candidate E was trained using strict match-grouped 3-fold cross-validation (`StratifiedGroupKFold`) on the 1,005 historical training matches ($\le 2023$) to ensure zero fold leakage.

### Artifact Specifications

| Attribute | Legacy Model (Candidate A) | Integrated Model (Candidate E) |
| :--- | :--- | :--- |
| **File Path** | `models/inn1_sequence_model.pkl` | `models/inn1_candidate_e.pkl` |
| **File Size** | 3.2 MB | **157.9 KB** |
| **Model Class** | `xgboost.sklearn.XGBClassifier` | `sklearn.calibration.CalibratedClassifierCV` |
| **Feature Count** | 8 | **13** |
| **Training Matches** | 1,005 matches (IPL 2008–2023) | 1,005 matches (IPL 2008–2023) |
| **Training Snapshots** | 19,944 snapshots | 19,944 snapshots |
| **2026 Test Accuracy** | 56.77% | **57.68%** |
| **2026 Test Log-Loss** | 0.7795 | **0.7193** (-0.0602 reduction) |
| **2026 Test Brier Score** | 0.2703 | **0.2578** (-0.0125 reduction) |

**Integrity Verification:**
The modification timestamp and byte contents of `models/inn1_sequence_model.pkl` were verified before and after serialization of Candidate E. The legacy artifact was never overwritten or modified.

---

## 4. Defensive Feature Extraction Implementation

In `app.py` under the `/predict_live` endpoint, input preprocessing was updated to enforce defensive guards:

### 4.1 Input Sanitization & Clamping
```python
# Defensive input clamping for all innings
raw_over = float(data.get("over", 0))
raw_wickets = int(data.get("wickets_lost", 0))
current_score = max(0, int(data.get("current_score", 0)))

over = min(20.0, max(0.0, raw_over))
wickets_lost = min(10, max(0, raw_wickets))
```

### 4.2 Safe Handling of Rolling Inputs
```python
raw_l3_r = data.get("last3_runs")
raw_l3_w = data.get("last3_wickets")
last3_runs = float(raw_l3_r) if raw_l3_r is not None else 0.0
last3_wickets = float(raw_l3_w) if raw_l3_w is not None else 0.0
last3_runs = max(0.0, last3_runs)
last3_wickets = min(10.0, max(0.0, last3_wickets))
```

### 4.3 Five Validated Candidate E Era-Adjusted Features
```python
proj = current_score + (balls_remaining / 6.0) * crr if balls_remaining > 0 else float(current_score)

proj_vs_190 = float(proj - 190.0)
proj_ratio_185 = float(proj / 185.0)
wickets_in_hand = float(max(0.0, 10.0 - wickets_lost))
runs_per_wkt_lost = float(current_score / max(1.0, float(wickets_lost)))
run_rate_momentum = float((last3_runs / 3.0) - crr)
```

No external databases, lookup dictionaries, or additional network calls are used. Feature generation executes purely in memory in under 0.1 ms.

---

## 5. Multi-Tier Safe Inference & Fallback Architecture

To ensure zero downtime and absolute resilience in production, `app.py` implements a three-tier execution hierarchy for first-innings predictions:

```
[Incoming POST /predict_live (inning=1)]
                   │
                   ▼
       Is Candidate E available?
         ├── Yes ──> Try Candidate E inference
         │             ├── Success (0 <= p <= 1) ──> Return "Sequence Inning 1 (Candidate E Calibrated)"
         │             └── Exception / Out-of-bounds ──> Log warning, proceed to Tier 1
         │
         └── No ──> Proceed to Tier 1
                   │
                   ▼
       [Tier 1 Fallback] Is Legacy Sequence Model available?
         ├── Yes ──> Try Legacy Sequence inference
         │             ├── Success (0 <= p <= 1) ──> Return "Sequence Inning 1 (ML Baseline)"
         │             └── Exception ──> Log warning, proceed to Tier 2
         │
         └── No ──> Proceed to Tier 2
                   │
                   ▼
       [Tier 2 Fallback] Classical live_models['inn1_model']
                       └── Return "XGBoost (ML Baseline)"
```

### Fallback Logging
When a fallback is triggered, `app.logger.warning(...)` records the failure reason internally with stack information, while the client receives a valid HTTP 200 response with properly calculated probabilities. Internal error traces are never exposed to API users.

---

## 6. Controlled Shadow Comparison (15 Representative Scenarios)

In a controlled test execution, identical inputs were evaluated simultaneously through both Candidate E and the Legacy baseline model across 15 match situations spanning the Powerplay, Middle Overs, Death Overs, and End of Innings:

| Scenario Name | Match State | Candidate E Prob | Legacy Prob | Absolute Difference | Model Selected | Fallback Occurred |
| :--- | :--- | :---: | :---: | :---: | :--- | :---: |
| **Powerplay Normal CSK** | Ov 4.0, 32/0 (L3: 24/0) | 50.3% | 51.1% | 0.8% | Candidate E Calibrated | False |
| **Powerplay Collapse 1** | Ov 5.0, 26/3 (L3: 12/2) | 23.8% | 21.3% | 2.5% | Candidate E Calibrated | False |
| **Powerplay Aggressive** | Ov 6.0, 68/1 (L3: 36/1) | 76.3% | 73.9% | 2.4% | Candidate E Calibrated | False |
| **Middle Consolidation** | Ov 9.0, 75/2 (L3: 22/0) | 51.3% | 52.6% | 1.3% | Candidate E Calibrated | False |
| **Middle Stall** | Ov 11.0, 82/4 (L3: 14/1) | 33.1% | 29.6% | 3.5% | Candidate E Calibrated | False |
| **Middle Explosion** | Ov 13.0, 135/2 (L3: 42/0) | 78.6% | 76.7% | 1.9% | Candidate E Calibrated | False |
| **Middle Crisis 5 Down** | Ov 14.0, 98/5 (L3: 16/2) | 31.8% | 35.7% | 3.9% | Candidate E Calibrated | False |
| **Death Entry Solid** | Ov 16.0, 150/3 (L3: 34/0) | 68.7% | 70.2% | 1.5% | Candidate E Calibrated | False |
| **Death Low Total** | Ov 17.0, 122/6 (L3: 18/1) | 32.3% | 36.0% | 3.7% | Candidate E Calibrated | False |
| **Death High Pace** | Ov 18.0, 190/3 (L3: 45/0) | 79.2% | 81.3% | 2.1% | Candidate E Calibrated | False |
| **Death Late Collapse** | Ov 19.0, 155/8 (L3: 15/3) | 36.3% | 32.9% | 3.4% | Candidate E Calibrated | False |
| **Over 20 Score 165** | Ov 20.0, 165/6 (Final) | 48.6% | 49.3% | 0.7% | Candidate E Calibrated | False |
| **Over 20 Score 190** | Ov 20.0, 190/5 (Final) | 67.4% | 63.3% | 4.1% | Candidate E Calibrated | False |
| **Over 20 Score 215** | Ov 20.0, 215/4 (Final) | 79.7% | 73.7% | 6.0% | Candidate E Calibrated | False |
| **Over 20 Score 240** | Ov 20.0, 240/3 (Final) | **84.9%** | **97.6%** | **12.7%** | Candidate E Calibrated | False |

### Key Shadow Comparison Insights

1. **Elimination of Extreme Overconfidence:**  
   In the extreme high-scoring scenario (Over 20.0, score 240/3), the Legacy baseline predicted a near-certain **97.6%** win probability. Candidate E predicted **84.9%** (a 12.7% reduction). In modern T20 cricket, totals of 240 are defended frequently but not with 98% certainty. Candidate E's calibrated output avoids the severe log-loss penalty of near-certainty predictions on chase upsets.
2. **Close Agreement in Balanced Scenarios:**  
   In par scoring situations (e.g., 32/0 at Over 4.0, or 165/6 at Over 20.0), Candidate E and the Legacy model agree within 0.7% to 1.3%, showing seamless continuity.
3. **Privacy & API Hygiene:**  
   Shadow comparison metrics were tested for API leakage. The client JSON response contains zero experimental fields.

---

## 7. Performance & Operational Budget

| Metric | Target / Limit | Measured Result | Status |
| :--- | :---: | :---: | :---: |
| **Single Request Latency** | < 50.0 ms | **5.20 ms** | Passed |
| **Incremental Memory RSS** | < 50.0 MB | **0.0 MB** | Passed |
| **Package Dependencies** | Scikit-Learn + XGBoost | Unchanged | Passed |
| **Artifact Disk Footprint** | < 5.0 MB | **157.9 KB** | Passed |
| **HTTP Status Code** | 200 OK | **200 OK** | Passed |

---

## 8. Integration Verification Conclusion

Candidate E integration has been implemented and validated locally. All unit tests, regression tests, boundary tests, and fallback safety paths have passed.

Awaiting user review and authorization prior to Git commit, push, or Render deployment.
