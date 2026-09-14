(() => {
  'use strict';

  function removeUnusedPM() {
    document.querySelectorAll('[data-note-cell$=":pm"]').forEach(el => el.remove());
    document.querySelectorAll('.period-side').forEach(el => {
      const label = el.querySelector('strong')?.textContent?.trim().toUpperCase() || '';
      if (label === 'PÉRIODE PM' || label === 'PERIODE PM') el.remove();
    });
  }

  function cleanCourseListLabels() {
    document.querySelectorAll('.cl-title strong').forEach(el => {
      if (/^Cours #\? - /.test(el.textContent || '')) {
        el.textContent = (el.textContent || '').replace(/^Cours #\? - /, 'Cours sans numéro - ');
      }
    });
  }

  function tidy() {
    removeUnusedPM();
    cleanCourseListLabels();
  }

  function start() {
    tidy();
    new MutationObserver(tidy).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
