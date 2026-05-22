from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import numpy as np
import os

from src.features import TEAM_MAPPING
from src.iplt20_api import IPLT20API

app = Flask(__name__)
CORS(app)

MODEL_PATH = "models/model.pkl"
ENCODERS_PATH = "models/encoders.pkl"
LIVE_MODEL_PATH = "models/live_model.pkl"

model = None
metadata = None
live_models = None
elo_dict = {}
recent_form_dict = {}
venue_stats_dict = {}
venue_overall = {}
h2h_stats = {}
team_perf = {}
valid_teams = []

ipl_api = IPLT20API()


def load_assets():
    global model, metadata, live_models, elo_dict, recent_form_dict
    global venue_stats_dict, venue_overall, h2h_stats, team_perf, valid_teams

    if not os.path.exists(MODEL_PATH) or not os.path.exists(ENCODERS_PATH):
        raise FileNotFoundError("Model files not found. Run train.py first.")

    model = joblib.load(MODEL_PATH)
    metadata = joblib.load(ENCODERS_PATH)

    elo_dict = metadata.get("elo", {})
    recent_form_dict = metadata.get("recent_form", {})
    venue_stats_dict = metadata.get("venue_stats", {})
    venue_overall = metadata.get("venue_overall", {})
    h2h_stats = metadata.get("h2h_stats", {})
    team_perf = metadata.get("team_perf", {})
    valid_teams = metadata.get("all_teams", [])

    if os.path.exists(LIVE_MODEL_PATH):
        live_models = joblib.load(LIVE_MODEL_PATH)


load_assets()


def clean_team_name(name):
    if not name:
        return name
    stripped = str(name).strip()
    return TEAM_MAPPING.get(stripped, stripped)


def get_strength(team):
    perf = team_perf.get(team, [])
    if not perf:
        return {'bat_score': 50.0, 'bowl_score': 50.0}

    pp_rr = np.mean([p['bat'].get('powerplay_runs', 0) / 6.0 for p in perf])
    mid_rr = np.mean([p['bat'].get('middle_runs', 0) / 9.0 for p in perf])
    death_rr = np.mean([p['bat'].get('death_runs', 0) / 5.0 for p in perf])
    avg_score = np.mean([sum(p['bat'].get(k, 0) for k in ['powerplay_runs', 'middle_runs', 'death_runs']) for p in perf])
    chases = [p['chased_won'] for p in perf if p['chased_won'] is not None]
    chase_pct = np.mean(chases) if chases else 0.5

    pp_wkts = np.mean([p['bowl'].get('powerplay_wkts', 0) for p in perf])
    death_econ_list = [p['bowl'].get('death_runs', 0) / max(1, p['bowl'].get('death_overs', 5.0)) for p in perf]
    death_econ = np.mean(death_econ_list) if death_econ_list else 10.0
    avg_wkts = np.mean([sum(p['bowl'].get(k, 0) for k in ['powerplay_wkts', 'middle_wkts', 'death_wkts']) for p in perf])
    defends = [p['defended_won'] for p in perf if p['defended_won'] is not None]
    defend_pct = np.mean(defends) if defends else 0.5

    bat_score = (pp_rr * 2) + (mid_rr * 1) + (death_rr * 3) + (chase_pct * 20) + (avg_score * 0.1)
    bowl_score = (pp_wkts * 10) - (death_econ * 2) + (avg_wkts * 2) + (defend_pct * 20)

    return {'bat_score': bat_score, 'bowl_score': bowl_score}


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

    raw_t1 = str(data.get('team1', '')).strip()
    raw_t2 = str(data.get('team2', '')).strip()
    venue = str(data.get('venue', '')).strip()
    raw_toss_winner = str(data.get('toss_winner', '')).strip()
    toss_decision = str(data.get('toss_decision', '')).strip().lower()

    prediction_mode = 'pre_toss' if not raw_toss_winner or not toss_decision else 'post_toss'

    t1 = clean_team_name(raw_t1)
    t2 = clean_team_name(raw_t2)
    toss_winner = clean_team_name(raw_toss_winner)

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
    f1 = recent_form_dict.get(t1, [])[-5:]
    f2 = recent_form_dict.get(t2, [])[-5:]
    form_diff = (np.mean(f1) if f1 else 0.5) - (np.mean(f2) if f2 else 0.5)

    v1_wins, v1_matches = venue_stats_dict.get(f"{t1}_{venue}", venue_stats_dict.get((t1, venue), [0, 0]))
    v2_wins, v2_matches = venue_stats_dict.get(f"{t2}_{venue}", venue_stats_dict.get((t2, venue), [0, 0]))
    venue_diff = (v1_wins / v1_matches if v1_matches > 0 else 0.5) - (v2_wins / v2_matches if v2_matches > 0 else 0.5)

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

    st1 = get_strength(t1)
    st2 = get_strength(t2)
    bat_diff = st1['bat_score'] - st2['bat_score']
    bowl_diff = st1['bowl_score'] - st2['bowl_score']

    input_data = pd.DataFrame([{
        "elo_diff": elo_diff,
        "form_diff": form_diff,
        "venue_diff": venue_diff,
        "batting_strength_diff": bat_diff,
        "bowling_strength_diff": bowl_diff,
        "toss_impact": t1_toss_adv
    }])

    proba = model.predict_proba(input_data)[0]
    prob_t2 = float(proba[0])
    prob_t1 = float(proba[1])
    predicted_winner = raw_t1 if prob_t1 >= prob_t2 else raw_t2

    pair = tuple(sorted([t1, t2]))
    h2h_key = f"{pair[0]}_vs_{pair[1]}"
    h2h_data = h2h_stats.get(h2h_key, {'wins': {}, 'last_5': [], 'max_margin': {}})

    response = {
        "prediction_mode": prediction_mode,
        "predicted_winner": predicted_winner,
        "probabilities": {raw_t1: round(prob_t1, 4), raw_t2: round(prob_t2, 4)},
        "feature_values_used": {
            "elo_diff": round(elo_diff, 2),
            "form_diff": round(form_diff, 4),
            "venue_diff": round(venue_diff, 4),
            "batting_strength_diff": round(bat_diff, 2),
            "bowling_strength_diff": round(bowl_diff, 2),
            "toss_impact": round(t1_toss_adv, 4)
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

    balls_completed = int(over * 6)
    balls_remaining = max(0, 120 - balls_completed)
    crr = (current_score / balls_completed * 6) if balls_completed > 0 else 0.0

    runs_needed = -1
    req_rr = 0.0

    if inning == 1:
        features = live_models['features_inn1']
        X = pd.DataFrame([{
            'over': over, 'current_score': current_score,
            'wickets_lost': wickets_lost, 'crr': crr
        }])[features]
        live_model = live_models['inn1_model']
    else:
        features = live_models['features_inn2']
        runs_needed = max(0, target - current_score) if target > 0 else 0
        req_rr = (runs_needed / balls_remaining * 6) if balls_remaining > 0 and runs_needed > 0 else (0.0 if runs_needed <= 0 else 99.0)
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


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
