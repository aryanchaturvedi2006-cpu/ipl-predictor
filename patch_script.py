import re

with open('script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update factor grid logic
old_factor_logic = """  const eloA   = normDiff(f.elo_diff, 400),   eloB   = 100 - eloA;
  const formA  = normDiff(f.form_diff, 4),     formB  = 100 - formA;
  const venueA = normDiff(f.venue_diff, 0.8),    venueB = 100 - venueA;
  const batA   = normDiff(f.batting_strength_diff,  15), batB   = 100 - batA;
  const bowlA  = normDiff(f.bowling_strength_diff,  60), bowlB  = 100 - bowlA;
  const tossA  = normDiff(f.toss_impact, 0.3), tossB  = 100 - tossA;

  const tossWonA = normDiff(f.toss_won, 1), tossWonB = 100 - tossWonA;

  const factors = [
    { name: 'Elo Rating Difference',  weight: 'RF', f: {a: eloA,   b: eloB},   note: `Elo diff: ${f.elo_diff.toFixed(0)} pts. Tracks long-run team quality through wins/losses.` },
    { name: 'Recent Form (Last 5)',   weight: 'RF', f: {a: formA,  b: formB},  note: `Form diff: ${(f.form_diff * 100).toFixed(0)}%. Win rate of last 5 matches. Current momentum.` },
    { name: 'Venue Win %',            weight: 'RF', f: {a: venueA, b: venueB}, note: `Venue diff: ${(f.venue_diff * 100).toFixed(0)}%. Ground-specific win history at this venue.` },
    { name: 'Batting Strength',       weight: 'RF', f: {a: batA,   b: batB},   note: `Diff: ${f.batting_strength_diff.toFixed(1)}. Composite of powerplay, middle & death overs run rate (last 10 games).` },
    { name: 'Bowling Strength',       weight: 'RF', f: {a: bowlA,  b: bowlB},  note: `Diff: ${f.bowling_strength_diff.toFixed(1)}. Composite of powerplay wkts, death economy & wicket-taking (last 10 games).` },
    { name: 'Toss Advantage',         weight: 'RF', f: {a: tossA,  b: tossB},  note: `Toss impact: ${f.toss_impact.toFixed(3)}. Based on this venue's historical chase vs defend bias.` },
    { name: 'Toss Winner',            weight: 'RF', f: {a: tossWonA, b: tossWonB}, note: `Direct flag indicating which team won the toss.` },
    { name: 'Pitch Type <span style="font-size:0.65rem; color:#f97316; margin-left:4px; background:rgba(249,115,22,0.1); padding:2px 4px; border-radius:4px;">Auto</span>', weight: 'FIX', f: {
        a: pitchImpactA === 0 ? 50 : Math.max(5, Math.min(95, 50 + (pitchImpactA / 15) * 50)),
        b: pitchImpactA === 0 ? 50 : Math.max(5, Math.min(95, 50 + (-pitchImpactA / 15) * 50))
      }, note: `Pitch condition calculated from historical averages.` 
    },
    { name: 'Dew Factor <span style="font-size:0.65rem; color:#f97316; margin-left:4px; background:rgba(249,115,22,0.1); padding:2px 4px; border-radius:4px;">Auto</span>', weight: 'FIX', f: {
        a: dewImpactValA === 0 ? 50 : Math.max(5, Math.min(95, 50 + (dewImpactValA / 14) * 50)),
        b: dewImpactValB === 0 ? 50 : Math.max(5, Math.min(95, 50 + (dewImpactValB / 14) * 50))
      }, note: dewImpactNote 
    },
    { name: 'Squad Strength',         weight: 'FIX', f: {
        a: squadImpactValA === 0 ? 50 : Math.max(5, Math.min(95, 50 + (squadImpactValA / 15) * 50)),
        b: squadImpactValA === 0 ? 50 : Math.max(5, Math.min(95, 50 + (-squadImpactValA / 15) * 50))
      }, note: `Multiplier impact based on reported absences.` 
    }
  ];"""

new_factor_logic = """  // Update section title to clarify these are heuristics, not model weights
  document.querySelectorAll('.section-title').forEach(el => {
    if(el.textContent.includes('FACTOR BREAKDOWN')) {
      el.textContent = 'MATCH FACTOR INDICATORS (Heuristic Diagnostics)';
    }
  });

  const eloA = normDiff(f.elo_diff || 0, 400), eloB = 100 - eloA;
  const recentWinA = normDiff(f.recent_win_rate_diff || 0, 1.0), recentWinB = 100 - recentWinA;
  const venueWinA = normDiff(f.venue_win_rate_diff || 0, 1.0), venueWinB = 100 - venueWinA;
  const batA = normDiff(f.batting_strength_diff || 0, 15), batB = 100 - batA;
  const bowlA = normDiff(f.bowling_strength_diff || 0, 60), bowlB = 100 - bowlA;
  const runRateA = normDiff(f.recent_bat_run_rate_diff || 0, 2.0), runRateB = 100 - runRateA;
  
  const factors = [
    { name: 'Elo Rating Diff', weight: 'STAT', f: {a: eloA, b: eloB}, note: `Elo diff: ${(f.elo_diff||0).toFixed(0)} pts. Tracks long-run team quality.` },
    { name: 'Recent Win Rate', weight: 'STAT', f: {a: recentWinA, b: recentWinB}, note: `Diff: ${((f.recent_win_rate_diff||0)*100).toFixed(0)}%. Win rate in recent matches.` },
    { name: 'Venue Win Rate', weight: 'STAT', f: {a: venueWinA, b: venueWinB}, note: `Diff: ${((f.venue_win_rate_diff||0)*100).toFixed(0)}%. Historical win rate at this venue.` },
    { name: 'Batting Strength', weight: 'STAT', f: {a: batA, b: batB}, note: `Diff: ${(f.batting_strength_diff||0).toFixed(1)}. Composite of phase-wise batting stats.` },
    { name: 'Bowling Strength', weight: 'STAT', f: {a: bowlA, b: bowlB}, note: `Diff: ${(f.bowling_strength_diff||0).toFixed(1)}. Composite of phase-wise bowling stats.` },
    { name: 'Recent Run Rate', weight: 'STAT', f: {a: runRateA, b: runRateB}, note: `Diff: ${(f.recent_bat_run_rate_diff||0).toFixed(2)}. Run rate in recent matches.` },
    { name: 'Pitch Type <span style="font-size:0.65rem; color:#f97316; margin-left:4px; background:rgba(249,115,22,0.1); padding:2px 4px; border-radius:4px;">Auto</span>', weight: 'COND', f: {
        a: pitchImpactA === 0 ? 50 : Math.max(5, Math.min(95, 50 + (pitchImpactA / 15) * 50)),
        b: pitchImpactA === 0 ? 50 : Math.max(5, Math.min(95, 50 + (-pitchImpactA / 15) * 50))
      }, note: `Pitch condition calculated from historical averages.` 
    },
    { name: 'Dew Factor <span style="font-size:0.65rem; color:#f97316; margin-left:4px; background:rgba(249,115,22,0.1); padding:2px 4px; border-radius:4px;">Auto</span>', weight: 'COND', f: {
        a: dewImpactValA === 0 ? 50 : Math.max(5, Math.min(95, 50 + (dewImpactValA / 14) * 50)),
        b: dewImpactValB === 0 ? 50 : Math.max(5, Math.min(95, 50 + (dewImpactValB / 14) * 50))
      }, note: dewImpactNote 
    }
  ];"""

if old_factor_logic in content:
    content = content.replace(old_factor_logic, new_factor_logic)

# 2. Add Model Badge dynamically in displayResults
model_badge_insertion = """  const confEl = document.getElementById('winnerConf');
  if (confEl) {
    confEl.textContent = conf;
    confEl.style.color = diff > 12 ? '#10b981' : diff > 5 ? '#00c8e6' : '#f59e0b';
    confEl.style.borderColor = confEl.style.color;
    confEl.style.background = confEl.style.color + '15';
  }

  // Model Badge (dynamic insertion)
  let modelBadge = document.getElementById('predictionModelBadge');
  if (!modelBadge) {
    modelBadge = document.createElement('div');
    modelBadge.id = 'predictionModelBadge';
    modelBadge.style.cssText = "margin-top:12px;font-size:0.85rem;color:#a5b4fc;font-weight:600;font-family:'Orbitron', sans-serif;background:rgba(129,140,248,0.1);padding:4px 12px;border-radius:20px;display:inline-block;";
    if (winnerPanel) {
      winnerPanel.appendChild(modelBadge);
    }
  }
  modelBadge.innerHTML = `Powered by ${r.prediction_model || 'Unknown Model'}`;"""

old_conf_logic = """  const confEl = document.getElementById('winnerConf');
  if (confEl) {
    confEl.textContent = conf;
    confEl.style.color = diff > 12 ? '#10b981' : diff > 5 ? '#00c8e6' : '#f59e0b';
    confEl.style.borderColor = confEl.style.color;
    confEl.style.background = confEl.style.color + '15';
  }"""

if old_conf_logic in content:
    content = content.replace(old_conf_logic, model_badge_insertion)

with open('script.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied to script.js without emojis")
