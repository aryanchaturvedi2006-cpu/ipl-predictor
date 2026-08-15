const WEATHER_API_KEY = "dccc683dce071a7396560a42a8c1ff33"; // free at openweathermap.org
const VENUE_CITIES = {
  'Wankhede': 'Mumbai',
  'Eden Gardens': 'Kolkata', 
  'Chinnaswamy': 'Bangalore',
  'Chepauk': 'Chennai',
  'Kotla': 'Delhi',
  'Narendra Modi': 'Ahmedabad',
  'Rajiv Gandhi': 'Hyderabad',
  'Sawai Mansingh': 'Jaipur',
  'Punjab Cricket': 'Chandigarh',
  'BRSABV': 'Lucknow',
  'Brabourne': 'Mumbai',
  'DY Patil': 'Mumbai'
};

const VENUE_PITCH_PROFILE = {
  'Wankhede': { 
    avgScore: 182, avgWickets: 7.2, 
    pitchType: 'Batting Friendly',
    description: 'High-scoring venue. Last 10 matches avg: 182 runs, flat track.',
    chasingWin: 58
  },
  'Chepauk': { 
    avgScore: 155, avgWickets: 8.8,
    pitchType: 'Bowling Friendly',
    description: 'Low-scoring. Spinners dominant. Last 10 matches avg: 155 runs.',
    chasingWin: 38
  },
  'Eden Gardens': { 
    avgScore: 168, avgWickets: 7.8,
    pitchType: 'Balanced',
    description: 'Even contest. Dew factor significant in evening matches.',
    chasingWin: 52
  },
  'Chinnaswamy': { 
    avgScore: 190, avgWickets: 6.9,
    pitchType: 'Batting Friendly',
    description: 'Smallest boundary. Highest scoring IPL venue. Bowlers suffer.',
    chasingWin: 55
  },
  'Kotla': { 
    avgScore: 158, avgWickets: 8.1,
    pitchType: 'Bowling Friendly',
    description: 'Slow surface. Spinners effective. Batsmen struggle in 2nd half.',
    chasingWin: 45
  },
  'Narendra Modi': { 
    avgScore: 171, avgWickets: 7.5,
    pitchType: 'Balanced',
    description: 'Good batting surface. Large ground helps bowlers slightly.',
    chasingWin: 50
  },
  'Rajiv Gandhi': { 
    avgScore: 175, avgWickets: 7.3,
    pitchType: 'Batting Friendly',
    description: 'Pacers get bounce. Good batting track with true carry.',
    chasingWin: 53
  },
  'Sawai Mansingh': { 
    avgScore: 162, avgWickets: 8.0,
    pitchType: 'Balanced',
    description: 'Spin-friendly in later overs. Moderate scoring.',
    chasingWin: 47
  },
  'BRSABV Ekana': { 
    avgScore: 160, avgWickets: 8.3,
    pitchType: 'Bowling Friendly',
    description: 'Pacers dominate powerplay. Slowish outfield.',
    chasingWin: 44
  },
  'Punjab Cricket': { 
    avgScore: 174, avgWickets: 7.4,
    pitchType: 'Batting Friendly',
    description: 'Flat track. High powerplay typical.',
    chasingWin: 51
  }
};

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
  
  const venueEl = document.getElementById('venue');
  if (venueEl) {
    venueEl.addEventListener('change', async function() {
      const venue = this.value;
      if (!venue) return;
      
      const autoWeather = document.getElementById('auto-weather-card');
      const autoPitch = document.getElementById('pitch-auto-card');
      
      if (autoWeather) autoWeather.innerHTML = '<div style="text-align:center; padding: 20px; color:var(--text-2);">⏳ Fetching live conditions...</div>';
      if (autoPitch) autoPitch.innerHTML = '<div style="text-align:center; padding: 20px; color:var(--text-2);">⏳ Loading pitch data...</div>';
      
      const [weather] = await Promise.all([
        fetchWeatherForVenue(venue),
        autoPitchFromVenue(venue)
      ]);
      
      lastWeatherData = weather;
      populateWeatherCard(weather, venue);
      showConditionsSummary(venue, weather);
      
      if(typeof checkReady === 'function') checkReady();
    });
  }
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

  // Dew checkbox logic
  const dewProneVenues = ['Wankhede', 'Eden Gardens', 'Chepauk', 'Chinnaswamy', 'Kotla'];
  const dewExpectedCb = document.getElementById('dewExpected');
  const dewWarning = document.getElementById('dewWarning');
  if (dewExpectedCb && dewWarning) {
    const isDewProne = dewProneVenues.some(dp => v.name.includes(dp) || key.toLowerCase().includes(dp.toLowerCase()));
    if (isDewProne) {
      dewExpectedCb.checked = true;
      dewWarning.style.display = 'block';
    } else {
      dewExpectedCb.checked = false;
      dewWarning.style.display = 'none';
    }
  }
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
  const pitch   = getAutoPitchType(venueKey);
  const weather = lastWeatherData ? lastWeatherData.weatherMain.toLowerCase() : 'sunny';
  const wind    = lastWeatherData ? lastWeatherData.windCondition.toLowerCase() : 'calm';

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
    
    const isDewExpected = getAutoDew(lastWeatherData);
    
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
      tossSwing: data.possible_toss_swing || null,
      dewExpected: isDewExpected
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
  // --- DEW FACTOR ADJUSTMENT ---
  let probA = r.totalA;
  let probB = r.totalB;
  let dewImpactValA = 0, dewImpactValB = 0;
  let dewImpactNote = `No significant dew expected.`;

  if (r.dewExpected) {
    if (r.mode === 'post_toss') {
      const tossWinnerKey = r.tossWinner; 
      if (r.tossDecision === 'bowl') {
        dewImpactNote = `Dew is active. ${TEAMS[tossWinnerKey].shortName} chose to field (+7% advantage).`;
        if (tossWinnerKey === r.aKey) { probA += 7; probB -= 7; dewImpactValA = 7; dewImpactValB = -7; }
        else { probB += 7; probA -= 7; dewImpactValA = -7; dewImpactValB = 7; }
      } else if (r.tossDecision === 'bat') {
        dewImpactNote = `Dew is active. ${TEAMS[tossWinnerKey].shortName} chose to bat (-5% penalty).`;
        if (tossWinnerKey === r.aKey) { probA -= 5; probB += 5; dewImpactValA = -5; dewImpactValB = 5; }
        else { probB -= 5; probA += 5; dewImpactValA = 5; dewImpactValB = -5; }
      }
    } else {
      dewImpactNote = `Dew expected. Potential: Fielding toss winner +7% | Batting toss winner -5%.`;
    }
  }

  // --- NEW FACTORS ADJUSTMENTS ---
  // 1. Squad Strength
  const squadSelectA = document.getElementById('teamASquad')?.value || '1.0';
  const squadSelectB = document.getElementById('teamBSquad')?.value || '1.0';

  let squadImpactValA = 0;
  if (squadSelectA !== '1.0' || squadSelectB !== '1.0') {
    const impactA = (typeof squadImpacts !== 'undefined' && (squadImpacts.A.bat > 0 || squadImpacts.A.bowl > 0)) ? ((squadImpacts.A.bat + squadImpacts.A.bowl) / 2) : (1.0 - parseFloat(squadSelectA)) * 50;
    const impactB = (typeof squadImpacts !== 'undefined' && (squadImpacts.B.bat > 0 || squadImpacts.B.bowl > 0)) ? ((squadImpacts.B.bat + squadImpacts.B.bowl) / 2) : (1.0 - parseFloat(squadSelectB)) * 50;
    squadImpactValA = -(impactA - impactB);
  }
  
  probA += squadImpactValA;
  probB -= squadImpactValA;

  // 2. Pitch Type
  const batRatingA = TEAMS[r.aKey].powerHitting + TEAMS[r.aKey].battingDepth;
  const batRatingB = TEAMS[r.bKey].powerHitting + TEAMS[r.bKey].battingDepth;
  const bowlRatingA = TEAMS[r.aKey].pacerQuality + TEAMS[r.aKey].spinnerQuality;
  const bowlRatingB = TEAMS[r.bKey].pacerQuality + TEAMS[r.bKey].spinnerQuality;

  let pitchImpactA = 0;
  if (r.pitch === 'flat') {
    if (batRatingA > batRatingB + 5) pitchImpactA = 8;
    else if (batRatingB > batRatingA + 5) pitchImpactA = -8;
  } else if (r.pitch === 'green') {
    if (bowlRatingA > bowlRatingB + 5) pitchImpactA = 8;
    else if (bowlRatingB > bowlRatingA + 5) pitchImpactA = -8;
  } else if (r.pitch === 'dry') {
    if (TEAMS[r.aKey].spinnerQuality > TEAMS[r.bKey].spinnerQuality + 5) pitchImpactA = 10;
    else if (TEAMS[r.bKey].spinnerQuality > TEAMS[r.aKey].spinnerQuality + 5) pitchImpactA = -10;
  }
  probA += pitchImpactA;
  probB -= pitchImpactA;

  // 3. Venue Chase Bias & Toss Decision Quality
  const venueBias = {
    'Wankhede': { chasing: 0.58, defending: 0.42 },
    'Eden Gardens': { chasing: 0.52, defending: 0.48 },
    'Chepauk': { chasing: 0.38, defending: 0.62 },
    'Chinnaswamy': { chasing: 0.55, defending: 0.45 },
    'Kotla': { chasing: 0.45, defending: 0.55 },
    'Narendra Modi': { chasing: 0.50, defending: 0.50 },
    'Rajiv Gandhi': { chasing: 0.53, defending: 0.47 },
    'default': { chasing: 0.50, defending: 0.50 }
  };
  let venueName = 'default';
  Object.keys(venueBias).forEach(k => {
    if (r.venue.name.includes(k) || r.venue.city.includes(k)) venueName = k;
  });

  let venueChaseBiasA = 0;
  let tossDecisionQualityA = 0;
  let tossDecisionStr = "Neutral";

  if (r.mode === 'post_toss') {
    const isTeamAChasing = (r.tossWinner === r.aKey && r.tossDecision === 'bowl') || (r.tossWinner === r.bKey && r.tossDecision === 'bat');
    const chaseProb = venueBias[venueName].chasing; 
    const biasShift = (chaseProb - 0.50) * 100;
    venueChaseBiasA = isTeamAChasing ? biasShift : -biasShift;

    const dewProneVenues = ['Wankhede', 'Eden Gardens', 'Chepauk', 'Chinnaswamy', 'Kotla'];
    const isDewProne = dewProneVenues.includes(venueName);
    
    if (isDewProne && r.tossDecision === 'bat') {
      tossDecisionStr = "Questionable ⚠️";
      if (r.tossWinner === r.aKey) tossDecisionQualityA = -4;
      else tossDecisionQualityA = 4;
    } else if (chaseProb > 0.50 && r.tossDecision === 'bowl') {
      tossDecisionStr = "Smart ✅";
      if (r.tossWinner === r.aKey) tossDecisionQualityA = 4;
      else tossDecisionQualityA = -4;
    }
    
    probA += venueChaseBiasA;
    probA += tossDecisionQualityA;
    probB -= venueChaseBiasA;
    probB -= tossDecisionQualityA;
  }

  // Clamp probabilities
  r.totalA = Math.max(1, Math.min(99, probA));
  r.totalB = 100 - r.totalA;
  r.winner = r.totalA >= r.totalB ? r.aKey : r.bKey;

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
    
    // Prediction Confidence Badge
    const winProbValue = Math.max(r.totalA, r.totalB);
    const confScore = Math.round(Math.abs(winProbValue - 50) * 2);
    const confBadge = document.getElementById('confBadge');
    if(confBadge) {
      if (winProbValue > 70 || winProbValue < 30) {
        confBadge.innerHTML = `🟢 HIGH CONFIDENCE — ${confScore}/100`;
      } else if (winProbValue >= 55) {
        confBadge.innerHTML = `🟡 MEDIUM CONFIDENCE — ${confScore}/100`;
      } else {
        confBadge.innerHTML = `🔴 CLOSE CALL — ${confScore}/100`;
      }
      confBadge.style.backgroundColor = winner.primaryColor;
      confBadge.style.color = '#fff';
      confBadge.style.opacity = '1';
    }
  }, 80);

  // Factor Cards - 6 XGBoost Features
  const f = r.features;

  // Normalize each diff value to a 0-100 scale for display
  function normDiff(val, scale) {
    return Math.max(5, Math.min(95, 50 + (val / scale) * 50));
  }

  const eloA   = normDiff(f.elo_diff, 400),   eloB   = 100 - eloA;
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
    { name: 'Pitch Type <span style="font-size:0.65rem; color:#f97316; margin-left:4px; background:rgba(249,115,22,0.1); padding:2px 4px; border-radius:4px;">⚡ Auto</span>', weight: 'FIX', f: {
        a: pitchImpactA === 0 ? 50 : Math.max(5, Math.min(95, 50 + (pitchImpactA / 15) * 50)),
        b: pitchImpactA === 0 ? 50 : Math.max(5, Math.min(95, 50 + (-pitchImpactA / 15) * 50))
      }, note: `Pitch condition calculated from historical averages.` 
    },
    { name: 'Dew Factor <span style="font-size:0.65rem; color:#f97316; margin-left:4px; background:rgba(249,115,22,0.1); padding:2px 4px; border-radius:4px;">⚡ Auto</span>', weight: 'FIX', f: {
        a: dewImpactValA === 0 ? 50 : Math.max(5, Math.min(95, 50 + (dewImpactValA / 14) * 50)),
        b: dewImpactValB === 0 ? 50 : Math.max(5, Math.min(95, 50 + (dewImpactValB / 14) * 50))
      }, note: dewImpactNote 
    },
    { name: 'Squad Strength',         weight: 'FIX', f: {
        a: squadImpactValA === 0 ? 50 : Math.max(5, Math.min(95, 50 + (squadImpactValA / 15) * 50)),
        b: squadImpactValA === 0 ? 50 : Math.max(5, Math.min(95, 50 + (-squadImpactValA / 15) * 50))
      }, note: `Multiplier impact based on reported absences.` 
    }
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

  // WHY Explainer Panel
  const whyTeamA = document.getElementById('whyTeamA');
  if(whyTeamA) {
    whyTeamA.textContent = tA.shortName;
    document.getElementById('whyTeamB').textContent = tB.shortName;
    
    function formatImpact(val) {
      if (val > 0) return `<span class="impact-val impact-pos">+${val.toFixed(1)}%</span><span class="impact-val impact-neg">−${val.toFixed(1)}%</span>`;
      if (val < 0) return `<span class="impact-val impact-neg">−${Math.abs(val).toFixed(1)}%</span><span class="impact-val impact-pos">+${Math.abs(val).toFixed(1)}%</span>`;
      return `<span class="impact-val impact-neu">Even</span><span class="impact-val impact-neu">Even</span>`;
    }
    
    // Scale features down to look like percentage impacts roughly
    const whyFactors = [
      { name: 'Elo Rating', diff: (f.elo_diff || 0) / 15 },
      { name: 'Recent Form', diff: (f.form_diff || 0) * 15 },
      { name: 'Venue Record', diff: (f.venue_diff || 0) * 10 },
      { name: 'Pitch Type <span style="font-size:0.65rem; color:#f97316; margin-left:4px; background:rgba(249,115,22,0.1); padding:2px 4px; border-radius:4px;">⚡ Auto</span>', diff: pitchImpactA },
      { name: 'Squad Strength', diff: squadImpactValA },
      { name: 'Dew Factor <span style="font-size:0.65rem; color:#f97316; margin-left:4px; background:rgba(249,115,22,0.1); padding:2px 4px; border-radius:4px;">⚡ Auto</span>', diff: dewImpactValA }
    ];
    
    if (r.mode === 'post_toss') {
      whyFactors.push({ name: 'Venue Chase Bias', diff: venueChaseBiasA });
      whyFactors.push({ name: `Toss Decision Quality (${tossDecisionStr})`, diff: tossDecisionQualityA });
    }
    
    let strongest = whyFactors[0];
    let whyHtml = '';
    
    whyFactors.forEach((fac, idx) => {
      if (Math.abs(fac.diff) > Math.abs(strongest.diff)) strongest = fac;
      
      // Fix 1: Hide "Even" or negligible rows (diff < 0.5%), but always show Elo Rating as baseline
      if (fac.name !== 'Elo Rating' && Math.abs(fac.diff) < 0.5) return;
      
      whyHtml += `<div class="why-row" id="whyRow${idx}">
        <div>${fac.name}</div>
        ${formatImpact(fac.diff)}
      </div>`;
    });
    
    document.getElementById('whyRows').innerHTML = whyHtml;
    document.getElementById('whyStrongest').textContent = `${strongest.name} difference is the strongest predictor in this matchup.`;
    
    document.getElementById('chipRain').innerHTML = `🌧️ Rain → ${tB.shortName} +3%`;
    document.getElementById('chipToss').innerHTML = `🏏 Toss (bat) → ${tA.shortName} +5%`;
    document.getElementById('chipVenue').innerHTML = `📍 Venue change → Even`;
    
    // Hide panel by default on new prediction
    document.getElementById('whyPanel').style.display = 'none';
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
      if (card.querySelector('select, input, button')) return;
      
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = ((y - centerY) / centerY) * -3;
      const rotateY = ((x - centerX) / centerX) * 3;
      
      card.style.transform = `perspective(1500px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.transform = `perspective(1500px) rotateX(0deg) rotateY(0deg)`;
    });
    
    card.addEventListener('mouseenter', () => {
      // Removing 'none' so that the CSS transition kicks in
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

// Toggle WHY panel with staggered animation
window.toggleWhyPanel = function() {
  const panel = document.getElementById('whyPanel');
  if(panel.style.display === 'none') {
    panel.style.display = 'block';
    const rows = document.querySelectorAll('.why-row');
    rows.forEach((row, i) => {
      row.classList.remove('show');
      setTimeout(() => {
        row.classList.add('show');
      }, i * 150);
    });
  } else {
    panel.style.display = 'none';
  }
};

// ================================================================
// DYNAMIC SQUAD STRENGTH
// ================================================================
let squadImpacts = { A: { bat: 0, bowl: 0 }, B: { bat: 0, bowl: 0 } };

window.updateSquadInputs = function(team) {
  const select = document.getElementById('team' + team + 'Squad');
  const container = document.getElementById('squadInputs' + team);
  if (!container) return;
  const val = select.value;
  container.innerHTML = '';
  squadImpacts[team] = { bat: 0, bowl: 0 };
  const impactDiv = document.getElementById('squadImpact' + team);
  if (impactDiv) impactDiv.innerHTML = '';

  if (val === '0.85') {
    container.innerHTML = `
      <input type="text" class="select squad-input" placeholder="Player name (e.g. Bumrah)" 
             onblur="calculateSquadImpact('${team}')" oninput="calculateSquadImpact('${team}')" 
             style="margin-bottom:8px; font-size:0.8rem; padding:6px; background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius); width:100%;">
    `;
  } else if (val === '0.70') {
    container.innerHTML = `
      <div id="dynamicInputs${team}">
        <input type="text" class="select squad-input" placeholder="Player 1" onblur="calculateSquadImpact('${team}')" oninput="calculateSquadImpact('${team}')" style="margin-bottom:8px; font-size:0.8rem; padding:6px; background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius); width:100%;">
        <input type="text" class="select squad-input" placeholder="Player 2" onblur="calculateSquadImpact('${team}')" oninput="calculateSquadImpact('${team}')" style="margin-bottom:8px; font-size:0.8rem; padding:6px; background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius); width:100%;">
      </div>
      <button onclick="addSquadInput('${team}')" style="background:rgba(255,255,255,0.05); border:1px dashed rgba(255,255,255,0.2); color:var(--text-2); padding:4px 8px; font-size:0.7rem; border-radius:4px; cursor:pointer; width:100%; margin-bottom:8px;">+ Add Another</button>
    `;
  }
};

window.addSquadInput = function(team) {
  const div = document.getElementById('dynamicInputs' + team);
  if (div && div.children.length < 6) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'select squad-input';
    input.placeholder = `Player ${div.children.length + 1}`;
    input.onblur = () => calculateSquadImpact(team);
    input.oninput = () => calculateSquadImpact(team);
    input.style.cssText = "margin-bottom:8px; font-size:0.8rem; padding:6px; background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius); width:100%;";
    div.appendChild(input);
  }
};

window.calculateSquadImpact = function(team) {
  const container = document.getElementById('squadInputs' + team);
  if (!container) return;
  const inputs = container.querySelectorAll('.squad-input');
  
  let batPenalty = 0;
  let bowlPenalty = 0;
  let summaryNotes = [];
  let errorNotes = [];
  
  const teamKey = document.getElementById('team' + team).value;
  let playersList = [];
  if (teamKey && TEAMS[teamKey] && TEAMS[teamKey].players) {
    playersList = TEAMS[teamKey].players;
  } else {
    Object.values(TEAMS).forEach(t => {
      if (t.players) playersList = playersList.concat(t.players);
    });
  }

  inputs.forEach(inp => {
    const query = inp.value.trim();
    if (query.length === 0) return; // Case 3: Empty input
    
    const matched = playersList.find(p => p.name.toLowerCase().includes(query.toLowerCase()));
    if (matched) {
      // Case 1: Player found
      const role = matched.role;
      const lowerRole = role.toLowerCase();
      if (lowerRole.includes('bowler') || lowerRole.includes('pacer') || lowerRole.includes('spinner')) {
        bowlPenalty += 12;
        summaryNotes.push(`⚡ ${matched.name} found — ${role} — Bowling strength reduced by 12%`);
      } else if (lowerRole.includes('batsman')) {
        batPenalty += 10;
        summaryNotes.push(`⚡ ${matched.name} found — ${role} — Batting strength reduced by 10%`);
      } else {
        batPenalty += 8;
        bowlPenalty += 8;
        summaryNotes.push(`⚡ ${matched.name} found — ${role} — Batting & Bowling both reduced by 8%`);
      }
    } else {
      // Case 2: Player NOT found
      errorNotes.push(`⚠️ ${query} not found in 2026 IPL squads. Please verify the name.`);
    }
  });

  // Simple rule: Agar player milta nahi toh prediction pe koi effect nahi
  if (errorNotes.length > 0) {
    batPenalty = 0;
    bowlPenalty = 0;
  }

  // Cap maximum penalty at -35%
  batPenalty = Math.min(batPenalty, 35);
  bowlPenalty = Math.min(bowlPenalty, 35);
  
  squadImpacts[team] = { bat: batPenalty, bowl: bowlPenalty };
  
  const impactDiv = document.getElementById('squadImpact' + team);
  if (impactDiv) {
    if (summaryNotes.length === 0 && errorNotes.length === 0) {
      impactDiv.innerHTML = '';
    } else {
      let html = '';
      if (errorNotes.length > 0) {
        html += errorNotes.map(n => `<div style="margin-bottom:4px; color:#f59e0b;">${n}</div>`).join('');
        html += `<div style="margin-bottom:8px; font-style:italic; color:var(--text-2);">Tip: Check spelling or try last name only</div>`;
      }
      
      // Show found players too, but NO total impact line if there's an error
      if (summaryNotes.length > 0) {
        html += summaryNotes.map(n => `<div style="margin-bottom:2px; color:var(--text-1);">${n}</div>`).join('');
      }
      
      if (errorNotes.length === 0 && summaryNotes.length > 0) {
        html += `<div style="margin-top:6px; font-weight:600; color:var(--text-1);">Total impact: Batting −${batPenalty}%, Bowling −${bowlPenalty}%</div>`;
      }
      
      impactDiv.innerHTML = html;
    }
  }
};

// ================================================================
// AUTO-FETCH WEATHER & PITCH CONDITIONS
// ================================================================
let lastWeatherData = null;

async function fetchWeatherForVenue(venue) {
  const city = VENUE_CITIES[venue] || 'Mumbai';
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_API_KEY}&units=metric`;
    const res = await fetch(url);
    const data = await res.json();
    
    const temp = data.main.temp;
    const humidity = data.main.humidity;
    const windSpeed = data.wind.speed;
    const weatherMain = data.weather[0].main;
    
    let dewProbability = 'Low';
    if (humidity > 85 && temp > 18 && temp < 32 && windSpeed < 2) {
      dewProbability = 'High';
    } else if (humidity > 70 && temp > 15 && windSpeed < 4) {
      dewProbability = 'Medium';
    }
    
    const rainChance = weatherMain === 'Rain' ? 'High' 
      : weatherMain === 'Drizzle' ? 'Medium'
      : weatherMain === 'Clouds' && humidity > 80 ? 'Low-Medium'
      : 'Low';
    
    const windCondition = windSpeed > 6 ? 'Strong' : windSpeed > 3 ? 'Moderate' : 'Calm';
    
    return { temp, humidity, windSpeed, dewProbability, rainChance, windCondition, weatherMain };
  } catch(e) {
    console.log("Weather API error", e);
    // fallback
    return { temp: 30, humidity: 65, windSpeed: 2, dewProbability: 'Low', rainChance: 'Low', windCondition: 'Calm', weatherMain: 'Clear' };
  }
}

