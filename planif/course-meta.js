(() => {
  'use strict';

  const API_URL = 'https://ojyswaxuqwnqilrvtjll.supabase.co/functions/v1/planner-api';
  const ACCESS_STORAGE = 'cr-planner-access-v1';
  const SCHOOL_START = '2026-08-24';
  const SCHOOL_END = '2027-06-24';
  const CAL_CACHE = 'cr-planif-course-calendar-v1';
  const CACHE_MAX_AGE = 24 * 60 * 60 * 1000;

  // Couleurs exactes des événements Google Agenda « Horaire Cardinal-Roy ».
  // FRA3SE-31 = colorId 2, FRA3SE-32 = colorId 7, FRA5SE-51 = colorId 5.
  const COURSE_META = {
    'FRA3SE-31': { color: '#7ae7bf', anchorDate: '2026-09-11', anchorNumber: 8 },
    'FRA3SE-32': { color: '#46d6db', anchorDate: '2026-09-11', anchorNumber: 8 },
    'FRA5SE-51': { color: '#fbd75b', anchorDate: '2026-09-10', anchorNumber: 5 },
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

  function parseISO(s) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  }
  function iso(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  }
  function groupOnDay(rec, group) {
    if (!rec || rec.day_kind !== 'school' || !rec.cycle_day) return false;
    return Object.values(COURSES[rec.cycle_day] || {}).includes(group);
  }

  async function fetchCalendarChunk(from, to, key) {
    const res = await fetch(`${API_URL}?from=${from}&to=${to}`, {
      headers: { 'x-planner-key': key },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Calendrier indisponible (${res.status})`);
    const data = await res.json();
    return data.calendar || [];
  }

  async function fetchWholeSchoolCalendar(key) {
    const rows = [];
    let cursor = parseISO(SCHOOL_START);
    const last = parseISO(SCHOOL_END);
    while (cursor <= last) {
      const chunkEnd = addDays(cursor, 59) < last ? addDays(cursor, 59) : last;
      rows.push(...await fetchCalendarChunk(iso(cursor), iso(chunkEnd), key));
      cursor = addDays(chunkEnd, 1);
    }
    const unique = new Map(rows.map(r => [r.plan_date, r]));
    return [...unique.values()].sort((a, b) => a.plan_date.localeCompare(b.plan_date));
  }

  async function ensureCalendar() {
    if (calendar.length) return calendar;
    if (loadingCalendar) return loadingCalendar;

    try {
      const cached = JSON.parse(localStorage.getItem(CAL_CACHE) || 'null');
      if (cached?.savedAt && Date.now() - cached.savedAt < CACHE_MAX_AGE && Array.isArray(cached.rows) && cached.rows.length) {
        calendar = cached.rows;
        return calendar;
      }
    } catch { /* cache invalide : on recharge */ }

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

  function injectStyles() {
    if (document.getElementById('courseMetaStyles')) return;
    const style = document.createElement('style');
    style.id = 'courseMetaStyles';
    style.textContent = `
      .course-strip.has-course.course-meta-strip{
        background:var(--course-color)!important;
        color:#1d1d1d!important;
        justify-content:space-between!important;
        gap:8px;
        padding-left:10px!important;
        padding-right:10px!important;
        text-shadow:none!important;
      }
      .course-strip-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .course-strip-number{margin-left:auto;white-space:nowrap;font-size:.78em;font-weight:900;opacity:.78;letter-spacing:.01em}
      .day-card .course-strip.has-course.course-meta-strip{justify-content:space-between!important;padding-left:12px!important;padding-right:12px!important}
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
    const signature = `${group}:${dateISO}:${number ?? '?'}`;
    if (strip.dataset.courseMetaSignature === signature) return;

    strip.dataset.courseGroup = group;
    strip.dataset.courseMetaSignature = signature;
    strip.classList.add('course-meta-strip');
    strip.style.setProperty('--course-color', COURSE_META[group].color);
    strip.innerHTML = `<span class="course-strip-name">${group}</span><span class="course-strip-number">${number == null ? '' : `#${number}`}</span>`;
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

  function start() {
    injectStyles();
    const planner = document.getElementById('planner');
    if (planner) new MutationObserver(queueApply).observe(planner, { childList: true, subtree: true });
    queueApply();
    refreshMetadata();

    // Si la clé vient d'être saisie à la première ouverture, on attend qu'elle soit enregistrée.
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
