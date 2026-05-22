import pandas as pd
import numpy as np

def build_live_snapshots(matches_df, deliveries_df):
    """
    Takes historical match data and ball-by-ball delivery data to create 
    over-by-over snapshots for the live ML model.
    """
    print("Building live match snapshots...")
    
    # 1. Clean team names mapping (similar to pre-match)
    TEAM_MAPPING = {
        "Delhi Daredevils": "Delhi Capitals",
        "Kings XI Punjab": "Punjab Kings",
        "Rising Pune Supergiants": "Rising Pune Supergiant",
        "Royal Challengers Bangalore": "Royal Challengers Bengaluru"
    }
    
    def map_team(name):
        if pd.isna(name): return name
        return TEAM_MAPPING.get(str(name).strip(), str(name).strip())

    matches = matches_df.copy()
    for col in ['team1', 'team2', 'winner']:
        matches[col] = matches[col].apply(map_team)
        
    dels = deliveries_df.copy()
    dels['batting_team'] = dels['batting_team'].apply(map_team)
    dels['bowling_team'] = dels['bowling_team'].apply(map_team)
    
    # Match outcomes dict for easy lookup
    match_winners = dict(zip(matches['match_id'], matches['winner']))
    
    snapshots = []
    
    # Process ball by ball into over snapshots
    # We want a snapshot at the end of each over
    # First, let's group by match_id and inning
    
    grouped = dels.groupby(['match_id', 'innings'], observed=True)
    
    count = 0
    for (m_id, inning), group in grouped:
        count += 1
        if count % 200 == 0:
            print(f"Processed {count} innings...")
            
        winner = match_winners.get(m_id)
        if pd.isna(winner): continue
            
        group = group.sort_values(['over', 'ball'])
        
        bat_team = group['batting_team'].iloc[0]
        bowl_team = group['bowling_team'].iloc[0]
        
        # Did batting team win?
        batting_won = 1 if bat_team == winner else 0
        
        current_score = 0
        wickets_lost = 0
        
        # Determine target if it's the 2nd innings
        target = -1
        if inning == 2:
            # Find 1st innings total
            inn1 = dels[(dels['match_id'] == m_id) & (dels['innings'] == 1)]
            if not inn1.empty:
                target = inn1['total_runs'].sum() + 1
        
        # Iterate over each over
        over_groups = group.groupby('over')
        
        for over, over_data in over_groups:
            runs_in_over = over_data['total_runs'].sum()
            wkts_in_over = over_data['is_wicket'].fillna(False).astype(int).sum()
            
            current_score += runs_in_over
            wickets_lost += wkts_in_over
            
            overs_completed = over
            balls_completed = overs_completed * 6
            balls_remaining = 120 - balls_completed
            
            crr = (current_score / balls_completed) * 6 if balls_completed > 0 else 0.0
            
            req_rr = -1.0
            runs_needed = -1
            if inning == 2 and target > 0:
                runs_needed = target - current_score
                if balls_remaining > 0:
                    req_rr = (runs_needed / balls_remaining) * 6
                else:
                    req_rr = 99.0 if runs_needed > 0 else 0.0
            
            snapshots.append({
                'match_id': m_id,
                'inning': inning,
                'over': overs_completed,
                'batting_team': bat_team,
                'bowling_team': bowl_team,
                'current_score': current_score,
                'wickets_lost': wickets_lost,
                'target': target,
                'runs_needed': runs_needed,
                'balls_remaining': balls_remaining,
                'crr': crr,
                'req_rr': req_rr,
                'batting_won': batting_won
            })
            
    df_snapshots = pd.DataFrame(snapshots)
    print(f"Generated {len(df_snapshots)} over-by-over snapshots.")
    return df_snapshots
