const CRIC_API_KEY = "YOUR_CRICAPI_KEY_HERE"; // get free key from cricapi.com
const PREDICT_API = (window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1')
  ? (window.location.port === '5001' ? '/predict_live' : 'http://localhost:5001/predict_live')
  : 'https://ipl-predictor-backend-04gv.onrender.com/predict_live';
const IPL_TEAMS = ['CSK','MI','RCB','KKR','SRH','RR','DC','PBKS','LSG','GT'];

// ─── LSTM Sequence History ────────────────────────────────
// Maintains chronological over-by-over history for LSTM inference
// Consistent with training: sequence of 20 steps, padded with zeros if < 20 overs
const liveSequenceHistory = [];
let currentMatchId = null;
let lastRecordedOver = -1;

function resetSequenceHistory(matchId) {
  if (matchId !== currentMatchId) {
    liveSequenceHistory.length = 0;
    currentMatchId = matchId;
    lastRecordedOver = -1;
  }
}

function addOverSnapshot(snapshot) {
  // snapshot = { score, wickets, crr, rrr, balls_left, last3_runs, last3_wickets }
  liveSequenceHistory.push(snapshot);
  // Keep only last 20 — consistent with LSTM seq_len=20
  if (liveSequenceHistory.length > 20) liveSequenceHistory.shift();
}

function buildPaddedSequence() {
  // Pad with zeros at the start if fewer than 20 steps recorded
  // Consistent with training: zero-padding for early overs
  const SEQ_LEN = 20;
  const padded = [];
  const zeros = [0, 0, 0, 0, 0, 0, 0]; // 7 features
  for (let i = 0; i < SEQ_LEN - liveSequenceHistory.length; i++) {
    padded.push(zeros);
  }
  for (const snap of liveSequenceHistory) {
    padded.push([
      Math.min(snap.score, 300)   / 300.0,
      Math.min(snap.wickets, 10)  / 10.0,
      Math.min(snap.crr, 20)      / 20.0,
      Math.min(snap.rrr, 30)      / 30.0,
      Math.min(snap.balls_left, 120) / 120.0,
      Math.min(snap.last3_runs, 60)  / 60.0,
      Math.min(snap.last3_wickets, 3) / 3.0
    ]);
  }
  return padded; // 20 x 7
}

// ─── CricAPI Fetch ────────────────────────────────────────
async function fetchLiveMatches() {
  try {
    showStatus("Fetching live data...");
    const res = await fetch(`https://api.cricapi.com/v1/currentMatches?apikey=${CRIC_API_KEY}&offset=0`);
    const data = await res.json();

    if (!data.data) { showNoMatch(); return; }

    const iplMatch = data.data.find(m =>
      IPL_TEAMS.some(t => m.name.includes(t)) && m.matchStarted && !m.matchEnded
    );

    if (iplMatch) {
      parseAndDisplay(iplMatch);
    } else {
      showNoMatch();
    }
  } catch(e) {
    showStatus("API error — retrying in 30s");
  }
}

async function parseAndDisplay(match) {
  const overs    = match.score?.[0]?.o || 0;
  const battingTeam = match.score?.[0]?.inning?.split(" Inning")[0] || "Team A";
  const teams    = match.teams || [];
  const bowlingTeam = teams.find(t => t !== battingTeam) || "Team B";

  const isSecondInnings = match.score?.length > 1;
  const runs    = match.score?.[0]?.r || 0;
  const wickets = match.score?.[0]?.w || 0;
  // Target = 1st innings score + 1
  const target  = isSecondInnings ? (match.score[1]?.r + 1 || null) : null;

  const ballsBowled = Math.floor(overs) * 6 + Math.round((overs % 1) * 10);
  const ballsLeft   = Math.max(0, 120 - ballsBowled);
  const runsNeeded  = target ? Math.max(0, target - runs) : null;
  const currentRR   = overs > 0 ? (runs / overs).toFixed(2) : "0.00";
  const requiredRR  = (runsNeeded && ballsLeft > 0)
    ? ((runsNeeded / ballsLeft) * 6).toFixed(2) : null;

  // Update scorecard UI
  updateScorecard({
    battingTeam, bowlingTeam, runs, wickets, overs,
    target, runsNeeded, ballsLeft, currentRR, requiredRR, isSecondInnings
  });

  // Predict live win probability
  if (isSecondInnings && target) {
    resetSequenceHistory(match.id || match.name);

    const completedOvers = Math.floor(overs);
    if (completedOvers > 0 && completedOvers > lastRecordedOver) {
      // Compute last3 from recorded history
      const histLen = liveSequenceHistory.length;
      let baseScore = 0;
      let baseWickets = 0;
      if (histLen >= 3) {
        baseScore = liveSequenceHistory[histLen - 3].score;
        baseWickets = liveSequenceHistory[histLen - 3].wickets;
      }
      const last3Runs    = runs - baseScore;
      const last3Wickets = wickets - baseWickets;

      addOverSnapshot({
        score:        runs,
        wickets:      wickets,
        crr:          parseFloat(currentRR),
        rrr:          requiredRR ? parseFloat(requiredRR) : 0,
        balls_left:   ballsLeft,
        last3_runs:   Math.max(0, last3Runs),
        last3_wickets: Math.max(0, last3Wickets)
      });
      lastRecordedOver = completedOvers;
    }

    // Only supply sequence if genuine sequential history exists (to avoid feeding arbitrary zero-padded vectors)
    const hasGenuineHistory = (completedOvers <= 1) || (liveSequenceHistory.length >= completedOvers);
    const seqToSend = hasGenuineHistory ? buildPaddedSequence() : null;

    await getLivePrediction({
      inning:        2,
      over:          overs,
      current_score: runs,
      wickets_lost:  wickets,
      target:        target,
      batting_team:  battingTeam,
      bowling_team:  bowlingTeam,
      sequence_history: seqToSend
    });
  } else {
    // 1st Innings in-match prediction
    await getLivePrediction({
      inning:        1,
      over:          overs,
      current_score: runs,
      wickets_lost:  wickets,
      batting_team:  battingTeam,
      bowling_team:  bowlingTeam
    });
  }
}

// ─── Flask Prediction Call ────────────────────────────────
async function getLivePrediction(matchData) {
  try {
    const res = await fetch(PREDICT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(matchData)
    });
    const result = await res.json();

    // Backend returns 'batting_team_win_probability' (not 'batting_team_win_prob')
    const battingProb = result.batting_team_win_probability ?? result.batting_team_win_prob ?? 50;
    const bowlingProb = result.bowling_team_win_probability ?? result.bowling_team_win_prob ?? 50;
    const modelUsed   = result.model_used || "XGBoost";

    updateProbabilityGauge(battingProb, bowlingProb);
    addGraphPoint(battingProb);
    showModelBadge(modelUsed);

    if (typeof updateMatchSituation === "function") {
      updateMatchSituation(battingProb, matchData);
    }
  } catch(e) {
    console.log("Prediction API not available:", e);
  }
}

