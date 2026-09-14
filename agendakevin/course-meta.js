(() => {
  'use strict';

  const API_URL = 'https://ojyswaxuqwnqilrvtjll.supabase.co/functions/v1/planner-api';
  const ACCESS_STORAGE = 'cr-planner-access-v1';
  const SCHOOL_START = '2026-08-24';
  const SCHOOL_END = '2027-06-24';
  const CAL_CACHE = 'cr-planif-course-calendar-v2';
  const CACHE_MAX_AGE = 24 * 60 * 60 * 1000;

  // Couleurs exactes des événements Google Agenda « Horaire Cardinal-Roy ».
  // FRA3SE-31 = colorId 2, FRA3SE-32 = colorId 7, FRA5SE-51 = colorId 5.
  const COURSE_META = {
    'FRA3SE-31': { color: '#7ae7bf', anchorDate: '2026-09-11', anchorNumber: 8 },
    'FRA3SE-32': { color: '#46d6db', anchorDate: '2026-09-11', anchorNumber: 8 },
    'FRA5SE-51': { color: '#fbd75b', anchorDate: '2026-09-10', anchorNumber: 5 },
  };

  // Exceptions historiques du groupe 32 :
  // - le 2 septembre a été publié comme cours #5;
  // - le cours du 4 septembre (Fête de la rentrée) n'a pas reçu de numéro.
  const COURSE_NUMBER_OVERRIDES = {
    'FRA3SE-32': {
      '2026-09-02': 5,
      '2026-09-04': null,
    },
  };

  const COURSES = {
    1:  { p1: 'FRA3SE-32', p3: 'FRA3SE-31' },
    2:  { p1: 'FRA3SE-32', p3: 'FRA5SE-51' },
    3:  { p1: 'FRA3SE-31', p3: 'FRA3SE-32' },
    4:  { p1: 'FRA3SE-32', p3: 'FRA5SE-51' },
    5:  { p3: 'FRA3SE-31' },
    6:  { p1: 'FRA5SE-51', p2: 'FRA3SE-31', p3: 'FRA3SE-32' },
    7:  { p1: 'FRA3SE-31', p2: 'FRA3SE-32' },
    8:  { p1: 'FRA5SE-51', p2: 'FRA3SE-31' },
    9:  { p1: 'FRA5SE-51', p2: 'FRA3SE-31', p3: 'FRA3SE-32' },
    10: { p1: 'FRA3SE-31', p2: 'FRA3SE-32' },
    11: { p1: 'FRA3SE-32', p2: 'FRA5SE-51', p3: 'FRA3SE-31' },
    12: { p1: 'FRA3SE-32', p2: 'FRA5SE-51' },
    13: { p1: 'FRA3SE-31', p2: 'FRA5SE-51' },
    14: { p2: 'FRA3SE-31' },
    15: { p2: 'FRA3SE-32', p3: 'FRA5SE-51' },
    16: { p2: 'FRA3SE-32', p3: 'FRA3SE-31' },
    17: { p3: 'FRA5SE-51' },
    18: { p2: 'FRA3SE-32', p3: 'FRA3SE-31' },
  };

  let calendar = [];
  let loadingCalendar = null;
  let applyQueued = false;
  const numberCache = new Map();

  function groupSlot(rec, group) {
    if (!rec || rec.day_kind !== 'school' || !rec.cycle_day) return null;
    const entries = Object.entries(COURSES[rec.cycle_day] || {});
    const hit = entries.find(([, value]) => value === group);
    return hit ? hit[0] : null;
  }

  function groupOnDay(rec, group) {
    return !!groupSlot(rec, group);
  }

  async function fetchWholeSchoolCalendar(key) {
    const url = new URL(API_URL);
    url.searchParams.set('action', 'calendar');
    url.searchParams.set('from', SCHOOL_START);
    url.searchParams.set('to', SCHOOL_END);
    const res = await fetch(url, {
      headers: { 'x-planner-key': key },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Calendrier indisponible (${res.status})`);
    const data = await res.json();
    return (data.calendar || []).sort((a, b) => a.plan_date.localeCompare(b.plan_date));
  }

  async function ensureCalendar({ force = false } = {}) {
    if (calendar.length && !force) return calendar;
    if (loadingCalendar) return loadingCalendar;

    if (!force) {
      try {
        const cached = JSON.parse(localStorage.getItem(CAL_CACHE) || 'null');
        if (cached?.savedAt && Date.now() - cached.savedAt < CACHE_MAX_AGE && Array.isArray(cached.rows) && cached.rows.length) {
          calendar = cached.rows;
          return calendar;
        }
      } catch { /* cache invalide : on recharge */ }
    }

    const key = localStorage.getItem(ACCESS_STORAGE) || '';
    if (!key) return [];

    loadingCalendar = fetchWholeSchoolCalendar(key)
      .then(rows => {
        calendar = rows;
        numberCache.clear();
        try { localStorage.setItem(CAL_CACHE, JSON.stringify({ savedAt: Date.now(), rows })); } catch { }
        return rows;
      })
      .catch(() => [])
      .finally(() => { loadingCalendar = null; });
    return loadingCalendar;
  }

  function courseNumber(group, dateISO) {
    const meta = COURSE_META[group];
    if (!meta || !calendar.length) return null;
    const cacheKey = `${group}:${dateISO}`;
    if (numberCache.has(cacheKey)) return numberCache.get(cacheKey);

    const overrides = COURSE_NUMBER_OVERRIDES[group];
    if (overrides && Object.prototype.hasOwnProperty.call(overrides, dateISO)) {
      const value = overrides[dateISO];
      numberCache.set(cacheKey, value);
      return value;
    }

    let number = meta.anchorNumber;
    if (dateISO > meta.anchorDate) {
      for (const rec of calendar) {
        if (rec.plan_date <= meta.anchorDate || rec.plan_date > dateISO) continue;
        if (groupOnDay(rec, group)) number += 1;
      }
    } else if (dateISO < meta.anchorDate) {
      for (const rec of calendar) {
        if (rec.plan_date <= dateISO || rec.plan_date > meta.anchorDate) continue;
        if (groupOnDay(rec, group)) number -= 1;
      }
    }
    numberCache.set(cacheKey, number);
    return number;
  }

  async function nextCourse(group, afterDateISO, { includeSame = false } = {}) {
    await ensureCalendar();
    const start = String(afterDateISO || SCHOOL_START);
    for (const rec of calendar) {
      if (includeSame ? rec.plan_date < start : rec.plan_date <= start) continue;
      const periodKey = groupSlot(rec, group);
      if (!periodKey) continue;
      return {
        group,
        date: rec.plan_date,
        periodKey,
        cycleDay: rec.cycle_day,
        courseNumber: courseNumber(group, rec.plan_date),
      };
    }
    return null;
  }

  async function previousCourse(group, beforeDateISO) {
    await ensureCalendar();
    for (let i = calendar.length - 1; i >= 0; i -= 1) {
      const rec = calendar[i];
      if (rec.plan_date >= beforeDateISO) continue;
      const periodKey = groupSlot(rec, group);
      if (!periodKey) continue;
      return {
        group,
        date: rec.plan_date,
        periodKey,
        cycleDay: rec.cycle_day,
        courseNumber: courseNumber(group, rec.plan_date),
      };
    }
    return null;
  }

  function courseAt(dateISO, periodKey) {
    const rec = calendar.find(r => r.plan_date === dateISO);
    if (!rec || rec.day_kind !== 'school' || !rec.cycle_day) return '';
    return COURSES[rec.cycle_day]?.[periodKey] || '';
  }

  function pairedSec3(group) {
    if (group === 'FRA3SE-31') return 'FRA3SE-32';
    if (group === 'FRA3SE-32') return 'FRA3SE-31';
    return '';
  }

  function injectStyles() {
    if (document.getElementById('courseMetaStyles')) return;
    const style = document.createElement('style');
    style.id = 'courseMetaStyles';
    style.textContent = `
      .course-strip.has-course.course-meta-strip{
        position:relative!important;
        background:var(--course-color)!important;
        color:#1d1d1d!important;
        justify-content:center!important;
        padding-left:10px!important;
        padding-right:10px!important;
        text-shadow:none!important;
      }
      .course-strip-name{
        position:absolute;
        left:50%;
        transform:translateX(-50%);
        max-width:calc(100% - 76px);
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
        text-align:center;
      }
      .course-strip-number{
        position:absolute;
        right:10px;
        margin:0;
        white-space:nowrap;
        font-size:.78em;
        font-weight:900;
        opacity:.78;
        letter-spacing:.01em;
        cursor:pointer;
      }
      .course-strip-number:hover{opacity:1;text-decoration:underline;text-underline-offset:2px}
      .day-card .course-strip.has-course.course-meta-strip{justify-content:center!important;padding-left:12px!important;padding-right:12px!important}
      .day-card .course-strip-number{right:12px}
    `;
    document.head.appendChild(style);
  }

  function rawGroup(strip) {
    if (strip.dataset.courseGroup && COURSE_META[strip.dataset.courseGroup]) return strip.dataset.courseGroup;
    const named = strip.querySelector('.course-strip-name')?.textContent?.trim();
    if (named && COURSE_META[named]) return named;
    const text = strip.textContent.trim();
    return COURSE_META[text] ? text : '';
  }

  function applyStrip(strip) {
    if (!strip.classList.contains('has-course')) return;
    const group = rawGroup(strip);
    if (!group) return;
    const cell = strip.closest('[data-note-cell]');
    const id = cell?.dataset.noteCell || '';
    const colon = id.lastIndexOf(':');
    if (colon < 0) return;
    const dateISO = id.slice(0, colon);
    const number = courseNumber(group, dateISO);
    const signature = `${group}:${dateISO}:${number ?? 'none'}`;
    if (strip.dataset.courseMetaSignature === signature) return;

    strip.dataset.courseGroup = group;
    strip.dataset.courseMetaSignature = signature;
    strip.classList.add('course-meta-strip');
    strip.style.setProperty('--course-color', COURSE_META[group].color);
    strip.innerHTML = `<span class="course-strip-name">${group}</span><span class="course-strip-number" role="button" tabindex="0" title="Options du cours">${number == null ? '' : `#${number}`}</span>`;
  }

  function applyAll() {
    document.querySelectorAll('.course-strip.has-course').forEach(applyStrip);
  }

  function queueApply() {
    if (applyQueued) return;
    applyQueued = true;
    requestAnimationFrame(() => {
      applyQueued = false;
      applyAll();
    });
  }

  async function refreshMetadata() {
    await ensureCalendar();
    applyAll();
  }

  window.CRPlannerCourseMeta = {
    ensureCalendar,
    courseNumber,
    nextCourse,
    previousCourse,
    courseAt,
    pairedSec3,
    getMeta: group => COURSE_META[group] ? { ...COURSE_META[group] } : null,
    getCalendar: () => calendar.map(r => ({ ...r })),
  };

  function start() {
    injectStyles();
    const planner = document.getElementById('planner');
    if (planner) new MutationObserver(queueApply).observe(planner, { childList: true, subtree: true });
    queueApply();
    refreshMetadata();

    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (calendar.length || loadingCalendar) { clearInterval(timer); return; }
      if (localStorage.getItem(ACCESS_STORAGE)) {
        clearInterval(timer);
        refreshMetadata();
      } else if (tries > 120) clearInterval(timer);
    }, 500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
