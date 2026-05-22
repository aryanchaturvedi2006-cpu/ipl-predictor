import pandas as pd
import numpy as np

# Standardized mapping of alternate and historical team names to match data.js
TEAM_MAPPING = {
    "Delhi Daredevils": "Delhi Capitals",
    "Kings XI Punjab": "Punjab Kings",
    "Rising Pune Supergiants": "Rising Pune Supergiant",
    "Royal Challengers Bangalore": "Royal Challengers Bengaluru"
}

def clean_team_names(df):
    """
    Standardizes team names in team1, team2, toss_winner, and winner columns.
    Ensures identical strings represent the same team across all variables.
    """
    def map_name(name):
        if pd.isna(name):
            return name
        return TEAM_MAPPING.get(str(name).strip(), str(name).strip())
    
    for col in ["team1", "team2", "toss_winner", "winner"]:
        if col in df.columns:
            df[col] = df[col].apply(map_name)
    return df

def build_features(df):
    """
    Engineers leak-free chronological features for IPL matches:
    1. Elo rating difference (Team1 Elo - Team2 Elo)
    2. Recent form difference (Team1 average win rate - Team2 average win rate in past 5 matches)
    3. Venue win percentage difference (Team1 venue win rate - Team2 venue win rate)
    
    Features represent the state BEFORE the match starts.
    Running metrics are updated ONLY after the match outcome is known.
    """
    # Parse date and sort matches chronologically to avoid future data leakage
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(by="date").reset_index(drop=True)
    
    # Set target variable: 1 if team1 wins, 0 if team2 wins
    df["target"] = (df["winner"] == df["team1"]).astype(int)
    
    # Identify unique teams to initialize running statistics
    unique_teams = set(df["team1"].dropna().unique()) | set(df["team2"].dropna().unique())
    
    # Initialize running Elo ratings (standard baseline is 1500)
    elo = {team: 1500.0 for team in unique_teams}
    k_factor = 32  # Maximum adjustment per match
    
    # Initialize recent form tracking (stores list of 1s and 0s for each team's recent outcomes)
    recent_form = {team: [] for team in unique_teams}
    form_window = 5
    
    # Initialize venue stats tracking: (team, venue) -> [wins, matches_played]
    venue_stats = {}
    
    elo_diffs = []
    form_diffs = []
    venue_diffs = []
    
    # Iterate chronologically through each match row
    for idx, row in df.iterrows():
        t1 = row["team1"]
        t2 = row["team2"]
        venue = row["venue"]
        winner = row["winner"]
        
        # 1. Compute Elo rating difference (Team 1 - Team 2)
        elo_t1 = elo[t1]
        elo_t2 = elo[t2]
        elo_diffs.append(elo_t1 - elo_t2)
        
        # 2. Compute recent form difference (Team 1 - Team 2)
        form_t1_history = recent_form[t1][-form_window:]
        form_t2_history = recent_form[t2][-form_window:]
        
        form_t1_val = np.mean(form_t1_history) if len(form_t1_history) > 0 else 0.5
        form_t2_val = np.mean(form_t2_history) if len(form_t2_history) > 0 else 0.5
        form_diffs.append(form_t1_val - form_t2_val)
        
        # 3. Compute venue win rate difference (Team 1 - Team 2)
        v_key1 = (t1, venue)
        v_key2 = (t2, venue)
        
        wins1, matches1 = venue_stats.get(v_key1, [0, 0])
        wins2, matches2 = venue_stats.get(v_key2, [0, 0])
        
        venue_t1_val = wins1 / matches1 if matches1 > 0 else 0.5
        venue_t2_val = wins2 / matches2 if matches2 > 0 else 0.5
        venue_diffs.append(venue_t1_val - venue_t2_val)
        
        # --- Update Running Stats After Match ---
        t1_won = 1 if winner == t1 else 0
        t2_won = 1 - t1_won
        
        # Elo Update based on expected probability vs actual outcome
        expected_t1 = 1 / (1 + 10 ** ((elo_t2 - elo_t1) / 400))
        expected_t2 = 1 - expected_t1
        
        elo[t1] = elo_t1 + k_factor * (t1_won - expected_t1)
        elo[t2] = elo_t2 + k_factor * (t2_won - expected_t2)
        
        # Recent Form Update
        recent_form[t1].append(t1_won)
        recent_form[t2].append(t2_won)
        
        # Venue Stats Update
        if v_key1 not in venue_stats:
            venue_stats[v_key1] = [0, 0]
        if v_key2 not in venue_stats:
            venue_stats[v_key2] = [0, 0]
            
        venue_stats[v_key1][1] += 1
        venue_stats[v_key2][1] += 1
        if t1_won:
            venue_stats[v_key1][0] += 1
        else:
            venue_stats[v_key2][0] += 1
            
    # Add the engineered features to the DataFrame
    df["elo_diff"] = elo_diffs
    df["form_diff"] = form_diffs
    df["venue_diff"] = venue_diffs
    
    # Group the running final states for serialization and online inference
    final_states = {
        "elo": elo,
        "recent_form": recent_form,
        "venue_stats": venue_stats
    }
    
    return df, final_states
