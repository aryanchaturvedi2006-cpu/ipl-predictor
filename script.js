
let predictionChart = null;

function initGauge() {
  const ctx = document.getElementById('gaugeChart');
  if(!ctx) return;
  predictionChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Team A', 'Team B'],
      datasets: [{
        data: [50, 50],
        backgroundColor: ['#555', '#333'],
        borderWidth: 0
      }]
    },
    options: {
      circumference: 180,
      rotation: -90,
      cutout: '80%',
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      },
      animation: { animateRotate: true, animateScale: false, duration: 1000 }
    }
  });
}
document.addEventListener('DOMContentLoaded', initGauge);

// Function to animate scoreboard numbers
function initScoreboards() {
  const nums = document.querySelectorAll('.scoreboard-num');
  nums.forEach(num => {
    const target = parseInt(num.getAttribute('data-target'));
    if(isNaN(target)) return;
    let current = 0;
    const duration = 2000;
    const stepTime = Math.abs(Math.floor(duration / target));
    const timer = setInterval(() => {
      current += 1;
      num.textContent = current;
      if (current >= target) clearInterval(timer);
    }, stepTime);
  });
}
document.addEventListener('DOMContentLoaded', initScoreboards);
// ================================================================
// IPL PREDICTOR — 8-FACTOR SIMULATION ENGINE  (script.js)
// For use with predictor.html
// ================================================================

// ---- Initialize on page load ----
document.addEventListener('DOMContentLoaded', () => {
  populateDropdowns();
  wireRadioPills();
  ['teamA', 'teamB', 'venue'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', checkReady);
  });
  // Wire timing hint update
  // Wire timing hint update
  document.querySelectorAll('input[name="timing"]').forEach(r => {
    r.addEventListener('change', updateTimingHint);
  });

});

