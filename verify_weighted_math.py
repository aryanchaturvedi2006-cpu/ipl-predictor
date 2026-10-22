import pandas as pd

df = pd.read_csv("data/matches.csv")
df = df.dropna(subset=["winner"]).reset_index(drop=True)
df = df.sort_values('date').reset_index(drop=True)
dels = pd.read_csv("data/deliveries.csv", low_memory=False)

# Get the last MI vs CSK match at Wankhede
mi_csk = df[((df['team1'] == 'Mumbai Indians') & (df['team2'] == 'Chennai Super Kings')) | ((df['team1'] == 'Chennai Super Kings') & (df['team2'] == 'Mumbai Indians'))]
mi_csk_wankhede = mi_csk[mi_csk['venue'] == 'Wankhede Stadium'].iloc[-1]
match_id = mi_csk_wankhede['id']
print(f"Match: {mi_csk_wankhede['team1']} vs {mi_csk_wankhede['team2']} at Wankhede. ID: {match_id}")

mi_matches = df[(df['team1'] == 'Mumbai Indians') | (df['team2'] == 'Mumbai Indians')]
mi_matches = mi_matches[mi_matches.index < mi_csk_wankhede.name].tail(10)

csk_matches = df[(df['team1'] == 'Chennai Super Kings') | (df['team2'] == 'Chennai Super Kings')]
csk_matches = csk_matches[csk_matches.index < mi_csk_wankhede.name].tail(10)

def calc_rr_exact(team, matches):
    print(f"\n--- {team} (10 previous matches) ---")
    total_runs = 0
    total_legal_balls = 0
    match_rrs = []
    
    for idx, row in matches.iterrows():
        mid = row['id']
        match_dels = dels[dels['match_id'] == mid]
        team_dels = match_dels[match_dels['batting_team'] == team]
        runs = team_dels['total_runs'].sum()
        
        legal_balls_per_over = team_dels.groupby('over').size().clip(upper=6)
        legal_balls = legal_balls_per_over.sum()
        overs = legal_balls / 6.0
        
        rr = runs / overs if overs > 0 else 0
        match_rrs.append(rr)
        print(f"Match {mid}: Runs={runs:3d}, Legal Balls={legal_balls:3d}, Overs={overs:5.2f}, RR={rr:5.2f}")
        total_runs += runs
        total_legal_balls += legal_balls
        
    unweighted_rr = sum(match_rrs) / len(match_rrs) if match_rrs else 0
    weighted_rr = total_runs / (total_legal_balls / 6.0) if total_legal_balls > 0 else 0
    
    print(f"{team} Unweighted Mean RR: {unweighted_rr:.4f}")
    print(f"{team} Weighted Aggregate RR (features.py method): {weighted_rr:.4f}")
    return unweighted_rr, weighted_rr

csk_unweighted, csk_weighted = calc_rr_exact('Chennai Super Kings', csk_matches)
mi_unweighted, mi_weighted = calc_rr_exact('Mumbai Indians', mi_matches)

print("\n=======================================================")
print(f"MI  Unweighted RR: {mi_unweighted:.4f}")
print(f"CSK Unweighted RR: {csk_unweighted:.4f}")
print(f"Unweighted Difference (MI - CSK): {mi_unweighted - csk_unweighted:.4f}")
print("-------------------------------------------------------")
print(f"MI  Weighted RR (Current implementation): {mi_weighted:.4f}")
print(f"CSK Weighted RR (Current implementation): {csk_weighted:.4f}")
print(f"Weighted Difference (MI - CSK): {mi_weighted - csk_weighted:.5f}")
print("=======================================================")
