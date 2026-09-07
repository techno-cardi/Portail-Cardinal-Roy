(() => {
  const VERSION = '1.3';
  const ASSET_VERSION = '20260907-1045';
  let scheduled = false;

  const ensureStyles = () => {
    const existing = document.querySelector('link[data-home-compact],link[data-home-compact-style]');
    if (existing && existing.dataset.homeCompactVersion === ASSET_VERSION) return;
    existing?.remove();
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

  const scheduleApply = () => {
    if (scheduled) return;
    scheduled = true;
    Promise.resolve().then(() => {
      scheduled = false;
      applyLayout();
    });
  };

  ensureStyles();
  applyLayout();

  /* On observe uniquement les zones qui peuvent réellement modifier la mise en
     page compacte. Les rotations du ticker et les résultats de recherche ne
     déclenchent donc plus inutilement applyLayout(). */
  const nav = document.querySelector('.section-nav-inner');
  const stage = document.querySelector('.search-stage-inner');
  const intro = stage?.querySelector('.search-intro');
  const observer = new MutationObserver(scheduleApply);
  if (nav) observer.observe(nav, { childList: true });
  if (stage) observer.observe(stage, { childList: true });
  if (intro) observer.observe(intro, { childList: true, subtree: true });

  window.addEventListener('load', applyLayout, { once: true });
})();