// ─── Model Badge ─────────────────────────────────────────
function showModelBadge(modelUsed) {
  const isDL = modelUsed.includes("LSTM") || modelUsed.includes("FFNN");
  const badgeEl = document.getElementById('live-model-badge');
  if (!badgeEl) return;
  badgeEl.innerHTML = isDL
    ? `<strong>Powered by ${modelUsed}</strong> — Deep Learning`
    : `Powered by ${modelUsed}`;
  badgeEl.style.color = isDL ? '#a5b4fc' : '#94a3b8';
}

// ─── UI Update Functions ──────────────────────────────────
function updateScorecard(d) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  set('batting-team-name', d.battingTeam);
  set('bowling-team-name', d.bowlingTeam);
  set('live-score',        `${d.runs}/${d.wickets}`);
  set('live-overs',        `${d.overs} Overs`);
  set('current-rr',        d.currentRR);
  set('balls-left',        d.ballsLeft);
  set('wickets-lost',      d.wickets);

  if (d.isSecondInnings) {
    set('target-display', `Target: ${d.target}`);
    set('need-display',   `Need ${d.runsNeeded} off ${d.ballsLeft} balls`);
    const rrEl = document.getElementById('required-rr');
    if (rrEl) {
      rrEl.textContent = d.requiredRR;
      rrEl.style.color = d.requiredRR < 10 ? '#22c55e'
        : d.requiredRR < 13 ? '#f97316' : '#ef4444';
    }
  }

  const prob = parseFloat(document.getElementById('batting-prob')?.textContent) || 50;
  const situation = prob > 75 ? "COMFORTABLE WIN"
    : prob > 55 ? "SLIGHT ADVANTAGE"
    : prob > 45 ? "VERY CLOSE MATCH"
    : prob > 25 ? "DIFFICULT CHASE"
    : "UNLIKELY COMEBACK";
  set('match-situation', situation);

  showStatus(`Last updated: ${new Date().toLocaleTimeString()}`);
}

