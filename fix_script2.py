import re

js_file = 'script.js'
with open(js_file, 'r', encoding='utf-8', errors='ignore') as f:
    js = f.read()

# I will find the exact duplicate innerHTML setting and replace it carefully.
# We have:
bad_block = """  const tw = TEAMS[tossWinner];
  
    const btn = document.getElementById('predictBtn');
    if (btn) btn.classList.add('loading');
      
      btn.innerHTML = '<span class="coin-icon">dY??</span> Analysing...';
      
    
    btn.innerHTML = '<span class="coin-icon">dY??</span> Analysing...';
    
    showLoader();"""

good_block = """  const tw = TEAMS[tossWinner];

  const btn = document.getElementById('predictBtn');
  let originalText = '';
  if (btn) {
    originalText = btn.innerHTML;
    btn.classList.add('loading');
    btn.innerHTML = '<span class="coin-icon">🏏</span> Analysing...';
  }
  const waitDelay = new Promise(r => setTimeout(r, 1500));
  showLoader();"""

# Also fix the restore block:
bad_restore = "if (btn) { btn.classList.remove('loading'); btn.innerHTML = originalText; }"
good_restore = "if (btn) { btn.classList.remove('loading'); if(originalText) btn.innerHTML = originalText; }"

js = js.replace(bad_block, good_block)
js = js.replace(bad_restore, good_restore)

# Clean up any leftover dY?? or dYT to normal emojis if needed, but let's just write this.
with open(js_file, 'w', encoding='utf-8') as f:
    f.write(js)