function autoPitchFromVenue(venue) {
  const profile = VENUE_PITCH_PROFILE[venue];
  if (!profile) return;
  
  const pitchCard = document.getElementById('pitch-auto-card');
  if (pitchCard) {
    pitchCard.innerHTML = `
      <div style="font-weight: 700; font-family: 'Orbitron'; margin-bottom: 12px;">🏏 PITCH INTELLIGENCE — ${venue}</div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <div>📊 Avg Score: <strong>${profile.avgScore}</strong></div>
        <div>🎯 Avg Wickets: <strong>${profile.avgWickets}</strong></div>
      </div>
      <div style="margin-bottom: 12px;">🏃 Chasing Win %: <strong>${profile.chasingWin}%</strong></div>
      <div style="display: inline-block; padding: 4px 12px; background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3); border-radius: 100px; color: #22c55e; font-size: 0.8rem; font-weight: bold; margin-bottom: 12px;">
        ${profile.pitchType}
      </div>
      <div style="font-size: 0.85rem; color: var(--text-2); margin-bottom: 12px;">${profile.description}</div>
      <div style="font-size: 0.75rem; color: #f97316;">⚡ Auto-detected from IPL historical data</div>
    `;
  }
  
  if (typeof updateVenueChaseBias === 'function') {
    updateVenueChaseBias(profile.chasingWin);
  } else {
     // If not defined, just create it on window so it doesn't crash, we'll apply it in displayResults
     window.VENUE_CHASE_BIAS = profile.chasingWin;
  }
}

