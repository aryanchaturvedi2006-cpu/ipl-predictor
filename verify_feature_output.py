import pandas as pd
from src.features import build_features

df = pd.read_csv("data/matches.csv")
df = df.dropna(subset=["winner"]).reset_index(drop=True)

df, final_states = build_features(df)

# Get the last MI vs CSK match at Wankhede
mi_csk = df[((df['team1'] == 'Mumbai Indians') & (df['team2'] == 'Chennai Super Kings')) | ((df['team1'] == 'Chennai Super Kings') & (df['team2'] == 'Mumbai Indians'))]
mi_csk_wankhede = mi_csk[mi_csk['venue'] == 'Wankhede Stadium'].iloc[-1]

print(f"Match: {mi_csk_wankhede['team1']} vs {mi_csk_wankhede['team2']} at Wankhede")
print("recent_bat_run_rate_diff from features:", mi_csk_wankhede['recent_bat_run_rate_diff'])

print("\n--- Validating team_perf keys inside final_states ---")
team_perf = final_states['team_perf']
csk_last_perf = team_perf['Chennai Super Kings'][-1]
print("CSK's last match performance 'bat' dictionary:")
for k, v in csk_last_perf['bat'].items():
    print(f"  {k}: {v}")

print("\n--- Verifying feature columns ---\n", list(df.columns[-10:]))
