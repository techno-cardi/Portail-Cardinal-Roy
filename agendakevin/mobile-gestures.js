(() => {
  'use strict';

  const MOBILE_QUERY = '(max-width: 820px), (pointer: coarse)';
  const SWIPE_MIN = 58;
  const AXIS_RATIO = 1.25;
  let gesture = null;
  let weekWrap = null;
  let observer = null;
  let shouldCenterToday = true;
  let resumeTimer = null;

  function isMobile() {
    return matchMedia(MOBILE_QUERY).matches;
  }

  function isInstalledAndroidApp() {
    return /Android/i.test(navigator.userAgent)
      && isMobile()
      && matchMedia('(display-mode: standalone)').matches;
  }

  function localIso(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
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

  function centerTodayInWeek() {
    if (!shouldCenterToday || !isInstalledAndroidApp() || activeView() !== 'week') return false;
    if (!weekWrap) return false;

    const today = weekWrap.querySelector(`.day-head[data-open-day="${localIso()}"]`);
    if (!today) return false;

    const maxScroll = Math.max(0, weekWrap.scrollWidth - weekWrap.clientWidth);
    const wanted = today.offsetLeft + (today.offsetWidth / 2) - (weekWrap.clientWidth / 2);
    weekWrap.scrollLeft = Math.max(0, Math.min(maxScroll, wanted));
    shouldCenterToday = false;
    return true;
  }

  function bindWeekWrap() {
    const current = document.querySelector('.week-wrap');
    if (current === weekWrap) {
      if (current) requestAnimationFrame(centerTodayInWeek);
      return;
    }
    weekWrap = current;
    if (weekWrap) requestAnimationFrame(centerTodayInWeek);
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

  function returnToTodayOnResume() {
    if (!isInstalledAndroidApp() || document.visibilityState !== 'visible') return;
    shouldCenterToday = true;
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => {
      const shell = document.getElementById('appShell');
      const todayBtn = document.getElementById('todayBtn');
      if (shell && !shell.hidden && todayBtn && !todayBtn.disabled) {
        todayBtn.click();
      } else {
        bindWeekWrap();
      }
    }, 80);
  }

  function start() {
    injectMobileHintStyles();
    document.addEventListener('pointerdown', blockAccidentalTouchDrag, true);
    document.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true, capture: true });
    document.addEventListener('visibilitychange', returnToTodayOnResume);
    window.addEventListener('pageshow', e => { if (e.persisted) returnToTodayOnResume(); });
    observer = new MutationObserver(bindWeekWrap);
    const planner = document.getElementById('planner');
    if (planner) observer.observe(planner, { childList: true, subtree: true });
    bindWeekWrap();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
