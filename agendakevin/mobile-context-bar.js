(() => {
  'use strict';

  const MOBILE_QUERY = '(max-width: 820px), (pointer: coarse)';
  const PERIODS = [
    ['p1', 'P1'],
    ['p2', 'P2'],
    ['p3', 'P3'],
  ];

  let bar = null;
  let frame = 0;
  let weekWrap = null;

  function isAndroidPwa() {
    return /Android/i.test(navigator.userAgent)
      && matchMedia(MOBILE_QUERY).matches
      && matchMedia('(display-mode: standalone)').matches;
  }

  function activeWeekView() {
    return Boolean(document.querySelector('[data-view="week"].active') && document.querySelector('.week-wrap'));
  }

  function shortDate(dateISO) {
    const [y, m, d] = dateISO.split('-').map(Number);
    const date = new Date(y, m - 1, d, 12);
    const weekday = new Intl.DateTimeFormat('fr-CA', { weekday: 'short' }).format(date).replace('.', '');
    const month = new Intl.DateTimeFormat('fr-CA', { month: 'short' }).format(date).replace('.', '');
    return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${d} ${month}`;
  }

  function ensureBar() {
    if (bar) return bar;
    bar = document.createElement('div');
    bar.id = 'mobileAgendaContext';
    bar.setAttribute('aria-hidden', 'true');
    bar.innerHTML = `
      <div class="mobile-context-main">
        <span class="mobile-context-date"></span>
        <span class="mobile-context-sep">·</span>
        <strong class="mobile-context-period"></strong>
        <span class="mobile-context-course"></span>
      </div>
      <div class="mobile-context-periods"></div>
    `;
    document.body.appendChild(bar);
    return bar;
  }

  function injectStyles() {
    if (document.getElementById('mobileAgendaContextStyles')) return;
    const style = document.createElement('style');
    style.id = 'mobileAgendaContextStyles';
    style.textContent = `
      #mobileAgendaContext{display:none}
      @media (max-width:820px), (pointer:coarse){
        #mobileAgendaContext{
          position:fixed;
          left:10px;
          right:10px;
          z-index:29;
          padding:6px 9px 7px;
          border:1px solid rgba(170,191,203,.8);
          border-radius:11px;
          background:rgba(249,252,253,.94);
          box-shadow:0 5px 18px rgba(20,58,79,.12);
          backdrop-filter:blur(9px);
          -webkit-backdrop-filter:blur(9px);
          color:#173246;
          pointer-events:none;
          opacity:0;
          transform:translateY(-5px);
          transition:opacity .12s ease,transform .12s ease;
        }
        #mobileAgendaContext.show{display:block;opacity:1;transform:none}
        .mobile-context-main{display:flex;align-items:baseline;gap:5px;min-width:0;white-space:nowrap}
        .mobile-context-date{font-size:.76rem;font-weight:800;color:#36586d}
        .mobile-context-sep{font-size:.72rem;color:#93a5b0}
        .mobile-context-period{font-size:.82rem;color:#07577f}
        .mobile-context-course{margin-left:auto;min-width:0;overflow:hidden;text-overflow:ellipsis;font-size:.74rem;font-weight:800;color:#385a6d}
        .mobile-context-course.free{font-weight:650;color:#9aa8b0}
        .mobile-context-periods{display:flex;align-items:center;justify-content:space-around;gap:8px;margin-top:4px}
        .mobile-context-chip{min-width:42px;padding:2px 8px;border-radius:999px;text-align:center;font-size:.66rem;font-weight:750;line-height:1.15;color:#9aa8b0;border:1px solid transparent}
        .mobile-context-chip.teaching{color:#426579;background:rgba(218,235,244,.62)}
        .mobile-context-chip.active{color:#fff;background:#07577f;border-color:#07577f;font-weight:850}
      }
    `;
    document.head.appendChild(style);
  }

  function currentDateISO(wrap) {
    const wrapRect = wrap.getBoundingClientRect();
    const centerX = (wrapRect.left + wrapRect.right) / 2;
    const headers = [...wrap.querySelectorAll('.day-head[data-open-day]')];
    if (!headers.length) return '';
    return headers
      .map(node => {
        const rect = node.getBoundingClientRect();
        return { node, distance: Math.abs((rect.left + rect.right) / 2 - centerX) };
      })
      .sort((a, b) => a.distance - b.distance)[0].node.dataset.openDay || '';
  }

  function cellsForDate(wrap, dateISO) {
    return [...wrap.querySelectorAll(`[data-note-cell^="${dateISO}:"]`)];
  }

  function keyForCell(cell) {
    const id = String(cell?.dataset.noteCell || '');
    return id.slice(id.lastIndexOf(':') + 1);
  }

  function visiblePeriodCell(cells, probeY) {
    const containing = cells.find(cell => {
      const rect = cell.getBoundingClientRect();
      return rect.top <= probeY && rect.bottom > probeY;
    });
    if (containing) return containing;

    const visible = cells.filter(cell => {
      const rect = cell.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < innerHeight;
    });
    if (!visible.length) return null;

    return visible
      .map(cell => ({ cell, distance: Math.abs(cell.getBoundingClientRect().top - probeY) }))
      .sort((a, b) => a.distance - b.distance)[0].cell;
  }

  function headerStillProvidesContext(dateISO, toolbarBottom) {
    const header = document.querySelector(`.week-wrap .day-head[data-open-day="${dateISO}"]`);
    if (!header) return false;
    const rect = header.getBoundingClientRect();
    return rect.bottom > toolbarBottom + 12;
  }

  function render() {
    frame = 0;
    if (!isAndroidPwa() || !activeWeekView()) {
      bar?.classList.remove('show');
      return;
    }

    weekWrap = document.querySelector('.week-wrap');
    if (!weekWrap) return;

    const toolbar = document.querySelector('.toolbar');
    const toolbarRect = toolbar?.getBoundingClientRect();
    const toolbarBottom = Math.max(8, toolbarRect?.bottom || 8);
    const dateISO = currentDateISO(weekWrap);
    if (!dateISO) return;

    if (headerStillProvidesContext(dateISO, toolbarBottom)) {
      bar?.classList.remove('show');
      return;
    }

    const context = ensureBar();
    context.style.top = `${Math.round(toolbarBottom + 6)}px`;
    context.classList.add('show');

    const barHeight = context.getBoundingClientRect().height || 48;
    const probeY = Math.min(innerHeight - 20, toolbarBottom + barHeight + 18);
    const cells = cellsForDate(weekWrap, dateISO);
    const cell = visiblePeriodCell(cells, probeY);
    if (!cell) {
      context.classList.remove('show');
      return;
    }

    const key = keyForCell(cell);
    const label = PERIODS.find(([periodKey]) => periodKey === key)?.[1] || key.toUpperCase();
    const courseNode = cell.querySelector('.course-strip.has-course');
    const course = String(courseNode?.textContent || '').trim();

    context.querySelector('.mobile-context-date').textContent = shortDate(dateISO);
    context.querySelector('.mobile-context-period').textContent = label;
    const courseEl = context.querySelector('.mobile-context-course');
    courseEl.textContent = course || 'Libre';
    courseEl.classList.toggle('free', !course);

    const teaching = new Set(cells
      .filter(item => item.querySelector('.course-strip.has-course'))
      .map(keyForCell));

    context.querySelector('.mobile-context-periods').innerHTML = PERIODS.map(([periodKey, periodLabel]) => {
      const classes = ['mobile-context-chip'];
      if (teaching.has(periodKey)) classes.push('teaching');
      if (periodKey === key) classes.push('active');
      return `<span class="${classes.join(' ')}">${periodLabel}</span>`;
    }).join('');
  }

  function schedule() {
    if (frame) return;
    frame = requestAnimationFrame(render);
  }

  function bindWeekWrap() {
    const current = document.querySelector('.week-wrap');
    if (current === weekWrap) return;
    if (weekWrap) weekWrap.removeEventListener('scroll', schedule);
    weekWrap = current;
    if (weekWrap) weekWrap.addEventListener('scroll', schedule, { passive: true });
  }

  function start() {
    if (!isAndroidPwa()) return;
    injectStyles();
    bindWeekWrap();
    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', schedule, { passive: true });
    document.addEventListener('visibilitychange', schedule);
    const planner = document.getElementById('planner');
    if (planner) {
      new MutationObserver(() => {
        bindWeekWrap();
        schedule();
      }).observe(planner, { childList: true, subtree: true });
    }
    schedule();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();