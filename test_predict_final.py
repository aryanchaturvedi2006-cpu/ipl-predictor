import json

def get_prediction(payload):
    try:
        import requests
        res = requests.post("http://localhost:5001/predict", json=payload, timeout=2)
        return res.json()
    except Exception:
        from app import app
        client = app.test_client()
        res = client.post("/predict", json=payload)
        return json.loads(res.data)

payload1 = {
    "team1": "Chennai Super Kings",
    "team2": "Mumbai Indians",
    "venue": "Wankhede Stadium"
}

payload2 = {
    "team1": "Mumbai Indians",
    "team2": "Chennai Super Kings",
    "venue": "Wankhede Stadium"
}

print("=== Prediction 1 (CSK vs MI) ===")
data1 = get_prediction(payload1)
print(json.dumps(data1, indent=2))

print("\n=== Prediction 2 (MI vs CSK) ===")
data2 = get_prediction(payload2)
print(json.dumps(data2, indent=2))
