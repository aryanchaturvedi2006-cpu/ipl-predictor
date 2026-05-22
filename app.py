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
valid_teams = []

def load_assets():
    """
    Loads the trained XGBoost model and corresponding encoders/statistics metadata.
    Initializes helper data structures for rapid real-time lookup.
    """
    global model, metadata, elo_dict, recent_form_dict, venue_stats_dict, valid_teams
    
    if not os.path.exists(MODEL_PATH) or not os.path.exists(ENCODERS_PATH):
        raise FileNotFoundError(
            "Model files not found. Please ensure train.py has been run and "
            "models/model.pkl and models/encoders.pkl exist."
        )
        
    model = joblib.load(MODEL_PATH)
    metadata = joblib.load(ENCODERS_PATH)
    
    elo_dict = metadata["elo"]
    recent_form_dict = metadata["recent_form"]
    venue_stats_dict = metadata["venue_stats"]
    valid_teams = metadata["all_teams"]

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
    Expects a JSON payload:
    {
        "team1": "Team A Name",
        "team2": "Team B Name",
        "venue": "Venue Name",
        "toss_winner": "Toss Winner Name",
        "toss_decision": "bat/bowl"
    }
    
    Returns structured JSON with probabilities and feature values.
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
    # Validate team names
    invalid_teams = []
    if t1 not in valid_teams:
        invalid_teams.append(f"team1 ({raw_t1})")
    if t2 not in valid_teams:
        invalid_teams.append(f"team2 ({raw_t2})")
    if invalid_teams:
        return jsonify({
            "error": f"Unknown team(s) provided: {', '.join(invalid_teams)}. "
                     f"Please use standard IPL team names."
        }), 400

    if t1 == t2:
        return jsonify({"error": "team1 and team2 must be different teams."}), 400

    # Validate toss winner
    if toss_winner not in [t1, t2]:
        return jsonify({"error": f"toss_winner must be either team1 ({raw_t1}) or team2 ({raw_t2})."}), 400

    # Validate toss decision
    if toss_decision not in ["bat", "bowl"]:
        return jsonify({"error": "toss_decision must be either 'bat' or 'bowl'."}), 400

    # Validate venue presence
    if not venue:
        return jsonify({"error": "venue field cannot be empty."}), 400

    # 4. Dynamic Online Feature Generation
    # Compute Elo Rating Difference
    elo_t1 = elo_dict.get(t1, 1500.0)
    elo_t2 = elo_dict.get(t2, 1500.0)
    elo_diff = elo_t1 - elo_t2

    # Compute Recent Form Difference (last 5 matches win percentage)
    form_t1_history = recent_form_dict.get(t1, [])[-5:]
    form_t2_history = recent_form_dict.get(t2, [])[-5:]
    
    form_t1 = np.mean(form_t1_history) if len(form_t1_history) > 0 else 0.5
    form_t2 = np.mean(form_t2_history) if len(form_t2_history) > 0 else 0.5
    form_diff = form_t1 - form_t2

    # Compute Venue Win Percentage Difference
    # venue_stats_dict maps (team_name, venue_name) -> [wins, matches_played]
    wins1, matches1 = venue_stats_dict.get((t1, venue), [0, 0])
    wins2, matches2 = venue_stats_dict.get((t2, venue), [0, 0])
    
    venue_t1 = wins1 / matches1 if matches1 > 0 else 0.5
    venue_t2 = wins2 / matches2 if matches2 > 0 else 0.5
    venue_diff = venue_t1 - venue_t2

    # 5. Model Inference
    # Create input DataFrame matching the exact features used during training
    input_data = pd.DataFrame([{
        "elo_diff": elo_diff,
        "form_diff": form_diff,
        "venue_diff": venue_diff
    }])

    # Generate probabilities for target classes
    # Target = 1 corresponds to team1 winning; target = 0 corresponds to team2 winning
    probabilities = model.predict_proba(input_data)[0]
    prob_team2 = float(probabilities[0])
    prob_team1 = float(probabilities[1])

    # Determine predicted winner
    predicted_winner = raw_t1 if prob_team1 >= prob_team2 else raw_t2

    # 6. Structured JSON Response
    response = {
        "predicted_winner": predicted_winner,
        "probabilities": {
            raw_t1: round(prob_team1, 4),
            raw_t2: round(prob_team2, 4)
        },
        "feature_values_used": {
            "elo_diff": round(elo_diff, 2),
            "form_diff": round(form_diff, 4),
            "venue_diff": round(venue_diff, 4)
        }
    }

    return jsonify(response), 200

if __name__ == "__main__":
    # Start the Flask application on port 5000
    app.run(host="0.0.0.0", port=5000, debug=True)
