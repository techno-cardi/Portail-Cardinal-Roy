(() => {
  'use strict';

  const MOBILE_QUERY = '(max-width: 820px), (pointer: coarse)';
  const SWIPE_MIN = 58;
  const AXIS_RATIO = 1.25;
  let gesture = null;
  let weekWrap = null;
  let observer = null;

  function isMobile() {
    return matchMedia(MOBILE_QUERY).matches;
  }

  function clickNav(direction) {
    const btn = document.getElementById(direction < 0 ? 'prevBtn' : 'nextBtn');
    if (btn && !btn.disabled) btn.click();
  }

  function activeView() {
    return document.querySelector('[data-view].active')?.dataset.view || '';
  }

  function atLeftEdge(el) {
    return !el || el.scrollLeft <= 3;
  }

  function atRightEdge(el) {
    return !el || (el.scrollLeft + el.clientWidth >= el.scrollWidth - 3);
  }

  function bindWeekWrap() {
    const current = document.querySelector('.week-wrap');
    if (current === weekWrap) return;
    weekWrap = current;
  }

  function onTouchStart(e) {
    if (!isMobile() || e.touches.length !== 1) return;
    bindWeekWrap();
    const t = e.touches[0];
    const target = e.target;
    const inWeek = !!target.closest('.week-wrap');
    const inDay = !!target.closest('.day-view');
    if (!inWeek && !inDay) return;

    gesture = {
      x: t.clientX,
      y: t.clientY,
      view: activeView(),
      inWeek,
      leftEdge: inWeek ? atLeftEdge(weekWrap) : false,
      rightEdge: inWeek ? atRightEdge(weekWrap) : false,
    };
  }

  function onTouchEnd(e) {
    if (!gesture || !isMobile() || !e.changedTouches.length) {
      gesture = null;
      return;
    }
    const t = e.changedTouches[0];
    const dx = t.clientX - gesture.x;
    const dy = t.clientY - gesture.y;
    const horizontal = Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * AXIS_RATIO;

    if (horizontal) {
      if (gesture.view === 'day') {
        clickNav(dx > 0 ? -1 : 1);
      } else if (gesture.view === 'week' && gesture.inWeek) {
        if (dx > 0 && gesture.leftEdge) clickNav(-1);
        if (dx < 0 && gesture.rightEdge) clickNav(1);
      }
    }
    gesture = null;
  }

  // Sur écran tactile, un simple toucher/glissement sur le numéro sert au défilement.
  // On bloque le démarrage immédiat du drag de bureau pour éviter les déplacements accidentels.
  function blockAccidentalTouchDrag(e) {
    if (!isMobile()) return;
    if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
    if (!e.target.closest('.number-badge')) return;
    e.stopImmediatePropagation();
  }

  function injectMobileHintStyles() {
    if (document.getElementById('mobileGestureStyles')) return;
    const style = document.createElement('style');
    style.id = 'mobileGestureStyles';
    style.textContent = `
      @media (max-width:820px), (pointer:coarse){
        .week-wrap{-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain}
        .number-badge{touch-action:pan-x pan-y;user-select:none;-webkit-user-select:none}
      }
    `;
    document.head.appendChild(style);
  }

  function start() {
    injectMobileHintStyles();
    document.addEventListener('pointerdown', blockAccidentalTouchDrag, true);
    document.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true, capture: true });
    observer = new MutationObserver(bindWeekWrap);
    const planner = document.getElementById('planner');
    if (planner) observer.observe(planner, { childList: true, subtree: true });
    bindWeekWrap();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
