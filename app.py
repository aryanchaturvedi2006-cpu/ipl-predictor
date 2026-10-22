import os
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
import logging
logging.getLogger("tensorflow").setLevel(logging.ERROR)

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import joblib
import pandas as pd
import numpy as np
import json
import urllib.request
import urllib.error
from tensorflow.keras.models import load_model

env_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            if line.startswith('GEMINI_API_KEY='):
                os.environ['GEMINI_API_KEY'] = line.strip().split('=', 1)[1]

from src.features import TEAM_MAPPING
from src.iplt20_api import IPLT20API

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

@app.route("/")
def serve_index():
    return send_from_directory(".", "index.html")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PRE_PATH = os.path.join(BASE_DIR, "models", "model_pre.pkl")
MODEL_POST_PATH = os.path.join(BASE_DIR, "models", "model_post.pkl")
ENCODERS_PATH = os.path.join(BASE_DIR, "models", "encoders.pkl")
LIVE_MODEL_PATH = os.path.join(BASE_DIR, "models", "live_model.pkl")

model_pre = None
model_post = None
metadata = None
live_models = None
elo_dict = {}
recent_form_dict = {}
venue_stats_dict = {}
venue_overall = {}
h2h_stats = {}
team_perf = {}
valid_teams = []
season_form_dict = {}

ffnn_pre = None
ffnn_post = None
scaler_pre = None
scaler_post = None
use_ffnn = False
lstm_live = None

ipl_api = IPLT20API()


def load_assets():
    global model_pre, model_post, metadata, live_models, elo_dict, recent_form_dict
    global venue_stats_dict, venue_overall, h2h_stats, team_perf, valid_teams
    global ffnn_pre, ffnn_post, scaler_pre, scaler_post, use_ffnn, lstm_live
    global season_form_dict

    if not os.path.exists(MODEL_PRE_PATH) or not os.path.exists(ENCODERS_PATH):
        raise FileNotFoundError("Model files not found. Run train.py first.")

    model_pre = joblib.load(MODEL_PRE_PATH)
    model_post = joblib.load(MODEL_POST_PATH)
    metadata = joblib.load(ENCODERS_PATH)

    elo_dict = metadata.get("elo", {})
    recent_form_dict = metadata.get("recent_form", {})
    venue_stats_dict = metadata.get("venue_stats", {})
    venue_overall = metadata.get("venue_overall", {})
    h2h_stats = metadata.get("h2h_stats", {})
    team_perf = metadata.get("team_perf", {})
    valid_teams = metadata.get("all_teams", [])
    season_form_dict = metadata.get("season_form", {})

    if os.path.exists(LIVE_MODEL_PATH):
        live_models = joblib.load(LIVE_MODEL_PATH)
        
    try:
        ffnn_pre = load_model(os.path.join(BASE_DIR, "models", "ffnn_pre.keras"))
        ffnn_post = load_model(os.path.join(BASE_DIR, "models", "ffnn_post.keras"))
        scaler_pre = joblib.load(os.path.join(BASE_DIR, "models", "scaler_pre.pkl"))
        scaler_post = joblib.load(os.path.join(BASE_DIR, "models", "scaler_post.pkl"))
        use_ffnn = True
    except Exception as e:
        print(f"Failed to load FFNN models, falling back to Random Forest. Error: {e}")
        use_ffnn = False

    try:
        lstm_live = load_model(os.path.join(BASE_DIR, "models", "lstm_live.keras"))
        print("Loaded LSTM live model.")
    except Exception as e:
        print(f"Failed to load LSTM live model: {e}")
        lstm_live = None


load_assets()


def clean_team_name(name):
    if not name:
        return name
    stripped = str(name).strip()
    return TEAM_MAPPING.get(stripped, stripped)


FEATURES_PRE = [
    "elo_diff", "recent_win_rate_diff", "venue_win_rate_diff",
    "batting_strength_diff", "bowling_strength_diff",
    "recent_bat_run_rate_diff", "recent_bowl_wkts_diff",
    "recent_runs_scored_avg_diff", "recent_runs_conceded_avg_diff",
    "season_win_rate_diff"
]
FEATURES_POST = FEATURES_PRE + ["toss_impact", "toss_won"]


