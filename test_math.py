import joblib
import numpy as np

metadata = joblib.load('models/encoders.pkl')
team_perf = metadata['team_perf']

def get_strength_app(team):
    perf = team_perf.get(team, [])
    if not perf: return None
    
    bat_runs_sum = sum(sum(p['bat'].get(k, 0) for k in ['powerplay_runs', 'middle_runs', 'death_runs']) for p in perf)
    bat_overs_sum = sum(sum(p['bat'].get(k, 0) for k in ['powerplay_overs', 'middle_overs', 'death_overs']) for p in perf)
    
    print(f"[{team}] bat_runs_sum: {bat_runs_sum}")
    print(f"[{team}] bat_overs_sum: {bat_overs_sum}")
    recent_bat_rr = bat_runs_sum / max(1.0, bat_overs_sum)
    print(f"[{team}] recent_bat_rr: {recent_bat_rr}")
    return recent_bat_rr

rr_csk = get_strength_app("Chennai Super Kings")
rr_mi = get_strength_app("Mumbai Indians")
print(f"recent_bat_run_rate_diff: {rr_csk - rr_mi}")

