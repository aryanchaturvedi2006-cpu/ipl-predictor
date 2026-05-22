// ================================================================
// IPL PREDICTOR — 8-FACTOR SIMULATION ENGINE  (script.js)
// For use with predictor.html
// ================================================================

// ---- Initialize on page load ----
document.addEventListener('DOMContentLoaded', () => {
  populateDropdowns();
  wireRadioPills();
  ['teamA', 'teamB'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', checkReady);
  });
  // Wire timing hint update
  document.querySelectorAll('input[name="timing"]').forEach(r => {
    r.addEventListener('change', updateTimingHint);
  });
  wireTacticalSelectors();
});

// ---- Wire tactical select listeners ----
function wireTacticalSelectors() {
  const bSel = document.getElementById('tacticalBatsman');
  const wSel = document.getElementById('tacticalBowler');
  bSel?.addEventListener('change', updateTactical);
  wSel?.addEventListener('change', updateTactical);
}

// ---- Update timing hint text ----
function updateTimingHint() {
  const val = document.querySelector('input[name="timing"]:checked')?.value || 'night';
  const hint = document.getElementById('timingHint');
  if (!hint) return;
  if (val === 'day') {
    hint.innerHTML = '☀️ <strong>Day Match:</strong> Pitch gets drier under sun — spinners become increasingly dangerous. No dew, so bowling 2nd innings is easier. Batting on a used pitch is harder.';
    hint.style.borderColor = 'rgba(245,158,11,0.3)';
    hint.style.background  = 'rgba(245,158,11,0.05)';
  } else {
    hint.innerHTML = '🌙 <strong>Night/Day-Night:</strong> Dew makes the ball slippery for spinners in 2nd innings. Pacers get extra swing. Chasing team has a significant advantage at venues with heavy dew.';
    hint.style.borderColor = 'rgba(0,200,230,0.1)';
    hint.style.background  = 'rgba(0,200,230,0.05)';
  }
}
function populateDropdowns() {
  const aEl = document.getElementById('teamA');
  const bEl = document.getElementById('teamB');
  const vEl = document.getElementById('venue');
  if (!aEl) return;

  Object.keys(TEAMS).forEach(k => {
    const t = TEAMS[k];
    const opt = `<option value="${k}">${t.shortName} — ${t.name}</option>`;
    aEl.innerHTML += opt;
    bEl.innerHTML += opt;
  });

  Object.keys(VENUES).forEach(k => {
    vEl.innerHTML += `<option value="${k}">${VENUES[k].name}, ${VENUES[k].city}</option>`;
  });
}

// ---- Wire radio pills ----
function wireRadioPills() {
  document.querySelectorAll('.radio-row, .radio-group').forEach(row => {
    row.querySelectorAll('.radio-pill, .radio-card').forEach(pill => {
      pill.addEventListener('click', () => {
        row.querySelectorAll('.radio-pill, .radio-card').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        pill.querySelector('input').checked = true;
      });
    });
  });
}

// ---- Update Team Badge ----
function updateTeam(side) {
  const key = document.getElementById(`team${side}`).value;
  const badge = document.getElementById(`badge${side}`);
  if (!badge) return;

  if (key && TEAMS[key]) {
    const t = TEAMS[key];
    document.getElementById(`badge${side}Short`).textContent = t.shortName;
    document.getElementById(`badge${side}Short`).style.color = t.primaryColor;
    document.getElementById(`badge${side}Name`).textContent = t.name;
    document.getElementById(`badge${side}Name`).style.color = '#f0f4ff';
    document.getElementById(`badge${side}City`).textContent = `📍 ${t.city}`;
    badge.style.borderColor = t.primaryColor + '55';
    badge.style.background = t.primaryColor + '0d';
  } else {
    document.getElementById(`badge${side}Short`).textContent = '?';
    document.getElementById(`badge${side}Short`).style.color = 'var(--text-2)';
    document.getElementById(`badge${side}Name`).textContent = 'Select a team';
    document.getElementById(`badge${side}Name`).style.color = 'var(--text-2)';
    document.getElementById(`badge${side}City`).textContent = '';
    badge.style.borderColor = 'rgba(255,255,255,0.07)';
    badge.style.background = 'rgba(255,255,255,0.02)';
  }

  refreshTossOptions();
  checkReady();
  
  // Tactical Update: Refresh selectors whenever a team changes
  const aKey = document.getElementById('teamA').value;
  const bKey = document.getElementById('teamB').value;
  const tSec = document.getElementById('tacticalSection');
  if (tSec && aKey && bKey && aKey !== bKey) {
    populateTacticalSelectors(TEAMS[aKey], TEAMS[bKey]);
    updateTactical();
    tSec.style.display = 'block';
    setTimeout(() => {
      tSec.style.opacity = '1';
      tSec.style.pointerEvents = 'auto';
    }, 10);
  } else if (tSec) {
    tSec.style.opacity = '0';
    tSec.style.pointerEvents = 'none';
    setTimeout(() => { tSec.style.display = 'none'; }, 500);
  }
}

// ---- Refresh Toss Winner Options ----
function refreshTossOptions() {
  const tw = document.getElementById('tossWinner');
  if (!tw) return;
  const aKey = document.getElementById('teamA').value;
  const bKey = document.getElementById('teamB').value;
  tw.innerHTML = '<option value="">-- Select Toss Winner --</option>';
  if (aKey && TEAMS[aKey]) tw.innerHTML += `<option value="${aKey}">${TEAMS[aKey].name}</option>`;
  if (bKey && TEAMS[bKey]) tw.innerHTML += `<option value="${bKey}">${TEAMS[bKey].name}</option>`;
}

