import re

js_file = 'script.js'
with open(js_file, 'r', encoding='utf-8') as f:
    js = f.read()

# Replace button loading text and add 1.5s delay
# 1. Add "Analysing..." to button click
# Currently, predictBtn click logic is around line 257 (runPrediction)
# Actually, let's just find btn.classList.add('loading');
js = js.replace("btn.classList.add('loading');", "btn.classList.add('loading');\n    const originalText = btn.innerHTML;\n    btn.innerHTML = '<span class=\"coin-icon\">🏏</span> Analysing...';\n    const waitDelay = new Promise(r => setTimeout(r, 1500));")

# 2. Wait for delay
js = js.replace("const r = await response.json();", "const r = await response.json();\n      await waitDelay;")

# 3. Restore button text
js = js.replace("if (btn) btn.classList.remove('loading');", "if (btn) { btn.classList.remove('loading'); btn.innerHTML = originalText; }")

# Update UI logic to use Chart.js instead of probFill width
ui_update_old = """  document.getElementById('probFillA').style.width = pA + '%';
  document.getElementById('probFillB').style.width = pB + '%';"""
ui_update_new = """  if(typeof predictionChart !== 'undefined' && predictionChart) {
    predictionChart.data.datasets[0].data = [r.totalA, r.totalB];
    predictionChart.data.datasets[0].backgroundColor = [tA.primaryColor, tB.primaryColor];
    predictionChart.update();
  }
  const gt = document.getElementById('gaugeText');
  if(gt) {
    gt.textContent = pA > pB ? tA.shortName + ' Favored' : (pB > pA ? tB.shortName + ' Favored' : 'Even Match');
  }"""
js = js.replace(ui_update_old, ui_update_new)

with open(js_file, 'w', encoding='utf-8') as f:
    f.write(js)
