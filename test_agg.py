import pandas as pd
dels = pd.read_csv('data/deliveries.csv', low_memory=False)
dels['is_wicket'] = dels['is_wicket'].fillna(False).astype(bool)
dels['over_phase'] = pd.cut(dels['over'], bins=[0, 6, 15, 25], labels=['powerplay', 'middle', 'death'])

# Calculate legal balls per over (capped at 6)
legal_balls_per_over = dels.groupby(['match_id', 'batting_team', 'bowling_team', 'over_phase', 'over'], observed=True).size().reset_index(name='balls')
legal_balls_per_over['legal_balls'] = legal_balls_per_over['balls'].clip(upper=6)

# Aggregate by phase
phase_balls = legal_balls_per_over.groupby(['match_id', 'batting_team', 'bowling_team', 'over_phase'], observed=True)['legal_balls'].sum().reset_index()

# Original aggregation for runs and wickets
agg = dels.groupby(['match_id', 'batting_team', 'bowling_team', 'over_phase'], observed=True).agg(
    runs=('total_runs', 'sum'),
    wkts=('is_wicket', 'sum')
).reset_index()

# Merge legal balls into agg
agg = pd.merge(agg, phase_balls, on=['match_id', 'batting_team', 'bowling_team', 'over_phase'])

print(agg.head(10))