// ---- Update Venue Info ----
function updateVenue() {
  const key = document.getElementById('venue').value;
  const meta = document.getElementById('venueMeta');
  if (!meta) return;
  if (!key || !VENUES[key]) { meta.innerHTML = ''; return; }
  const v = VENUES[key];
  const dewLabel = { low: '🟢 Low Dew', medium: '🟡 Medium Dew', high: '🔴 High Dew' }[v.dewFactor];
  const dimLabel = { small: '📐 Small Ground', average: '📐 Average Ground', large: '📐 Large Ground' }[v.dimensions];
  const sizeLabel = v.groundDimensions ? `📏 ${v.groundDimensions}` : '';
  meta.innerHTML = `
    <span class="tag tag-cyan">⭐ Avg ${v.avgScore}</span>
    <span class="tag tag-${v.batFirstWinPct > 50 ? 'green' : 'red'}">🏏 Bat 1st ${v.batFirstWinPct}%</span>
    <span class="tag tag-${v.chaseWinPct > 50 ? 'green' : 'red'}">🎯 Chase ${v.chaseWinPct}%</span>
    <span class="tag tag-purple">${dewLabel}</span>
    <span class="tag tag-gold">${dimLabel}</span>
    ${sizeLabel ? `<span class="tag tag-slate">${sizeLabel}</span>` : ''}`;

  // Auto-set default pitch
  const dp = v.defaultPitch;
  document.querySelectorAll('[name="pitch"]').forEach(r => { r.checked = r.value === dp; });
  document.querySelectorAll('#pitchRow .radio-pill, #pitchGroup .radio-card').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.val === dp);
  });
}

// ---- Check if prediction can run ----
function checkReady() {
  const a = document.getElementById('teamA')?.value;
  const b = document.getElementById('teamB')?.value;
  const btn = document.getElementById('predictBtn');
  const hint = document.getElementById('predictHint');
  if (!btn) return;
  if (a && b && a !== b) {
    btn.disabled = false;
    if (hint) hint.textContent = '✅ Ready! Adjust conditions above then click Predict.';
  } else if (a && b && a === b) {
    btn.disabled = true;
    if (hint) hint.textContent = '⚠️ Both teams cannot be the same.';
  } else {
    btn.disabled = true;
    if (hint) hint.textContent = 'Select both teams to enable prediction';
  }
}

// ================================================================
// CORE PREDICTION ENGINE — 7 FACTORS
// ================================================================

function getMatchupData(aKey, bKey) {
  const tA = TEAMS[aKey], tB = TEAMS[bKey];
  if (tA.keyMatchups?.[bKey]) return tA.keyMatchups[bKey];
  if (tB.keyMatchups?.[aKey]) {
    const d = tB.keyMatchups[aKey];
    return { myDismissals: d.theirDismissals, theirDismissals: d.myDismissals,
             myBatsmanAvg: d.theirBatsmanAvg, theirBatsmanAvg: d.myBatsmanAvg };
  }
  return { myDismissals: 85, theirDismissals: 85, myBatsmanAvg: 28, theirBatsmanAvg: 28 };
}

function getConsistencyScore(teamKey) {
  const h = TEAM_HISTORY[teamKey];
  if (!h) return 50;
  return Math.min((h.playoffs / h.seasons) * 60 + (h.titles / 5) * 40, 100);
}

// ================================================================
// UI — RUN PREDICTION
// ================================================================

async function runPrediction() {
  const aKey    = document.getElementById('teamA').value;
  const bKey    = document.getElementById('teamB').value;
  const venueKey = document.getElementById('venue').value;
  if (!aKey || !bKey || aKey === bKey) {
    alert("Please select two different teams.");
    return;
  }
  const tossWinner  = document.getElementById('tossWinner').value || aKey;
  const tossDecision = document.querySelector('input[name="toss"]:checked')?.value
                     || document.querySelector('input[name="tossDecision"]:checked')?.value || 'bat';
  const pitch   = document.querySelector('input[name="pitch"]:checked')?.value || 'flat';
  const weather = document.querySelector('input[name="weather"]:checked')?.value || 'sunny';
  const wind    = document.querySelector('input[name="wind"]:checked')?.value || 'calm';

  const timing     = document.querySelector('input[name="timing"]:checked')?.value || 'night';

  const tA = TEAMS[aKey];
  const tB = TEAMS[bKey];
  const v = VENUES[venueKey];
  const tw = TEAMS[tossWinner];

  showLoader();
  
  try {
    const payload = {
      team1: tA.name,
      team2: tB.name,
      venue: v.name,
      toss_winner: tw.name,
      toss_decision: tossDecision
    };

    // Use local backend for development, and the Render backend URL for production
    const API_URL = window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5000/predict' 
      : 'https://ipl-predictor-backend-04gv.onrender.com/predict';

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Process API response
    const probA = (data.probabilities[tA.name] || data.probabilities[tA.shortName] || 0) * 100;
    const probB = (data.probabilities[tB.name] || data.probabilities[tB.shortName] || 0) * 100;
    
    const result = {
      totalA: probA,
      totalB: probB,
      winner: probA >= probB ? aKey : bKey,
      aKey, bKey,
      pitch, weather, wind, tossDecision, tossWinner,
      venue: v,
      isDay: timing === 'day',
      features: data.feature_values_used,
      h2h: data.informational_h2h || null
    };
    
    hideLoader();
    displayResults(result);
  } catch (error) {
    hideLoader();
    const hint = document.getElementById('predictHint');
    if (hint) hint.textContent = '❌ Error: ' + error.message;
    alert('Prediction Error: ' + error.message + '\n\nMake sure the Flask server is running locally on port 5000.');
    console.error('Fetch error:', error);
  }
}

