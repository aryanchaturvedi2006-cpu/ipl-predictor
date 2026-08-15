// ================================================================
// SHARED NAVIGATION COMPONENT  (nav.js)
// ================================================================
(function () {
  const links = [
    { href: 'index.html',     label: 'Home' },
    { href: 'predictor.html', label: 'Predictor' },
    { href: 'live.html',      label: 'Live Center' },
    { href: 'teams.html',     label: 'Teams' },
    { href: 'player_h2h.html',   label: 'Player H2H' },
    { href: 'history.html',   label: 'IPL History' },
    { href: 'stats.html',     label: 'Stats Center' },
    { href: 'news.html',      label: 'News' },
    { href: 'captains_challenge.html', label: '🧠 Captain' },
  ];


  const current = window.location.pathname.split('/').pop() || 'index.html';

  const navHTML = `
  <nav class="nav">
    <div class="nav-inner">
      <a href="index.html" class="nav-logo">
        <span class="nav-logo-icon">🏏</span>
        <span class="nav-logo-text">IPL<span>Predict</span></span>
      </a>
      <div class="nav-links">
        ${links.map(l => `<a href="${l.href}" class="nav-link${current === l.href ? ' active' : ''}">${l.label}</a>`).join('')}
        <a href="predictor.html" class="nav-cta">⚡ Predict Now</a>
      </div>
      <button class="hamburger" id="hamburger" aria-label="Open menu">☰</button>
    </div>
  </nav>
  <div class="mobile-menu" id="mobileMenu">
    ${links.map(l => `<a href="${l.href}" class="mobile-link${current === l.href ? ' active' : ''}">${l.label}</a>`).join('')}
    <a href="predictor.html" class="mobile-link" style="color:var(--accent);font-weight:600;">⚡ Predict Now</a>
  </div>
  <div class="ticker-wrap">
    <div class="ticker-content">
      🏏 LIVE: CSK vs MI - Pitch: Turning | Dew: Heavy | Toss: CSK (Bat) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 🔴 RECENT: RCB won by 12 runs &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 🏏 NEXT: KKR vs DC
    </div>
  </div>`;

  // Inject nav at top of body
  document.body.insertAdjacentHTML('afterbegin', navHTML);

  // Hamburger toggle
  document.getElementById('hamburger').addEventListener('click', () => {
    document.getElementById('mobileMenu').classList.toggle('open');
  });

  // Close mobile menu on link click
  document.querySelectorAll('.mobile-link').forEach(l => {
    l.addEventListener('click', () => document.getElementById('mobileMenu').classList.remove('open'));
  });
})();
