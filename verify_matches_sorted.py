import pandas as pd
from src.features import build_features

df = pd.read_csv("data/matches.csv")
df = df.dropna(subset=["winner"]).reset_index(drop=True)
df = df.sort_values('date').reset_index(drop=True)

# Get the last MI vs CSK match at Wankhede
mi_csk = df[((df['team1'] == 'Mumbai Indians') & (df['team2'] == 'Chennai Super Kings')) | ((df['team1'] == 'Chennai Super Kings') & (df['team2'] == 'Mumbai Indians'))]
mi_csk_wankhede = mi_csk[mi_csk['venue'] == 'Wankhede Stadium'].iloc[-1]
match_id = mi_csk_wankhede['id']

print(f"Prediction Match: {match_id}")

mi_matches = df[(df['team1'] == 'Mumbai Indians') | (df['team2'] == 'Mumbai Indians')]
mi_matches = mi_matches[mi_matches.index < mi_csk_wankhede.name].tail(10)
print("MI Last 10 IDs:", mi_matches['id'].tolist())

csk_matches = df[(df['team1'] == 'Chennai Super Kings') | (df['team2'] == 'Chennai Super Kings')]
csk_matches = csk_matches[csk_matches.index < mi_csk_wankhede.name].tail(10)
print("CSK Last 10 IDs:", csk_matches['id'].tolist())