// ================================================================
// DISPLAY RESULTS
// ================================================================

function displayResults(r) {
  const tA = TEAMS[r.aKey], tB = TEAMS[r.bKey];
  const winner = TEAMS[r.winner];
  const loser  = r.winner === r.aKey ? tB : tA;

  // Winner Panel
  document.getElementById('winnerName').textContent = winner.name;
  document.getElementById('winnerName').style.color = winner.primaryColor;
  const winnerPanel = document.getElementById('winnerPanel');
  if (winnerPanel) {
    winnerPanel.style.setProperty('--winner-gradient', `linear-gradient(135deg, ${winner.primaryColor}, ${winner.secondaryColor})`);
    winnerPanel.style.borderColor = winner.primaryColor + '44';
  }
  const diff = Math.abs(r.totalA - r.totalB);
  const conf = diff > 12 ? '🔥 High Confidence' : diff > 5 ? '✅ Moderate Confidence' : '⚖️ Very Close Contest';
  const confEl = document.getElementById('winnerConf');
  if (confEl) {
    confEl.textContent = conf;
    confEl.style.color = diff > 12 ? '#10b981' : diff > 5 ? '#00c8e6' : '#f59e0b';
    confEl.style.borderColor = confEl.style.color;
    confEl.style.background = confEl.style.color + '15';
  }

  // Probability
  document.getElementById('probPctA').textContent  = r.totalA.toFixed(1) + '%';
  document.getElementById('probPctB').textContent  = r.totalB.toFixed(1) + '%';
  document.getElementById('probShortA').textContent = tA.shortName;
  document.getElementById('probShortB').textContent = tB.shortName;
  document.getElementById('probPctA').style.color = tA.primaryColor;
  document.getElementById('probPctB').style.color = tB.primaryColor;
  setTimeout(() => {
    const fA = document.getElementById('probFillA');
    const fB = document.getElementById('probFillB');
    fA.style.width = r.totalA + '%';
    fB.style.width = r.totalB + '%';
    fA.style.background = tA.primaryColor;
    fB.style.background = tB.primaryColor;
  }, 80);

  // Factor Cards - 6 XGBoost Features
  const f = r.features;

  // Normalize each diff value to a 0-100 scale for display
  function normDiff(val, scale) {
    return Math.max(0, Math.min(100, 50 + (val / scale) * 50));
  }

  const eloA   = normDiff(f.elo_diff, 200),   eloB   = 100 - eloA;
  const formA  = normDiff(f.form_diff, 1),     formB  = 100 - formA;
  const venueA = normDiff(f.venue_diff, 1),    venueB = 100 - venueA;
  const batA   = normDiff(f.batting_strength_diff,  20), batB   = 100 - batA;
  const bowlA  = normDiff(f.bowling_strength_diff,  15), bowlB  = 100 - bowlA;
  const tossA  = normDiff(f.toss_impact, 0.3), tossB  = 100 - tossA;

  const factors = [
    { name: 'Elo Rating Difference',  weight: 'XGB', f: {a: eloA,   b: eloB},   note: `Elo diff: ${f.elo_diff.toFixed(0)} pts. Tracks long-run team quality through wins/losses.` },
    { name: 'Recent Form (Last 5)',   weight: 'XGB', f: {a: formA,  b: formB},  note: `Form diff: ${(f.form_diff * 100).toFixed(0)}%. Win rate of last 5 matches. Current momentum.` },
    { name: 'Venue Win %',            weight: 'XGB', f: {a: venueA, b: venueB}, note: `Venue diff: ${(f.venue_diff * 100).toFixed(0)}%. Ground-specific win history at this venue.` },
    { name: 'Batting Strength',       weight: 'XGB', f: {a: batA,   b: batB},   note: `Diff: ${f.batting_strength_diff.toFixed(1)}. Composite of powerplay, middle & death overs run rate (last 10 games).` },
    { name: 'Bowling Strength',       weight: 'XGB', f: {a: bowlA,  b: bowlB},  note: `Diff: ${f.bowling_strength_diff.toFixed(1)}. Composite of powerplay wkts, death economy & wicket-taking (last 10 games).` },
    { name: 'Toss + Venue Advantage', weight: 'XGB', f: {a: tossA,  b: tossB},  note: `Toss impact: ${f.toss_impact.toFixed(3)}. Based on this venue's historical chase vs defend bias.` }
  ];

  const grid = document.getElementById('factorGrid');
  if (grid) {
    grid.innerHTML = factors.map(fac => {
      const pA = fac.f.a.toFixed(1), pB = fac.f.b.toFixed(1);
      const barA = ((fac.f.a / (fac.f.a + fac.f.b)) * 100).toFixed(1);
      const barB = (100 - +barA).toFixed(1);
      return `<div class="fc">
        <div class="fc-head">
          <span class="fc-name">${fac.name}</span>
          <span class="fc-weight">${fac.weight}</span>
        </div>
        <div class="fc-bar">
          <div class="fc-bar-a" style="width:${barA}%;background:${tA.primaryColor}"></div>
          <div class="fc-bar-b" style="width:${barB}%;background:${tB.primaryColor}"></div>
        </div>
        <div class="fc-pcts">
          <span style="color:${tA.primaryColor}">${tA.shortName} ${pA}%</span>
          <span style="color:${tB.primaryColor}">${tB.shortName} ${pB}%</span>
        </div>
        <div class="fc-note">${fac.note}</div>
      </div>`;
    }).join('');
  }

  // Informational H2H Section
  const h2hEl = document.getElementById('h2hSection');
  if (h2hEl && r.h2h) {
    const h = r.h2h;
    const last5HTML = (h.last_5 || []).slice(-5).map(w => {
      const isA = w === tA.name;
      return `<span class="h2h-dot" style="background:${isA ? tA.primaryColor : tB.primaryColor}">${isA ? tA.shortName : tB.shortName}</span>`;
    }).join('');
    h2hEl.style.display = 'block';
    h2hEl.innerHTML = `
      <div class="h2h-header">HEAD TO HEAD <span class="h2h-label">(Context only - not used in prediction)</span></div>
      <div class="h2h-stats">
        <div class="h2h-stat"><span class="h2h-val" style="color:${tA.primaryColor}">${h.team1_wins}</span><span class="h2h-desc">${tA.shortName} Wins</span></div>
        <div class="h2h-stat"><span class="h2h-val" style="color:${tB.primaryColor}">${h.team2_wins}</span><span class="h2h-desc">${tB.shortName} Wins</span></div>
        <div class="h2h-stat"><span class="h2h-val">${h.team1_max_margin}</span><span class="h2h-desc">${tA.shortName} Best Win (margin)</span></div>
        <div class="h2h-stat"><span class="h2h-val">${h.team2_max_margin}</span><span class="h2h-desc">${tB.shortName} Best Win (margin)</span></div>
      </div>
      <div class="h2h-last5"><span class="h2h-l5-label">Last 5 meetings:</span> ${last5HTML || '<em>No data</em>'}</div>
    `;
  }

  // AI Analysis
  const analysis = generateAnalysis(r, tA, tB, winner);
  const ab = document.getElementById('analysisBody');
  if (ab) ab.innerHTML = analysis;

  // Show
  const section = document.getElementById('resultsSection');
  section.style.display = 'block';
  section.classList.add('fade-in');
  
  // Tactical & Form
  renderForm('A', tA.recentForm);
  renderForm('B', tB.recentForm);
  // Selector population now happens on team change for better responsiveness
  
  setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
}