// ---- Toggle Toss UI based on Prediction Mode ----
function toggleTossUI() {
  const mode = document.querySelector('input[name="pred_mode"]:checked')?.value || 'pre_toss';
  const tossGroups = document.querySelectorAll('.toss-group');
  if (mode === 'post_toss') {
    tossGroups.forEach(g => g.style.display = 'block');
  } else {
    tossGroups.forEach(g => g.style.display = 'none');
  }
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
        const input = pill.querySelector('input');
        if (!input.checked) {
          input.checked = true;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
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
    document.getElementById(`badge${side}Name`).style.color = '#ffffff';
    document.getElementById(`badge${side}City`).textContent = `📍 ${t.city}`;
    badge.style.borderColor = t.primaryColor;
    badge.style.background = `linear-gradient(135deg, rgba(0,0,0,0.8), ${t.primaryColor}33)`;
    badge.style.boxShadow = `0 0 20px ${t.primaryColor}55, inset 0 0 10px ${t.primaryColor}33`;
  } else {
    document.getElementById(`badge${side}Short`).textContent = '?';
    document.getElementById(`badge${side}Short`).style.color = 'var(--text-2)';
    document.getElementById(`badge${side}Name`).textContent = 'Select a team';
    document.getElementById(`badge${side}Name`).style.color = 'var(--text-2)';
    document.getElementById(`badge${side}City`).textContent = '';
    badge.style.borderColor = 'rgba(255,255,255,0.07)';
    badge.style.background = 'rgba(255,255,255,0.02)';
    badge.style.boxShadow = 'none';
  }

  refreshTossOptions();
  checkReady();
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
  const btn = document.getElementById('predictBtn');
  const tA = document.getElementById('teamA')?.value;
  const tB = document.getElementById('teamB')?.value;
  const venue = document.getElementById('venue')?.value;
  const hint = document.getElementById('predictHint');
  
  if (tA && tB && tA !== tB && venue) {
    btn.disabled = false;
    if (hint) hint.textContent = '✅ Ready! Adjust conditions above then click Predict.';
    
    // UI Interaction: VS Clash Animation
    const badgeA = document.getElementById('badgeA');
    const badgeB = document.getElementById('badgeB');
    const vsRing = document.querySelector('.vs-ring');
    if(badgeA && badgeB && vsRing) {
      badgeA.classList.remove('clash-animate-left');
      badgeB.classList.remove('clash-animate-right');
      vsRing.classList.remove('clash-ring-glow');
      void badgeA.offsetWidth;
      badgeA.classList.add('clash-animate-left');
      badgeB.classList.add('clash-animate-right');
      vsRing.classList.add('clash-ring-glow');
    }
  } else if (tA && tB && tA === tB) {
    btn.disabled = true;
    if (hint) hint.textContent = '⚡ Both teams cannot be the same.';
  } else {
    btn.disabled = true;
    if (hint) hint.textContent = 'Select both teams and a venue to enable prediction';
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
  if (!venueKey) {
    alert("Please select a venue.");
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

  const btn = document.getElementById('predictBtn');
  let originalText = '';
  if (btn) {
    originalText = btn.innerHTML;
    btn.classList.add('loading');
    btn.innerHTML = '<span class="coin-icon">🏏</span> Analysing...';
  }
  const waitDelay = new Promise(r => setTimeout(r, 1500));
  
  showLoader();
  
  try {
    const mode = document.querySelector('input[name="pred_mode"]:checked')?.value || 'pre_toss';
    
    let payload = {
      team1: tA.name,
      team2: tB.name,
      venue: v.name,
      pitch: pitch,
      weather: weather,
      wind: wind,
      timing: timing
    };
    
    if (mode === 'post_toss') {
      payload.toss_winner = tw.name;
      payload.toss_decision = tossDecision;
    } else {
      payload.toss_winner = '';
      payload.toss_decision = '';
    }

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
    await waitDelay;
    
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
      h2h: data.informational_h2h || null,
      mode: data.prediction_mode,
      tossSwing: data.possible_toss_swing || null
    };
    
    hideLoader();
    displayResults(result);
  } catch (error) {
    hideLoader();
    const hint = document.getElementById('predictHint');
    if (hint) hint.textContent = '❌ Error: ' + error.message;
    btn.classList.remove('loading');
    alert("Prediction failed: " + error.message);
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
  const btn = document.getElementById('predictBtn');
  if (btn) { btn.classList.remove('loading'); btn.innerHTML = '⚡ Predict Now'; }

  const pA = Math.round(r.totalA);
  const pB = Math.round(r.totalB);
  
  // Scoreboard Flip Animation class toggle
  const pctAEl = document.getElementById('probPctA');
  const pctBEl = document.getElementById('probPctB');
  pctAEl.classList.remove('flip-animate');
  pctBEl.classList.remove('flip-animate');
  
  // Trigger reflow
  void pctAEl.offsetWidth;
  
  pctAEl.classList.add('flip-animate');
  pctBEl.classList.add('flip-animate');

  pctAEl.textContent = pA + '%';
  pctBEl.textContent = pB + '%';

  document.getElementById('probShortA').textContent = tA.shortName;
  document.getElementById('probShortB').textContent = tB.shortName;
  // Ensure legibility by making text bright and using team color as glow
  document.getElementById('probPctA').style.color = 'var(--floodlight)';
  document.getElementById('probPctA').style.textShadow = `0 0 10px ${tA.primaryColor}, 0 0 20px ${tA.primaryColor}`;
  document.getElementById('probPctB').style.color = 'var(--floodlight)';
  document.getElementById('probPctB').style.textShadow = `0 0 10px ${tB.primaryColor}, 0 0 20px ${tB.primaryColor}`;
  
  // Apply Jersey Glow
  document.getElementById('badgeA').style.boxShadow = `0 0 30px ${tA.primaryColor}88`;
  document.getElementById('badgeB').style.boxShadow = `0 0 30px ${tB.primaryColor}88`;


  setTimeout(() => {
    if(typeof predictionChart !== 'undefined' && predictionChart) {
      predictionChart.data.datasets[0].data = [r.totalA, r.totalB];
      predictionChart.data.datasets[0].backgroundColor = [tA.primaryColor, tB.primaryColor];
      predictionChart.update();
    }
    const gt = document.getElementById('gaugeText');
    if(gt) gt.textContent = pA > pB ? tA.shortName + ' Favored' : (pB > pA ? tB.shortName + ' Favored' : 'Even Match');
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
  const bowlA  = normDiff(f.bowling_strength_diff,  30), bowlB  = 100 - bowlA;
  const tossA  = normDiff(f.toss_impact, 0.3), tossB  = 100 - tossA;

  const tossWonA = normDiff(f.toss_won, 1), tossWonB = 100 - tossWonA;

  const factors = [
    { name: 'Elo Rating Difference',  weight: 'RF', f: {a: eloA,   b: eloB},   note: `Elo diff: ${f.elo_diff.toFixed(0)} pts. Tracks long-run team quality through wins/losses.` },
    { name: 'Recent Form (Last 5)',   weight: 'RF', f: {a: formA,  b: formB},  note: `Form diff: ${(f.form_diff * 100).toFixed(0)}%. Win rate of last 5 matches. Current momentum.` },
    { name: 'Venue Win %',            weight: 'RF', f: {a: venueA, b: venueB}, note: `Venue diff: ${(f.venue_diff * 100).toFixed(0)}%. Ground-specific win history at this venue.` },
    { name: 'Batting Strength',       weight: 'RF', f: {a: batA,   b: batB},   note: `Diff: ${f.batting_strength_diff.toFixed(1)}. Composite of powerplay, middle & death overs run rate (last 10 games).` },
    { name: 'Bowling Strength',       weight: 'RF', f: {a: bowlA,  b: bowlB},  note: `Diff: ${f.bowling_strength_diff.toFixed(1)}. Composite of powerplay wkts, death economy & wicket-taking (last 10 games).` },
    { name: 'Toss Advantage',         weight: 'RF', f: {a: tossA,  b: tossB},  note: `Toss impact: ${f.toss_impact.toFixed(3)}. Based on this venue's historical chase vs defend bias.` },
    { name: 'Toss Winner',            weight: 'RF', f: {a: tossWonA, b: tossWonB}, note: `Direct flag indicating which team won the toss.` }
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
  
  // Toss Swing Info (Pre-Toss Mode)
  if (r.mode === 'pre_toss' && r.tossSwing) {
    const tsDiv = document.createElement('div');
    tsDiv.className = 'analysis-point';
    tsDiv.style.borderLeftColor = '#00c8e6';
    tsDiv.innerHTML = `<span class="ap-icon">🔮</span><span><strong>Possible Toss Swing:</strong> ${r.tossSwing}</span>`;
    ab.appendChild(tsDiv);
  }

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
  if (r.mode === 'post_toss') {
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
  } else {
    points.push({
      icon: '⏱️',
      color: '#00c8e6',
      text: `<strong>Pre-Toss Prediction:</strong> Toss advantage is neutralised for this prediction. Baseline probabilities reflect pure squad strength and form.`
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
  if(typeof predictionChart !== 'undefined' && predictionChart) {
    predictionChart.data.datasets[0].data = [50, 50];
    predictionChart.data.datasets[0].backgroundColor = ['#555', '#333'];
    predictionChart.update();
  }
  const gt = document.getElementById('gaugeText');
  if(gt) gt.textContent = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}


// ================================================================
// HYPER-INTERACTIVE UI LOGIC
// ================================================================

document.addEventListener('DOMContentLoaded', () => {
  // 1. Inject Weather Overlay Div
  const weatherOverlay = document.createElement('div');
  weatherOverlay.className = 'weather-overlay';
  document.body.prepend(weatherOverlay);

  // 2. Button Ripple Effect
  const buttons = document.querySelectorAll('.btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', function(e) {
      const rect = this.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const circle = document.createElement('span');
      circle.classList.add('ripple');
      circle.style.left = x + 'px';
      circle.style.top = y + 'px';
      // Set size based on largest dimension
      const d = Math.max(rect.width, rect.height);
      circle.style.width = circle.style.height = d + 'px';
      // Center the circle on the mouse click
      circle.style.transform = `translate(-50%, -50%) scale(0)`;
      
      this.appendChild(circle);
      setTimeout(() => circle.remove(), 600);
    });
  });

  // 3. Setup 3D Tilt for all Cards
  const cards = document.querySelectorAll('.card, .feature-card, .ts-badge, .stat-box');
  cards.forEach(card => {
    card.classList.add('tilt-card');
    
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = ((y - centerY) / centerY) * -10; // Max tilt 10deg
      const rotateY = ((x - centerX) / centerX) * 10;
      
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg)`;
      card.style.transition = 'transform 0.5s ease-out';
    });
    
    card.addEventListener('mouseenter', () => {
      card.style.transition = 'none'; // Remove transition for instant mouse tracking
    });
  });
  
  // 4. Setup Weather Radio Listeners
  const weatherRadios = document.querySelectorAll('input[name="weather"]');
  if(weatherRadios.length) {
    weatherRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        document.body.classList.remove('weather-rain', 'weather-dust');
        if(e.target.value === 'rain') {
          document.body.classList.add('weather-rain');
        } else if(e.target.value === 'overcast') {
          // You could add overcast styling if needed
        }
      });
    });
  }
  
  // Setup Pitch Radio Listeners (for Dust effect)
  const pitchRadios = document.querySelectorAll('input[name="pitch"]');
  if(pitchRadios.length) {
    pitchRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        if(e.target.value === 'dry') {
          document.body.classList.add('weather-dust');
        } else {
          document.body.classList.remove('weather-dust');
        }
      });
    });
  }
});
