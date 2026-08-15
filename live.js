const CRIC_API_KEY = "YOUR_CRICAPI_KEY_HERE"; // get free key from cricapi.com
const PREDICT_API = "http://localhost:5000/predict_live";
const IPL_TEAMS = ['CSK','MI','RCB','KKR','SRH','RR','DC','PBKS','LSG','GT'];

async function fetchLiveMatches() {
  try {
    showStatus("🔴 Fetching live data...");
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
    showStatus("⚠️ API error — retrying in 30s");
  }
}

async function parseAndDisplay(match) {
  // CricAPI gives score like "115/4 in 14.2 overs"
  const scoreStr = match.score?.[0]?.r + "/" + match.score?.[0]?.w;
  const overs = match.score?.[0]?.o;
  const battingTeam = match.score?.[0]?.inning?.split(" Inning")[0];
  
  // Identify bowling team
  const teams = match.teams;
  const bowlingTeam = teams.find(t => t !== battingTeam);
  
  // Get target if 2nd innings
  const isSecondInnings = match.score?.length > 1;
  const target = isSecondInnings ? (match.score[0].r + 1) : null;
  const runs = match.score?.[0]?.r;
  const wickets = match.score?.[0]?.w;
  const ballsBowled = Math.floor(overs) * 6 + Math.round((overs % 1) * 10);
  const ballsLeft = 120 - ballsBowled;
  const runsNeeded = target ? target - runs : null;
  const currentRR = overs > 0 ? (runs / overs).toFixed(2) : 0;
  const requiredRR = (runsNeeded && ballsLeft > 0) ? ((runsNeeded / ballsLeft) * 6).toFixed(2) : null;

  // Update scorecard UI
  updateScorecard({
    battingTeam, bowlingTeam, runs, wickets, overs,
    target, runsNeeded, ballsLeft, currentRR, requiredRR, isSecondInnings
  });

  // If 2nd innings, send to Flask for live prediction
  if (isSecondInnings && target) {
    await getLivePrediction({
      batting_team: battingTeam,
      bowling_team: bowlingTeam,
      current_score: runs,
      wickets_fallen: wickets,
      overs_completed: overs,
      target: target
    });
  }
}

async function getLivePrediction(matchData) {
  try {
    const res = await fetch(PREDICT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(matchData)
    });
    const result = await res.json();
    
    updateProbabilityGauge(result.batting_team_win_prob, result.bowling_team_win_prob);
    addGraphPoint(result.batting_team_win_prob); // adds point to over-by-over chart
    if (typeof updateMatchSituation === "function") {
        updateMatchSituation(result.batting_team_win_prob, matchData);
    }
  } catch(e) {
    console.log("Prediction API not available");
  }
}

function updateScorecard(d) {
  document.getElementById('batting-team-name').textContent = d.battingTeam;
  document.getElementById('bowling-team-name').textContent = d.bowlingTeam;
  document.getElementById('live-score').textContent = `${d.runs}/${d.wickets}`;
  document.getElementById('live-overs').textContent = `${d.overs} Overs`;
  
  if (d.isSecondInnings) {
    document.getElementById('target-display').textContent = `Target: ${d.target}`;
    document.getElementById('need-display').textContent = `Need ${d.runsNeeded} off ${d.ballsLeft} balls`;
    document.getElementById('required-rr').textContent = d.requiredRR;
    document.getElementById('required-rr').style.color = 
      d.requiredRR < 10 ? '#22c55e' : d.requiredRR < 13 ? '#f97316' : '#ef4444';
  }
  
  document.getElementById('current-rr').textContent = d.currentRR;
  document.getElementById('balls-left').textContent = d.ballsLeft;
  document.getElementById('wickets-lost').textContent = d.wickets;
  
  // Match situation badge
  const prob = parseFloat(document.getElementById('batting-prob')?.textContent) || 50;
  const situation = prob > 75 ? "💚 COMFORTABLE WIN" 
    : prob > 55 ? "🟡 SLIGHT ADVANTAGE"
    : prob > 45 ? "🔥 VERY CLOSE MATCH"
    : prob > 25 ? "🟠 DIFFICULT CHASE"
    : "🚨 UNLIKELY COMEBACK";
  document.getElementById('match-situation').textContent = situation;
  
  showStatus(`✅ Last updated: ${new Date().toLocaleTimeString()}`);
}

function updateProbabilityGauge(battingProb, bowlingProb) {
  // Animated counter update
  animateValue('batting-prob', battingProb);
  animateValue('bowling-prob', bowlingProb);
  
  // CSS gauge needle rotation
  const rotation = (battingProb / 100) * 180 - 90; // -90 to +90 degrees
  document.getElementById('gauge-needle').style.transform = `rotate(${rotation}deg)`;
  
  // Color update
  const color = battingProb > 65 ? '#22c55e' : battingProb > 45 ? '#f97316' : '#ef4444';
  document.getElementById('gauge-needle').style.borderColor = color;
}

function animateValue(id, target) {
  const el = document.getElementById(id);
  const current = parseFloat(el.textContent) || 50;
  const diff = target - current;
  let step = 0;
  const timer = setInterval(() => {
    step++;
    el.textContent = (current + (diff * step / 20)).toFixed(1) + '%';
    if (step >= 20) clearInterval(timer);
  }, 30);
}

let probChart;
const chartLabels = [];
const battingData = [];
const bowlingData = [];

function initChart(team1, team2) {
  const ctx = document.getElementById('prob-chart').getContext('2d');
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
  chartLabels.push(`Over ${Math.floor(chartLabels.length + 1)}`);
  battingData.push(battingProb);
  bowlingData.push(100 - battingProb);
  if (probChart) probChart.update();
}

function showNoMatch() {
  document.getElementById('live-content').innerHTML = `
    <div style="text-align:center; padding:60px 20px;">
      <div style="font-size:48px">🏏</div>
      <h2 style="font-family:Orbitron; color:#f97316; margin:16px 0">NO LIVE IPL MATCH</h2>
      <p style="color:#94a3b8">Check back during match hours (typically 3:30 PM & 7:30 PM IST)</p>
      <p style="color:#64748b; font-size:12px; margin-top:8px">Last checked: ${new Date().toLocaleTimeString()}</p>
    </div>
  `;
}

function showStatus(msg) {
  const el = document.getElementById('live-status-bar');
  if (el) el.innerHTML = msg;
}

// On page load
document.addEventListener('DOMContentLoaded', () => {
    fetchLiveMatches();
    setInterval(fetchLiveMatches, 30000);
});
