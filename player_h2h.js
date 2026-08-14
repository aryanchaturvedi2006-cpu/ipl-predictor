// ---- Player H2H Logic ----

document.addEventListener('DOMContentLoaded', () => {
  // Populate Team Selectors on load
  const teamA = document.getElementById('teamA');
  const teamB = document.getElementById('teamB');
  
  if (teamA && teamB) {
    let options = '<option value="">-- Select Team --</option>';
    Object.keys(TEAMS).forEach(key => {
      options += `<option value="${key}">${TEAMS[key].name}</option>`;
    });
    teamA.innerHTML = options;
    teamB.innerHTML = options;
  }
});

function updateTeamSelections() {
  const aKey = document.getElementById('teamA').value;
  const bKey = document.getElementById('teamB').value;
  const tSec = document.getElementById('tacticalSection');
  
  const bSel = document.getElementById('tacticalBatsman');
  const wSel = document.getElementById('tacticalBowler');

  if (aKey && bKey) {
    populateTacticalSelectors(TEAMS[aKey], TEAMS[bKey]);
    bSel.disabled = false;
    wSel.disabled = false;
  } else {
    bSel.disabled = true;
    wSel.disabled = true;
    tSec.style.display = 'none';
  }
}

function populateTacticalSelectors(tA, tB) {
  const bSel = document.getElementById('tacticalBatsman');
  const wSel = document.getElementById('tacticalBowler');
  if (!bSel || !wSel) return;
  
  bSel.innerHTML = '<option value="">-- Choose Batsman --</option>' + 
    tA.players.filter(p => p.role.includes('Batsman') || p.role.includes('All-Rounder'))
      .map(p => `<option value="${p.id}">${p.name}</option>`).join('');
      
  wSel.innerHTML = '<option value="">-- Choose Bowler --</option>' + 
    tB.players.filter(p => p.role.includes('Pacer') || p.role.includes('Spinner') || p.role.includes('All-Rounder'))
      .map(p => `<option value="${p.id}">${p.name}</option>`).join('');

  updateTactical();
}

function updateTactical() {
  const batId = document.getElementById('tacticalBatsman').value;
  const bowlId = document.getElementById('tacticalBowler').value;
  const tSec = document.getElementById('tacticalSection');
  
  if (!batId || !bowlId) { 
    tSec.style.display = 'none'; 
    return; 
  }
  
  tSec.style.display = 'block';
  
  // 1. Get Matchup Data
  let m = (typeof DETAILED_MATCHUPS !== 'undefined' ? DETAILED_MATCHUPS : []).find(x => x.batsman === batId && x.bowler === bowlId);
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

  const seed = (batId.length * 7) + (bowlId.length * 3);
  const rnd = (s) => Math.abs(Math.sin(seed + s));

  const batSeed = (batId || "a").split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const bowlSeed = (bowlId || "b").split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const vulns = ["short", "swing", "full", "yorker", "spin", "wide"];
  const zones = ["cover", "pull", "behind", "straight", "mid-wicket"];
  const lengths = ["short", "good", "full", "yorker"];
  
  const bVuln = batsman.vulnerability || vulns[batSeed % vulns.length];
  const bZone = batsman.strengthZone || zones[(batSeed * 3) % zones.length];
  const bwPref = bowler.preferredLength || lengths[bowlSeed % lengths.length];

  const vuln = bVuln.toLowerCase();
  const preferred = (batsman.preferredLength || lengths[(batSeed * 5) % lengths.length]).toLowerCase();
  const bowlerLength = bwPref.toLowerCase();
  const isPacer = bowler.role.toLowerCase().includes("pacer");
  const isSpinner = bowler.role.toLowerCase().includes("spinner");
  
  let bPlan = "";
  let sTips = "";
  
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
