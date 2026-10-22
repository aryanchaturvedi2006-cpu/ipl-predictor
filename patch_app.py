with open("app.py", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update globals
old_globals1 = """team_perf = {}
valid_teams = []"""
new_globals1 = """team_perf = {}
valid_teams = []
season_form_dict = {}"""
content = content.replace(old_globals1, new_globals1)

old_globals2 = """    global venue_stats_dict, venue_overall, h2h_stats, team_perf, valid_teams
    global ffnn_pre, ffnn_post, scaler_pre, scaler_post, use_ffnn, lstm_live"""
new_globals2 = """    global venue_stats_dict, venue_overall, h2h_stats, team_perf, valid_teams
    global ffnn_pre, ffnn_post, scaler_pre, scaler_post, use_ffnn, lstm_live
    global season_form_dict"""
content = content.replace(old_globals2, new_globals2)

old_load = """    team_perf = metadata.get("team_perf", {})
    valid_teams = metadata.get("all_teams", [])"""
new_load = """    team_perf = metadata.get("team_perf", {})
    valid_teams = metadata.get("all_teams", [])
    season_form_dict = metadata.get("season_form", {})"""
content = content.replace(old_load, new_load)

# 2. Update prediction feature extraction
old_features_extract = """    # Features
    elo_diff = elo_dict.get(t1, 1500.0) - elo_dict.get(t2, 1500.0)
    f1 = recent_form_dict.get(t1, [])[-5:]
    f2 = recent_form_dict.get(t2, [])[-5:]
    form_diff = (np.mean(f1) if f1 else 0.5) - (np.mean(f2) if f2 else 0.5)

    v1_wins, v1_matches = venue_stats_dict.get(f"{t1}_{venue}", venue_stats_dict.get((t1, venue), [0, 0]))
    v2_wins, v2_matches = venue_stats_dict.get(f"{t2}_{venue}", venue_stats_dict.get((t2, venue), [0, 0]))
    venue_diff = (v1_wins / v1_matches if v1_matches > 0 else 0.5) - (v2_wins / v2_matches if v2_matches > 0 else 0.5)

    vo = venue_overall.get(venue, {'matches': 0, 'bat_first_wins': 0})
    chase_adv = 0
    if vo['matches'] >= 5:
        chase_adv = 0.5 - (vo['bat_first_wins'] / vo['matches'])

    t1_toss_adv = 0.0
    toss_swing_info = None

    if prediction_mode == 'post_toss':
        if toss_winner == t1:
            t1_toss_adv = chase_adv if toss_decision == 'field' else -chase_adv
        elif toss_winner == t2:
            t1_toss_adv = -chase_adv if toss_decision == 'field' else chase_adv
    else:
        toss_swing_info = f'If {raw_t1} wins toss and chases, probability may shift by {(chase_adv * 100):.1f}%'

    st1 = get_strength(t1)
    st2 = get_strength(t2)
    bat_diff = st1['bat_score'] - st2['bat_score']
    bowl_diff = st1['bowl_score'] - st2['bowl_score']

    toss_won = 0
    if prediction_mode == 'post_toss':
        toss_won = 1 if toss_winner == t1 else -1

    input_data_pre = pd.DataFrame([{
        "elo_diff": elo_diff,
        "form_diff": form_diff,
        "venue_diff": venue_diff,
        "batting_strength_diff": bat_diff,
        "bowling_strength_diff": bowl_diff
    }])
    
    input_data_post = pd.DataFrame([{
        "elo_diff": elo_diff,
        "form_diff": form_diff,
        "venue_diff": venue_diff,
        "batting_strength_diff": bat_diff,
        "bowling_strength_diff": bowl_diff,
        "toss_impact": t1_toss_adv,
        "toss_won": toss_won
    }])"""

new_features_extract = """    # Features
    elo_diff = elo_dict.get(t1, 1500.0) - elo_dict.get(t2, 1500.0)
    f1 = recent_form_dict.get(t1, [])[-10:]
    f2 = recent_form_dict.get(t2, [])[-10:]
    recent_win_rate_diff = (np.mean(f1) if f1 else 0.5) - (np.mean(f2) if f2 else 0.5)

    v1_wins, v1_matches = venue_stats_dict.get(f"{t1}_{venue}", venue_stats_dict.get((t1, venue), [0, 0]))
    v2_wins, v2_matches = venue_stats_dict.get(f"{t2}_{venue}", venue_stats_dict.get((t2, venue), [0, 0]))
    venue_win_rate_diff = (v1_wins / v1_matches if v1_matches > 0 else 0.5) - (v2_wins / v2_matches if v2_matches > 0 else 0.5)

    vo = venue_overall.get(venue, {'matches': 0, 'bat_first_wins': 0})
    chase_adv = 0
    if vo['matches'] >= 5:
        chase_adv = 0.5 - (vo['bat_first_wins'] / vo['matches'])

    t1_toss_adv = 0.0
    toss_swing_info = None

    if prediction_mode == 'post_toss':
        if toss_winner == t1:
            t1_toss_adv = chase_adv if toss_decision == 'field' else -chase_adv
        elif toss_winner == t2:
            t1_toss_adv = -chase_adv if toss_decision == 'field' else chase_adv
    else:
        toss_swing_info = f'If {raw_t1} wins toss and chases, probability may shift by {(chase_adv * 100):.1f}%'

    def get_strength_app(team):
        perf = team_perf.get(team, [])
        if not perf:
            return {
                'bat_score': 50.0, 'bowl_score': 50.0,
                'recent_bat_rr': 0.0, 'recent_bowl_wkts': 0.0,
                'recent_runs_scored_avg': 0.0, 'recent_runs_conceded_avg': 0.0
            }
        
        pp_rr = np.mean([p['bat'].get('powerplay_runs', 0) / 6 for p in perf])
        mid_rr = np.mean([p['bat'].get('middle_runs', 0) / 9 for p in perf])
        death_rr = np.mean([p['bat'].get('death_runs', 0) / 5 for p in perf])
        avg_score = np.mean([sum(p['bat'].get(k, 0) for k in ['powerplay_runs', 'middle_runs', 'death_runs']) for p in perf])
        chases = [p['chased_won'] for p in perf if p['chased_won'] is not None]
        chase_pct = np.mean(chases) if chases else 0.5
        
        pp_wkts = np.mean([p['bowl'].get('powerplay_wkts', 0) for p in perf])
        death_econ_list = [p['bowl'].get('death_runs', 0) / max(1, p['bowl'].get('death_overs', 0)) for p in perf if p['bowl'].get('death_overs', 0) > 0]
        death_econ = np.mean(death_econ_list) if death_econ_list else 10.0
        avg_wkts = np.mean([sum(p['bowl'].get(k, 0) for k in ['powerplay_wkts', 'middle_wkts', 'death_wkts']) for p in perf])
        defends = [p['defended_won'] for p in perf if p['defended_won'] is not None]
        defend_pct = np.mean(defends) if defends else 0.5
        
        bat_score = (pp_rr * 2) + (mid_rr * 1) + (death_rr * 3) + (chase_pct * 20) + (avg_score * 0.1)
        bowl_score = (pp_wkts * 10) - (death_econ * 2) + (avg_wkts * 2) + (defend_pct * 20)
        
        bat_runs_sum = sum(sum(p['bat'].get(k, 0) for k in ['powerplay_runs', 'middle_runs', 'death_runs']) for p in perf)
        bat_overs_sum = sum(sum(p['bat'].get(k, 0) for k in ['powerplay_overs', 'middle_overs', 'death_overs']) for p in perf)
        recent_bat_rr = bat_runs_sum / max(1.0, bat_overs_sum)
        
        recent_bowl_wkts = np.mean([sum(p['bowl'].get(k, 0) for k in ['powerplay_wkts', 'middle_wkts', 'death_wkts']) for p in perf])
        recent_runs_scored_avg = np.mean([sum(p['bat'].get(k, 0) for k in ['powerplay_runs', 'middle_runs', 'death_runs']) for p in perf])
        recent_runs_conceded_avg = np.mean([sum(p['bowl'].get(k, 0) for k in ['powerplay_runs', 'middle_runs', 'death_runs']) for p in perf])
        
        return {
            'bat_score': bat_score, 'bowl_score': bowl_score,
            'recent_bat_rr': recent_bat_rr, 'recent_bowl_wkts': recent_bowl_wkts,
            'recent_runs_scored_avg': recent_runs_scored_avg,
            'recent_runs_conceded_avg': recent_runs_conceded_avg
        }
        
    st1 = get_strength_app(t1)
    st2 = get_strength_app(t2)
    batting_strength_diff = st1['bat_score'] - st2['bat_score']
    bowling_strength_diff = st1['bowl_score'] - st2['bowl_score']
    recent_bat_run_rate_diff = st1['recent_bat_rr'] - st2['recent_bat_rr']
    recent_bowl_wkts_diff = st1['recent_bowl_wkts'] - st2['recent_bowl_wkts']
    recent_runs_scored_avg_diff = st1['recent_runs_scored_avg'] - st2['recent_runs_scored_avg']
    recent_runs_conceded_avg_diff = st1['recent_runs_conceded_avg'] - st2['recent_runs_conceded_avg']

    def get_latest_season_form(team):
        team_keys = [k for k in season_form_dict.keys() if k.startswith(f"{team}_")]
        if not team_keys: return 0.5
        latest_key = sorted(team_keys, key=lambda x: str(x.split('_')[1]))[-1]
        history = season_form_dict[latest_key]
        return np.mean(history) if history else 0.5
        
    sf1 = get_latest_season_form(t1)
    sf2 = get_latest_season_form(t2)
    season_win_rate_diff = sf1 - sf2

    toss_won = 0
    if prediction_mode == 'post_toss':
        toss_won = 1 if toss_winner == t1 else -1

    input_data_pre = pd.DataFrame([{
        "elo_diff": elo_diff,
        "recent_win_rate_diff": recent_win_rate_diff,
        "venue_win_rate_diff": venue_win_rate_diff,
        "batting_strength_diff": batting_strength_diff,
        "bowling_strength_diff": bowling_strength_diff,
        "recent_bat_run_rate_diff": recent_bat_run_rate_diff,
        "recent_bowl_wkts_diff": recent_bowl_wkts_diff,
        "recent_runs_scored_avg_diff": recent_runs_scored_avg_diff,
        "recent_runs_conceded_avg_diff": recent_runs_conceded_avg_diff,
        "season_win_rate_diff": season_win_rate_diff
    }])
    
    input_data_post = pd.DataFrame([{
        "elo_diff": elo_diff,
        "recent_win_rate_diff": recent_win_rate_diff,
        "venue_win_rate_diff": venue_win_rate_diff,
        "batting_strength_diff": batting_strength_diff,
        "bowling_strength_diff": bowling_strength_diff,
        "recent_bat_run_rate_diff": recent_bat_run_rate_diff,
        "recent_bowl_wkts_diff": recent_bowl_wkts_diff,
        "recent_runs_scored_avg_diff": recent_runs_scored_avg_diff,
        "recent_runs_conceded_avg_diff": recent_runs_conceded_avg_diff,
        "season_win_rate_diff": season_win_rate_diff,
        "toss_impact": t1_toss_adv,
        "toss_won": toss_won
    }])"""

content = content.replace(old_features_extract, new_features_extract)

with open("app.py", "w", encoding="utf-8") as f:
    f.write(content)
print("app.py patched successfully.")