function populateWeatherCard(weather, venue) {
  const card = document.getElementById('auto-weather-card');
  if (!card) return;
  const city = VENUE_CITIES[venue] || 'Mumbai';
  
  card.innerHTML = `
    <div style="font-weight: 700; font-family: 'Orbitron'; margin-bottom: 12px;">🌤️ LIVE CONDITIONS — ${city} (${venue})</div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; font-size: 0.9rem;">
      <div>🌡️ Temp: <strong>${Math.round(weather.temp)}°C</strong></div>
      <div>💧 Humidity: <strong>${weather.humidity}%</strong></div>
      <div>💨 Wind: <strong>${weather.windCondition} (${weather.windSpeed} m/s)</strong></div>
      <div>🌧️ Rain: <strong>${weather.rainChance}</strong></div>
    </div>
    
    <div style="padding: 12px; background: rgba(0, 200, 230, 0.05); border: 1px solid rgba(0, 200, 230, 0.1); border-radius: 8px; margin-bottom: 12px;">
      🌫️ Dew Expected: <strong style="color: ${weather.dewProbability==='High'?'#ef4444':weather.dewProbability==='Medium'?'#f59e0b':'#22c55e'};">${weather.dewProbability.toUpperCase()}</strong>
      <div style="font-size: 0.75rem; color: var(--text-2); margin-top: 4px;">(Humidity ${weather.humidity}%, Temp ${Math.round(weather.temp)}°C, ${weather.windCondition} wind)</div>
    </div>
    
    <div style="font-size: 0.75rem; color: #f97316;">⚡ Auto-detected from real-time weather data</div>
  `;
}

function showConditionsSummary(venue, weather) {
  const summary = document.getElementById('conditions-summary');
  if (!summary) return;
  const pitchType = getAutoPitchType(venue);
  summary.innerHTML = `
    <div style="padding: 12px 16px; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 8px; font-size: 0.85rem; display: flex; flex-direction: column; gap: 6px;">
      <div>✅ <strong>${venue}</strong> conditions loaded — 
      ${weather.weatherMain} • ${Math.round(weather.temp)}°C • 
      Dew: <strong>${weather.dewProbability}</strong> • 
      Pitch: <strong>${pitchType}</strong></div>
      <div style="color: var(--text-2); font-size: 0.75rem;">🏏 Pitch & dew auto-configured for prediction</div>
    </div>
  `;
}

function getAutoPitchType(venue) {
  const profile = VENUE_PITCH_PROFILE[venue];
  if (!profile) return 'Balanced'; 
  return profile.pitchType; 
}

function getAutoDew(weatherData) {
  if (!weatherData) return false;
  return weatherData.dewProbability === 'High' ? true : false;
}