// ---- Form Rendering ----
function renderForm(side, streak) {
  const el = document.getElementById(`form${side}`);
  if (!el || !streak) return;
  el.innerHTML = streak.map(s => `<div class="form-dot form-${s.toLowerCase()}">${s}</div>`).join('');
}

function formNote(tA, tB) {
  const fA = (tA.recentForm || []).join('');
  const fB = (tB.recentForm || []).join('');
  return `${tA.shortName}: ${fA} | ${tB.shortName}: ${fB}. (Past 5 matches shown for reference).`;
}

// ---- Tactical Matchups ----
function populateTacticalSelectors(tA, tB) {
  const bSel = document.getElementById('tacticalBatsman');
  const wSel = document.getElementById('tacticalBowler');
  if (!bSel || !wSel) return;
  
  bSel.innerHTML = '<option value="">-- Choose Batsman (Team A) --</option>' + 
    tA.players.filter(p => p.role.includes('Batsman') || p.role.includes('All-Rounder'))
      .map(p => `<option value="${p.id}">${p.name}</option>`).join('');
      
  wSel.innerHTML = '<option value="">-- Choose Bowler (Team B) --</option>' + 
    tB.players.filter(p => p.role.includes('Pacer') || p.role.includes('Spinner') || p.role.includes('All-Rounder'))
      .map(p => `<option value="${p.id}">${p.name}</option>`).join('');

  // Re-wire event listeners after rebuilding options
  wireTacticalSelectors();
  updateTactical();
}

function updateTactical() {
  const batId = document.getElementById('tacticalBatsman').value;
  const bowlId = document.getElementById('tacticalBowler').value;
  const dash = document.getElementById('tacticalDashboard');
  if (!batId || !bowlId) { dash.style.display = 'none'; return; }
  dash.style.display = 'grid';
  
  // 1. Get Matchup Data (Manual or Dynamic Generator)
  let m = (DETAILED_MATCHUPS || []).find(x => x.batsman === batId && x.bowler === bowlId);
  if (!m) m = getDynamicTactics(batId, bowlId);
  
  // 2. Update Wagon Wheel (8 Sectors)
  const sectors = ['straight','cover','point','thirdman','behind','fineleg','squareleg','midwicket'];
  sectors.forEach(s => {
    const val = m.wagonWheel[s] || 0;
    const el = document.getElementById(`ww-${s}`);
    if (el) el.textContent = val + '%';
  });
  
  // 3. Update Weak Zones
  document.getElementById('weak-short').textContent = m.weakZones.short || '-';
  document.getElementById('weak-yorker').textContent = m.weakZones.yorker || '-';
  document.getElementById('weak-good').textContent = m.weakZones.goodLength || '-';
  
  // 4. Update Strategies
  document.getElementById('strat-bowler').textContent = m.bowlerPlan || "No specific blueprint.";
  document.getElementById('strat-batsman').textContent = m.survivalTips || "Play on merit.";
  document.getElementById('strat-insight').textContent = m.highlight || "Standard elite matchup.";
}