def get_strength_app(team):
    perf = team_perf.get(team, [])
    if not perf:
        return {
            'bat_score': 50.0, 'bowl_score': 50.0,
            'recent_bat_rr': 0.0, 'recent_bowl_wkts': 0.0,
            'recent_runs_scored_avg': 0.0, 'recent_runs_conceded_avg': 0.0
        }
    
    pp_rr = np.mean([p['bat'].get('powerplay_runs', 0) / 6.0 for p in perf])
    mid_rr = np.mean([p['bat'].get('middle_runs', 0) / 9.0 for p in perf])
    death_rr = np.mean([p['bat'].get('death_runs', 0) / 5.0 for p in perf])
    avg_score = np.mean([sum(p['bat'].get(k, 0) for k in ['powerplay_runs', 'middle_runs', 'death_runs']) for p in perf])
    chases = [p['chased_won'] for p in perf if p['chased_won'] is not None]
    chase_pct = np.mean(chases) if chases else 0.5
    
    pp_wkts = np.mean([p['bowl'].get('powerplay_wkts', 0) for p in perf])
    death_econ_list = [p['bowl'].get('death_runs', 0) / max(1.0, float(p['bowl'].get('death_overs', 0))) for p in perf if p['bowl'].get('death_overs', 0) > 0]
    death_econ = np.mean(death_econ_list) if death_econ_list else 10.0
    avg_wkts = np.mean([sum(p['bowl'].get(k, 0) for k in ['powerplay_wkts', 'middle_wkts', 'death_wkts']) for p in perf])
    defends = [p['defended_won'] for p in perf if p['defended_won'] is not None]
    defend_pct = np.mean(defends) if defends else 0.5
    
    bat_score = (pp_rr * 2) + (mid_rr * 1) + (death_rr * 3) + (chase_pct * 20) + (avg_score * 0.1)
    bowl_score = (pp_wkts * 10) - (death_econ * 2) + (avg_wkts * 2) + (defend_pct * 20)
    
    bat_runs_sum = sum(sum(p['bat'].get(k, 0) for k in ['powerplay_runs', 'middle_runs', 'death_runs']) for p in perf)
    bat_overs_sum = sum(sum(p['bat'].get(k, 0) for k in ['powerplay_overs', 'middle_overs', 'death_overs']) for p in perf)
    recent_bat_rr = bat_runs_sum / max(1.0, bat_overs_sum)
    
    recent_bowl_wkts = np.mean([sum(p['bowl'].get(k, 0) for k in ['powerplay_wkts', 'middle_wkts', 'death_wkts']) for p in perf])
    recent_runs_scored_avg = np.mean([sum(p['bat'].get(k, 0) for k in ['powerplay_runs', 'middle_runs', 'death_runs']) for p in perf])
    recent_runs_conceded_avg = np.mean([sum(p['bowl'].get(k, 0) for k in ['powerplay_runs', 'middle_runs', 'death_runs']) for p in perf])
    
    return {
        'bat_score': bat_score, 'bowl_score': bowl_score,
        'recent_bat_rr': recent_bat_rr, 'recent_bowl_wkts': recent_bowl_wkts,
        'recent_runs_scored_avg': recent_runs_scored_avg,
        'recent_runs_conceded_avg': recent_runs_conceded_avg
    }

get_strength = get_strength_app


def get_latest_season_form(team):
    team_keys = [k for k in season_form_dict.keys() if k.startswith(f"{team}_")]
    if not team_keys:
        return 0.5
    latest_key = sorted(team_keys, key=lambda x: str(x.split('_')[1]))[-1]
    history = season_form_dict[latest_key]
    return np.mean(history) if history else 0.5


