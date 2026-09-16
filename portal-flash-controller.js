(() => {
  'use strict';

  const LEGACY_CLASS = 'portal-search-flash';
  const ACTIVE_CLASS = 'portal-search-pulse';
  const FLASH_MS = 2850;
  let sequence = 0;
  let navigationTimer = 0;
  const cleanupTimers = new WeakMap();

  const clearTarget = target => {
    if (!(target instanceof Element)) return;
    const timer = cleanupTimers.get(target);
    if (timer) window.clearTimeout(timer);
    cleanupTimers.delete(target);
    target.classList.remove(ACTIVE_CLASS);
  };

  const clearAll = except => {
    document.querySelectorAll(`.${ACTIVE_CLASS}`).forEach(node => {
      if (node !== except) clearTarget(node);
    });
  };

  const restartFlash = target => {
    if (!(target instanceof Element)) return;

    clearAll(target);
    clearTarget(target);

    // Un seul reflow, puis un seul frame. Ça évite le double départ visible
    // qu’on avait quand history.replaceState et le moteur de recherche relançaient
    // tous les deux l’animation presque au même moment.
    void target.offsetWidth;
    const current = ++sequence;
    target.dataset.portalFlashSequence = String(current);

    window.requestAnimationFrame(() => {
      target.classList.add(ACTIVE_CLASS);
      const timer = window.setTimeout(() => {
        if (target.dataset.portalFlashSequence === String(current)) {
          target.classList.remove(ACTIVE_CLASS);
        }
        cleanupTimers.delete(target);
      }, FLASH_MS);
      cleanupTimers.set(target, timer);
    });
  };

  const resolveHashTarget = hash => {
    const raw = String(hash || '').replace(/^#/, '');
    if (!raw) return null;
    let id = raw;
    try { id = decodeURIComponent(raw); } catch {}
    const node = document.getElementById(id);
    if (!node) return null;
    if (node.classList.contains('category-section')) {
      return node.querySelector('.category-heading') || node;
    }
    return node;
  };

  const flashCurrentHashAfterNavigation = (delay = 120) => {
    if (navigationTimer) window.clearTimeout(navigationTimer);
    navigationTimer = window.setTimeout(() => {
      navigationTimer = 0;
      const target = resolveHashTarget(location.hash);
      if (target) restartFlash(target);
    }, delay);
  };

  // Les anciennes routines de recherche ajoutent encore portal-search-flash.
  // On l’utilise seulement comme signal et on fait vivre la vraie animation sur
  // une classe séparée. Ainsi, leurs vieux setTimeout ne peuvent plus couper une
  // nouvelle impulsion lancée quelques instants plus tard.
  const observer = new MutationObserver(records => {
    for (const record of records) {
      const target = record.target;
      if (!(target instanceof Element)) continue;
      if (target.classList.contains(LEGACY_CLASS)) restartFlash(target);
    }
  });
  observer.observe(document.documentElement, {
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  });

  // Les liens de catégorie changent réellement le hash; une seule impulsion est
  // donc lancée ici. On ne surcharge plus history.replaceState/pushState.
  window.addEventListener('hashchange', () => flashCurrentHashAfterNavigation(120));

  document.addEventListener('click', event => {
    const backToTop = event.target.closest('#back-to-top');
    if (backToTop) {
      clearAll();
      return;
    }

    const summary = event.target.closest('.procedure > summary');
    if (summary?.parentElement) {
      window.setTimeout(() => restartFlash(summary.parentElement), 40);
    }
  }, true);

  window.PORTAL_FLASH_TARGET = restartFlash;
  window.PORTAL_FLASH_HASH = flashCurrentHashAfterNavigation;
  window.PORTAL_FLASH_CLASS = ACTIVE_CLASS;
})();