// ---- Dynamic Data Generator (Technical Engine) ----
function getDynamicTactics(batId, bowlId) {
  const batTeam = Object.values(TEAMS).find(t => t.players.find(p => p.id === batId));
  const bowlTeam = Object.values(TEAMS).find(t => t.players.find(p => p.id === bowlId));
  const batsman = batTeam?.players.find(p => p.id === batId) || { name: "Batsman", role: "Batsman" };
  const bowler = bowlTeam?.players.find(p => p.id === bowlId) || { name: "Bowler", role: "Pacer" };

  // 1. Base Seed
  const seed = (batId.length * 7) + (bowlId.length * 3);
  const rnd = (s) => Math.abs(Math.sin(seed + s));

  // Generate consistent pseudo-random values if not present
  const batSeed = (batId || "a").split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const bowlSeed = (bowlId || "b").split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const vulns = ["short", "swing", "full", "yorker", "spin", "wide"];
  const zones = ["cover", "pull", "behind", "straight", "mid-wicket"];
  const lengths = ["short", "good", "full", "yorker"];
  
  const bVuln = batsman.vulnerability || vulns[batSeed % vulns.length];
  const bZone = batsman.strengthZone || zones[(batSeed * 3) % zones.length];
  const bwPref = bowler.preferredLength || lengths[bowlSeed % lengths.length];

  // 2. Technical Line & Length Mapping
  const vuln = bVuln.toLowerCase();
  const preferred = (batsman.preferredLength || lengths[(batSeed * 5) % lengths.length]).toLowerCase();
  const bowlerLength = bwPref.toLowerCase();
  const isPacer = bowler.role.toLowerCase().includes("pacer");
  const isSpinner = bowler.role.toLowerCase().includes("spinner");
  
  let bPlan = "";
  let sTips = "";
  
  // Base out percentages simulating length they got out most
  let sOut = 15 + (batSeed % 12);
  let yOut = 10 + ((batSeed * 2) % 15);
  let gOut = 30 + ((batSeed * 3) % 20);

  let weakShort = "Out: " + sOut + "%";
  let weakYorker = "Out: " + yOut + "%";
  let weakGood = "Out: " + gOut + "%";

  const usesShort = vuln.includes("short") || vuln.includes("bouncer") || vuln.includes("pull") || vuln.includes("hook") || vuln.includes("back-foot");
  const usesFull = vuln.includes("full") || vuln.includes("yorker") || vuln.includes("toss") || vuln.includes("drive") || vuln.includes("mid-wicket");
  const usesSwing = vuln.includes("swing") || vuln.includes("in-swing") || vuln.includes("out-swing") || vuln.includes("move") || vuln.includes("off-stump") || vuln.includes("inswing") || vuln.includes("outswing");
  const usesSpin = vuln.includes("spin") || vuln.includes("leg-spin") || vuln.includes("off-spin");
  const usesWide = vuln.includes("wide") || vuln.includes("wide yorker");

  if (usesShort) {
    bPlan = `Attack his soft leg-side defence with short deliveries at the body. Force ${batsman.name} onto the back foot and follow with a fuller ball to make him play under pressure.`;
    weakShort = `High Risk (${sOut + 35}% Out)`;
    weakGood = `Warning (${gOut + 5}% Out)`;
    if (isSpinner) bPlan += " Add an arm ball or quicker one to prevent the pull shot from being comfortable.";
  } else if (usesSwing) {
    const side = rnd(12)>0.5 ? 'outside off-stump' : 'middle-and-leg';
    bPlan = `Use the corridor of uncertainty. Keep the line tight around ${side} and make him play off the seam. Early movement will expose his tendency against lateral swing.`;
    weakGood = `Dangerous (${gOut + 25}% Out)`;
    weakShort = `Warning (${sOut + 10}% Out)`;
  } else if (usesFull) {
    bPlan = `Bowling full and straight is the priority. Mix in yorkers and low full tosses at the toes to take away his scoring zone.`;
    weakYorker = `Critical (${yOut + 45}% Out)`;
    weakGood = `Solid (${gOut + 10}% Out)`;
  } else if (usesSpin) {
    bPlan = `Vary flight, drift, and pace to make him play across the line. Keep the ball tight to the stumps and look for the arm-ball or googly to break his rhythm.`;
    weakGood = `High Risk (${gOut + 30}% Out)`;
    weakShort = `Warning (${sOut + 5}% Out)`;
  } else {
    const line = preferred === 'short' ? 'back of a length' : 'full and straight';
    bPlan = `Stay disciplined on ${line}. Pin him down with a narrow off-stump line and make him earn every run rather than giving him easy width.`;
  }

  // 3. Survival Guide logic
  if (isPacer) {
    if (usesSwing) {
      sTips = `Play the ball late and off the back foot. Trust the umpires and leave anything darting outside off; wait for the one that straights to score.`;
    } else if (usesFull) {
      sTips = `Don't chase the wide ball. Stay balanced and drive only when the delivery is full and on the stumps. Be ready for toe-crushing yorkers at the death.`;
    } else if (usesShort) {
      sTips = `Keep your weight back and play the short ball with soft hands. Look for the fuller ball through the on-side rather than trying to muscle every delivery.`;
    } else {
      sTips = `Watch the release point and let the ball come to you. Use the crease to create room, but don't over-commit unless you have a true scoring length.`;
    }
  } else if (isSpinner) {
    if (usesSpin) {
      sTips = `Use soft hands and stay late. If the ball is turning, leave the line or play with the spin rather than across it. Read the wrist early.`;
    } else {
      sTips = `Attack the flight but do not reach for the ball. Use the depth of the crease to free your arms and look for the over-pitched delivery.`;
    }
  } else {
    sTips = `Play on merit and stay balanced. Avoid premeditating shots; focus on timing and placement, especially against a bowler with clearly defined strengths.`;
  }

  if (bZone) {
    sTips += ` Trust his strength through ${bZone}.`;
  }
  if (bowlerLength) {
    sTips += ` ${bowler.name} prefers ${bowlerLength} lengths, so be ready for pressure there.`;
  }

  // 4. Wagon Wheel (Reflect Strength Zone)
  const sz = bZone.toLowerCase();
  let w;
  if (sz.includes("cover") || sz.includes("off-side") || sz.includes("drive") || sz.includes("extra cover")) {
    w = { straight:8, cover:30, point:20, thirdman:5, behind:5, fineleg:5, squareleg:10, midwicket:17 };
  } else if (sz.includes("pull") || sz.includes("hook") || sz.includes("square") || sz.includes("leg-side")) {
    w = { straight:5, cover:5, point:10, thirdman:5, behind:10, fineleg:10, squareleg:25, midwicket:30 };
  } else if (sz.includes("behind") || sz.includes("scoop") || sz.includes("late cut") || sz.includes("scoop")) {
    w = { straight:10, cover:10, point:10, thirdman:5, behind:25, fineleg:25, squareleg:10, midwicket:15 };
  } else if (sz.includes("straight") || sz.includes("long-on") || sz.includes("lofted straight") || sz.includes("straight drive")) {
    w = { straight:35, cover:20, point:10, thirdman:5, behind:10, fineleg:5, squareleg:5, midwicket:10 };
  } else if (sz.includes("mid-wicket") || sz.includes("deep mid-wicket")) {
    w = { straight:8, cover:8, point:10, thirdman:5, behind:5, fineleg:10, squareleg:15, midwicket:39 };
  } else {
    w = { straight:10, cover:12, point:12, thirdman:8, behind:10, fineleg:10, squareleg:16, midwicket:22 };
  }

  if (usesShort && weakShort.indexOf('High') === -1) {
    weakShort = `High Risk (${sOut + 35}% Out)`;
  }
  if (usesFull && weakGood.indexOf('Dangerous') === -1) {
    weakGood = `Dangerous (${gOut + 35}% Out)`;
  }
  if (usesSwing && weakGood.indexOf('Warning') === -1 && weakGood.indexOf('Dangerous') === -1) {
    weakGood = `Warning (${gOut + 15}% Out)`;
  }
  if (usesSpin && weakGood.indexOf('High') === -1) {
    weakGood = `High Risk (${gOut + 35}% Out)`;
  }
  if ((usesWide || vuln.includes('wide yorker')) && weakYorker.indexOf('High') === -1) {
    weakYorker = `High Risk (${yOut + 30}% Out)`;
  }
  if ((vuln.includes('yorker') || vuln.includes('full toss') || vuln.includes('toe')) && weakYorker.indexOf('Severe') === -1) {
    weakYorker = `Severe (${yOut + 50}% Out)`;
  }
  if (usesShort && !usesFull && weakGood.indexOf('Warning') === -1 && weakGood.indexOf('High') === -1) {
    weakGood = `Warning (${gOut + 10}% Out)`;
  }
  if (usesFull && !usesShort && weakShort.indexOf('Warning') === -1 && weakShort.indexOf('High') === -1) {
    weakShort = `Warning (${sOut + 10}% Out)`;
  }

  const total = Object.values(w).reduce((sum, value) => sum + value, 0);
  Object.keys(w).forEach(key => {
    w[key] = Math.max(5, Math.round((w[key] / total) * 100));
  });
  const adjustedTotal = Object.values(w).reduce((sum, value) => sum + value, 0);
  if (adjustedTotal !== 100) {
    const diff = 100 - adjustedTotal;
    w.straight = Math.max(5, w.straight + diff);
  }

  return {
    wagonWheel: w,
    weakZones: { short: weakShort, yorker: weakYorker, goodLength: weakGood },
    bowlerPlan: bPlan,
    survivalTips: sTips,
    highlight: `${batsman.name} (${batsman.bat || 80} Batting) vs ${bowler.name} (${bowler.bowl || 80} Bowling). A strategic battle focusing on ${batsman.vulnerability || 'standard technique'}.`
  };
}