# ============================================================
# POST /predict  — Pre-Match (Pre-Toss or Post-Toss)
# ============================================================
@app.route("/predict", methods=["POST"])
def predict():
    """
    Pre-match prediction supporting Pre-Toss and Post-Toss modes.
    Required: team1, team2, venue
    Optional: toss_winner, toss_decision (omit for Pre-Toss mode)
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid JSON payload."}), 400

    for f in ["team1", "team2", "venue"]:
        if f not in data or not data[f]:
            return jsonify({"error": f"Missing required field: {f}"}), 400

    raw_t1 = str(data['team1']).strip()
    raw_t2 = str(data['team2']).strip()
    t1 = clean_team_name(raw_t1)
    t2 = clean_team_name(raw_t2)
    venue = str(data['venue']).strip()
    
    toss_winner_raw = data.get('toss_winner')
    toss_decision_raw = data.get('toss_decision')
    toss_winner = clean_team_name(str(toss_winner_raw).strip()) if toss_winner_raw else None
    toss_decision = str(toss_decision_raw).strip().lower() if toss_decision_raw else None

    pitch = str(data.get('pitch') or 'flat').strip().lower()
    weather = str(data.get('weather') or 'sunny').strip().lower()
    wind = str(data.get('wind') or 'calm').strip().lower()
    timing = str(data.get('timing') or 'night').strip().lower()
    
    if (toss_winner and not toss_decision) or (toss_decision and not toss_winner):
        return jsonify({"error": "Both toss_winner and toss_decision are required for post-toss predictions."}), 400

    prediction_mode = 'post_toss' if toss_winner and toss_decision else 'pre_toss'

    invalid_teams = []
    if t1 not in valid_teams: invalid_teams.append(f"team1 ({raw_t1})")
    if t2 not in valid_teams: invalid_teams.append(f"team2 ({raw_t2})")
    if invalid_teams:
        return jsonify({"error": f"Unknown team(s): {', '.join(invalid_teams)}"}), 400
    if t1 == t2:
        return jsonify({"error": "team1 and team2 must be different."}), 400

    if prediction_mode == 'post_toss':
        if toss_winner not in [t1, t2]:
            return jsonify({"error": f"toss_winner must be {raw_t1} or {raw_t2}."}), 400
        if toss_decision not in ["bat", "bowl", "field"]:
            return jsonify({"error": "toss_decision must be 'bat' or 'field'."}), 400
        if toss_decision == "bowl":
            toss_decision = "field"

    # Features
    elo_diff = elo_dict.get(t1, 1500.0) - elo_dict.get(t2, 1500.0)
    f1 = recent_form_dict.get(t1, [])[-10:]
    f2 = recent_form_dict.get(t2, [])[-10:]
    recent_win_rate_diff = (np.mean(f1) if f1 else 0.5) - (np.mean(f2) if f2 else 0.5)

    v1_wins, v1_matches = venue_stats_dict.get(f"{t1}_{venue}", venue_stats_dict.get((t1, venue), [0, 0]))
    v2_wins, v2_matches = venue_stats_dict.get(f"{t2}_{venue}", venue_stats_dict.get((t2, venue), [0, 0]))
    venue_win_rate_diff = (v1_wins / v1_matches if v1_matches > 0 else 0.5) - (v2_wins / v2_matches if v2_matches > 0 else 0.5)

    vo = venue_overall.get(venue, {'matches': 0, 'bat_first_wins': 0})
    chase_adv = 0
    if vo['matches'] >= 5:
        chase_adv = 0.5 - (vo['bat_first_wins'] / vo['matches'])

    t1_toss_adv = 0.0
    toss_swing_info = None

    if prediction_mode == 'post_toss':
        if toss_winner == t1:
            t1_toss_adv = chase_adv if toss_decision == 'field' else -chase_adv
        elif toss_winner == t2:
            t1_toss_adv = -chase_adv if toss_decision == 'field' else chase_adv
    else:
        toss_swing_info = f'If {raw_t1} wins toss and chases, probability may shift by {(chase_adv * 100):.1f}%'

    st1 = get_strength_app(t1)
    st2 = get_strength_app(t2)
    batting_strength_diff = st1['bat_score'] - st2['bat_score']
    bowling_strength_diff = st1['bowl_score'] - st2['bowl_score']
    recent_bat_run_rate_diff = st1['recent_bat_rr'] - st2['recent_bat_rr']
    recent_bowl_wkts_diff = st1['recent_bowl_wkts'] - st2['recent_bowl_wkts']
    recent_runs_scored_avg_diff = st1['recent_runs_scored_avg'] - st2['recent_runs_scored_avg']
    recent_runs_conceded_avg_diff = st1['recent_runs_conceded_avg'] - st2['recent_runs_conceded_avg']

    sf1 = get_latest_season_form(t1)
    sf2 = get_latest_season_form(t2)
    season_win_rate_diff = sf1 - sf2

    toss_won = 0
    if prediction_mode == 'post_toss':
        toss_won = 1 if toss_winner == t1 else 0

    input_data_pre = pd.DataFrame([{
        "elo_diff": elo_diff,
        "recent_win_rate_diff": recent_win_rate_diff,
        "venue_win_rate_diff": venue_win_rate_diff,
        "batting_strength_diff": batting_strength_diff,
        "bowling_strength_diff": bowling_strength_diff,
        "recent_bat_run_rate_diff": recent_bat_run_rate_diff,
        "recent_bowl_wkts_diff": recent_bowl_wkts_diff,
        "recent_runs_scored_avg_diff": recent_runs_scored_avg_diff,
        "recent_runs_conceded_avg_diff": recent_runs_conceded_avg_diff,
        "season_win_rate_diff": season_win_rate_diff
    }])
    
    input_data_post = pd.DataFrame([{
        "elo_diff": elo_diff,
        "recent_win_rate_diff": recent_win_rate_diff,
        "venue_win_rate_diff": venue_win_rate_diff,
        "batting_strength_diff": batting_strength_diff,
        "bowling_strength_diff": bowling_strength_diff,
        "recent_bat_run_rate_diff": recent_bat_run_rate_diff,
        "recent_bowl_wkts_diff": recent_bowl_wkts_diff,
        "recent_runs_scored_avg_diff": recent_runs_scored_avg_diff,
        "recent_runs_conceded_avg_diff": recent_runs_conceded_avg_diff,
        "season_win_rate_diff": season_win_rate_diff,
        "toss_impact": t1_toss_adv,
        "toss_won": toss_won
    }])

    if use_ffnn:
        prediction_model_used = "FFNN (Deep Learning)"
        if prediction_mode == 'pre_toss':
            X = scaler_pre.transform(input_data_pre)
            X_mir = scaler_pre.transform(-input_data_pre)
            p1 = float(ffnn_pre.predict(X, verbose=0)[0][0])
            p1_mir = float(ffnn_pre.predict(X_mir, verbose=0)[0][0])
            prob_t1 = 0.5 * (p1 + (1.0 - p1_mir))
        else:
            input_data_post_mir = input_data_post.copy()
            for col in FEATURES_PRE + ["toss_impact"]:
                input_data_post_mir[col] = -input_data_post_mir[col]
            input_data_post_mir["toss_won"] = 1 - input_data_post_mir["toss_won"]

            X = scaler_post.transform(input_data_post)
            X_mir = scaler_post.transform(input_data_post_mir)
            p1 = float(ffnn_post.predict(X, verbose=0)[0][0])
            p1_mir = float(ffnn_post.predict(X_mir, verbose=0)[0][0])
            prob_t1 = 0.5 * (p1 + (1.0 - p1_mir))
        prob_t2 = 1.0 - prob_t1
    else:
        prediction_model_used = "Random Forest (ML Baseline)"
        if prediction_mode == 'pre_toss':
            proba = model_pre.predict_proba(input_data_pre)[0]
        else:
            proba = model_post.predict_proba(input_data_post)[0]
        prob_t2 = float(proba[0])
        prob_t1 = float(proba[1])
    
    # --- EXPERT OVERLAY: ENVIRONMENTAL SHIFT ---
    shift_t1 = 0.0
    shift_t2 = 0.0

    bat_diff = batting_strength_diff
    bowl_diff = bowling_strength_diff

    if pitch in ['turning', 'green']:
        if bowl_diff > 0: shift_t1 += 0.015
        elif bowl_diff < 0: shift_t2 += 0.015
    elif pitch == 'flat':
        if bat_diff > 0: shift_t1 += 0.015
        elif bat_diff < 0: shift_t2 += 0.015
        
    if weather == 'overcast' or wind == 'breezy':
        if bowl_diff > 0: shift_t1 += 0.01
        elif bowl_diff < 0: shift_t2 += 0.01

    if timing == 'night' and prediction_mode == 'post_toss':
        t1_chasing = (toss_winner == t1 and toss_decision == 'field') or (toss_winner == t2 and toss_decision == 'bat')
        if t1_chasing: shift_t1 += 0.015
        else: shift_t2 += 0.015

    prob_t1 += shift_t1
    prob_t2 += shift_t2
    total = prob_t1 + prob_t2
    prob_t1 /= total
    prob_t2 /= total

    predicted_winner = raw_t1 if prob_t1 >= prob_t2 else raw_t2
    win_prob = max(prob_t1, prob_t2) * 100

    pair = tuple(sorted([t1, t2]))
    h2h_key = f"{pair[0]}_vs_{pair[1]}"
    h2h_data = h2h_stats.get(h2h_key, {'wins': {}, 'last_5': [], 'max_margin': {}})

    response = {
        "prediction_mode": prediction_mode,
        "predicted_winner": predicted_winner,
        "winner": predicted_winner,
        "probability": round(win_prob, 2),
        "prediction_model": prediction_model_used,
        "prediction_model_used": prediction_model_used,
        "probabilities": {raw_t1: round(prob_t1, 4), raw_t2: round(prob_t2, 4)},
        "feature_values_used": {
            "elo_diff": round(elo_diff, 2),
            "recent_win_rate_diff": round(recent_win_rate_diff, 4),
            "venue_win_rate_diff": round(venue_win_rate_diff, 4),
            "batting_strength_diff": round(batting_strength_diff, 2),
            "bowling_strength_diff": round(bowling_strength_diff, 2),
            "recent_bat_run_rate_diff": round(recent_bat_run_rate_diff, 4),
            "recent_bowl_wkts_diff": round(recent_bowl_wkts_diff, 4),
            "recent_runs_scored_avg_diff": round(recent_runs_scored_avg_diff, 2),
            "recent_runs_conceded_avg_diff": round(recent_runs_conceded_avg_diff, 2),
            "season_win_rate_diff": round(season_win_rate_diff, 4),
            "toss_impact": round(t1_toss_adv, 4),
            "toss_won": toss_won,
            "env_shift_t1": round(shift_t1, 4),
            "env_shift_t2": round(shift_t2, 4)
        },
        "informational_h2h": {
            "team1_wins": h2h_data['wins'].get(t1, 0),
            "team2_wins": h2h_data['wins'].get(t2, 0),
            "last_5": h2h_data['last_5'],
            "team1_max_margin": h2h_data['max_margin'].get(t1, 0),
            "team2_max_margin": h2h_data['max_margin'].get(t2, 0)
        }
    }

    if prediction_mode == 'pre_toss' and toss_swing_info:
        response['possible_toss_swing'] = toss_swing_info

    return jsonify(response), 200


# ============================================================
# POST /predict_live  — Live In-Match Prediction
# ============================================================
@app.route("/predict_live", methods=["POST"])
def predict_live():
    """
    Live in-match win probability using the dedicated live XGBoost model.
    Required: inning, over, current_score, wickets_lost
    For inning 2 also provide: target
    """
    if live_models is None:
        return jsonify({"error": "Live model unavailable. Run train_live.py first."}), 503

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid JSON payload."}), 400

    missing = [f for f in ["inning", "over", "current_score", "wickets_lost"] if f not in data]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    inning = int(data.get("inning", 2))
    over = float(data.get("over", 0))
    current_score = int(data.get("current_score", 0))
    wickets_lost = int(data.get("wickets_lost", 0))
    target = int(data.get("target", -1))
    batting_team = str(data.get("batting_team", "Team A"))
    bowling_team = str(data.get("bowling_team", "Team B"))

    if inning == 2 and target <= 0:
        return jsonify({"error": "A valid positive target score is required for inning 2."}), 400

    completed_overs = int(over)
    completed_balls = int(round((over - completed_overs) * 10))
    balls_completed = completed_overs * 6 + completed_balls
    balls_remaining = max(0, 120 - balls_completed)
    crr = (current_score / balls_completed * 6) if balls_completed > 0 else 0.0

    runs_needed = -1
    req_rr = 0.0

    model_used_name = "XGBoost (ML Baseline)"
    
    if inning == 1:
        features = live_models['features_inn1']
        X = pd.DataFrame([{
            'over': over, 'current_score': current_score,
            'wickets_lost': wickets_lost, 'crr': crr
        }])[features]
        live_model = live_models['inn1_model']
        proba = live_model.predict_proba(X)[0]
        batting_win_prob = round(float(proba[1]) * 100, 1)
    else:
        runs_needed = max(0, target - current_score) if target > 0 else 0
        req_rr = (runs_needed / balls_remaining * 6) if balls_remaining > 0 and runs_needed > 0 else (0.0 if runs_needed <= 0 else 99.0)
        
        used_lstm = False
        seq_hist = data.get("sequence_history")
        if lstm_live is not None and seq_hist is not None:
            try:
                if len(seq_hist) == 20 and all(len(step) == 7 for step in seq_hist):
                    seq_arr = np.array([seq_hist], dtype=np.float32)
                    lstm_prob = lstm_live.predict(seq_arr, verbose=0).flatten()[0]
                    batting_win_prob = round(float(lstm_prob) * 100, 1)
                    model_used_name = "LSTM (Deep Learning)"
                    used_lstm = True
            except Exception as e:
                print(f"LSTM prediction failed: {e}")
                
        if not used_lstm:
            features = live_models['features_inn2']
            X = pd.DataFrame([{
                'over': over, 'current_score': current_score,
                'wickets_lost': wickets_lost, 'crr': crr,
                'target': target, 'runs_needed': runs_needed,
                'balls_remaining': balls_remaining, 'req_rr': req_rr
            }])[features]
            live_model = live_models['inn2_model']
            proba = live_model.predict_proba(X)[0]
            batting_win_prob = round(float(proba[1]) * 100, 1)

    bowling_win_prob = round(100 - batting_win_prob, 1)

    pressure_index = 0
    if inning == 2 and target > 0 and balls_remaining > 0:
        pressure_index = min(100, max(0, round((req_rr - crr) * 10, 1)))

    # Momentum
    momentum = "Balanced"
    if wickets_lost >= 5:
        momentum = "Bowling team dominant"
    elif inning == 2 and runs_needed > 0 and runs_needed <= balls_remaining * 1.5 and wickets_lost <= 3:
        momentum = "Batting team gaining"
    elif inning == 2 and req_rr > crr * 1.5:
        momentum = "Bowling team on top"

    # Phase context
    if over <= 6:
        phase = "Powerplay"
    elif over <= 15:
        phase = "Middle Overs"
    else:
        phase = "Death Overs"

    return jsonify({
        "prediction_mode": "live",
        "model_used": model_used_name,
        "inning": inning,
        "phase": phase,
        "batting_team": batting_team,
        "bowling_team": bowling_team,
        "batting_team_win_probability": batting_win_prob,
        "bowling_team_win_probability": bowling_win_prob,
        "current_score": current_score,
        "wickets_lost": wickets_lost,
        "overs_completed": over,
        "target": target if target > 0 else None,
        "current_rr": round(crr, 2),
        "required_rr": round(req_rr, 2) if inning == 2 and target > 0 else None,
        "pressure_index": pressure_index,
        "momentum": momentum,
        "context": {
            "balls_remaining": balls_remaining,
            "runs_needed": int(runs_needed) if inning == 2 and target > 0 else None,
            "wickets_in_hand": 10 - wickets_lost
        }
    }), 200


# ============================================================
# GET /live_matches  — Official IPL Website
# ============================================================
@app.route("/live_matches", methods=["GET"])
def live_matches():
    """
    Fetches live match data strictly from the official IPL website (iplt20.com).
    Falls back gracefully when no match is currently live.
    """
    try:
        matches = ipl_api.get_live_matches()
        return jsonify({"matches": matches, "source": "iplt20.com"}), 200
    except Exception as e:
        return jsonify({"error": str(e), "matches": []}), 500


# ============================================================
# GET /fixtures  — Official IPL Website
# ============================================================
@app.route("/fixtures", methods=["GET"])
def fixtures():
    """
    Returns upcoming and recent IPL fixtures from iplt20.com.
    """
    try:
        upcoming = ipl_api.get_fixtures()
        return jsonify({"fixtures": upcoming, "source": "iplt20.com"}), 200
    except Exception as e:
        return jsonify({"error": str(e), "fixtures": []}), 500


# ============================================================
# GET /api/news  — Official IPL News Scraping Mock/Fallback
# ============================================================
@app.route("/api/news", methods=["GET"])
def api_news():
    news_items = [
        {
            "title": "BCCI Announces IPL 2026 Mega Auction Rules & Retention Policy",
            "description": "Retention policy updated with a maximum of 4 players per franchise allowed. Auctions to be held in late December.",
            "link": "https://www.iplt20.com/news",
            "source": "IPLT20 Official",
            "date": "2026-08-15",
            "tag": "transfer",
            "isLive": True
        },
        {
            "title": "CSK Captaincy: Ruturaj Gaikwad officially confirmed for 2026 season",
            "description": "The Chennai franchise officially announces Gaikwad at the helm, moving forward with their new era.",
            "link": "https://www.iplt20.com/news",
            "source": "Chennai Super Kings",
            "date": "2026-08-14",
            "tag": "player",
            "isLive": False
        },
        {
            "title": "Impact Player Rule Retained for IPL 2026 After Franchise Feedback",
            "description": "Despite some pushback, the IPL governing council decides to keep the popular tactical rule.",
            "link": "https://www.iplt20.com/news",
            "source": "IPLT20 Official",
            "date": "2026-08-12",
            "tag": "ipl",
            "isLive": False
        },
        {
            "title": "RCB vs MI: A classic rivalry awaits in the season opener",
            "description": "The iconic clash is set to open the 2026 season at the Chinnaswamy Stadium under lights.",
            "link": "https://www.iplt20.com/news",
            "source": "Match Preview",
            "date": "2026-08-10",
            "tag": "match",
            "isLive": False
        }
    ]
    return jsonify({"news": news_items}), 200


# ============================================================
# POST /api/argue  — Gemini AI Integration
# ============================================================
@app.route("/api/argue", methods=["POST"])
def api_argue():
    data = request.get_json(silent=True)
    if not data or 'prompt' not in data:
        return jsonify({"error": "Invalid request"}), 400

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key or api_key == "YOUR_GEMINI_API_KEY_HERE":
        return jsonify({"reply": "I would debate you, but my API key is missing from the backend .env file!"}), 200

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": data['prompt']}]}]
    }

    try:
        req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'}, method='POST')
        with urllib.request.urlopen(req, timeout=10) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            print("GEMINI RAW RESPONSE:", json.dumps(res_data, indent=2))
            
            try:
                reply = res_data['candidates'][0]['content']['parts'][0]['text'].strip()
            except (KeyError, IndexError):
                reply = ""
                
            if not reply:
                reply = "Hmm, your argument left me speechless! But I still stand by my choice."
                
            return jsonify({"reply": reply}), 200
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"Gemini API HTTP Error {e.code}: {error_body}")
        return jsonify({"reply": f"API Error {e.code}: {error_body}"}), 200
    except Exception as e:
        print(f"Gemini API General Error: {e}")
        return jsonify({"reply": f"Connection Error: {str(e)}"}), 200

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=True)
