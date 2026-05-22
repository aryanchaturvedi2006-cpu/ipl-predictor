// ================================================================
// IPL PREDICTOR — LIVE MATCH CENTER  (live.js)
// Handles live score fetching from iplt20.com via backend,
// manual situation entry, and live win probability display.
// Auto-refreshes every 30 seconds.
// ================================================================

const API_URL = window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000'
  : 'https://ipl-predictor-backend-04gv.onrender.com';

// ---- State ----
let currentMatchState = null;
let previousProb = null;
let refreshTimer = null;
const REFRESH_INTERVAL_MS = 30000;

// ---- Boot ----
document.addEventListener('DOMContentLoaded', () => {
  fetchLiveAndPredict();
  fetchFixtures();
  // Auto-refresh every 30 seconds
  refreshTimer = setInterval(fetchLiveAndPredict, REFRESH_INTERVAL_MS);
});

// ================================================================
// FETCH LIVE FROM BACKEND (iplt20.com)
// ================================================================
async function fetchLiveAndPredict() {
  setStatus('Fetching live data from <strong>iplt20.com</strong>...');
  try {
    const res = await fetch(`${API_URL}/live_matches`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const match = data.matches && data.matches[0];
    if (!match) {
      setStatus('No live IPL match currently. Showing simulation mode — enter values manually below.');
      return;
    }

    // Populate UI with fetched data
    currentMatchState = match;
    updateScoreboard(match);
    setStatus(`Live data from <strong>iplt20.com</strong> — refreshes in 30s.`);

    // Run live prediction with this data
    await runLivePrediction(match);
  } catch (e) {
    setStatus(`Could not reach iplt20.com (${e.message}). Use manual entry below.`);
  }
}

// ================================================================
// MANUAL INPUT HANDLER
// ================================================================
async function runManualLive() {
  const state = {
    batting_team: document.getElementById('inputBatTeam').value.trim() || 'Team A',
    bowling_team: document.getElementById('inputBowlTeam').value.trim() || 'Team B',
    inning: parseInt(document.getElementById('inputInning').value) || 2,
    current_score: parseInt(document.getElementById('inputScore').value) || 0,
    wickets_lost: parseInt(document.getElementById('inputWickets').value) || 0,
    overs: parseFloat(document.getElementById('inputOvers').value) || 0,
    target: parseInt(document.getElementById('inputTarget').value) || -1,
    status: 'MANUAL'
  };

  updateScoreboard(state);
  await runLivePrediction(state);
}

// ================================================================
// CALL /predict_live ENDPOINT
// ================================================================
async function runLivePrediction(match) {
  try {
    const payload = {
      inning: match.inning || 2,
      over: match.overs || 0,
      current_score: match.current_score || 0,
      wickets_lost: match.wickets_lost || 0,
      target: match.target || -1,
      batting_team: match.batting_team || 'Team A',
      bowling_team: match.bowling_team || 'Team B'
    };

    const res = await fetch(`${API_URL}/predict_live`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    displayLiveResult(data);
  } catch (e) {
    console.error('Live prediction error:', e);
    setStatus(`Prediction error: ${e.message}`);
  }
}

// ================================================================
// UPDATE SCOREBOARD UI
// ================================================================
function updateScoreboard(match) {
  // Teams
  safeSet('battingTeamName', match.batting_team || 'Batting Team');
  safeSet('bowlingTeamName', match.bowling_team || 'Bowling Team');

  // Score
  const wkts = match.wickets_lost ?? 0;
  const scoreStr = `${match.current_score ?? 0}/${wkts}`;
  safeSet('liveScore', scoreStr);
  safeSet('liveOvers', `${match.overs ?? 0} Overs`);

  // Target info
  if (match.target && match.target > 0) {
    safeSet('targetDisplay', `Target: ${match.target}`);
    const runsNeeded = Math.max(0, match.target - (match.current_score || 0));
    const balls = match.balls_remaining || Math.max(0, 120 - Math.floor((match.overs || 0) * 6));
    safeSet('needDisplay', `Need ${runsNeeded} off ${balls} balls`);
  } else {
    safeSet('targetDisplay', '1st Innings');
    safeSet('needDisplay', 'Setting target');
  }

  // Meta
  const balls = Math.round((match.overs || 0) * 6);
  const ballsDone = balls;
  const crr = ballsDone > 0 ? ((match.current_score || 0) / ballsDone * 6).toFixed(2) : '0.00';
  safeSet('crrDisplay', crr);

  if (match.required_rr != null) {
    safeSet('rrrDisplay', parseFloat(match.required_rr).toFixed(2));
  } else if (match.target && match.target > 0) {
    const ballsLeft = Math.max(1, 120 - ballsDone);
    const runsNeeded = Math.max(0, match.target - (match.current_score || 0));
    safeSet('rrrDisplay', (runsNeeded / ballsLeft * 6).toFixed(2));
  } else {
    safeSet('rrrDisplay', '--');
  }

  safeSet('wicketsDisplay', wkts);
  const ballsLeft = Math.max(0, 120 - ballsDone);
  safeSet('ballsDisplay', ballsLeft);
}

// ================================================================
// DISPLAY LIVE RESULT
// ================================================================
function displayLiveResult(data) {
  const batTeam = data.batting_team || 'Batting Team';
  const bowlTeam = data.bowling_team || 'Bowling Team';
  const batProb = data.batting_team_win_probability || 50;
  const bowlProb = data.bowling_team_win_probability || 50;
  const pressure = data.pressure_index || 0;
  const momentum = data.momentum || 'Balanced';
  const phase = data.phase || 'Middle Overs';

  // Probability bar
  const barA = document.getElementById('probLiveA');
  const barB = document.getElementById('probLiveB');
  const teamAColor = getTeamColor(batTeam);
  const teamBColor = getTeamColor(bowlTeam);

  if (barA) {
    barA.style.width = batProb + '%';
    barA.style.background = teamAColor;
    barA.textContent = batProb + '%';
  }
  if (barB) {
    barB.style.width = bowlProb + '%';
    barB.style.background = teamBColor;
    barB.textContent = bowlProb + '%';
  }

  safeSet('probLabelA', `${batTeam} Win`);
  safeSet('probLabelB', `${bowlTeam} Win`);

  // Phase Tag
  const phaseTag = document.getElementById('phaseTag');
  if (phaseTag) {
    phaseTag.textContent = phase;
    const phaseColors = {
      'Powerplay': '#22c55e',
      'Middle Overs': '#00c8e6',
      'Death Overs': '#ef4444'
    };
    phaseTag.style.borderColor = (phaseColors[phase] || '#00c8e6') + '55';
    phaseTag.style.color = phaseColors[phase] || '#00c8e6';
  }

  // Momentum
  const momentumFill = document.getElementById('momentumFill');
  if (momentumFill) {
    let fillWidth = 50;
    let fillColor = '#6366f1';
    if (momentum.includes('Batting')) { fillWidth = 72; fillColor = '#22c55e'; }
    else if (momentum.includes('Bowling')) { fillWidth = 28; fillColor = '#ef4444'; }
    momentumFill.style.width = fillWidth + '%';
    momentumFill.style.background = fillColor;
  }
  safeSet('momentumNote', momentum);

  // Pressure Index
  const pressureRing = document.getElementById('pressureRing');
  safeSet('pressureVal', pressure);
  if (pressureRing) {
    let ringColor = '#22c55e';
    let shadow = 'rgba(34,197,94,0.3)';
    if (pressure > 60) { ringColor = '#ef4444'; shadow = 'rgba(239,68,68,0.3)'; }
    else if (pressure > 30) { ringColor = '#f59e0b'; shadow = 'rgba(245,158,11,0.3)'; }
    pressureRing.style.borderColor = ringColor;
    pressureRing.style.boxShadow = `0 0 20px ${shadow}`;
  }
  const pressureDesc = pressure > 60 ? 'Extreme pressure on batting side — must score quickly.' :
                       pressure > 30 ? 'Moderate pressure — run rate climbing.' :
                       'Low pressure — batters have control.';
  safeSet('pressureDesc', pressureDesc);

  // Context grid
  const ctx = data.context || {};
  safeSet('ctxWickets', ctx.wickets_in_hand ?? (10 - (data.wickets_lost || 0)));
  safeSet('ctxRuns', ctx.runs_needed ?? '--');
  safeSet('ctxBalls', ctx.balls_remaining ?? '--');

  // Explainability
  renderExplainer(data, previousProb);
  previousProb = { bat: batProb, bowl: bowlProb };
}

// ================================================================
// EXPLAINABILITY ENGINE
// ================================================================
function renderExplainer(data, prev) {
  const el = document.getElementById('explainerBody');
  if (!el) return;

  const points = [];
  const batProb = data.batting_team_win_probability;
  const bat = data.batting_team;
  const bowl = data.bowling_team;

  // Change from previous
  if (prev) {
    const diff = (batProb - prev.bat).toFixed(1);
    const dir = diff > 0 ? 'increased' : 'decreased';
    const col = diff > 0 ? '#22c55e' : '#ef4444';
    if (Math.abs(diff) >= 0.5) {
      points.push({ color: col, text: `Win probability for <strong>${bat}</strong> ${dir} by <strong>${Math.abs(diff)}%</strong> since last update.` });
    }
  }

  // Run rate analysis
  if (data.required_rr != null) {
    const rrDiff = (data.required_rr - data.current_rr).toFixed(2);
    if (rrDiff > 2) {
      points.push({ color: '#ef4444', text: `Required RR (${data.required_rr}) is <strong>${rrDiff} runs/over higher</strong> than current RR (${data.current_rr}). Major pressure on <strong>${bat}</strong>.` });
    } else if (rrDiff < 0) {
      points.push({ color: '#22c55e', text: `Current RR (${data.current_rr}) is ahead of requirement (${data.required_rr}). <strong>${bat}</strong> are in control.` });
    } else {
      points.push({ color: '#f59e0b', text: `RR (${data.current_rr}) close to requirement (${data.required_rr}). Contest is balanced.` });
    }
  }

  // Wickets
  const wickets = data.wickets_lost || 0;
  if (wickets >= 6) {
    points.push({ color: '#ef4444', text: `<strong>${wickets} wickets lost</strong> — tail is exposed. Wickets strongly reduce batting win probability.` });
  } else if (wickets <= 2 && data.inning === 2) {
    points.push({ color: '#22c55e', text: `Only <strong>${wickets} wickets lost</strong> — <strong>${bat}</strong> have plenty of batting depth remaining.` });
  }

  // Phase
  if (data.phase === 'Death Overs') {
    points.push({ color: '#f59e0b', text: `Death Overs phase — boundaries become critical. Power hitters and death bowling will decide this match.` });
  } else if (data.phase === 'Powerplay') {
    points.push({ color: '#00c8e6', text: `Powerplay phase — fielding restrictions in play. Early wickets here dramatically shift probability toward <strong>${bowl}</strong>.` });
  }

  // Momentum
  if (data.momentum && data.momentum !== 'Balanced') {
    const mCol = data.momentum.includes('Batting') ? '#22c55e' : '#ef4444';
    points.push({ color: mCol, text: `<strong>Momentum:</strong> ${data.momentum}. This contextual signal is factored into the live model output.` });
  }

  if (points.length === 0) {
    points.push({ color: '#6366f1', text: 'Match situation is stable. No significant probability shift since last update.' });
  }

  el.innerHTML = points.map(p => `
    <div class="explainer-row" style="border-left-color:${p.color}">
      <span>${p.text}</span>
    </div>`).join('');
}

// ================================================================
// FETCH FIXTURES
// ================================================================
async function fetchFixtures() {
  const el = document.getElementById('fixturesBody');
  try {
    const res = await fetch(`${API_URL}/fixtures`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (!data.fixtures || data.fixtures.length === 0) {
      el.innerHTML = '<div style="padding:16px;color:var(--text-2);text-align:center">No upcoming fixtures available.</div>';
      return;
    }

    el.innerHTML = data.fixtures.map(f => `
      <div class="fixture-row">
        <div>
          <div class="fixture-teams">${f.team1} vs ${f.team2}</div>
          <div class="fixture-meta">${f.venue || ''}</div>
        </div>
        <div class="fixture-date">${f.date || ''}</div>
      </div>`).join('');
  } catch (e) {
    el.innerHTML = `<div style="padding:16px;color:var(--text-2);text-align:center">Could not load fixtures from iplt20.com.</div>`;
  }
}

// ================================================================
// HELPERS
// ================================================================
function safeSet(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setStatus(msg) {
  const el = document.getElementById('statusBanner');
  if (el) el.innerHTML = msg;
}

function getTeamColor(teamName) {
  const colorMap = {
    'Chennai Super Kings': '#f5a623',
    'Mumbai Indians': '#004ba0',
    'Royal Challengers Bengaluru': '#c8102e',
    'Royal Challengers Bangalore': '#c8102e',
    'Kolkata Knight Riders': '#552583',
    'Rajasthan Royals': '#254aa5',
    'Delhi Capitals': '#0057a8',
    'Sunrisers Hyderabad': '#f7a721',
    'Punjab Kings': '#ed1f27',
    'Lucknow Super Giants': '#a0c4ff',
    'Gujarat Titans': '#1a2b5f',
    'Rising Pune Supergiant': '#9b1f5e'
  };
  if (colorMap[teamName]) return colorMap[teamName];
  // Fallback — pick from TEAMS data if loaded
  const team = Object.values(window.TEAMS || {}).find(t => t.name === teamName);
  return team ? team.primaryColor : '#6366f1';
}
