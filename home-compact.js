(() => {
  const VERSION = '1.2';
  const ASSET_VERSION = '20260907-0824';
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

    // Sur desktop, le texte d'aide et « Mes favoris » partagent la même ligne.
    // On déplace les éléments existants au lieu de les recréer pour conserver
    // tous leurs écouteurs, leur contenu dynamique et leur accessibilité.
    const guidance = intro.querySelector('p');
    let guidanceRow = intro.querySelector('.search-guidance-row');
    if (!guidanceRow) {
      guidanceRow = document.createElement('div');
      guidanceRow.className = 'search-guidance-row';
      intro.querySelector('h2')?.insertAdjacentElement('afterend', guidanceRow);
    }
    if (guidance && guidance.parentElement !== guidanceRow) guidanceRow.appendChild(guidance);
    if (favorites.parentElement !== guidanceRow) guidanceRow.appendChild(favorites);

    // Nettoyage de la variante précédente, qui réservait une ligne entière
    // juste pour les favoris.
    stage.querySelectorAll('.search-favorites-row').forEach(row => {
      if (!row.contains(favorites)) row.remove();
    });

    // « Commencer » demeure une section du portail et reste trouvable par la
    // recherche; on retire seulement son raccourci de la barre horizontale.
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

  const nav = document.querySelector('.section-nav-inner');
  const stage = document.querySelector('.search-stage-inner');
  if (nav || stage) {
    const observer = new MutationObserver(scheduleApply);
    if (nav) observer.observe(nav, { childList: true });
    if (stage) observer.observe(stage, { childList: true, subtree: true });
  }

  // Dernière passe pour WebKit/Safari et les scripts qui terminent leur rendu
  // dans une microtâche ou juste après l'événement load.
  window.addEventListener('load', applyLayout, { once: true });
})();