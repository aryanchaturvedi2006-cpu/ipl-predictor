import json
import pprint
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
print(f"Status Code: {response.status_code}")

if response.status_code == 200:
    res = json.loads(response.data)
    print("\n--- feature_values_used returned by /predict ---")
    pprint.pprint(res.get("feature_values_used", {}))
    print("-------------------------------------------------")
else:
    print("Error:", response.data)
