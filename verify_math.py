import os
import pandas as pd
import json

matches_path = "data/matches.csv"
deliveries_path = "data/deliveries.csv"

if not os.path.exists(matches_path) or not os.path.exists(deliveries_path):
    print("Data files not found.")
    exit(0)

df = pd.read_csv(matches_path)
dels = pd.read_csv(deliveries_path, low_memory=False)

TEAM_MAPPING = {
    'Delhi Daredevils': 'Delhi Capitals',
    'Kings XI Punjab': 'Punjab Kings',
    'Deccan Chargers': 'Sunrisers Hyderabad',
    'Rising Pune Supergiant': 'Rising Pune Supergiants',
    'Royal Challengers Bangalore': 'Royal Challengers Bengaluru'
}

df['team1'] = df['team1'].replace(TEAM_MAPPING)
df['team2'] = df['team2'].replace(TEAM_MAPPING)
dels['batting_team'] = dels['batting_team'].replace(TEAM_MAPPING)

# Get the last MI vs CSK match at Wankhede
mi_csk = df[
    ((df['team1'] == 'Mumbai Indians') & (df['team2'] == 'Chennai Super Kings')) |
    ((df['team1'] == 'Chennai Super Kings') & (df['team2'] == 'Mumbai Indians'))
]
mi_csk_wankhede = mi_csk[mi_csk['venue'].str.contains('Wankhede', case=False, na=False)]

if mi_csk_wankhede.empty:
    print("No MI vs CSK match found at Wankhede.")
    exit(0)

target_match = mi_csk_wankhede.iloc[-1]
match_id = target_match['id']
print(f"Match: {target_match['team1']} vs {target_match['team2']} at Wankhede. ID: {match_id}")

mi_matches = df[(df['team1'] == 'Mumbai Indians') | (df['team2'] == 'Mumbai Indians')]
mi_matches = mi_matches[mi_matches.index < target_match.name].tail(10)

csk_matches = df[(df['team1'] == 'Chennai Super Kings') | (df['team2'] == 'Chennai Super Kings')]
csk_matches = csk_matches[csk_matches.index < target_match.name].tail(10)

def calc_rr(team, matches):
    print(f"\n--- {team} ---")
    total_runs = 0
    total_balls = 0
    
    for idx, row in matches.iterrows():
        mid = row['id']
        match_dels = dels[dels['match_id'] == mid]
        team_dels = match_dels[match_dels['batting_team'] == team]
        runs = int(team_dels['total_runs'].sum())
        balls = len(team_dels)
        overs = balls / 6.0
        
        rr = (runs / overs) if overs > 0 else 0.0
        print(f"Match {mid}: Runs={runs}, Balls={balls}, Overs={overs:.2f}, RR={rr:.2f}")
        total_runs += runs
        total_balls += balls
        
    avg_rr = total_runs / (total_balls / 6.0) if total_balls > 0 else 0.0
    print(f"Total Runs={total_runs}, Total Overs={total_balls/6.0:.2f}, Average RR={avg_rr:.2f}")
    return avg_rr

rr1 = calc_rr('Chennai Super Kings', csk_matches)
rr2 = calc_rr('Mumbai Indians', mi_matches)
print(f"\nDiff (CSK - MI): {rr1 - rr2:.2f}")
