import joblib
from app import load_assets, get_strength_app, team_perf

load_assets()

# Print keys of a match
print("Team Perf length:", len(team_perf.get("Chennai Super Kings", [])))
print("First match keys:", team_perf["Chennai Super Kings"][0]['bat'].keys())

st_csk = get_strength_app("Chennai Super Kings")
st_mi = get_strength_app("Mumbai Indians")

print("CSK strength:", st_csk)
print("MI strength:", st_mi)

print("recent_bat_run_rate_diff:", st_csk['recent_bat_rr'] - st_mi['recent_bat_rr'])
