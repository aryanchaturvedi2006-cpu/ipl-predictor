import json
from app import app

client = app.test_client()

data = {
    "team1": "Chennai Super Kings",
    "team2": "Mumbai Indians",
    "venue": "Wankhede Stadium",
    "toss_winner": "Mumbai Indians",
    "toss_decision": "field",
    "pitch": "flat",
    "weather": "sunny",
    "wind": "calm",
    "timing": "night"
}

print("Running /predict test...")
response = client.post('/predict', json=data)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    res = json.loads(response.data)
    print("Success! Response keys:", res.keys())
    print("Prediction model used:", res.get("prediction_model_used", "UNKNOWN"))
    print("Probability:", res.get("probability"))
else:
    print("Error:", response.data)