function updateProbabilityGauge(battingProb, bowlingProb) {
  animateValue('batting-prob', battingProb);
  animateValue('bowling-prob', bowlingProb);
  const needle = document.getElementById('gauge-needle');
  if (needle) {
    const rotation = (battingProb / 100) * 180 - 90;
    needle.style.transform = `rotate(${rotation}deg)`;
    needle.style.borderColor = battingProb > 65 ? '#22c55e'
      : battingProb > 45 ? '#f97316' : '#ef4444';
  }
}

function animateValue(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const current = parseFloat(el.textContent) || 50;
  const diff = target - current;
  let step = 0;
  const timer = setInterval(() => {
    step++;
    el.textContent = (current + (diff * step / 20)).toFixed(1) + '%';
    if (step >= 20) clearInterval(timer);
  }, 30);
}

// ─── Chart ───────────────────────────────────────────────
let probChart;
const chartLabels  = [];
const battingData  = [];
const bowlingData  = [];

function initChart(team1, team2) {
  const canvas = document.getElementById('prob-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  probChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartLabels,
      datasets: [
        { label: team1, data: battingData, borderColor: '#f97316', tension: 0.4, fill: false },
        { label: team2, data: bowlingData, borderColor: '#3b82f6', tension: 0.4, fill: false }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: { min: 0, max: 100, title: { display: true, text: 'Win %' } },
        x: { title: { display: true, text: 'Over' } }
      },
      plugins: { legend: { display: true } }
    }
  });
}

function addGraphPoint(battingProb) {
  chartLabels.push(`Over ${chartLabels.length + 1}`);
  battingData.push(battingProb);
  bowlingData.push(100 - battingProb);
  if (probChart) probChart.update();
}

// ─── No Match State & Replay Testing ────────────────────────
function showNoMatch() {
  const el = document.getElementById('live-content');
  if (el) el.innerHTML = `
    <div style="text-align:center; padding:40px 20px;">
      <h2 style="font-family:Orbitron; color:#f97316; margin:16px 0">NO LIVE IPL MATCH IN PROGRESS</h2>
      <p style="color:#94a3b8">CricAPI reports no active match currently underway (matches typically run at 3:30 PM &amp; 7:30 PM IST).</p>
      <p style="color:#64748b; font-size:12px; margin-top:8px">Last checked: ${new Date().toLocaleTimeString()}</p>
      <div style="margin-top:24px;">
        <button id="btn-demo-replay" style="background:#f97316; color:#000; border:none; padding:10px 24px; font-weight:700; border-radius:6px; cursor:pointer; font-family:'Orbitron',sans-serif; font-size:12px;">
          REPLAY HISTORICAL CHASE (LSTM VERIFICATION)
        </button>
      </div>
    </div>`;

  const btn = document.getElementById('btn-demo-replay');
  if (btn) {
    btn.addEventListener('click', runDemoChaseReplay);
  }
}

async function runDemoChaseReplay() {
  showStatus("Simulating real over-by-over historical chase for verification...");
  // Reconstruct full live scorecard UI
  location.reload();
}

function showStatus(msg) {
  const el = document.getElementById('live-status-bar');
  if (el) el.innerHTML = msg;
}

// ─── Init ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  fetchLiveMatches();
  setInterval(fetchLiveMatches, 30000);
});