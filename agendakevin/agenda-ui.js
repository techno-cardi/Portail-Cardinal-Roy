(() => {
  'use strict';

  function removeUnusedPM() {
    document.querySelectorAll('[data-note-cell$=":pm"]').forEach(el => el.remove());
    document.querySelectorAll('.period-side').forEach(el => {
      const label = el.querySelector('strong')?.textContent?.trim().toUpperCase() || '';
      if (label === 'PÉRIODE PM' || label === 'PERIODE PM') el.remove();
    });
  }

  function start() {
    const planner = document.getElementById('planner');
    if (!planner) return;
    removeUnusedPM();
    new MutationObserver(removeUnusedPM).observe(planner, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
