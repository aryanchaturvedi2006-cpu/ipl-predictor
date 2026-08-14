import re

js_file = 'script.js'
with open(js_file, 'r', encoding='utf-8') as f:
    js = f.read()

# Add Chart.js gauge logic to the top
gauge_init = """
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
"""

if 'initGauge' not in js:
    js = gauge_init + js

# Replace runPrediction function logic for 1.5s delay
# Find runPrediction block
run_pred_match = re.search(r'async function runPrediction\(\)\s*\{.*?\n\}', js, re.DOTALL)
if run_pred_match:
    old_func = run_pred_match.group(0)
    
    # We want to change how the button behaves and add a timeout before rendering
    # The existing function does fetch() and then updates UI.
    # We will do: btn.classList.add('loading'); btn.innerHTML = '<span class="coin-icon">🏏</span> Analysing...';
    # Then await 1.5s. Then update UI.
    
    new_func = old_func.replace("btn.classList.add('loading');", "btn.classList.add('loading');\n  const originalText = btn.innerHTML;\n  btn.innerHTML = '<span class=\"coin-icon\">🏏</span> Analysing...';\n  const waitDelay = new Promise(r => setTimeout(r, 1500));")
    
    # Wait for both fetch and delay
    new_func = new_func.replace("const data = await res.json();", "const data = await res.json();\n    await waitDelay;")
    
    # Restore button text
    new_func = new_func.replace("if (btn) btn.classList.remove('loading');", "if (btn) { btn.classList.remove('loading'); btn.innerHTML = originalText; }")
    
    js = js.replace(old_func, new_func)

# Replace the UI update logic inside updateUI
update_ui_match = re.search(r'function updateUI\(r, tA, tB\)\s*\{.*?\n\}', js, re.DOTALL)
if update_ui_match:
    old_ui = update_ui_match.group(0)
    
    # Update Chart instead of probFillA/B
    new_ui = old_ui.replace("document.getElementById('probFillA').style.width = pA + '%';", "")
    new_ui = new_ui.replace("document.getElementById('probFillB').style.width = pB + '%';", "")
    
    chart_update = """
  if(predictionChart) {
    predictionChart.data.datasets[0].data = [r.totalA, r.totalB];
    predictionChart.data.datasets[0].backgroundColor = [tA.primaryColor, tB.primaryColor];
    predictionChart.update();
  }
  document.getElementById('gaugeText').textContent = pA > pB ? tA.shortName + ' Favored' : (pB > pA ? tB.shortName + ' Favored' : 'Even Match');
"""
    new_ui = new_ui.replace("document.getElementById('probPctA').textContent  = r.totalA.toFixed(1) + '%';", "document.getElementById('probPctA').textContent  = r.totalA.toFixed(1) + '%';" + chart_update)
    
    js = js.replace(old_ui, new_ui)

# Update checkReady to handle badge colors (team selection glow)
js = js.replace("badgeA.style.borderColor = 'rgba(255,255,255,0.07)';", "badgeA.style.borderColor = teamMap[a]?.primaryColor || 'rgba(255,255,255,0.07)';\n    badgeA.style.boxShadow = teamMap[a] ? `0 0 18px 3px ${teamMap[a].primaryColor}60` : 'none';")
js = js.replace("badgeB.style.borderColor = 'rgba(255,255,255,0.07)';", "badgeB.style.borderColor = teamMap[b]?.primaryColor || 'rgba(255,255,255,0.07)';\n    badgeB.style.boxShadow = teamMap[b] ? `0 0 18px 3px ${teamMap[b].primaryColor}60` : 'none';")

with open(js_file, 'w', encoding='utf-8') as f:
    f.write(js)
