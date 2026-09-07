(() => {
  const VERSION = '1.4';
  const ASSET_VERSION = '20260907-finalfix';
  const MAX_RETRIES = 50;
  let retries = 0;
  let retryTimer = 0;

  const ensureStyles = () => {
    const links = [...document.querySelectorAll('link[data-home-compact],link[data-home-compact-style]')];
    const current = links.find(link => link.dataset.homeCompactVersion === ASSET_VERSION);
    if (current) {
      links.forEach(link => {
        if (link !== current) link.remove();
      });
      return;
    }
    links.forEach(link => link.remove());
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `home-compact.css?v=${ASSET_VERSION}`;
    link.dataset.homeCompactStyle = 'true';
    link.dataset.homeCompactVersion = ASSET_VERSION;
    document.head.appendChild(link);
  };

  const applyLayout = () => {
    const stage = document.querySelector('.search-stage-inner');
    const intro = stage?.querySelector('.search-intro');
    const searchShell = stage?.querySelector('.search-shell');
    const favorites = document.getElementById('favorites-jump');
    const nav = document.querySelector('.section-nav-inner');
    if (!stage || !intro || !searchShell || !favorites || !nav) return false;

    const guidance = intro.querySelector('p');
    let guidanceRow = intro.querySelector('.search-guidance-row');
    if (!guidanceRow) {
      guidanceRow = document.createElement('div');
      guidanceRow.className = 'search-guidance-row';
      intro.querySelector('h2')?.insertAdjacentElement('afterend', guidanceRow);
    }
    if (guidance && guidance.parentElement !== guidanceRow) guidanceRow.appendChild(guidance);
    if (favorites.parentElement !== guidanceRow) guidanceRow.appendChild(favorites);

    stage.querySelectorAll('.search-favorites-row').forEach(row => {
      if (!row.contains(favorites)) row.remove();
    });

    nav.querySelectorAll('a[href="#section-commencer"]').forEach(link => link.remove());

    document.documentElement.dataset.homeCompact = VERSION;
    return true;
  };

  const boot = () => {
    window.clearTimeout(retryTimer);
    ensureStyles();
    if (applyLayout()) return;
    retries += 1;
    if (retries < MAX_RETRIES) retryTimer = window.setTimeout(boot, 120);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  window.addEventListener('load', () => {
    retries = 0;
    boot();
  }, { once: true });
})();