// ---- Note generators ----
function pitchNote(pitch, tA, tB, isDay) {
  const dayTag = isDay ? ' (Day match — extra spin danger ☀️)' : ' (Night — batting easier later 🌙)';
  if (pitch === 'green') return `Green pitch${dayTag} — ${tA.shortName} pace: ${tA.pacerQuality} | ${tB.shortName} pace: ${tB.pacerQuality}. Batsmen vs pace also compared.`;
  if (pitch === 'dry')   return `Dry pitch${dayTag} — ${tA.shortName} spin: ${tA.spinnerQuality} (×${isDay?'1.15':'1.0'} day boost) | ${tB.shortName}: ${tB.spinnerQuality}. Battle vs spin decisive.`;
  return `Flat pitch${dayTag} — Power hitting: ${tA.shortName} ${tA.powerHitting} vs ${tB.shortName} ${tB.powerHitting}.${isDay ? ' Spinners get +15% bonus in day conditions.' : ''}`;
}
function matchupNote(aKey, bKey) {
  const md = getMatchupData(aKey, bKey);
  return `${TEAMS[aKey].shortName} bowlers: ${md.myDismissals} dismissals | ${TEAMS[bKey].shortName} bowlers: ${md.theirDismissals} dismissals.`;
}
function weatherNote(weather, wind, tA, tB, isDay) {
  const wm = { sunny:'Sunny — neutral', overcast:'Overcast — swing & seam', humid:'Humid — slight swing' };
  const wdm = { calm:'Calm', breezy:'Breezy — slight swing boost', high:'High wind — maximum pace swing boost' };
  const dayNote = isDay ? ` ☀️ Day match adds +8% spinner bonus on top.` : ` 🌙 Night — pacers get extra grip boost.`;
  return `${wm[weather]}. ${wdm[wind]}.${dayNote} ${tA.shortName} pacers: ${tA.pacerQuality} vs ${tB.shortName}: ${tB.pacerQuality}.`;
}
function groundNote(venue, tA, tB) {
  const base = `${venue.dimensions.charAt(0).toUpperCase() + venue.dimensions.slice(1)} ground`;
  const size = venue.groundDimensions ? ` (${venue.groundDimensions})` : '';
  return `${base}${size}. ${tA.shortName} venue win%: ${venue.teamWinPct?.[tA.shortName] || 50}% | ${tB.shortName}: ${venue.teamWinPct?.[tB.shortName] || 50}%.`;
}
function tossNote(tossWinner, decision, venue, tA, tB, isDay) {
  const tw = TEAMS[tossWinner]?.shortName || '?';
  const dewActive = !isDay;
  const dew = { low: 'Low', medium: 'Medium', high: 'Heavy' }[venue.dewFactor];
  const dewStr = dewActive
    ? `Dew: ${dew} — ${venue.dewFactor === 'high' ? 'spinners badly affected in 2nd innings!' : 'some dew likely in 2nd innings.'}`
    : '☀️ Day match — No dew. Spinner effectiveness maintained throughout.';
  return `${tw} chose to ${decision === 'bat' ? 'bat' : 'bowl'} first. Bat 1st win%: ${venue.batFirstWinPct}% | Chase: ${venue.chaseWinPct}%. ${dewStr}`;
}
function consistencyNote(aKey, bKey) {
  const cA = getConsistencyScore(aKey).toFixed(0);
  const cB = getConsistencyScore(bKey).toFixed(0);
  const hA = TEAM_HISTORY[aKey], hB = TEAM_HISTORY[bKey];
  return `${TEAMS[aKey].shortName}: ${hA.titles} titles, ${hA.playoffs} playoffs (Score: ${cA}) | ${TEAMS[bKey].shortName}: ${hB.titles} titles, ${hB.playoffs} playoffs (Score: ${cB}).`;
}

