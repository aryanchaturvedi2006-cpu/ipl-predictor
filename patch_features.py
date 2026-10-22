import re

with open("src/features.py", "r") as f:
    content = f.read()

# 1. Update recent_form length
content = content.replace("recent_form = {team: deque(maxlen=5) for team in unique_teams}", 
                          "recent_form = {team: deque(maxlen=10) for team in unique_teams}")

# 2. Add season_form
content = content.replace("team_perf = {team: deque(maxlen=10) for team in unique_teams}",
                          "team_perf = {team: deque(maxlen=10) for team in unique_teams}\n    season_form = defaultdict(lambda: deque(maxlen=20))")

# 3. Fix overs for batting
content = content.replace("match_stats[m_id]['batting'][b_team][f'{ph}_wkts'] = r['wkts']",
                          "match_stats[m_id]['batting'][b_team][f'{ph}_wkts'] = r['wkts']\n            match_stats[m_id]['batting'][b_team][f'{ph}_overs'] = r['balls'] / 6.0")

# 4. Update lists
old_lists = """    elo_diffs, form_diffs, venue_diffs = [], [], []
    batting_diffs, bowling_diffs, toss_impacts, toss_wons = [], [], [], []"""
new_lists = """    elo_diffs, recent_win_rate_diffs, venue_diffs = [], [], []
    batting_diffs, bowling_diffs, toss_impacts, toss_wons = [], [], [], []
    recent_bat_rr_diffs, recent_bowl_wkts_diffs = [], []
    recent_runs_scored_avg_diffs, recent_runs_conceded_avg_diffs = [], []
    season_win_rate_diffs = []"""
content = content.replace(old_lists, new_lists)

# 5. Extract features
old_extract = """        # --- COMPUTE PRE-MATCH FEATURES ---
        elo_diffs.append(elo.get(t1, 1500) - elo.get(t2, 1500))
        
        f1 = np.mean(recent_form[t1]) if recent_form[t1] else 0.5
        f2 = np.mean(recent_form[t2]) if recent_form[t2] else 0.5
        form_diffs.append(f1 - f2)
        
        v1_wins, v1_matches = team_venue[(t1, venue)]
        v2_wins, v2_matches = team_venue[(t2, venue)]
        venue_diffs.append((v1_wins / v1_matches if v1_matches > 0 else 0.5) - (v2_wins / v2_matches if v2_matches > 0 else 0.5))"""

new_extract = """        season = row.get("season", "unknown")
        
        # --- COMPUTE PRE-MATCH FEATURES ---
        elo_diffs.append(elo.get(t1, 1500) - elo.get(t2, 1500))
        
        f1 = np.mean(recent_form[t1]) if recent_form[t1] else 0.5
        f2 = np.mean(recent_form[t2]) if recent_form[t2] else 0.5
        recent_win_rate_diffs.append(f1 - f2)
        
        v1_wins, v1_matches = team_venue[(t1, venue)]
        v2_wins, v2_matches = team_venue[(t2, venue)]
        venue_diffs.append((v1_wins / v1_matches if v1_matches > 0 else 0.5) - (v2_wins / v2_matches if v2_matches > 0 else 0.5))
        
        sf1 = np.mean(season_form[(t1, season)]) if season_form[(t1, season)] else 0.5
        sf2 = np.mean(season_form[(t2, season)]) if season_form[(t2, season)] else 0.5
        season_win_rate_diffs.append(sf1 - sf2)"""
content = content.replace(old_extract, new_extract)

# 6. get_strength
old_return = """            return {'bat_score': bat_score, 'bowl_score': bowl_score}"""
new_return = """            bat_runs_sum = sum(sum(p['bat'][k] for k in ['powerplay_runs', 'middle_runs', 'death_runs']) for p in perf)
            bat_overs_sum = sum(sum(p['bat'].get(k, 0) for k in ['powerplay_overs', 'middle_overs', 'death_overs']) for p in perf)
            recent_bat_rr = bat_runs_sum / max(1.0, bat_overs_sum)
            
            recent_bowl_wkts = np.mean([sum(p['bowl'][k] for k in ['powerplay_wkts', 'middle_wkts', 'death_wkts']) for p in perf])
            recent_runs_scored_avg = np.mean([sum(p['bat'][k] for k in ['powerplay_runs', 'middle_runs', 'death_runs']) for p in perf])
            recent_runs_conceded_avg = np.mean([sum(p['bowl'][k] for k in ['powerplay_runs', 'middle_runs', 'death_runs']) for p in perf])
            
            return {
                'bat_score': bat_score, 'bowl_score': bowl_score,
                'recent_bat_rr': recent_bat_rr, 'recent_bowl_wkts': recent_bowl_wkts,
                'recent_runs_scored_avg': recent_runs_scored_avg,
                'recent_runs_conceded_avg': recent_runs_conceded_avg
            }"""
