(() => {
  'use strict';

  const CLASS_NAME = 'portal-search-flash';
  const FLASH_MS = 2900;
  const NAVIGATION_DELAY_MS = 900;
  let sequence = 0;
  let navigationTimer = 0;
  const cleanupTimers = new WeakMap();

  const clearTarget = target => {
    if (!(target instanceof Element)) return;
    const timer = cleanupTimers.get(target);
    if (timer) window.clearTimeout(timer);
    cleanupTimers.delete(target);
    target.classList.remove(CLASS_NAME);
    target.style.removeProperty('animation');
  };

  const restartFlash = target => {
    if (!(target instanceof Element)) return;

    // Une seule impulsion active à la fois. On enlève aussi toute ancienne
    // animation afin qu'un deuxième, troisième, dixième clic puisse toujours
    // repartir de 0 sans recharger la page.
    document.querySelectorAll(`.${CLASS_NAME}`).forEach(clearTarget);
    clearTarget(target);

    target.style.setProperty('animation', 'none', 'important');
    void target.offsetWidth;
    target.style.removeProperty('animation');

    const current = ++sequence;
    target.dataset.portalFlashSequence = String(current);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        target.classList.add(CLASS_NAME);
        const timer = window.setTimeout(() => {
          if (target.dataset.portalFlashSequence === String(current)) {
            target.classList.remove(CLASS_NAME);
          }
          cleanupTimers.delete(target);
        }, FLASH_MS);
        cleanupTimers.set(target, timer);
      });
    });
  };

  const resolveHashTarget = hash => {
    const raw = String(hash || '').replace(/^#/, '');
    if (!raw) return null;
    let id = raw;
    try { id = decodeURIComponent(raw); } catch {}
    const node = document.getElementById(id);
    if (!node) return null;

    // Pour une catégorie, on fait pulser son en-tête plutôt que toute la
    // section verticale, ce qui conserve l'effet compact et arrondi.
    if (node.classList.contains('category-section')) {
      return node.querySelector('.category-heading') || node;
    }
    return node;
  };

  const flashCurrentHashAfterNavigation = (delay = NAVIGATION_DELAY_MS) => {
    if (navigationTimer) window.clearTimeout(navigationTimer);
    navigationTimer = window.setTimeout(() => {
      navigationTimer = 0;
      const target = resolveHashTarget(location.hash);
      if (target) restartFlash(target);
    }, delay);
  };

  // Les moteurs du portail utilisent history.replaceState pour ouvrir une
  // ressource. replaceState ne déclenche pas hashchange, donc on centralise ici
  // la relance du halo pour chaque navigation interne.
  if (!history.__portalFlashWrapped) {
    const originalReplaceState = history.replaceState.bind(history);
    const originalPushState = history.pushState.bind(history);

    history.replaceState = (...args) => {
      const result = originalReplaceState(...args);
      if (location.hash) flashCurrentHashAfterNavigation();
      return result;
    };
    history.pushState = (...args) => {
      const result = originalPushState(...args);
      if (location.hash) flashCurrentHashAfterNavigation();
      return result;
    };
    Object.defineProperty(history, '__portalFlashWrapped', { value: true });
  }

  // Navigation native par ancre.
  window.addEventListener('hashchange', () => flashCurrentHashAfterNavigation(120));

  // Clic manuel sur une fiche dans le répertoire : chaque nouvelle sélection
  // doit aussi produire l'impulsion, même sans passer par la recherche.
  document.addEventListener('click', event => {
    const summary = event.target.closest('.procedure > summary');
    if (summary?.parentElement) {
      window.setTimeout(() => restartFlash(summary.parentElement), 40);
    }
  }, true);

  // Point d'entrée public pour les futurs scripts du portail.
  window.PORTAL_FLASH_TARGET = restartFlash;
  window.PORTAL_FLASH_HASH = flashCurrentHashAfterNavigation;
})();
