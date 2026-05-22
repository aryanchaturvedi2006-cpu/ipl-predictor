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

from collections import defaultdict, deque

def build_features(df):
    """
    Engineers leak-free chronological features for IPL matches using ball-by-ball data:
    1. elo_diff
    2. form_diff
    3. venue_diff
    4. batting_strength_diff (powerplay, middle, death run rates + chase success)
    5. bowling_strength_diff (powerplay wkts, death economy, overall wkts + defend success)
    6. toss_impact (based on venue chasing bias)
    """
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(by="date").reset_index(drop=True)
    df["target"] = (df["winner"] == df["team1"]).astype(int)
    
    unique_teams = set(df["team1"].dropna().unique()) | set(df["team2"].dropna().unique())
    
    # 1. Elo & Form
    elo = {team: 1500.0 for team in unique_teams}
    recent_form = {team: deque(maxlen=5) for team in unique_teams}
    
    # 2. H2H (Informational)
    h2h_stats = defaultdict(lambda: {'wins': defaultdict(int), 'last_5': deque(maxlen=5), 'max_margin': defaultdict(int)})
    
    # 3. Venue & Toss Intelligence
    venue_overall = defaultdict(lambda: {'matches': 0, 'bat_first_wins': 0, 'total_first_score': 0})
    team_venue = defaultdict(lambda: [0, 0])
    
    # 4. Process Ball-by-Ball Data
    import os
    dels_path = "data/deliveries.csv"
    match_stats = defaultdict(lambda: {'batting': defaultdict(lambda: defaultdict(int)), 'bowling': defaultdict(lambda: defaultdict(int))})
    
    if os.path.exists(dels_path):
        dels = pd.read_csv(dels_path, low_memory=False)
        dels['is_wicket'] = dels['is_wicket'].fillna(False).astype(bool)
        dels['over_phase'] = pd.cut(dels['over'], bins=[0, 6, 15, 25], labels=['powerplay', 'middle', 'death'])
        dels['batting_team'] = dels['batting_team'].apply(lambda x: TEAM_MAPPING.get(str(x).strip(), str(x).strip()))
        dels['bowling_team'] = dels['bowling_team'].apply(lambda x: TEAM_MAPPING.get(str(x).strip(), str(x).strip()))
        
        agg = dels.groupby(['match_id', 'batting_team', 'bowling_team', 'over_phase'], observed=True).agg(
            runs=('total_runs', 'sum'),
            wkts=('is_wicket', 'sum'),
            balls=('ball', 'count')
        ).reset_index()
        
        for _, r in agg.iterrows():
            m_id = r['match_id']
            b_team = r['batting_team']
            bw_team = r['bowling_team']
            ph = r['over_phase']
            
            match_stats[m_id]['batting'][b_team][f'{ph}_runs'] = r['runs']
            match_stats[m_id]['batting'][b_team][f'{ph}_wkts'] = r['wkts']
            match_stats[m_id]['bowling'][bw_team][f'{ph}_runs'] = r['runs']
            match_stats[m_id]['bowling'][bw_team][f'{ph}_wkts'] = r['wkts']
            match_stats[m_id]['bowling'][bw_team][f'{ph}_overs'] = r['balls'] / 6.0

    # 5. Track Recent Performance (Last 10 matches)
    team_perf = {team: deque(maxlen=10) for team in unique_teams}
    
    elo_diffs, form_diffs, venue_diffs = [], [], []
    batting_diffs, bowling_diffs, toss_impacts = [], [], []
    
    for idx, row in df.iterrows():
        t1 = row["team1"]
        t2 = row["team2"]
        venue = str(row["venue"]).strip()
        winner = row["winner"]
        m_id = row.get("match_id", None)
        
        # --- COMPUTE PRE-MATCH FEATURES ---
        elo_diffs.append(elo.get(t1, 1500) - elo.get(t2, 1500))
        
        f1 = np.mean(recent_form[t1]) if recent_form[t1] else 0.5
        f2 = np.mean(recent_form[t2]) if recent_form[t2] else 0.5
        form_diffs.append(f1 - f2)
        
        v1_wins, v1_matches = team_venue[(t1, venue)]
        v2_wins, v2_matches = team_venue[(t2, venue)]
        venue_diffs.append((v1_wins / v1_matches if v1_matches > 0 else 0.5) - (v2_wins / v2_matches if v2_matches > 0 else 0.5))
        
        # Toss Impact
        vo = venue_overall[venue]
        chase_adv = 0
        if vo['matches'] >= 5:
            chase_adv = 0.5 - (vo['bat_first_wins'] / vo['matches'])
            
        toss_winner = row['toss_winner']
        toss_decision = str(row['toss_decision']).strip().lower()
        t1_toss_adv = 0
        if toss_winner == t1:
            t1_toss_adv = chase_adv if toss_decision == 'field' else -chase_adv
        elif toss_winner == t2:
            t1_toss_adv = -chase_adv if toss_decision == 'field' else chase_adv
        toss_impacts.append(t1_toss_adv)
        
        # Batting & Bowling Strength
        def get_strength(team):
            perf = team_perf[team]
            if not perf:
                return {'bat_score': 50.0, 'bowl_score': 50.0}
            
            # Batting metrics
            pp_rr = np.mean([p['bat']['powerplay_runs'] / 6 for p in perf])
            mid_rr = np.mean([p['bat']['middle_runs'] / 9 for p in perf])
            death_rr = np.mean([p['bat']['death_runs'] / 5 for p in perf])
            avg_score = np.mean([sum(p['bat'][k] for k in ['powerplay_runs', 'middle_runs', 'death_runs']) for p in perf])
            chases = [p['chased_won'] for p in perf if p['chased_won'] is not None]
            chase_pct = np.mean(chases) if chases else 0.5
            
            # Bowling metrics
            pp_wkts = np.mean([p['bowl']['powerplay_wkts'] for p in perf])
            death_econ_list = [p['bowl']['death_runs'] / max(1, p['bowl']['death_overs']) for p in perf]
            death_econ = np.mean(death_econ_list) if death_econ_list else 10.0
            avg_wkts = np.mean([sum(p['bowl'][k] for k in ['powerplay_wkts', 'middle_wkts', 'death_wkts']) for p in perf])
            defends = [p['defended_won'] for p in perf if p['defended_won'] is not None]
            defend_pct = np.mean(defends) if defends else 0.5
            
            # Composite Scores
            bat_score = (pp_rr * 2) + (mid_rr * 1) + (death_rr * 3) + (chase_pct * 20) + (avg_score * 0.1)
            bowl_score = (pp_wkts * 10) - (death_econ * 2) + (avg_wkts * 2) + (defend_pct * 20)
            
            return {'bat_score': bat_score, 'bowl_score': bowl_score}

        st1, st2 = get_strength(t1), get_strength(t2)
        batting_diffs.append(st1['bat_score'] - st2['bat_score'])
        bowling_diffs.append(st1['bowl_score'] - st2['bowl_score'])
        
        # --- UPDATE RUNNING STATS ---
        if pd.isna(winner): continue
            
        t1_won = 1 if winner == t1 else 0
        t2_won = 1 - t1_won
        
        expected_t1 = 1 / (1 + 10 ** ((elo.get(t2, 1500) - elo.get(t1, 1500)) / 400))
        elo[t1] = elo.get(t1, 1500) + 32 * (t1_won - expected_t1)
        elo[t2] = elo.get(t2, 1500) + 32 * (t2_won - (1 - expected_t1))
        
        recent_form[t1].append(t1_won)
        recent_form[t2].append(t2_won)
        
        team_venue[(t1, venue)][1] += 1
        team_venue[(t2, venue)][1] += 1
        if t1_won: team_venue[(t1, venue)][0] += 1
        else: team_venue[(t2, venue)][0] += 1
        
        venue_overall[venue]['matches'] += 1
        t1_bat_first = (toss_winner == t1 and toss_decision == 'bat') or (toss_winner == t2 and toss_decision == 'field')
        if (t1_bat_first and t1_won) or (not t1_bat_first and t2_won):
            venue_overall[venue]['bat_first_wins'] += 1
            
        pair = tuple(sorted([t1, t2]))
        h2h_stats[pair]['wins'][winner] += 1
        h2h_stats[pair]['last_5'].append(winner)
        margin = pd.to_numeric(row.get('win_margin', 0), errors='coerce')
        if pd.notna(margin) and margin > h2h_stats[pair]['max_margin'][winner]:
            h2h_stats[pair]['max_margin'][winner] = margin
            
        if m_id and m_id in match_stats:
            m_data = match_stats[m_id]
            
            t1_chased_won = 1 if t1_won and not t1_bat_first else (0 if not t1_won and not t1_bat_first else None)
            t2_chased_won = 1 if t2_won and t1_bat_first else (0 if not t2_won and t1_bat_first else None)
            t1_defended_won = 1 if t1_won and t1_bat_first else (0 if not t1_won and t1_bat_first else None)
            t2_defended_won = 1 if t2_won and not t1_bat_first else (0 if not t2_won and not t1_bat_first else None)
            
            team_perf[t1].append({
                'bat': m_data['batting'].get(t1, defaultdict(int)),
                'bowl': m_data['bowling'].get(t1, defaultdict(int)),
                'chased_won': t1_chased_won,
                'defended_won': t1_defended_won
            })
            team_perf[t2].append({
                'bat': m_data['batting'].get(t2, defaultdict(int)),
                'bowl': m_data['bowling'].get(t2, defaultdict(int)),
                'chased_won': t2_chased_won,
                'defended_won': t2_defended_won
            })

    df["elo_diff"] = elo_diffs
    df["form_diff"] = form_diffs
    df["venue_diff"] = venue_diffs
    df["batting_strength_diff"] = batting_diffs
    df["bowling_strength_diff"] = bowling_diffs
    df["toss_impact"] = toss_impacts
    
    serializable_form = {k: list(v) for k, v in recent_form.items()}
    serializable_h2h = {}
    for pair, data in h2h_stats.items():
        serializable_h2h[f"{pair[0]}_vs_{pair[1]}"] = {
            'wins': dict(data['wins']),
            'last_5': list(data['last_5']),
            'max_margin': dict(data['max_margin'])
        }
    
    # Convert team_perf to pure dictionaries for serialization
    serializable_perf = {}
    for team, perfs in team_perf.items():
        serializable_perf[team] = []
        for p in perfs:
            serializable_perf[team].append({
                'bat': dict(p['bat']),
                'bowl': dict(p['bowl']),
                'chased_won': p['chased_won'],
                'defended_won': p['defended_won']
            })
    
    final_states = {
        "elo": elo,
        "recent_form": serializable_form,
        "venue_stats": dict(team_venue),
        "venue_overall": dict(venue_overall),
        "h2h_stats": serializable_h2h,
        "team_perf": serializable_perf
    }
    
    return df, final_states