content = content.replace(old_return, new_return)

old_diffs = """        st1, st2 = get_strength(t1), get_strength(t2)
        batting_diffs.append(st1['bat_score'] - st2['bat_score'])
        bowling_diffs.append(st1['bowl_score'] - st2['bowl_score'])"""
new_diffs = """        st1, st2 = get_strength(t1), get_strength(t2)
        batting_diffs.append(st1['bat_score'] - st2['bat_score'])
        bowling_diffs.append(st1['bowl_score'] - st2['bowl_score'])
        recent_bat_rr_diffs.append(st1['recent_bat_rr'] - st2['recent_bat_rr'])
        recent_bowl_wkts_diffs.append(st1['recent_bowl_wkts'] - st2['recent_bowl_wkts'])
        recent_runs_scored_avg_diffs.append(st1['recent_runs_scored_avg'] - st2['recent_runs_scored_avg'])
        recent_runs_conceded_avg_diffs.append(st1['recent_runs_conceded_avg'] - st2['recent_runs_conceded_avg'])"""
content = content.replace(old_diffs, new_diffs)

# 7. Update running stats (season_form)
old_running = """        recent_form[t1].append(t1_won)
        recent_form[t2].append(t2_won)"""
new_running = """        recent_form[t1].append(t1_won)
        recent_form[t2].append(t2_won)
        season_form[(t1, season)].append(t1_won)
        season_form[(t2, season)].append(t2_won)"""
content = content.replace(old_running, new_running)

# 8. df columns
old_cols = """    df["elo_diff"] = elo_diffs
    df["form_diff"] = form_diffs
    df["venue_diff"] = venue_diffs
    df["batting_strength_diff"] = batting_diffs
    df["bowling_strength_diff"] = bowling_diffs
    df["toss_impact"] = toss_impacts
    df["toss_won"] = toss_wons"""
new_cols = """    df["elo_diff"] = elo_diffs
    df["recent_win_rate_diff"] = recent_win_rate_diffs
    df["venue_win_rate_diff"] = venue_diffs
    df["batting_strength_diff"] = batting_diffs
    df["bowling_strength_diff"] = bowling_diffs
    df["recent_bat_run_rate_diff"] = recent_bat_rr_diffs
    df["recent_bowl_wkts_diff"] = recent_bowl_wkts_diffs
    df["recent_runs_scored_avg_diff"] = recent_runs_scored_avg_diffs
    df["recent_runs_conceded_avg_diff"] = recent_runs_conceded_avg_diffs
    df["season_win_rate_diff"] = season_win_rate_diffs
    df["toss_impact"] = toss_impacts
    df["toss_won"] = toss_wons"""
content = content.replace(old_cols, new_cols)

# 9. serialize season form
old_serial = """    final_states = {
        "elo": elo,
        "recent_form": serializable_form,
        "venue_stats": dict(team_venue),
        "venue_overall": dict(venue_overall),
        "h2h_stats": serializable_h2h,
        "team_perf": serializable_perf
    }"""
new_serial = """    serializable_season_form = {}
    for (team, season_str), dq in season_form.items():
        serializable_season_form[f"{team}_{season_str}"] = list(dq)
        
    final_states = {
        "elo": elo,
        "recent_form": serializable_form,
        "venue_stats": dict(team_venue),
        "venue_overall": dict(venue_overall),
        "h2h_stats": serializable_h2h,
        "team_perf": serializable_perf,
        "season_form": serializable_season_form
    }"""
content = content.replace(old_serial, new_serial)

with open("src/features.py", "w") as f:
    f.write(content)
print("features.py patched successfully.")
