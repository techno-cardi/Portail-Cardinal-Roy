(() => {
  'use strict';

  const MOBILE_QUERY = '(max-width: 820px), (pointer: coarse)';
  const PERIOD_END = { p1: 570, p2: 660, p3: 750, p4: 840, p5: 930, pm: 990 };
  let pending = true;
  let timer = 0;

  function isAndroidPwa() {
    return /Android/i.test(navigator.userAgent)
      && matchMedia(MOBILE_QUERY).matches
      && matchMedia('(display-mode: standalone)').matches;
  }

  function iso(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function tomorrow(date = new Date()) {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    return next;
  }

  function activeWeekView() {
    return document.querySelector('[data-view="week"].active') && document.querySelector('.week-wrap');
  }

  function header(dateISO) {
    return document.querySelector(`.week-wrap .day-head[data-open-day="${dateISO}"]`);
  }

  function isSchoolDay(dateISO) {
    const day = header(dateISO);
    return Boolean(day && !day.classList.contains('special'));
  }

  function teachingCells(dateISO) {
    return [...document.querySelectorAll(`.week-wrap [data-note-cell^="${dateISO}:"]`)]
      .filter(cell => cell.querySelector('.course-strip.has-course'));
  }

  function periodKey(cell) {
    const id = String(cell?.dataset.noteCell || '');
    return id.slice(id.lastIndexOf(':') + 1);
  }

  function chooseTarget(now = new Date()) {
    const todayISO = iso(now);
    if (!isSchoolDay(todayISO)) return null;

    const minute = now.getHours() * 60 + now.getMinutes();
    const remaining = teachingCells(todayISO).find(cell => minute < (PERIOD_END[periodKey(cell)] ?? -1));
    if (remaining) return { dateISO: todayISO, cell: remaining };

    const tomorrowISO = iso(tomorrow(now));
    if (!isSchoolDay(tomorrowISO)) return null;
    const firstTomorrow = teachingCells(tomorrowISO)[0];
    return firstTomorrow ? { dateISO: tomorrowISO, cell: firstTomorrow } : null;
  }

  function centerDate(dateISO) {
    const wrap = document.querySelector('.week-wrap');
    const day = header(dateISO);
    if (!wrap || !day) return false;
    const wanted = day.offsetLeft + day.offsetWidth / 2 - wrap.clientWidth / 2;
    wrap.scrollLeft = Math.max(0, Math.min(wrap.scrollWidth - wrap.clientWidth, wanted));
    return true;
  }

  function centerPeriod(cell) {
    const toolbar = document.querySelector('.toolbar');
    const toolbarHeight = toolbar?.getBoundingClientRect().height || 0;
    const top = window.scrollY + cell.getBoundingClientRect().top - toolbarHeight - 68;
    window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
  }

  function position() {
    if (!pending || !isAndroidPwa() || !activeWeekView()) return false;
    const target = chooseTarget();
    if (!target) {
      const todayISO = iso();
      if (isSchoolDay(todayISO)) centerDate(todayISO);
      pending = false;
      return false;
    }
    centerDate(target.dateISO);
    centerPeriod(target.cell);
    pending = false;
    return true;
  }

  function schedule(delay = 0) {
    clearTimeout(timer);
    timer = setTimeout(() => requestAnimationFrame(position), delay);
  }

  function onResume() {
    if (!isAndroidPwa() || document.visibilityState !== 'visible') return;
    pending = true;
    schedule(220);
  }

  function start() {
    if (!isAndroidPwa()) return;
    const planner = document.getElementById('planner');
    if (planner) new MutationObserver(() => schedule()).observe(planner, { childList: true, subtree: true });
    document.addEventListener('visibilitychange', onResume);
    window.addEventListener('pageshow', () => { pending = true; schedule(120); });
    schedule(120);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
