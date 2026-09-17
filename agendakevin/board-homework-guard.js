(() => {
  'use strict';

  const DESKTOP_QUERY = '(min-width: 821px)';
  const AUTO_REVEAL = {
    p1: 9 * 60 + 20,
    p2: 10 * 60 + 50,
    p3: 12 * 60 + 20,
  };

  let activeContext = null;
  let manuallyRevealed = false;
  let frame = 0;

  function isDesktop() {
    return matchMedia(DESKTOP_QUERY).matches && !/Android/i.test(navigator.userAgent);
  }

  function localIso(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function parseCellId(id) {
    const value = String(id || '');
    const split = value.lastIndexOf(':');
    return split > 0
      ? { dateISO: value.slice(0, split), periodKey: value.slice(split + 1) }
      : null;
  }

  function isHomeworkText(text) {
    const value = String(text || '').trim();
    return /^devoirs?\s*:/i.test(value) || /^(?:à|a)\s+faire\s*:/i.test(value);
  }

  function shouldAutoReveal(now = new Date()) {
    if (!activeContext || activeContext.dateISO !== localIso(now)) return false;
    const threshold = AUTO_REVEAL[activeContext.periodKey];
    if (!Number.isFinite(threshold)) return false;
    const minute = now.getHours() * 60 + now.getMinutes();
    return minute >= threshold;
  }

  function ensureStyles() {
    if (document.getElementById('boardHomeworkGuardStyles')) return;
    const style = document.createElement('style');
    style.id = 'boardHomeworkGuardStyles';
    style.textContent = `
      @media (min-width:821px){
        #classroomBoard .cr-board-homework-line.is-hidden{display:none!important}
        #classroomBoard .cr-board-homework-toggle{
          justify-self:start;
          margin-left:1.8em;
          border:1px dashed #c4a84f;
          border-radius:10px;
          background:#fff8df;
          color:#624f1d;
          padding:9px 13px;
          font:800 clamp(.95rem,1.45vw,1.25rem)/1.15 inherit;
          cursor:pointer;
        }
        #classroomBoard .cr-board-homework-toggle:hover{background:#fff1c5;border-color:#9f8331}
      }
    `;
    document.head.appendChild(style);
  }

  function captureBoardContext(event) {
    if (!isDesktop()) return;
    const name = event.target.closest?.('.course-strip-name');
    const cell = name?.closest?.('[data-note-cell]');
    const parsed = parseCellId(cell?.dataset.noteCell || '');
    if (!parsed) return;
    activeContext = parsed;
    manuallyRevealed = false;
    scheduleApply();
  }

  function applyBoardGuard() {
    frame = 0;
    if (!isDesktop()) return;
    const board = document.getElementById('classroomBoard');
    if (!board) return;

    const lines = [...board.querySelectorAll('.cr-board-plain')].filter(line => isHomeworkText(line.textContent));
    if (!lines.length) return;

    const reveal = manuallyRevealed || shouldAutoReveal();

    let button = board.querySelector('.cr-board-homework-toggle');
    lines.forEach(line => {
      line.classList.add('cr-board-homework-line');
      line.classList.toggle('is-hidden', !reveal);
    });

    if (reveal) {
      button?.remove();
      return;
    }

    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'cr-board-homework-toggle';
      button.textContent = 'Devoir masqué · Afficher';
      button.addEventListener('click', () => {
        manuallyRevealed = true;
        scheduleApply();
      });
      lines[0].before(button);
    }
  }

  function scheduleApply() {
    if (frame) return;
    frame = requestAnimationFrame(applyBoardGuard);
  }

  function start() {
    if (!isDesktop()) return;
    ensureStyles();

    document.addEventListener('dblclick', captureBoardContext, true);
    new MutationObserver(scheduleApply).observe(document.body, { childList: true, subtree: true });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') scheduleApply();
    });
    addEventListener('resize', scheduleApply, { passive: true });
    setInterval(scheduleApply, 15000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
