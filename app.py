from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import numpy as np
import os

# Import standardized team mapping from features module to keep logic uniform
from src.features import TEAM_MAPPING

app = Flask(__name__)
CORS(app)

# Paths to the serialized model and metadata
MODEL_PATH = "models/model.pkl"
ENCODERS_PATH = "models/encoders.pkl"

# Global variables to hold model assets in memory
model = None
metadata = None
elo_dict = {}
recent_form_dict = {}
venue_stats_dict = {}
venue_overall = {}
h2h_stats = {}
team_perf = {}
valid_teams = []

def load_assets():
    """
    Loads the trained XGBoost model and corresponding encoders/statistics metadata.
    Initializes helper data structures for rapid real-time lookup.
    """
    global model, metadata, elo_dict, recent_form_dict, venue_stats_dict
    global venue_overall, h2h_stats, team_perf, valid_teams
    
    if not os.path.exists(MODEL_PATH) or not os.path.exists(ENCODERS_PATH):
        raise FileNotFoundError(
            "Model files not found. Please ensure train.py has been run and "
            "models/model.pkl and models/encoders.pkl exist."
        )
        
    model = joblib.load(MODEL_PATH)
    metadata = joblib.load(ENCODERS_PATH)
    
    elo_dict = metadata.get("elo", {})
    recent_form_dict = metadata.get("recent_form", {})
    venue_stats_dict = metadata.get("venue_stats", {})
    venue_overall = metadata.get("venue_overall", {})
    h2h_stats = metadata.get("h2h_stats", {})
    team_perf = metadata.get("team_perf", {})
    valid_teams = metadata.get("all_teams", [])

# Load the model assets immediately when the server starts
load_assets()

def clean_team_name(name):
    """
    Normalizes team name inputs by stripping whitespace and applying standard mapping.
    """
    if not name:
        return name
    stripped = str(name).strip()
    return TEAM_MAPPING.get(stripped, stripped)

@app.route("/predict", methods=["POST"])
def predict():
    """
    POST /predict
    """
    # 1. Parse JSON payload
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid request. Payload must be a valid JSON object."}), 400
        
    required_fields = ["team1", "team2", "venue", "toss_winner", "toss_decision"]
    missing_fields = [f for f in required_fields if f not in data or not data[f]]
    if missing_fields:
        return jsonify({"error": f"Missing required fields: {', '.join(missing_fields)}"}), 400

    # 2. Extract and clean inputs
    raw_t1 = data["team1"]
    raw_t2 = data["team2"]
    venue = str(data["venue"]).strip()
    raw_toss_winner = data["toss_winner"]
    toss_decision = str(data["toss_decision"]).strip().lower()

    t1 = clean_team_name(raw_t1)
    t2 = clean_team_name(raw_t2)
    toss_winner = clean_team_name(raw_toss_winner)

    # 3. Input Validation
    invalid_teams = []
    if t1 not in valid_teams: invalid_teams.append(f"team1 ({raw_t1})")
    if t2 not in valid_teams: invalid_teams.append(f"team2 ({raw_t2})")
    if invalid_teams:
        return jsonify({"error": f"Unknown team(s) provided: {', '.join(invalid_teams)}."}), 400

    if t1 == t2:
        return jsonify({"error": "team1 and team2 must be different teams."}), 400

    if toss_winner not in [t1, t2]:
        return jsonify({"error": f"toss_winner must be either team1 ({raw_t1}) or team2 ({raw_t2})."}), 400

    if toss_decision not in ["bat", "bowl", "field"]:
        return jsonify({"error": "toss_decision must be either 'bat' or 'field'/'bowl'."}), 400
    if toss_decision == "bowl": toss_decision = "field"

    if not venue:
        return jsonify({"error": "venue field cannot be empty."}), 400

    # 4. Dynamic Online Feature Generation
    elo_diff = elo_dict.get(t1, 1500.0) - elo_dict.get(t2, 1500.0)

    f1_hist = recent_form_dict.get(t1, [])[-5:]
    f2_hist = recent_form_dict.get(t2, [])[-5:]
    form_diff = (np.mean(f1_hist) if f1_hist else 0.5) - (np.mean(f2_hist) if f2_hist else 0.5)

    v1_wins, v1_matches = venue_stats_dict.get(f"{t1}_{venue}", venue_stats_dict.get((t1, venue), [0, 0]))
    v2_wins, v2_matches = venue_stats_dict.get(f"{t2}_{venue}", venue_stats_dict.get((t2, venue), [0, 0]))
    venue_diff = (v1_wins / v1_matches if v1_matches > 0 else 0.5) - (v2_wins / v2_matches if v2_matches > 0 else 0.5)

    # Toss Impact
    vo = venue_overall.get(venue, {'matches': 0, 'bat_first_wins': 0, 'total_first_score': 0})
    chase_adv = 0
    if vo['matches'] >= 5:
        chase_adv = 0.5 - (vo['bat_first_wins'] / vo['matches'])
    
    t1_toss_adv = 0
    if toss_winner == t1:
        t1_toss_adv = chase_adv if toss_decision == 'field' else -chase_adv
    elif toss_winner == t2:
        t1_toss_adv = -chase_adv if toss_decision == 'field' else chase_adv

    # Batting & Bowling Strength
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

    st1 = get_strength(t1)
    st2 = get_strength(t2)
    bat_diff = st1['bat_score'] - st2['bat_score']
    bowl_diff = st1['bowl_score'] - st2['bowl_score']

    # 5. Model Inference
    input_data = pd.DataFrame([{
        "elo_diff": elo_diff,
        "form_diff": form_diff,
        "venue_diff": venue_diff,
        "batting_strength_diff": bat_diff,
        "bowling_strength_diff": bowl_diff,
        "toss_impact": t1_toss_adv
    }])

    probabilities = model.predict_proba(input_data)[0]
    prob_team2 = float(probabilities[0])
    prob_team1 = float(probabilities[1])
    predicted_winner = raw_t1 if prob_team1 >= prob_team2 else raw_t2

    # Informational H2H
    pair = tuple(sorted([t1, t2]))
    h2h_key = f"{pair[0]}_vs_{pair[1]}"
    h2h_data = h2h_stats.get(h2h_key, {'wins': {}, 'last_5': [], 'max_margin': {}})

    response = {
        "predicted_winner": predicted_winner,
        "probabilities": {raw_t1: round(prob_team1, 4), raw_t2: round(prob_team2, 4)},
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

    return jsonify(response), 200

if __name__ == "__main__":
    # Start the Flask application on port 5000
    app.run(host="0.0.0.0", port=5000, debug=True)
