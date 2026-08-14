import re

css_file = 'style.css'
with open(css_file, 'r', encoding='utf-8') as f:
    css = f.read()

# 1. Fonts and Variables
if 'Rajdhani' not in css:
    css = "@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&display=swap');\n" + css

css = css.replace('--accent:       #f97316;', '--accent:       #f97316;\n  --accent-2:     #facc15;')

# Change body font
css = re.sub(r'font-family:\s*\'Orbitron\',\s*sans-serif;', r"font-family: 'Rajdhani', sans-serif;", css)
# Restore Orbitron for specific elements
css += """

/* ================================================================
   STADIUM AT NIGHT REDESIGN 
   ================================================================ */
h1, h2, h3, h4, h5, h6, .hero-title, .card-title, .section-title, .step-title, .champion-year, .feature-title, .prob-pct {
    font-family: 'Orbitron', sans-serif !important;
}

/* Navbar Refining */
.nav {
    border-bottom: 1px solid rgba(249, 115, 22, 0.3);
}
.nav-link.active::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 50%;
    transform: translateX(-50%);
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #f97316;
    box-shadow: 0 0 8px #f97316;
}

/* Scoreboard Numbers */
.scoreboard-num {
    font-family: 'Orbitron', sans-serif;
    color: #facc15;
    text-shadow: 0 0 10px rgba(250,204,21,0.5);
    display: inline-block;
}

/* Floodlights */
.floodlight {
    position: absolute;
    top: 0;
    width: 20vw;
    height: 100vh;
    background: white;
    opacity: 0.04;
    pointer-events: none;
    z-index: 0;
}
.floodlight.left-1 { left: -5vw; clip-path: polygon(20% 0, 40% 0, 100% 100%, 0% 100%); transform: rotate(-15deg); }
.floodlight.left-2 { left: 5vw; clip-path: polygon(10% 0, 30% 0, 100% 100%, 0% 100%); transform: rotate(-5deg); }
.floodlight.right-1 { right: -5vw; clip-path: polygon(60% 0, 80% 0, 100% 100%, 0% 100%); transform: rotate(15deg); }
.floodlight.right-2 { right: 5vw; clip-path: polygon(70% 0, 90% 0, 100% 100%, 0% 100%); transform: rotate(5deg); }
"""

with open(css_file, 'w', encoding='utf-8') as f:
    f.write(css)
