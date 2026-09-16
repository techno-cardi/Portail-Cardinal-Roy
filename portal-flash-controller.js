(() => {
  'use strict';

  const ACTIVE_CLASS = 'portal-search-pulse';
  const FLASH_MS = 2850;
  let pulseSequence = 0;
  let navigationSequence = 0;
  let hashTimer = 0;
  const cleanupTimers = new WeakMap();

  const visualTarget = target => {
    if (!(target instanceof Element)) return null;
    if (target.classList.contains('category-section')) return target.querySelector('.category-heading') || target;
    return target;
  };

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
    target = visualTarget(target);
    if (!target) return;

    clearAll(target);
    clearTarget(target);
    void target.offsetWidth;

    const current = ++pulseSequence;
    target.dataset.portalFlashSequence = String(current);
    window.requestAnimationFrame(() => {
      target.classList.add(ACTIVE_CLASS);
      const timer = window.setTimeout(() => {
        if (target.dataset.portalFlashSequence === String(current)) target.classList.remove(ACTIVE_CLASS);
        cleanupTimers.delete(target);
      }, FLASH_MS);
      cleanupTimers.set(target, timer);
    });
  };

  const scrollAndFlash = (target, block = 'start') => {
    if (!(target instanceof Element)) return;
    const pulseTarget = visualTarget(target);
    const navigation = ++navigationSequence;
    let finished = false;
    let fallback = 0;

    const finish = () => {
      if (finished) return;
      finished = true;
      window.removeEventListener('scrollend', finish);
      if (fallback) window.clearTimeout(fallback);
      if (navigation === navigationSequence) restartFlash(pulseTarget);
    };

    if ('onscrollend' in window) window.addEventListener('scrollend', finish, { once:true });
    target.scrollIntoView({ behavior:'smooth', block });
    fallback = window.setTimeout(finish, 850);
  };

  const resolveHashTarget = hash => {
    const raw = String(hash || '').replace(/^#/, '');
    if (!raw) return null;
    let id = raw;
    try { id = decodeURIComponent(raw); } catch {}
    return visualTarget(document.getElementById(id));
  };

  const flashCurrentHashAfterNavigation = (delay = 120) => {
    if (hashTimer) window.clearTimeout(hashTimer);
    hashTimer = window.setTimeout(() => {
      hashTimer = 0;
      const target = resolveHashTarget(location.hash);
      if (target) restartFlash(target);
    }, delay);
  };

  window.addEventListener('hashchange', () => flashCurrentHashAfterNavigation(120));

  document.addEventListener('click', event => {
    if (event.target.closest('#back-to-top')) {
      clearAll();
      return;
    }
    const summary = event.target.closest('.procedure > summary');
    if (summary?.parentElement) window.setTimeout(() => restartFlash(summary.parentElement), 40);
  }, true);

  window.PORTAL_FLASH_TARGET = restartFlash;
  window.PORTAL_SCROLL_AND_FLASH = scrollAndFlash;
  window.PORTAL_FLASH_HASH = flashCurrentHashAfterNavigation;
  window.PORTAL_CLEAR_FLASH = clearAll;
  window.PORTAL_FLASH_CLASS = ACTIVE_CLASS;
})();