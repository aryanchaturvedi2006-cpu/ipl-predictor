const WEATHER_API_KEY = "dccc683dce071a7396560a42a8c1ff33"; // free at openweathermap.org

let venueProfilesData = null;
let venueProfilesPromise = null;

async function fetchVenueProfiles() {
  if (venueProfilesData) return venueProfilesData;
  if (!venueProfilesPromise) {
    venueProfilesPromise = fetch('venue_profiles.json')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        venueProfilesData = data;
        return data;
      })
      .catch(err => {
        console.error("Failed to load venue_profiles.json", err);
        venueProfilesPromise = null;
        return null;
      });
  }
  return venueProfilesPromise;
}

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
  ['teamA', 'teamB', 'venue', 'tossWinner'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', checkReady);
  });
  document.querySelectorAll('input[name="pred_mode"], input[name="toss"], input[name="tossDecision"]').forEach(r => {
    r.addEventListener('change', checkReady);
  });
  
  const venueEl = document.getElementById('venue');
  if (venueEl) {
    venueEl.addEventListener('change', async function() {
      const venue = this.value;
      if (!venue) return;
      
      const autoWeather = document.getElementById('auto-weather-card');
      const autoPitch = document.getElementById('pitch-auto-card');
      
      if (autoWeather) autoWeather.innerHTML = '<div style="text-align:center; padding: 20px; color:var(--text-2);">Fetching live conditions...</div>';
      if (autoPitch) autoPitch.innerHTML = '<div style="text-align:center; padding: 20px; color:var(--text-2);">Loading pitch data...</div>';
      
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
  checkReady();
}



// ---- Update timing hint text ----
function updateTimingHint() {
  const val = document.querySelector('input[name="timing"]:checked')?.value || 'night';
  const hint = document.getElementById('timingHint');
  if (!hint) return;
  if (val === 'day') {
    hint.innerHTML = '<strong>Day Match:</strong> Pitch gets drier under sun — spinners become increasingly dangerous. No dew, so bowling 2nd innings is easier. Batting on a used pitch is harder.';
    hint.style.borderColor = 'rgba(245,158,11,0.3)';
    hint.style.background  = 'rgba(245,158,11,0.05)';
  } else {
    hint.innerHTML = '<strong>Night/Day-Night:</strong> Dew makes the ball slippery for spinners in 2nd innings. Pacers get extra swing. Chasing team has a significant advantage at venues with heavy dew.';
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
    document.getElementById(`badge${side}City`).textContent = t.city;
    badge.style.borderColor = t.primaryColor;
    badge.style.background = 'rgba(0,0,0,0.8)';
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
  const prevVal = tw.value;
  const aKey = document.getElementById('teamA')?.value;
  const bKey = document.getElementById('teamB')?.value;
  tw.innerHTML = '<option value="">-- Select Toss Winner --</option>';
  if (aKey && TEAMS[aKey]) tw.innerHTML += `<option value="${aKey}">${TEAMS[aKey].name}</option>`;
  if (bKey && TEAMS[bKey]) tw.innerHTML += `<option value="${bKey}">${TEAMS[bKey].name}</option>`;
  if (prevVal === aKey || prevVal === bKey) {
    tw.value = prevVal;
  } else {
    tw.value = '';
  }
  checkReady();
}

// ---- Update Venue Info ----
function updateVenue() {
  const key = document.getElementById('venue').value;
  const meta = document.getElementById('venueMeta');
  if (!meta) return;
  if (!key || !VENUES[key]) { meta.innerHTML = ''; return; }
  const v = VENUES[key];
  const dewLabel = { low: 'Low Dew', medium: 'Medium Dew', high: 'High Dew' }[v.dewFactor];
  const dimLabel = { small: 'Small Ground', average: 'Average Ground', large: 'Large Ground' }[v.dimensions];
  const sizeLabel = v.groundDimensions ? v.groundDimensions : '';
  meta.innerHTML = `
    <span class="tag tag-cyan">Avg ${v.avgScore}</span>
    <span class="tag tag-${v.batFirstWinPct > 50 ? 'green' : 'red'}">Bat 1st ${v.batFirstWinPct}%</span>
    <span class="tag tag-${v.chaseWinPct > 50 ? 'green' : 'red'}">Chase ${v.chaseWinPct}%</span>
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
  const mode = document.querySelector('input[name="pred_mode"]:checked')?.value || 'pre_toss';

  if (!btn) return;

  if (!tA || !tB || !venue) {
    btn.disabled = true;
    if (hint) hint.textContent = 'Select both teams and a venue to enable prediction';
    return;
  }
  if (tA === tB) {
    btn.disabled = true;
    if (hint) hint.textContent = 'Both teams cannot be the same.';
    return;
  }

  if (mode === 'post_toss') {
    const tossWinner = document.getElementById('tossWinner')?.value;
    const tossDecision = document.querySelector('input[name="toss"]:checked')?.value
                      || document.querySelector('input[name="tossDecision"]:checked')?.value;
    if (!tossWinner || !tossDecision) {
      btn.disabled = true;
      if (hint) hint.textContent = 'Select toss winner and toss decision to enable prediction';
      return;
    }
  }

  btn.disabled = false;
  if (hint) hint.textContent = 'Ready! Adjust conditions above then click Predict.';
  
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
  const mode = document.querySelector('input[name="pred_mode"]:checked')?.value || 'pre_toss';
  let tossWinner = null;
  let tossDecision = null;
  if (mode === 'post_toss') {
    tossWinner = document.getElementById('tossWinner')?.value;
    tossDecision = document.querySelector('input[name="toss"]:checked')?.value
                || document.querySelector('input[name="tossDecision"]:checked')?.value;
    if (!tossWinner || !tossDecision) {
      alert("Please select both toss winner and toss decision.");
      return;
    }
  }
  const pitch   = getAutoPitchType(venueKey);
  const weather = (lastWeatherData && !lastWeatherData.unavailable && lastWeatherData.weatherMain) ? lastWeatherData.weatherMain.toLowerCase() : 'sunny';
  const wind    = (lastWeatherData && !lastWeatherData.unavailable && lastWeatherData.windCondition) ? lastWeatherData.windCondition.toLowerCase() : 'calm';

  const timing     = document.querySelector('input[name="timing"]:checked')?.value || 'night';

  const tA = TEAMS[aKey];
  const tB = TEAMS[bKey];
  const v = VENUES[venueKey];
  const tw = tossWinner ? TEAMS[tossWinner] : null;

  const btn = document.getElementById('predictBtn');
  let originalText = '';
  if (btn) {
    originalText = btn.innerHTML;
    btn.classList.add('loading');
    btn.innerHTML = 'Analysing...';
  }
  const waitDelay = new Promise(r => setTimeout(r, 1500));
  
  showLoader();
  
  try {
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
      ? 'http://localhost:5001/predict' 
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

    // Fix 4: Real model what-if scenarios in pre-toss mode
    let whatIfScenarios = null;
    if (mode === 'pre_toss') {
      try {
        const scenarios = [
          { team: tA, decision: 'bat', action: 'bat' },
          { team: tA, decision: 'field', action: 'field' },
          { team: tB, decision: 'bat', action: 'bat' },
          { team: tB, decision: 'field', action: 'field' }
        ];
        const scenarioPromises = scenarios.map(s =>
          fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...payload,
              toss_winner: s.team.name,
              toss_decision: s.decision
            })
          }).then(res => {
            if (!res.ok) throw new Error('What-if request failed');
            return res.json();
          })
        );
        const scenarioResults = await Promise.all(scenarioPromises);
        const evaluated = scenarioResults.map((resData, idx) => {
          const s = scenarios[idx];
          const prob = (resData.probabilities[s.team.name] || resData.probabilities[s.team.shortName] || 0) * 100;
          return {
            teamKey: s.team.key,
            shortName: s.team.shortName,
            action: s.action,
            prob: prob,
            text: `If ${s.team.shortName} win toss & ${s.action}: ${s.team.shortName} ${prob.toFixed(1)}%`
          };
        });

        // Select only 2–3 meaningful, non-redundant scenario chips:
        // 1. Team A win toss & field (primary chasing scenario)
        // 2. Team B win toss & field (primary chasing scenario)
        // 3. Batting scenario with the largest impact/shift from fielding
        const selectedChips = [];
        const aField = evaluated.find(e => e.teamKey === tA.key && e.action === 'field');
        const bField = evaluated.find(e => e.teamKey === tB.key && e.action === 'field');
        if (aField) selectedChips.push(aField);
        if (bField) selectedChips.push(bField);

        const batScenarios = evaluated.filter(e => e.action === 'bat');
        if (batScenarios.length > 0) {
          batScenarios.sort((s1, s2) => {
            const shift1 = Math.abs(s1.prob - (s1.teamKey === tA.key ? (aField?.prob || 50) : (bField?.prob || 50)));
            const shift2 = Math.abs(s2.prob - (s2.teamKey === tA.key ? (aField?.prob || 50) : (bField?.prob || 50)));
            return shift2 - shift1;
          });
          selectedChips.push(batScenarios[0]);
        }

        whatIfScenarios = selectedChips.slice(0, 3).map(s => s.text);
      } catch (err) {
        console.warn("What-if scenarios failed", err);
        whatIfScenarios = null;
      }
    }
    
    // Process API response
    const probA = (data.probabilities[tA.name] || data.probabilities[tA.shortName] || 0) * 100;
    const probB = (data.probabilities[tB.name] || data.probabilities[tB.shortName] || 0) * 100;
    
    const isDewExpected = getAutoDew(lastWeatherData);
    
    const result = {
      totalA: probA,
      totalB: probB,
      winner: (data.winner === tA.name || data.winner === tA.shortName) ? aKey : bKey,
      aKey, bKey,
      pitch, weather, wind, tossDecision, tossWinner,
      venue: v,
      isDay: timing === 'day',
      features: data.feature_values_used,
      h2h: data.informational_h2h || null,
      mode: data.prediction_mode,
      prediction_model: data.prediction_model || "Unknown Model",
      tossSwing: data.possible_toss_swing || null,
      dewExpected: isDewExpected,
      whatIfs: whatIfScenarios
    };
    
    hideLoader();
    displayResults(result);
  } catch (error) {
    hideLoader();
    const hint = document.getElementById('predictHint');
    if (hint) hint.textContent = 'Error: ' + error.message;
    btn.classList.remove('loading');
    alert("Prediction failed: " + error.message);
  }
}

// ================================================================
// DISPLAY RESULTS
// ================================================================

function displayResults(r) {
  // --- FACTOR ADJUSTMENTS (FOR SEPARATE RULE-BASED VIEW) ---
  let dewImpactValA = 0, dewImpactValB = 0;
  let dewImpactNote = 'No significant dew expected.';

  if (r.dewExpected) {
    if (r.mode === 'post_toss') {
      const tossWinnerKey = r.tossWinner; 
      if (r.tossDecision === 'bowl' || r.tossDecision === 'field') {
        dewImpactNote = `Dew is active. ${TEAMS[tossWinnerKey].shortName} chose to field (+7% advantage).`;
        if (tossWinnerKey === r.aKey) { dewImpactValA = 7; dewImpactValB = -7; }
        else { dewImpactValA = -7; dewImpactValB = 7; }
      } else if (r.tossDecision === 'bat') {
        dewImpactNote = `Dew is active. ${TEAMS[tossWinnerKey].shortName} chose to bat (-5% penalty).`;
        if (tossWinnerKey === r.aKey) { dewImpactValA = -5; dewImpactValB = 5; }
        else { dewImpactValA = 5; dewImpactValB = -5; }
      }
    } else {
      dewImpactNote = 'Dew expected. Potential: Fielding toss winner +7% | Batting toss winner -5%.';
    }
  }

  // 1. Squad Strength Adjustment
  const squadSelectA = document.getElementById('teamASquad')?.value || '1.0';
  const squadSelectB = document.getElementById('teamBSquad')?.value || '1.0';

  let squadImpactValA = 0;
  if (squadSelectA !== '1.0' || squadSelectB !== '1.0') {
    const impactA = (typeof squadImpacts !== 'undefined' && (squadImpacts.A.bat > 0 || squadImpacts.A.bowl > 0)) ? ((squadImpacts.A.bat + squadImpacts.A.bowl) / 2) : (1.0 - parseFloat(squadSelectA)) * 50;
    const impactB = (typeof squadImpacts !== 'undefined' && (squadImpacts.B.bat > 0 || squadImpacts.B.bowl > 0)) ? ((squadImpacts.B.bat + squadImpacts.B.bowl) / 2) : (1.0 - parseFloat(squadSelectB)) * 50;
    squadImpactValA = -(impactA - impactB);
  }

  // 2. Pitch Type Adjustment
  const batRatingA = TEAMS[r.aKey].powerHitting + TEAMS[r.aKey].battingDepth;
  const batRatingB = TEAMS[r.bKey].powerHitting + TEAMS[r.bKey].battingDepth;
  const bowlRatingA = TEAMS[r.aKey].pacerQuality + TEAMS[r.aKey].spinnerQuality;
  const bowlRatingB = TEAMS[r.bKey].pacerQuality + TEAMS[r.bKey].spinnerQuality;

  let pitchImpactA = 0;
  const normPitch = (r.pitch || '').toLowerCase();
  if (normPitch === 'flat' || normPitch === 'batting friendly') {
    if (batRatingA > batRatingB + 5) pitchImpactA = 8;
    else if (batRatingB > batRatingA + 5) pitchImpactA = -8;
  } else if (normPitch === 'green' || normPitch === 'bowling friendly') {
    if (bowlRatingA > bowlRatingB + 5) pitchImpactA = 8;
    else if (bowlRatingB > bowlRatingA + 5) pitchImpactA = -8;
  } else if (normPitch === 'dry') {
    if (TEAMS[r.aKey].spinnerQuality > TEAMS[r.bKey].spinnerQuality + 5) pitchImpactA = 10;
    else if (TEAMS[r.bKey].spinnerQuality > TEAMS[r.aKey].spinnerQuality + 5) pitchImpactA = -10;
  }

  // 3. Venue Chase Bias & Toss Decision Quality Adjustment
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
    if (r.venue.name.includes(k) || (r.venue.city && r.venue.city.includes(k))) venueName = k;
  });

  let venueChaseBiasA = 0;
  let tossDecisionQualityA = 0;
  let tossDecisionStr = "Neutral";

  if (r.mode === 'post_toss') {
    const isTeamAChasing = (r.tossWinner === r.aKey && (r.tossDecision === 'bowl' || r.tossDecision === 'field')) || (r.tossWinner === r.bKey && r.tossDecision === 'bat');
    const chaseProb = venueBias[venueName].chasing; 
    const biasShift = (chaseProb - 0.50) * 100;
    venueChaseBiasA = isTeamAChasing ? biasShift : -biasShift;

    const dewProneVenues = ['Wankhede', 'Eden Gardens', 'Chepauk', 'Chinnaswamy', 'Kotla'];
    const isDewProne = dewProneVenues.includes(venueName);
    
    if (isDewProne && r.tossDecision === 'bat') {
      tossDecisionStr = "Questionable";
      if (r.tossWinner === r.aKey) tossDecisionQualityA = -4;
      else tossDecisionQualityA = 4;
    } else if (chaseProb > 0.50 && (r.tossDecision === 'bowl' || r.tossDecision === 'field')) {
      tossDecisionStr = "Smart";
      if (r.tossWinner === r.aKey) tossDecisionQualityA = 4;
      else tossDecisionQualityA = -4;
    }
  }

  // Fix 6: Do not modify headline probabilities (r.totalA / r.totalB).
  // The headline gauge and percentages must equal the API probabilities exactly (model output).
  const netAdjustmentA = dewImpactValA + squadImpactValA + pitchImpactA + venueChaseBiasA + tossDecisionQualityA;
  const isAdjustmentActive = (dewImpactValA !== 0 || squadImpactValA !== 0 || pitchImpactA !== 0 || venueChaseBiasA !== 0 || tossDecisionQualityA !== 0);
  let adjProbA = r.totalA;
  let adjProbB = r.totalB;
  if (isAdjustmentActive) {
    adjProbA = Math.max(1, Math.min(99, r.totalA + netAdjustmentA));
    adjProbB = 100 - adjProbA;
  }

  const tA = TEAMS[r.aKey], tB = TEAMS[r.bKey];
  const winner = r.totalA >= r.totalB ? tA : tB;
  const loser  = r.totalA >= r.totalB ? tB : tA;

  // Winner Panel
  document.getElementById('winnerName').textContent = winner.name;
  document.getElementById('winnerName').style.color = winner.primaryColor;
  const winnerPanel = document.getElementById('winnerPanel');
  if (winnerPanel) {
    winnerPanel.style.borderColor = winner.primaryColor + '44';
  }
  const diff = Math.abs(r.totalA - r.totalB);
  const conf = diff > 12 ? 'High Confidence' : diff > 5 ? 'Moderate Confidence' : 'Very Close Contest';
  const confEl = document.getElementById('winnerConf');
  if (confEl) {
    confEl.textContent = conf;
    confEl.style.color = diff > 12 ? '#10b981' : diff > 5 ? '#00c8e6' : '#f59e0b';
    confEl.style.borderColor = confEl.style.color;
    confEl.style.background = confEl.style.color + '15';
  }

  // Model Badge & Toss Mode Badge (Fix 3b)
  let badgeContainer = document.getElementById('predictionBadgesContainer');
  if (!badgeContainer) {
    badgeContainer = document.createElement('div');
    badgeContainer.id = 'predictionBadgesContainer';
    badgeContainer.style.cssText = "margin-top:12px; display:flex; gap:8px; justify-content:center; flex-wrap:wrap; align-items:center;";
    if (winnerPanel) {
      winnerPanel.appendChild(badgeContainer);
    }
  }

  let modelBadge = document.getElementById('predictionModelBadge');
  if (!modelBadge) {
    modelBadge = document.createElement('div');
    modelBadge.id = 'predictionModelBadge';
    modelBadge.style.cssText = "font-size:0.85rem;color:#a5b4fc;font-weight:600;font-family:'Orbitron', sans-serif;background:rgba(129,140,248,0.1);padding:4px 12px;border-radius:20px;display:inline-block;";
    badgeContainer.appendChild(modelBadge);
  }
  modelBadge.textContent = `Powered by ${r.prediction_model || 'Unknown Model'}`;

  let tossModeBadge = document.getElementById('predictionTossModeBadge');
  if (!tossModeBadge) {
    tossModeBadge = document.createElement('div');
    tossModeBadge.id = 'predictionTossModeBadge';
    tossModeBadge.style.cssText = "font-size:0.85rem;color:#38bdf8;font-weight:600;font-family:'Orbitron', sans-serif;background:rgba(56,189,248,0.1);padding:4px 12px;border-radius:20px;display:inline-block;";
    badgeContainer.appendChild(tossModeBadge);
  }
  tossModeBadge.textContent = r.mode === 'post_toss' ? 'POST-TOSS PREDICTION' : 'PRE-TOSS PREDICTION';

  // Probability displays (Model headline probabilities)
  document.getElementById('probPctA').textContent = r.totalA.toFixed(1) + '%';
  document.getElementById('probPctB').textContent = r.totalB.toFixed(1) + '%';
  const btn = document.getElementById('predictBtn');
  if (btn) { btn.classList.remove('loading'); btn.innerHTML = 'Predict Match Winner'; }

  const pctAEl = document.getElementById('probPctA');
  const pctBEl = document.getElementById('probPctB');
  pctAEl.classList.remove('flip-animate');
  pctBEl.classList.remove('flip-animate');
  void pctAEl.offsetWidth;
  pctAEl.classList.add('flip-animate');
  pctBEl.classList.add('flip-animate');

  pctAEl.textContent = r.totalA.toFixed(1) + '%';
  pctBEl.textContent = r.totalB.toFixed(1) + '%';

  document.getElementById('probShortA').textContent = tA.shortName;
  document.getElementById('probShortB').textContent = tB.shortName;
  document.getElementById('probPctA').style.color = 'var(--floodlight)';
  document.getElementById('probPctA').style.textShadow = `0 0 10px ${tA.primaryColor}, 0 0 20px ${tA.primaryColor}`;
  document.getElementById('probPctB').style.color = 'var(--floodlight)';
  document.getElementById('probPctB').style.textShadow = `0 0 10px ${tB.primaryColor}, 0 0 20px ${tB.primaryColor}`;
  
  document.getElementById('badgeA').style.boxShadow = `0 0 30px ${tA.primaryColor}88`;
  document.getElementById('badgeB').style.boxShadow = `0 0 30px ${tB.primaryColor}88`;

  // Fix 6 / UI Refinement: Show rule-adjusted estimate cleanly under gauge if active
  const ruleView = document.getElementById('ruleAdjustedView');
  const ruleProbEl = document.getElementById('ruleAdjustedProb');
  if (ruleView) {
    if (isAdjustmentActive) {
      const probText = `${adjProbA.toFixed(1)}% / ${adjProbB.toFixed(1)}%`;
      if (ruleProbEl) {
        ruleProbEl.textContent = probText;
      } else {
        ruleView.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 6px;">
            <span style="font-family: 'Orbitron', sans-serif; font-size: 0.75rem; font-weight: 700; color: var(--text-2); letter-spacing: 0.05em;">RULE-ADJUSTED ESTIMATE</span>
            <span style="font-family: 'Orbitron', sans-serif; font-size: 0.95rem; font-weight: 700; color: var(--text-1);">${probText}</span>
          </div>
          <div style="font-size: 0.82rem; color: var(--text-2); margin-bottom: 3px;">Includes pitch, weather, squad and venue adjustments.</div>
          <div style="font-size: 0.74rem; color: #64748b;">Separate from the neural network's raw prediction.</div>
        `;
      }
      ruleView.style.display = 'block';
    } else {
      ruleView.style.display = 'none';
      if (ruleProbEl) ruleProbEl.textContent = '';
    }
  }

  setTimeout(() => {
    if (typeof predictionChart !== 'undefined' && predictionChart) {
      predictionChart.data.datasets[0].data = [r.totalA, r.totalB];
      predictionChart.data.datasets[0].backgroundColor = [tA.primaryColor, tB.primaryColor];
      predictionChart.update();
    }
    const gt = document.getElementById('gaugeText');
    if (gt) gt.textContent = r.totalA > r.totalB ? tA.shortName + ' Favored' : (r.totalB > r.totalA ? tB.shortName + ' Favored' : 'Even Match');
    
    // Prediction Confidence Badge
    const winProbValue = Math.max(r.totalA, r.totalB);
    const confScore = Math.round(Math.abs(winProbValue - 50) * 2);
    const confBadge = document.getElementById('confBadge');
    if (confBadge) {
      if (winProbValue > 70 || winProbValue < 30) {
        confBadge.innerHTML = `HIGH CONFIDENCE — ${confScore}/100`;
      } else if (winProbValue >= 55) {
        confBadge.innerHTML = `MEDIUM CONFIDENCE — ${confScore}/100`;
      } else {
        confBadge.innerHTML = `CLOSE CALL — ${confScore}/100`;
      }
      confBadge.style.backgroundColor = winner.primaryColor;
      confBadge.style.color = '#fff';
      confBadge.style.opacity = '1';
    }
  }, 80);

  // Fix 5a: Match Factor Indicators with honest scaling
  const f = r.features || {};

  const FEATURE_STD = {
    elo_diff: 82.6,
    recent_win_rate_diff: 0.246,
    venue_win_rate_diff: 0.407,
    batting_strength_diff: 10.63,
    bowling_strength_diff: 12.80,
    recent_bat_run_rate_diff: 0.966,
    recent_bowl_wkts_diff: 1.26,
    recent_runs_scored_avg_diff: 18.97,
    recent_runs_conceded_avg_diff: 19.11,
    season_win_rate_diff: 0.346,
    toss_impact: 0.102
  };

  function getShare(diff, featureKey) {
    const std = FEATURE_STD[featureKey];
    if (!std) return { a: 50, b: 50 };
    const shareA = 100 / (1 + Math.exp(-0.4 * diff / std));
    const shareB = 100 - shareA;
    return { a: shareA, b: shareB };
  }

  // Relabel the section "Relative advantage (not win probability)"
  const factorTitle = document.getElementById('factorSectionTitle');
  if (factorTitle) {
    factorTitle.textContent = 'Relative advantage (not win probability)';
  }
  document.querySelectorAll('.section-title').forEach(el => {
    if (el.textContent.includes('FACTOR BREAKDOWN') || el.textContent.includes('MATCH FACTOR INDICATORS') || el.textContent.includes('Relative advantage')) {
      el.textContent = 'Relative advantage (not win probability)';
    }
  });

  const factors = [
    {
      name: 'Elo Rating Diff',
      weight: 'STAT',
      f: getShare(f.elo_diff || 0, 'elo_diff'),
      note: `Elo diff: ${(f.elo_diff||0) > 0 ? '+' : ''}${(f.elo_diff||0).toFixed(0)} pts. Tracks long-run team quality.`
    },
    {
      name: 'Recent Win Rate',
      weight: 'STAT',
      f: getShare(f.recent_win_rate_diff || 0, 'recent_win_rate_diff'),
      note: `Diff: ${((f.recent_win_rate_diff||0)*100) > 0 ? '+' : ''}${((f.recent_win_rate_diff||0)*100).toFixed(1)}%. Win rate in recent matches.`
    },
    {
      name: 'Venue Win Rate',
      weight: 'STAT',
      f: getShare(f.venue_win_rate_diff || 0, 'venue_win_rate_diff'),
      note: `Diff: ${((f.venue_win_rate_diff||0)*100) > 0 ? '+' : ''}${((f.venue_win_rate_diff||0)*100).toFixed(1)}%. Historical win rate at this venue.`
    },
    {
      name: 'Batting Strength',
      weight: 'STAT',
      f: getShare(f.batting_strength_diff || 0, 'batting_strength_diff'),
      note: `Diff: ${(f.batting_strength_diff||0) > 0 ? '+' : ''}${(f.batting_strength_diff||0).toFixed(1)}. Composite of phase-wise batting stats.`
    },
    {
      name: 'Bowling Strength',
      weight: 'STAT',
      f: getShare(f.bowling_strength_diff || 0, 'bowling_strength_diff'),
      note: `Diff: ${(f.bowling_strength_diff||0) > 0 ? '+' : ''}${(f.bowling_strength_diff||0).toFixed(1)}. Composite of phase-wise bowling stats.`
    },
    {
      name: 'Recent Run Rate',
      weight: 'STAT',
      f: getShare(f.recent_bat_run_rate_diff || 0, 'recent_bat_run_rate_diff'),
      note: `Diff: ${(f.recent_bat_run_rate_diff||0) > 0 ? '+' : ''}${(f.recent_bat_run_rate_diff||0).toFixed(2)} rpo. Run rate in recent matches.`
    },
    {
      name: 'Recent Bowling Wickets',
      weight: 'STAT',
      f: getShare(f.recent_bowl_wkts_diff || 0, 'recent_bowl_wkts_diff'),
      note: `Diff: ${(f.recent_bowl_wkts_diff||0) > 0 ? '+' : ''}${(f.recent_bowl_wkts_diff||0).toFixed(2)} wkts. Average wickets in recent matches.`
    },
    {
      name: 'Recent Runs Scored Avg',
      weight: 'STAT',
      f: getShare(f.recent_runs_scored_avg_diff || 0, 'recent_runs_scored_avg_diff'),
      note: `Diff: ${(f.recent_runs_scored_avg_diff||0) > 0 ? '+' : ''}${(f.recent_runs_scored_avg_diff||0).toFixed(1)} runs. Average runs scored in recent matches.`
    },
    {
      name: 'Recent Runs Conceded Avg',
      weight: 'STAT',
      f: getShare(f.recent_runs_conceded_avg_diff || 0, 'recent_runs_conceded_avg_diff'),
      note: `Diff: ${(f.recent_runs_conceded_avg_diff||0) > 0 ? '+' : ''}${(f.recent_runs_conceded_avg_diff||0).toFixed(1)} runs. Conceding fewer runs favors team quality.`
    },
    {
      name: 'Season Win Rate',
      weight: 'STAT',
      f: getShare(f.season_win_rate_diff || 0, 'season_win_rate_diff'),
      note: `Diff: ${((f.season_win_rate_diff||0)*100) > 0 ? '+' : ''}${((f.season_win_rate_diff||0)*100).toFixed(1)}%. Current season performance.`
    }
  ];

  // Fix 3c: Also add two cards in Match Factor Indicators, post-toss only: "Toss Impact (model input)" and "Toss Winner / Decision"
  if (r.mode === 'post_toss') {
    const twTeam = (r.tossWinner && TEAMS[r.tossWinner]) ? TEAMS[r.tossWinner] : { shortName: r.tossWinner || 'Toss Winner' };
    const decText = (r.tossDecision === 'bowl' || r.tossDecision === 'field') ? 'field' : 'bat';
    const isWinnerA = r.tossWinner === r.aKey;

    factors.push({
      name: 'Toss Impact (model input)',
      weight: 'MODEL',
      f: getShare(f.toss_impact || 0, 'toss_impact'),
      note: `Model input toss_impact: ${(f.toss_impact||0) > 0 ? '+' : ''}${(f.toss_impact||0).toFixed(4)}. Impact on advantage.`
    });

    factors.push({
      name: 'Toss Winner / Decision',
      weight: 'TOSS',
      f: { a: isWinnerA ? 100 : 0, b: isWinnerA ? 0 : 100 },
      note: `${twTeam.shortName} won the toss and chose to ${decText}.`
    });
  }

  const grid = document.getElementById('factorGrid');
  if (grid) {
    grid.innerHTML = factors.map(fac => {
      const pA = fac.f.a.toFixed(1), pB = fac.f.b.toFixed(1);
      const sum = fac.f.a + fac.f.b;
      const barA = sum > 0 ? ((fac.f.a / sum) * 100).toFixed(1) : '50.0';
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

  // Fix 5b & Fix 3c: WHY Explainer Panel
  const whyTeamA = document.getElementById('whyTeamA');
  if (whyTeamA) {
    whyTeamA.textContent = tA.shortName;
    document.getElementById('whyTeamB').textContent = tB.shortName;
    
    const candidateFactors = [
      {
        key: 'elo_diff',
        name: 'Elo',
        diff: f.elo_diff || 0,
        formatVal: (d) => `${Math.round(Math.abs(d))} pts`
      },
      {
        key: 'recent_win_rate_diff',
        name: 'Recent Win Rate',
        diff: f.recent_win_rate_diff || 0,
        formatVal: (d) => `${(Math.abs(d) * 100).toFixed(1)}%`
      },
      {
        key: 'venue_win_rate_diff',
        name: 'Venue Win Rate',
        diff: f.venue_win_rate_diff || 0,
        formatVal: (d) => `${(Math.abs(d) * 100).toFixed(1)}%`
      },
      {
        key: 'batting_strength_diff',
        name: 'Batting Strength',
        diff: f.batting_strength_diff || 0,
        formatVal: (d) => `${Math.abs(d).toFixed(1)}`
      },
      {
        key: 'bowling_strength_diff',
        name: 'Bowling Strength',
        diff: f.bowling_strength_diff || 0,
        formatVal: (d) => `${Math.abs(d).toFixed(1)}`
      },
      {
        key: 'recent_bat_run_rate_diff',
        name: 'Recent Bat Run Rate',
        diff: f.recent_bat_run_rate_diff || 0,
        formatVal: (d) => `${Math.abs(d).toFixed(2)} rpo`
      },
      {
        key: 'recent_bowl_wkts_diff',
        name: 'Recent Bowling Wickets',
        diff: f.recent_bowl_wkts_diff || 0,
        formatVal: (d) => `${Math.abs(d).toFixed(2)} wkts`
      },
      {
        key: 'recent_runs_scored_avg_diff',
        name: 'Recent Runs Scored Avg',
        diff: f.recent_runs_scored_avg_diff || 0,
        formatVal: (d) => `${Math.abs(d).toFixed(1)} runs`
      },
      {
        key: 'recent_runs_conceded_avg_diff',
        name: 'Recent Runs Conceded Avg',
        diff: f.recent_runs_conceded_avg_diff || 0,
        formatVal: (d) => `${Math.abs(d).toFixed(1)} runs`
      },
      {
        key: 'season_win_rate_diff',
        name: 'Season Win Rate',
        diff: f.season_win_rate_diff || 0,
        formatVal: (d) => `${(Math.abs(d) * 100).toFixed(1)}%`
      }
    ];

    if (r.mode === 'post_toss') {
      const tossImpactVal = f.toss_impact || 0;
      const twTeam = (r.tossWinner && TEAMS[r.tossWinner]) ? TEAMS[r.tossWinner] : { shortName: r.tossWinner || '?' };
      const decText = (r.tossDecision === 'bowl' || r.tossDecision === 'field') ? 'field' : 'bat';
      candidateFactors.push({
        key: 'toss_impact',
        name: `Toss Advantage (${twTeam.shortName} chose ${decText})`,
        diff: tossImpactVal,
        formatVal: (d) => `${Math.abs(d).toFixed(4)}`
      });
    }

    // Rank factors dynamically by normalized gap: |diff| / STD[key]
    candidateFactors.forEach(fac => {
      const std = FEATURE_STD[fac.key] || 1;
      fac.gapRatio = Math.abs(fac.diff) / std;
    });

    candidateFactors.sort((a, b) => b.gapRatio - a.gapRatio);

    // Dynamically select top 2 or 3 most influential factors (maximum 3)
    let topFactors = candidateFactors.filter(fac => fac.gapRatio > 0.001).slice(0, 3);
    if (topFactors.length < 2) {
      topFactors = candidateFactors.slice(0, 2);
    }

    let whyHtml = '';
    topFactors.forEach((fac, idx) => {
      const valStr = fac.formatVal(fac.diff);
      let summaryText = '';
      let cellA = '<span class="impact-val impact-neu">Even</span>';
      let cellB = '<span class="impact-val impact-neu">Even</span>';

      if (fac.diff > 0.0001) {
        summaryText = `${fac.name}: ${tA.shortName} +${valStr}`;
        cellA = `<span class="impact-val impact-pos">+${valStr}</span>`;
        cellB = `<span class="impact-val impact-neg">−${valStr}</span>`;
      } else if (fac.diff < -0.0001) {
        summaryText = `${fac.name}: ${tB.shortName} +${valStr}`;
        cellA = `<span class="impact-val impact-neg">−${valStr}</span>`;
        cellB = `<span class="impact-val impact-pos">+${valStr}</span>`;
      } else {
        summaryText = `${fac.name}: Even`;
      }

      whyHtml += `<div class="why-row" id="whyRow${idx}">
        <div>${summaryText}</div>
        ${cellA}
        ${cellB}
      </div>`;
    });

    document.getElementById('whyRows').innerHTML = whyHtml;

    // Largest gap vs a typical matchup: chosen by |diff|/STD
    const largestGapFactor = topFactors[0] || candidateFactors[0];
    document.getElementById('whyStrongest').textContent = `Largest gap vs a typical matchup: ${largestGapFactor.name}`;

    // Fix 5b: Add caption: "Input differences, not model attribution. The neural network’s output is not an additive sum of these."
    let whyCaption = document.getElementById('whyCaption');
    if (!whyCaption) {
      whyCaption = document.createElement('div');
      whyCaption.id = 'whyCaption';
      whyCaption.style.cssText = "margin-top: 10px; font-size: 0.8rem; color: var(--text-2); font-style: italic;";
      document.getElementById('whyStrongest')?.insertAdjacentElement('afterend', whyCaption);
    }
    whyCaption.textContent = "Input differences, not model attribution. The neural network’s output is not an additive sum of these.";

    // Fix 4 / UI Refinement: Real model what-if chips in pre-toss mode (2-3 chips), hide in post-toss mode or if failed
    const whatIfSection = document.getElementById('whatIfSection');
    const whatIfChips = document.getElementById('whatIfChips');
    if (whatIfSection && whatIfChips) {
      if (r.mode === 'pre_toss' && r.whatIfs && r.whatIfs.length >= 2) {
        whatIfChips.innerHTML = r.whatIfs.map(text =>
          `<span class="tag" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border);">${text}</span>`
        ).join('');
        whatIfSection.style.display = 'block';
      } else {
        whatIfSection.style.display = 'none';
        whatIfChips.innerHTML = '';
      }
    }

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
  const v = (typeof VENUES !== 'undefined' && VENUES[venue]) ? VENUES[venue] : null;
  const city = v ? v.city : null;
  if (!city) {
    return { unavailable: true, dewProbability: 'None' };
  }
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${WEATHER_API_KEY}&units=metric`;
    const res = await fetch(url);
    if (!res.ok) {
      return { unavailable: true, dewProbability: 'None' };
    }
    const data = await res.json();
    if (!data || !data.main || !data.weather || !data.weather[0]) {
      return { unavailable: true, dewProbability: 'None' };
    }
    
    const temp = data.main.temp;
    const humidity = data.main.humidity;
    const windSpeed = data.wind ? data.wind.speed : 0;
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
    
    return { unavailable: false, temp, humidity, windSpeed, dewProbability, rainChance, windCondition, weatherMain };
  } catch(e) {
    console.log("Weather API error", e);
    return { unavailable: true, dewProbability: 'None' };
  }
}

async function autoPitchFromVenue(venue) {
  const pitchCard = document.getElementById('pitch-auto-card');
  const v = (typeof VENUES !== 'undefined' && VENUES[venue]) ? VENUES[venue] : { name: venue };
  
  let profiles = null;
  try {
    profiles = await fetchVenueProfiles();
  } catch (e) {
    profiles = null;
  }
  
  if (!profiles || !profiles[venue]) {
    if (pitchCard) {
      pitchCard.innerHTML = `
        <div style="font-weight: 700; font-family: 'Orbitron'; margin-bottom: 12px;">PITCH INTELLIGENCE — ${v.name || venue}</div>
        <div style="text-align:center; padding: 20px; color:var(--text-2);">Pitch data unavailable</div>
      `;
    }
    window.VENUE_CHASE_BIAS = 50;
    return;
  }
  
  const profile = profiles[venue];
  const meta = profiles._meta || {};
  const leagueAvg = meta.league_recent_avg_first_innings != null ? meta.league_recent_avg_first_innings : 192.0;
  const quality = profile.data_quality || 'ok';
  
  let displayedPitchType = profile.pitch_type || 'Unknown';
  let qualityWarningHtml = '';
  
  const matchesCount = profile.last10?.matches ?? profile.all_time?.matches ?? 0;
  const lastMatchDate = profile.last_match_date || 'N/A';
  const avgScore = profile.last10?.avg_first_innings != null ? profile.last10.avg_first_innings : 'N/A';
  const avgWickets = profile.last10?.avg_first_innings_wkts != null ? profile.last10.avg_first_innings_wkts : 'N/A';
  const chaseWin = profile.last10?.chase_win_pct != null ? `${profile.last10.chase_win_pct}%` : 'N/A';
  
  if (quality === 'none') {
    if (pitchCard) {
      pitchCard.innerHTML = `
        <div style="font-weight: 700; font-family: 'Orbitron'; margin-bottom: 12px;">PITCH INTELLIGENCE — ${v.name || venue}</div>
        <div style="text-align:center; padding: 20px; color:var(--text-2);">No IPL matches in dataset</div>
      `;
    }
    window.VENUE_CHASE_BIAS = 50;
    return;
  } else if (quality === 'stale') {
    displayedPitchType = 'Unknown';
    qualityWarningHtml = `
      <div style="padding: 6px 10px; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 6px; color: #ef4444; font-size: 0.75rem; margin-bottom: 10px;">
        No recent matches here (last: ${lastMatchDate}). Pitch profile not reliable
      </div>
    `;
  } else if (quality === 'limited') {
    qualityWarningHtml = `
      <div style="padding: 6px 10px; background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.3); border-radius: 6px; color: #f59e0b; font-size: 0.75rem; margin-bottom: 10px;">
        Limited data (${matchesCount} matches)
      </div>
    `;
  }
  
  if (pitchCard) {
    pitchCard.innerHTML = `
      <div style="font-weight: 700; font-family: 'Orbitron'; margin-bottom: 12px;">PITCH INTELLIGENCE — ${v.name || venue}</div>
      ${qualityWarningHtml}
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.85rem;">
        <div>Avg 1st-Innings Score: <strong>${avgScore}</strong></div>
        <div>Avg 1st-Innings Wickets: <strong>${avgWickets}</strong></div>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.85rem;">
        <div>Chase Win % (last 10): <strong>${chaseWin}</strong></div>
        <div>Matches: <strong>${matchesCount}</strong></div>
      </div>
      <div style="font-size: 0.8rem; color: var(--text-2); margin-bottom: 10px;">Last Match Date: <strong>${lastMatchDate}</strong></div>
      <div style="display: inline-block; padding: 4px 12px; background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3); border-radius: 100px; color: #22c55e; font-size: 0.8rem; font-weight: bold; margin-bottom: 6px;">
        ${displayedPitchType}
      </div>
      <div style="font-size: 0.75rem; color: var(--text-2); margin-bottom: 8px;">relative to league recent avg (${leagueAvg})</div>
      <div style="font-size: 0.75rem; color: #f97316;">Auto-detected from historical match data</div>
    `;
  }
  
  const chasingWinPct = profile.last10?.chase_win_pct != null ? profile.last10.chase_win_pct : 50;
  if (typeof updateVenueChaseBias === 'function') {
    updateVenueChaseBias(chasingWinPct);
  } else {
    window.VENUE_CHASE_BIAS = chasingWinPct;
  }
}

function populateWeatherCard(weather, venue) {
  const card = document.getElementById('auto-weather-card');
  if (!card) return;
  const v = (typeof VENUES !== 'undefined' && VENUES[venue]) ? VENUES[venue] : { name: venue, city: '' };
  
  if (!weather || weather.unavailable) {
    card.innerHTML = `
      <div style="font-weight: 700; font-family: 'Orbitron'; margin-bottom: 12px;">LIVE CONDITIONS — ${v.name}, ${v.city}</div>
      <div style="text-align: center; padding: 24px 12px; color: var(--text-2); font-size: 0.95rem;">Weather unavailable</div>
    `;
    return;
  }
  
  card.innerHTML = `
    <div style="font-weight: 700; font-family: 'Orbitron'; margin-bottom: 12px;">LIVE CONDITIONS — ${v.name}, ${v.city}</div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; font-size: 0.9rem;">
      <div>Temp: <strong>${Math.round(weather.temp)}°C</strong></div>
      <div>Humidity: <strong>${weather.humidity}%</strong></div>
      <div>Wind: <strong>${weather.windCondition} (${weather.windSpeed} m/s)</strong></div>
      <div>Rain: <strong>${weather.rainChance}</strong></div>
    </div>
    
    <div style="padding: 12px; background: rgba(0, 200, 230, 0.05); border: 1px solid rgba(0, 200, 230, 0.1); border-radius: 8px; margin-bottom: 12px;">
      Dew Expected: <strong style="color: ${weather.dewProbability==='High'?'#ef4444':weather.dewProbability==='Medium'?'#f59e0b':'#22c55e'};">${weather.dewProbability.toUpperCase()}</strong>
      <div style="font-size: 0.75rem; color: var(--text-2); margin-top: 4px;">(Humidity ${weather.humidity}%, Temp ${Math.round(weather.temp)}°C, ${weather.windCondition} wind)</div>
    </div>
    
    <div style="font-size: 0.75rem; color: #f97316;">Auto-detected from real-time weather data</div>
  `;
}

function showConditionsSummary(venue, weather) {
  const summary = document.getElementById('conditions-summary');
  if (!summary) return;
  const pitchType = getAutoPitchType(venue);
  const v = (typeof VENUES !== 'undefined' && VENUES[venue]) ? VENUES[venue] : { name: venue };
  
  if (!weather || weather.unavailable) {
    summary.innerHTML = `
      <div style="padding: 12px 16px; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border); border-radius: 8px; font-size: 0.85rem; display: flex; flex-direction: column; gap: 6px;">
        <div><strong>${v.name || venue}</strong> conditions loaded — Weather unavailable • Dew: <strong>Not expected</strong> • Pitch: <strong>${pitchType}</strong></div>
        <div style="color: var(--text-2); font-size: 0.75rem;">Pitch auto-configured for prediction</div>
      </div>
    `;
    return;
  }

  summary.innerHTML = `
    <div style="padding: 12px 16px; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 8px; font-size: 0.85rem; display: flex; flex-direction: column; gap: 6px;">
      <div><strong>${v.name || venue}</strong> conditions loaded — 
      ${weather.weatherMain} • ${Math.round(weather.temp)}°C • 
      Dew: <strong>${weather.dewProbability}</strong> • 
      Pitch: <strong>${pitchType}</strong></div>
      <div style="color: var(--text-2); font-size: 0.75rem;">Pitch & dew auto-configured for prediction</div>
    </div>
  `;
}

function getAutoPitchType(venue) {
  if (!venueProfilesData || !venueProfilesData[venue]) return 'Balanced';
  const profile = venueProfilesData[venue];
  if (profile.data_quality === 'stale' || profile.data_quality === 'none' || !profile.pitch_type || profile.pitch_type === 'Unknown') {
    return 'Balanced';
  }
  return profile.pitch_type;
}

function getAutoDew(weatherData) {
  if (!weatherData || weatherData.unavailable) return false;
  return weatherData.dewProbability === 'High';
}
