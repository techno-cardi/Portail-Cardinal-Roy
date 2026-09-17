(() => {
  'use strict';

  const BOARD_KEY = 'cr-planner-board-mode-v1';
  const REVEALED_KEY = 'cr-planner-board-revealed-v1';
  const DESKTOP_QUERY = '(min-width: 821px)';
  const AUTO_REVEAL = {
    p1: 9 * 60 + 20,
    p2: 10 * 60 + 50,
    p3: 12 * 60 + 20,
  };

  let boardMode = sessionStorage.getItem(BOARD_KEY) === '1';
  let revealed = loadRevealed();
  let frame = 0;
  let observer = null;
  let clockTimer = 0;

  function isDesktop() {
    return matchMedia(DESKTOP_QUERY).matches && !/Android/i.test(navigator.userAgent);
  }

  function loadRevealed() {
    try {
      return new Set(JSON.parse(sessionStorage.getItem(REVEALED_KEY) || '[]'));
    } catch {
      return new Set();
    }
  }

  function saveRevealed() {
    sessionStorage.setItem(REVEALED_KEY, JSON.stringify([...revealed]));
  }

  function localIso(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function cellIdFor(block) {
    return block.closest('[data-note-cell]')?.dataset.noteCell || '';
  }

  function splitCellId(id) {
    const i = id.lastIndexOf(':');
    return i > 0 ? [id.slice(0, i), id.slice(i + 1)] : ['', ''];
  }

  function homeworkKind(text) {
    const normalized = String(text || '').trim();
    if (/^devoirs?\s*:/i.test(normalized)) return 'Devoir';
    if (/^rappel\s*:/i.test(normalized)) return 'Rappel';
    if (/^(?:à|a)\s+faire\s*:/i.test(normalized)) return 'À faire';
    return '';
  }

  function shouldAutoReveal(cellId, now = new Date()) {
    const [dateISO, periodKey] = splitCellId(cellId);
    if (!dateISO || dateISO !== localIso(now)) return false;
    const threshold = AUTO_REVEAL[periodKey];
    if (!Number.isFinite(threshold)) return false;
    const minute = now.getHours() * 60 + now.getMinutes();
    return minute >= threshold;
  }

  function ensureStyles() {
    if (document.getElementById('boardHomeworkStyles')) return;
    const style = document.createElement('style');
    style.id = 'boardHomeworkStyles';
    style.textContent = `
      #boardModeBtn{display:none}
      @media (min-width:821px){
        #boardModeBtn{display:inline-flex;align-items:center;justify-content:center}
        #boardModeBtn.active{background:#07577f;color:#fff;border-color:#07577f;box-shadow:0 4px 14px rgba(7,87,127,.22)}
        body.board-mode-active .board-homework-block.board-homework-hidden .block-text{display:none!important}
        body.board-mode-active .board-homework-block.board-homework-hidden{min-height:42px;display:flex;align-items:center}
        .board-homework-reveal{
          display:none;
          width:100%;
          min-height:38px;
          border:1px dashed #c7a84b;
          border-radius:10px;
          background:#fff9e8;
          color:#66511b;
          font:800 .84rem/1.2 inherit;
          cursor:pointer;
          padding:8px 11px;
          text-align:left;
        }
        body.board-mode-active .board-homework-block.board-homework-hidden>.board-homework-reveal{display:block}
        .board-homework-reveal:hover{background:#fff4cf;border-color:#a98a31}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureButton() {
    let button = document.getElementById('boardModeBtn');
    if (button) return button;
    const actions = document.querySelector('.header-actions');
    if (!actions) return null;
    button = document.createElement('button');
    button.id = 'boardModeBtn';
    button.type = 'button';
    button.className = 'header-course-button';
    button.textContent = 'Tableau';
    button.title = 'Mode tableau : masquer les devoirs jusqu’à la fin du cours';
    button.setAttribute('aria-pressed', boardMode ? 'true' : 'false');
    const course = document.getElementById('courseListBtn');
    actions.insertBefore(button, course || actions.firstChild);
    button.addEventListener('click', () => {
      boardMode = !boardMode;
      sessionStorage.setItem(BOARD_KEY, boardMode ? '1' : '0');
      if (!boardMode) {
        revealed.clear();
        saveRevealed();
      }
      applyBoardMode();
    });
    return button;
  }

  function cleanupBlock(block) {
    block.classList.remove('board-homework-block', 'board-homework-hidden');
    block.querySelector(':scope > .board-homework-reveal')?.remove();
  }

  function protectBlock(block, now) {
    const textEl = block.querySelector(':scope > .block-text');
    if (!textEl) return;
    const kind = homeworkKind(textEl.textContent);
    if (!kind) {
      cleanupBlock(block);
      return;
    }

    const cellId = cellIdFor(block);
    const visible = revealed.has(cellId) || shouldAutoReveal(cellId, now);
    block.classList.add('board-homework-block');
    block.classList.toggle('board-homework-hidden', !visible);

    let button = block.querySelector(':scope > .board-homework-reveal');
    if (visible) {
      button?.remove();
      return;
    }

    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'board-homework-reveal';
      block.insertBefore(button, textEl);
      button.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        const id = cellIdFor(block);
        if (id) {
          revealed.add(id);
          saveRevealed();
        }
        scheduleApply();
      });
    }
    button.textContent = `${kind} masqué · Afficher`;
  }

  function applyBoardMode() {
    frame = 0;
    const desktop = isDesktop();
    const button = ensureButton();
    const active = desktop && boardMode;
    document.body.classList.toggle('board-mode-active', active);
    if (button) {
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
      button.title = active
        ? 'Mode tableau actif : les devoirs sont masqués'
        : 'Activer le mode tableau';
    }

    const blocks = [...document.querySelectorAll('#planner .editor-block')];
    if (!active) {
      blocks.forEach(cleanupBlock);
      return;
    }

    const now = new Date();
    blocks.forEach(block => protectBlock(block, now));
  }

  function scheduleApply() {
    if (frame) return;
    frame = requestAnimationFrame(applyBoardMode);
  }

  function start() {
    ensureStyles();
    ensureButton();
    scheduleApply();

    const planner = document.getElementById('planner');
    if (planner) {
      observer = new MutationObserver(scheduleApply);
      observer.observe(planner, { childList: true, subtree: true, characterData: true });
    }

    addEventListener('resize', scheduleApply, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') scheduleApply();
    });
    clockTimer = window.setInterval(scheduleApply, 30000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
