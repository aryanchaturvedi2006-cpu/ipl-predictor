"""
build_venue_profiles.py
Builds venue_profiles.json from the project's OWN data (data/matches.csv + data/deliveries.csv).
Nothing is hand-written. Keys = the 18 venue keys used by VENUES in data.js.
Run:  python build_venue_profiles.py
"""
import json, re
import pandas as pd, numpy as np

# ---- data.js VENUES key  <-  substrings of venue names found in matches.csv ----
ALIASES = {
  "Wankhede":      ["wankhede"],
  "Chepauk":       ["chidambaram"],
  "Chinnaswamy":   ["chinnaswamy"],
  "EdenGardens":   ["eden gardens"],
  "RajivGandhi":   ["rajiv gandhi"],
  "Mohali":        ["punjab cricket association", "is bindra"],
  "SawaiMansingh": ["sawai mansingh"],
  "ArunJaitley":   ["arun jaitley", "feroz shah kotla"],
  "NarendraModi":  ["narendra modi", "sardar patel stadium"],
  "Ekana":         ["ekana"],
  "Dharamshala":   ["himachal pradesh"],
  "Guwahati":      ["barsapara"],
  "Visakhapatnam": ["aca-vdca", "rajasekhara"],
  "Indore":        ["holkar"],
  "Rajkot":        ["saurashtra"],
  "Thiruvananthapuram": ["greenfield"],
  "Ranchi":        ["jsca"],
  "Pune":          ["maharashtra cricket association", "subrata roy"],
}
def venue_key(v):
    v = str(v).lower()
    for k, subs in ALIASES.items():
        if any(s in v for s in subs):
            return k
    return None

m = pd.read_csv("data/matches.csv")
m["date"] = pd.to_datetime(m["date"], errors="coerce")
m["vkey"] = m["venue"].map(venue_key)

# innings-1 totals / wickets from ball-by-ball
d = pd.read_csv("data/deliveries.csv", usecols=["match_id", "innings", "total_runs", "is_wicket"])
d1 = d[d["innings"] == 1].groupby("match_id").agg(inn1_runs=("total_runs", "sum"),
                                                  inn1_wkts=("is_wicket", "sum")).reset_index()
m = m.merge(d1, on="match_id", how="left")

# who batted first (from toss) -> did the chasing side win?
def batted_first(r):
    if r.toss_decision == "bat":
        return r.toss_winner
    other = r.team2 if r.toss_winner == r.team1 else r.team1
    return other
m["bat_first"] = m.apply(batted_first, axis=1)
res = m.dropna(subset=["winner"]).copy()
res["chase_won"] = (res["winner"] != res["bat_first"]).astype(int)

recent_ref = res[res["date"] >= res["date"].max() - pd.Timedelta(days=3*365)]
league_recent_avg = float(recent_ref["inn1_runs"].mean())

def block(g):
    g = g.sort_values("date")
    return {
        "matches": int(len(g)),
        "avg_first_innings": None if g["inn1_runs"].notna().sum() == 0 else round(float(g["inn1_runs"].mean()), 1),
        "avg_first_innings_wkts": None if g["inn1_wkts"].notna().sum() == 0 else round(float(g["inn1_wkts"].mean()), 1),
        "chase_win_pct": round(float(g["chase_won"].mean() * 100), 1),
    }

out = {"_meta": {
    "source": "data/matches.csv + data/deliveries.csv (computed, not hand-written)",
    "data_through": str(m["date"].max().date()),
    "league_recent_avg_first_innings": round(league_recent_avg, 1),
    "pitch_type_rule": "venue last-10 avg 1st-innings score vs league recent avg: >= +8 Batting Friendly, <= -8 Bowling Friendly, else Balanced",
    "limits": "Pitch 'turning/green/dry' cannot be derived from this data (no bowler-type or pitch-report columns).",
}}
for key in ALIASES:
    g = res[res["vkey"] == key]
    if g.empty:
        out[key] = {"data_quality": "none", "note": "No matches found for this venue in dataset"}
        continue
    g = g.sort_values("date")
    last10 = g.tail(10)
    last_date = g["date"].max()
    stale = (m["date"].max() - last_date).days > 3 * 365
    b10, ball = block(last10), block(g)
    quality = "stale" if stale else ("limited" if b10["matches"] < 5 else "ok")
    pitch = None
    if quality == "ok" and b10["avg_first_innings"] is not None:
        diff = b10["avg_first_innings"] - league_recent_avg
        pitch = "Batting Friendly" if diff >= 8 else ("Bowling Friendly" if diff <= -8 else "Balanced")
    out[key] = {
        "last10": b10, "all_time": ball,
        "last_match_date": str(last_date.date()),
        "data_quality": quality,
        "pitch_type": pitch,
        "vs_league_recent": None if b10["avg_first_innings"] is None else round(b10["avg_first_innings"] - league_recent_avg, 1),
    }
json.dump(out, open("venue_profiles.json", "w"), indent=2)
print("league recent avg 1st-inn:", round(league_recent_avg,1), "| data through", m["date"].max().date())
print(f"{'venue':<20}{'n_all':>6}{'n10':>5}{'avg10':>7}{'chase%10':>9}{'last match':>13}  quality / pitch")
for k, v in out.items():
    if k == "_meta": continue
    if v.get("data_quality") == "none": print(f"{k:<20} NONE"); continue
    print(f"{k:<20}{v['all_time']['matches']:>6}{v['last10']['matches']:>5}{str(v['last10']['avg_first_innings']):>7}{v['last10']['chase_win_pct']:>9}{v['last_match_date']:>13}  {v['data_quality']} / {v['pitch_type']}")