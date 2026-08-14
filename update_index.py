import re

html_file = 'index.html'
with open(html_file, 'r', encoding='utf-8') as f:
    html = f.read()

# Floodlights and Silhouette
floodlights_svg = """
  <!-- Floodlights -->
  <div class="floodlight left-1"></div>
  <div class="floodlight left-2"></div>
  <div class="floodlight right-1"></div>
  <div class="floodlight right-2"></div>
  
  <!-- Crowd Silhouette -->
  <svg viewBox="0 0 1000 100" preserveAspectRatio="none" style="position:absolute; bottom:0; left:0; width:100%; height:80px; z-index:1; opacity:0.8;">
    <path fill="#050810" d="M0,100 L0,50 Q10,40 20,55 T40,45 T60,60 T80,35 T100,55 T120,40 T140,65 T160,45 T180,55 T200,30 T220,60 T240,45 T260,70 T280,50 T300,40 T320,65 T340,45 T360,55 T380,35 T400,60 T420,45 T440,70 T460,50 T480,40 T500,65 T520,45 T540,55 T560,30 T580,60 T600,45 T620,70 T640,50 T660,40 T680,65 T700,45 T720,55 T740,35 T760,60 T780,45 T800,70 T820,50 T840,40 T860,65 T880,45 T900,55 T920,30 T940,60 T960,45 T980,70 L1000,50 L1000,100 Z"/>
  </svg>
"""

# Insert floodlights at the start of hero section
html = html.replace('<section class="hero-section">', f'<section class="hero-section">{floodlights_svg}')

# Wrap numbers in scoreboard-num
# Example: >10< -> ><span class="scoreboard-num" data-target="10">0</span><
# The numbers are in feature-icon (which is an emoji, don't wrap) and in some texts? 
# Wait, "All stat numbers (10 teams, 19 seasons, etc.) on homepage". Let's use regex to find numbers in specific places.
# "10 IPL Teams", "19 Seasons", "8-Factor Model", "2026 Latest" might be the texts.
def replace_number(match):
    num = match.group(1)
    return f'<span class="scoreboard-num" data-target="{num}">0</span>'

html = re.sub(r'>(10)\s+IPL Teams<', lambda m: f'>{replace_number(m)} IPL Teams<', html)
html = re.sub(r'>(19)\s+Seasons<', lambda m: f'>{replace_number(m)} Seasons<', html)
html = re.sub(r'>(8)-Factor Model<', lambda m: f'>{replace_number(m)}-Factor Model<', html)

with open(html_file, 'w', encoding='utf-8') as f:
    f.write(html)
