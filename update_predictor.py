import re

html_file = 'predictor.html'
with open(html_file, 'r', encoding='utf-8') as f:
    html = f.read()

# Add Chart.js
if 'chart.js' not in html:
    html = html.replace('</head>', '  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>\n</head>')

# Replace the prob-bar block with the canvas gauge
prob_bar_regex = re.compile(r'<div class="prob-row">.*?</div>\s*</div>\s*<div class="prob-team">', re.DOTALL)

replacement = """<div class="prob-row" style="flex-direction: column; align-items: center; position: relative;">
          <div style="width: 250px; height: 150px; position: relative;">
            <canvas id="gaugeChart"></canvas>
            <div id="gaugeText" style="position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); font-family: 'Orbitron', sans-serif; font-size: 1.5rem; font-weight: 700; color: #fff5c0;"></div>
          </div>
          <div style="display: flex; justify-content: space-between; width: 100%; margin-top: -10px;">
            <div class="prob-team" style="text-align: left;">
              <span class="prob-pct" id="probPctA" style="font-size: 1.5rem;">?</span>
              <span class="prob-short" id="probShortA">A</span>
            </div>
            <div class="prob-team" style="text-align: right;">
              <span class="prob-pct" id="probPctB" style="font-size: 1.5rem;">?</span>
              <span class="prob-short" id="probShortB">B</span>
            </div>
          </div>"""

# Need to accurately replace the structure
html = re.sub(r'<div class="prob-row">.*?<div class="prob-team">[^<]*<span class="prob-pct" id="probPctB">.*?</span>.*?<span class="prob-short" id="probShortB">.*?</span>[^<]*</div>\s*</div>', replacement + '\n        </div>', html, flags=re.DOTALL)

with open(html_file, 'w', encoding='utf-8') as f:
    f.write(html)
