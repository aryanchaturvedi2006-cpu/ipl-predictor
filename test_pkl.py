import joblib
import json

metadata = joblib.load('models/encoders.pkl')
team_perf = metadata['team_perf']

mi_perf = team_perf['Mumbai Indians']
print("MI Last Match Perf:")
print(json.dumps(mi_perf[-1], indent=2))