// ---- AI Analysis Text ----
function generateAnalysis(r, tA, tB, winner) {
  const points = [];
  const loser = r.winner === r.aKey ? tB : tA;
  const hW = TEAM_HISTORY[r.winner], hL = TEAM_HISTORY[r.winner === r.aKey ? r.bKey : r.aKey];

  // Day / Night analysis point
  if (r.isDay) {
    const betterSpin = tA.spinnerQuality > tB.spinnerQuality ? tA : tB;
    points.push({ icon:'☀️', color:'#f59e0b', text:`It's a <strong>Day match</strong> — sunlight dries the pitch quickly, making it increasingly difficult to bat as the game progresses. <strong>${betterSpin.name}</strong> will exploit this with their spin attack (Quality: ${betterSpin.spinnerQuality}, boosted ×1.15). No dew means bowlers maintain full grip all match.` });
  } else {
    points.push({ icon:'🌙', color:'#6366f1', text:`<strong>Night/Day-Night match</strong> — dew will significantly affect the 2nd innings, making it hard for spinners to grip the ball. Pacers get extra assistance from swing. The chasing team at venues with heavy dew (like Wankhede, Eden) has a major advantage.` });
  }

  // Pitch
  if (r.pitch === 'green') {
    const better = tA.pacerQuality > tB.pacerQuality ? tA : tB;
    points.push({ icon:'🟩', color:'#22c55e', text:`The <strong>green pitch</strong> is tailor-made for swing and seam. <strong>${better.name}</strong> (pace rating: ${better.pacerQuality}) have the superior pace attack to exploit these conditions and create pressure early.` });
  } else if (r.pitch === 'dry') {
    const better = tA.spinnerQuality > tB.spinnerQuality ? tA : tB;
    points.push({ icon:'🟫', color:'#a16207', text:`A <strong>dry, turning surface</strong> heavily rewards teams with quality spinners. <strong>${better.name}</strong> (spin rating: ${better.spinnerQuality}) can put consistent pressure with sharp turn and drift.` });
  } else {
    const better = tA.powerHitting > tB.powerHitting ? tA : tB;
    points.push({ icon:'🟧', color:'#ea580c', text:`A <strong>flat batting surface</strong> tilts the match in favour of big hitters. <strong>${better.name}</strong> (power hitting: ${better.powerHitting}) have the artillery to post or chase down massive totals.` });
  }

  // Weather + Wind
  if (r.weather === 'overcast' || r.wind === 'high' || r.wind === 'breezy') {
    const better = tA.pacerQuality > tB.pacerQuality ? tA : tB;
    const weatherStr = r.weather === 'overcast'
      ? `Overcast skies combined with ${r.wind === 'high' ? 'high wind' : r.wind === 'breezy' ? 'breezy conditions' : 'calm air'}`
      : `${r.wind === 'high' ? 'High wind' : 'Gentle breeze'}`;
    points.push({ icon:'🌬️', color:'#6366f1', text:`${weatherStr} will provide additional lateral movement, making it a bowler's paradise early on. <strong>${better.name}'s</strong> pace attack should exploit the conditions effectively.` });
  } else {
    points.push({ icon:'☀️', color:'#eab308', text:`Clear <strong>sunny skies and calm winds</strong> mean no weather assistance for the bowlers. Batsmen can expect a true surface and should play freely without worrying about uneven movement.` });
  }

  // Matchup
  const md = getMatchupData(r.aKey, r.bKey);
  const bowlingTeam = md.myDismissals >= md.theirDismissals ? tA : tB;
  points.push({ icon:'⚔️', color:'#00c8e6', text:`In <strong>bowler vs batsman career matchups</strong>, <strong>${bowlingTeam.name}'s</strong> bowlers have been more clinical (${md.myDismissals >= md.theirDismissals ? md.myDismissals : md.theirDismissals} IPL career dismissals vs the opposition). This gives them a subtle but meaningful edge.` });

  // Consistency
  const cW = getConsistencyScore(r.winner), cL = getConsistencyScore(r.winner === r.aKey ? r.bKey : r.aKey);
  if (cW > cL + 8) {
    points.push({ icon:'📈', color:'#10b981', text:`<strong>${winner.name}</strong> holds a <strong>consistency habit</strong> (Titles: ${hW?.titles}, Playoff: ${hW?.playoffs}) vs <strong>${loser.name}</strong> (${hL?.titles} titles). While this habit explains their winning nature, it was <strong>not used</strong> in this match-specific prediction.` });
  } else {
    points.push({ icon:'📊', color:'#a78bfa', text:`Both teams show similar <strong>historical habits</strong>. ${tA.shortName}: ${TEAM_HISTORY[r.aKey]?.titles} titles | ${tB.shortName}: ${TEAM_HISTORY[r.bKey]?.titles} titles. This historical data is shown for context only.` });
  }

  // Toss
  const tw = TEAMS[r.tossWinner];
  if (tw) {
    const goodCall = (r.tossDecision === 'bat' && r.venue.batFirstWinPct > 50) || (r.tossDecision === 'bowl' && r.venue.chaseWinPct > 50);
    const dewNote = r.venue.dewFactor === 'high' ? ' Heavy dew will make bowling in the 2nd innings very difficult.' : '';
    const choiceText = r.tossDecision === 'bat' ? 'batting' : 'chasing';
    const statPct = r.tossDecision === 'bat' ? r.venue.batFirstWinPct : r.venue.chaseWinPct;
    const advantageText = statPct > 50 ? 'historically favours' : 'historically disfavours';
    
    points.push({
      icon: goodCall ? '🪙' : '⚠️',
      color: goodCall ? '#f59e0b' : '#ef4444',
      text: `<strong>${tw.name}</strong> ${goodCall ? 'made the right call' : 'may regret the toss decision'} — choosing to <strong>${r.tossDecision === 'bat' ? 'bat' : 'bowl'} first</strong>. The venue ${advantageText} ${choiceText} (${statPct}% win rate).${dewNote}`
    });
  }

  // Final Verdict
  const diff = Math.abs(r.totalA - r.totalB);
  const verdict = diff > 12 ? 'should comfortably win' : diff > 5 ? 'hold a slight edge' : 'are in a nail-biting contest';
  const winProb = r.winner === r.aKey ? r.totalA : r.totalB;
  const loseProb = r.winner === r.aKey ? r.totalB : r.totalA;
  points.push({ icon:'🏆', color:'#ffd700', text:`<strong>Verdict:</strong> <strong>${winner.name}</strong> ${verdict} with a simulated win probability of <strong>${winProb.toFixed(1)}%</strong> against ${loser.name}'s ${loseProb.toFixed(1)}%.` });

  return points.map(p => `
    <div class="analysis-point" style="border-left-color:${p.color}">
      <span class="ap-icon">${p.icon}</span>
      <span>${p.text}</span>
    </div>`).join('');
}

// ---- Loader ----
function showLoader() {
  if (document.getElementById('loaderOverlay')) return;
  const el = document.createElement('div');
  el.className = 'loading-overlay'; el.id = 'loaderOverlay';
  el.innerHTML = `<div class="spinner"></div><div class="loading-text">Analysing Match...</div>`;
  document.body.appendChild(el);
  document.getElementById('predictBtn').disabled = true;
}
function hideLoader() {
  document.getElementById('loaderOverlay')?.remove();
  const btn = document.getElementById('predictBtn');
  if (btn) btn.disabled = false;
}

// ---- Reset ----
function resetPrediction() {
  const section = document.getElementById('resultsSection');
  if (section) section.style.display = 'none';
  document.getElementById('probFillA').style.width = '0%';
  document.getElementById('probFillB').style.width = '0%';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
