(() => {
  const VERSION = '1.0';
  let scheduled = false;

  const ensureStyles = () => {
    if (document.querySelector('link[data-home-compact],link[data-home-compact-style],link[href$="home-compact.css"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'home-compact.css';
    link.dataset.homeCompactStyle = 'true';
    document.head.appendChild(link);
  };

  const applyLayout = () => {
    const stage = document.querySelector('.search-stage-inner');
    const searchShell = stage?.querySelector('.search-shell');
    const favorites = document.getElementById('favorites-jump');
    const nav = document.querySelector('.section-nav-inner');
    if (!stage || !searchShell || !favorites || !nav) return false;

    // Le bouton « Mes favoris » reste le même élément DOM : ses écouteurs et
    // son compteur continuent donc de fonctionner après le déplacement.
    let favoriteRow = stage.querySelector('.search-favorites-row');
    if (!favoriteRow) {
      favoriteRow = document.createElement('div');
      favoriteRow.className = 'search-favorites-row';
      favoriteRow.setAttribute('aria-label', 'Accès aux favoris');
      searchShell.insertAdjacentElement('beforebegin', favoriteRow);
    }
    if (favorites.parentElement !== favoriteRow) favoriteRow.appendChild(favorites);

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
    if (stage) observer.observe(stage, { childList: true });
  }

  // Une dernière passe couvre WebKit/Safari et les scripts qui terminent leur
  // rendu dans une microtâche ou juste après l'événement load.
  window.addEventListener('load', applyLayout, { once: true });
})();
