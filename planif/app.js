(() => {
  'use strict';

  const API_URL = 'https://ojyswaxuqwnqilrvtjll.supabase.co/functions/v1/planner-api';
  const SCHOOL_START = '2026-08-24';
  const SCHOOL_END = '2027-06-24';
  const ACCESS_STORAGE = 'cr-planner-access-v1';
  const VIEW_STORAGE = 'cr-planner-view-v1';
  const CACHE_PREFIX = 'cr-planner-range:';
  const DRAFT_PREFIX = 'cr-planner-draft:';

  const PERIODS = [
    { key: 'am', label: 'PÉRIODE AM', time: '07:20–08:10', compact: true },
    { key: 'p1', label: 'Période 1', time: '08:15–09:30' },
    { key: 'p2', label: 'Période 2', time: '09:45–11:00' },
    { key: 'p3', label: 'Période 3', time: '11:15–12:30' },
    { key: 'p4', label: 'Période 4', time: '12:45–14:00' },
    { key: 'p5', label: 'Période 5', time: '14:15–15:30' },
    { key: 'pm', label: 'PÉRIODE PM', time: '15:40–16:30', compact: true },
  ];

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

  const el = {
    shell: document.getElementById('appShell'),
    planner: document.getElementById('planner'),
    title: document.getElementById('periodTitle'),
    save: document.getElementById('saveStatus'),
    prev: document.getElementById('prevBtn'),
    next: document.getElementById('nextBtn'),
    today: document.getElementById('todayBtn'),
    segmented: [...document.querySelectorAll('[data-view]')],
    accessDialog: document.getElementById('accessDialog'),
    accessForm: document.getElementById('accessForm'),
    accessKey: document.getElementById('accessKey'),
    accessError: document.getElementById('accessError'),
    unlock: document.getElementById('unlockBtn'),
    toggleKey: document.getElementById('toggleKeyBtn'),
    settings: document.getElementById('settingsBtn'),
    settingsDialog: document.getElementById('settingsDialog'),
    resetKey: document.getElementById('resetKeyBtn'),
    install: document.getElementById('installBtn'),
    installHelp: document.getElementById('installHelpBtn'),
    network: document.getElementById('networkStatus'),
    toast: document.getElementById('toast'),
  };

  const state = {
    key: localStorage.getItem(ACCESS_STORAGE) || '',
    view: localStorage.getItem(VIEW_STORAGE) || (matchMedia('(max-width: 820px)').matches ? 'day' : 'week'),
    focusDate: usefulDate(new Date()),
    calendar: new Map(),
    notes: new Map(),
    saveTimers: new Map(),
    loading: false,
    installPrompt: null,
    dragPayload: null,
    movePayload: null,
  };

  function localDate(y, m, d) { return new Date(y, m - 1, d, 12, 0, 0, 0); }
  function parseISO(s) { const [y,m,d] = s.split('-').map(Number); return localDate(y,m,d); }
  function iso(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth()+1).padStart(2,'0');
    const d = String(date.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }
  function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate()+n); return d; }
  function mondayOf(date) {
    const d = new Date(date); const day = d.getDay();
    const shift = day === 0 ? -6 : 1-day;
    return addDays(d, shift);
  }
  function usefulDate(date) {
    let d = new Date(date);
    if (d.getDay() === 6) d = addDays(d, 2);
    if (d.getDay() === 0) d = addDays(d, 1);
    if (iso(d) < SCHOOL_START) d = parseISO(SCHOOL_START);
    if (iso(d) > SCHOOL_END) d = parseISO(SCHOOL_END);
    return d;
  }
  function nextWeekday(date, delta) {
    let d = addDays(date, delta > 0 ? 1 : -1);
    while (d.getDay() === 0 || d.getDay() === 6) d = addDays(d, delta > 0 ? 1 : -1);
    return d;
  }
  function weekDates(date) { const m = mondayOf(date); return [0,1,2,3,4].map(i => addDays(m,i)); }
  function sameDay(a, b) { return iso(a) === iso(b); }
  function isToday(date) { return sameDay(date, new Date()); }
  function dateFr(date, options) { return new Intl.DateTimeFormat('fr-CA', options).format(date); }
  function capitalize(s) { return s ? s.charAt(0).toUpperCase()+s.slice(1) : s; }
  function noteId(dateISO, periodKey) { return `${dateISO}:${periodKey}`; }
  function courseFor(day, periodKey) {
    if (!day || day.day_kind !== 'school' || !day.cycle_day) return '';
    return COURSES[day.cycle_day]?.[periodKey] || '';
  }
  function dayRecord(date) { return state.calendar.get(iso(date)) || null; }
  function isSpecial(rec) { return !!rec && rec.day_kind !== 'school'; }
  function escapeHtml(s) { return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

  function setSaveStatus(text, cls='') {
    el.save.textContent = text;
    el.save.className = `save-status ${cls}`.trim();
  }

  function toast(message, ms=2600) {
    el.toast.textContent = message;
    el.toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.toast.classList.remove('show'), ms);
  }

  async function api(path='', options={}) {
    const headers = new Headers(options.headers || {});
    headers.set('x-planner-key', state.key);
    if (options.body && !headers.has('content-type')) headers.set('content-type','application/json');
    const res = await fetch(`${API_URL}${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || `Erreur ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  async function validateKey(candidate) {
    const old = state.key;
    state.key = candidate;
    try {
      await api('?action=ping');
      return true;
    } catch {
      state.key = old;
      return false;
    }
  }

  function rangeForCurrentView() {
    if (state.view === 'week') {
      const days = weekDates(state.focusDate);
      return [iso(days[0]), iso(days[4])];
    }
    const s = iso(state.focusDate);
    return [s,s];
  }

  function cacheKey(from,to) { return `${CACHE_PREFIX}${from}:${to}`; }

  function applyLoadedData(data) {
    state.calendar = new Map((data.calendar || []).map(r => [r.plan_date, r]));
    state.notes = new Map((data.notes || []).map(r => [noteId(r.plan_date, r.period_key), r.body || '']));
    for (let i=0; i<localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith(DRAFT_PREFIX)) continue;
      const id = k.slice(DRAFT_PREFIX.length);
      const [date] = id.split(':');
      if (state.calendar.has(date)) state.notes.set(id, localStorage.getItem(k) || '');
    }
  }

  async function loadCurrent() {
    if (!state.key) return;
    const [from,to] = rangeForCurrentView();
    state.loading = true;
    el.planner.innerHTML = '<div class="loading-card"><div><strong>Chargement de ta planification…</strong></div></div>';
    try {
      const data = await api(`?from=${from}&to=${to}`);
      localStorage.setItem(cacheKey(from,to), JSON.stringify(data));
      applyLoadedData(data);
      setSaveStatus('Synchronisé', 'saved');
    } catch (err) {
      const cached = localStorage.getItem(cacheKey(from,to));
      if (cached) {
        applyLoadedData(JSON.parse(cached));
        setSaveStatus('Hors ligne · copie locale', 'error');
      } else if (err.status === 401) {
        localStorage.removeItem(ACCESS_STORAGE);
        state.key = '';
        showAccess('Ta clé d’accès doit être entrée de nouveau.');
        return;
      } else {
        state.calendar = new Map(); state.notes = new Map();
        el.planner.innerHTML = '<div class="error-card"><div><strong>Impossible de charger la planification.</strong><br><small>Vérifie ta connexion puis réessaie.</small></div></div>';
        setSaveStatus('Connexion impossible', 'error');
        return;
      }
    } finally {
      state.loading = false;
    }
    render();
  }

  function headingForWeek(days) {
    const first = days[0], last = days[4];
    const sameMonth = first.getMonth() === last.getMonth();
    if (sameMonth) return `Semaine du ${first.getDate()} au ${last.getDate()} ${dateFr(last,{month:'long',year:'numeric'})}`;
    return `Semaine du ${first.getDate()} ${dateFr(first,{month:'long'})} au ${last.getDate()} ${dateFr(last,{month:'long',year:'numeric'})}`;
  }

  function dayHeaderHtml(date) {
    const rec = dayRecord(date);
    const special = isSpecial(rec);
    const classes = ['day-head'];
    if (special) classes.push('special');
    if (isToday(date)) classes.push('today');
    const cycle = rec?.cycle_day ? `<div class="cycle-diamond"><span>Jour ${rec.cycle_day}</span></div>` : '';
    const label = special ? `<div class="special-label">${escapeHtml(rec?.label || 'Sans cours')}</div>` : cycle;
    return `<button type="button" class="${classes.join(' ')}" data-open-day="${iso(date)}">
      <div class="day-name">${capitalize(dateFr(date,{weekday:'long'}))}</div>
      <div class="day-date">${dateFr(date,{day:'numeric',month:'long'})}</div>
      ${label}
    </button>`;
  }

  function noteCellHtml(date, period, mode='week') {
    const d = iso(date);
    const rec = dayRecord(date);
    const special = isSpecial(rec);
    const course = courseFor(rec, period.key);
    const id = noteId(d, period.key);
    const value = state.notes.get(id) || '';
    const moveButton = special ? '' : `<button type="button" class="move-note-btn" title="Déplacer la sélection" aria-label="Déplacer la sélection">↗</button>`;
    const readOnly = special ? ' readonly tabindex="-1"' : '';
    if (mode === 'week') {
      return `<div class="plan-cell ${special?'special':''} ${period.compact?'compact':''}" data-note-cell="${id}">
        <span class="dirty-dot" aria-hidden="true"></span>
        ${moveButton}
        <div class="course-strip ${course?'has-course':''}">${course ? escapeHtml(course) : '&nbsp;'}</div>
        <textarea class="note-area" data-date="${d}" data-period="${period.key}" aria-label="${escapeHtml(period.label)} — ${escapeHtml(dateFr(date,{weekday:'long',day:'numeric',month:'long'}))}"${readOnly}>${escapeHtml(value)}</textarea>
      </div>`;
    }
    return `<article class="day-card ${special?'special':''}" data-note-cell="${id}">
      <div class="day-period"><strong>${escapeHtml(period.label)}</strong><span>${escapeHtml(period.time)}</span></div>
      <div class="day-card-main">
        <span class="dirty-dot" aria-hidden="true"></span>
        ${moveButton}
        <div class="course-strip ${course?'has-course':''}">${course ? escapeHtml(course) : '&nbsp;'}</div>
        <textarea class="note-area" data-date="${d}" data-period="${period.key}" aria-label="${escapeHtml(period.label)} — ${escapeHtml(dateFr(date,{weekday:'long',day:'numeric',month:'long'}))}"${readOnly}>${escapeHtml(value)}</textarea>
      </div>
    </article>`;
  }

  function renderWeek() {
    const days = weekDates(state.focusDate);
    el.title.textContent = headingForWeek(days);
    let html = '<div class="week-wrap"><div class="week-grid"><div class="grid-corner"></div>';
    html += days.map(dayHeaderHtml).join('');
    for (const p of PERIODS) {
      html += `<div class="period-side ${p.compact?'compact':''}"><strong>${escapeHtml(p.label)}</strong><span>${escapeHtml(p.time)}</span></div>`;
      html += days.map(d => noteCellHtml(d,p,'week')).join('');
    }
    html += '</div></div>';
    el.planner.innerHTML = html;
  }

  function renderDay() {
    const d = state.focusDate;
    const rec = dayRecord(d);
    const special = isSpecial(rec);
    const cycleText = rec?.cycle_day ? `Jour ${rec.cycle_day}` : (rec?.label || 'Sans cours');
    el.title.textContent = `${capitalize(dateFr(d,{weekday:'long'}))} ${dateFr(d,{day:'numeric',month:'long',year:'numeric'})}`;
    el.planner.innerHTML = `<div class="day-view">
      <div class="mobile-day-head ${special?'special':''}">
        <div class="mobile-day-title"><strong>${capitalize(dateFr(d,{weekday:'long',day:'numeric',month:'long'}))}</strong><span>${escapeHtml(cycleText)}</span></div>
        ${rec?.cycle_day ? `<div class="cycle-diamond"><span>Jour ${rec.cycle_day}</span></div>` : `<div class="special-banner">${escapeHtml(rec?.label || 'Sans cours')}</div>`}
      </div>
      <div class="day-cards">${PERIODS.map(p => noteCellHtml(d,p,'day')).join('')}</div>
    </div>`;
  }

  function autosizeAll() {
    if (state.view !== 'day') return;
    document.querySelectorAll('.note-area').forEach(t => {
      t.style.height = 'auto';
      t.style.height = `${Math.max(93, t.scrollHeight)}px`;
    });
  }

  function render() {
    el.segmented.forEach(b => b.classList.toggle('active', b.dataset.view === state.view));
    if (state.view === 'week') renderWeek(); else renderDay();
    bindPlannerEvents();
    requestAnimationFrame(autosizeAll);
  }

  function lineBounds(value, pos) {
    const start = value.lastIndexOf('\n', Math.max(0,pos-1)) + 1;
    const next = value.indexOf('\n', pos);
    const end = next === -1 ? value.length : next;
    return { start, end, text: value.slice(start,end) };
  }

  function latestNumberBefore(value, lineStart) {
    const lines = value.slice(0, lineStart).split('\n');
    let last = null;
    for (const line of lines) {
      const m = line.match(/^\s*(\d+)\.\s*/);
      if (m) last = Number(m[1]);
    }
    return last;
  }

  function renumberNumberedLines(body) {
    let n = 0;
    return String(body).split('\n').map(line => {
      const m = line.match(/^\s*\d+\.\s*(.*)$/);
      if (!m) return line;
      n += 1;
      return `${n}. ${m[1]}`.trimEnd();
    }).join('\n');
  }

  function replaceRange(area, start, end, replacement, caretOffset = replacement.length) {
    area.value = area.value.slice(0,start) + replacement + area.value.slice(end);
    const pos = start + caretOffset;
    area.setSelectionRange(pos,pos);
  }

  function smartKeydown(area, event) {
    if (area.readOnly) return;
    if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const start = area.selectionStart;
      const end = area.selectionEnd;
      const bounds = lineBounds(area.value, start);
      const current = bounds.text.match(/^\s*(\d+)\.\s*(.*)$/);
      let next = current ? Number(current[1]) + 1 : null;
      if (!next) {
        const previous = latestNumberBefore(area.value, bounds.start);
        if (previous) next = previous + 1;
      }
      if (next) {
        event.preventDefault();
        replaceRange(area, start, end, `\n${next}. `);
        syncArea(area);
      }
      return;
    }

    if (event.key === 'Backspace' && area.selectionStart === area.selectionEnd) {
      const pos = area.selectionStart;
      const bounds = lineBounds(area.value, pos);
      const prefix = area.value.slice(bounds.start, pos);
      if (/^\s*\d+\.\s?$/.test(prefix)) {
        event.preventDefault();
        replaceRange(area, bounds.start, pos, '', 0);
        syncArea(area);
      }
    }
  }

  function autoSpaceNumber(area) {
    const pos = area.selectionStart;
    if (pos !== area.selectionEnd) return false;
    const bounds = lineBounds(area.value, pos);
    const beforeCaret = area.value.slice(bounds.start, pos);
    if (/^\s*\d+\.$/.test(beforeCaret)) {
      replaceRange(area, pos, pos, ' ');
      return true;
    }
    return false;
  }

  function markSelection(area) {
    const cell = area.closest('[data-note-cell]');
    const has = area.selectionStart !== area.selectionEnd && area.value.slice(area.selectionStart,area.selectionEnd).trim();
    area.draggable = !!has;
    cell?.classList.toggle('has-selection', !!has);
  }

  function selectionPayload(area, allowLineFallback=false) {
    let start = area.selectionStart;
    let end = area.selectionEnd;
    if (start === end && allowLineFallback) {
      const b = lineBounds(area.value, start);
      start = b.start;
      end = b.end;
    }
    const text = area.value.slice(start,end);
    if (!text.trim()) return null;
    return {
      sourceDate: area.dataset.date,
      sourcePeriod: area.dataset.period,
      sourceBody: area.value,
      start,
      end,
      text,
    };
  }

  function syncArea(area) {
    const id = noteId(area.dataset.date, area.dataset.period);
    let body = area.value;
    state.notes.set(id, body);
    localStorage.setItem(`${DRAFT_PREFIX}${id}`, body);
    area.closest('[data-note-cell]')?.classList.add('dirty');
    setSaveStatus('Modification…', 'saving');
    if (state.view === 'day') {
      area.style.height = 'auto';
      area.style.height = `${Math.max(93,area.scrollHeight)}px`;
    }
    clearTimeout(state.saveTimers.get(id));
    state.saveTimers.set(id, setTimeout(() => saveNote(area.dataset.date, area.dataset.period, body, id), 700));
  }

  function bindPlannerEvents() {
    el.planner.querySelectorAll('[data-open-day]').forEach(btn => btn.addEventListener('click', () => {
      state.focusDate = parseISO(btn.dataset.openDay);
      state.view = 'day';
      localStorage.setItem(VIEW_STORAGE,'day');
      loadCurrent();
    }));

    el.planner.querySelectorAll('.note-area').forEach(area => {
      if (area.readOnly) return;
      area.addEventListener('keydown', e => smartKeydown(area,e));
      area.addEventListener('input', () => {
        autoSpaceNumber(area);
        syncArea(area);
      });
      area.addEventListener('select', () => markSelection(area));
      area.addEventListener('mouseup', () => setTimeout(() => markSelection(area),0));
      area.addEventListener('keyup', () => markSelection(area));
      area.addEventListener('blur', () => setTimeout(() => {
        if (document.activeElement !== area) area.closest('[data-note-cell]')?.classList.remove('has-selection');
      },120));

      area.addEventListener('dragstart', e => {
        const payload = selectionPayload(area,false);
        if (!payload) { e.preventDefault(); return; }
        state.dragPayload = payload;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', payload.text);
        document.body.classList.add('moving-plan-item');
      });
      area.addEventListener('dragend', () => {
        state.dragPayload = null;
        document.body.classList.remove('moving-plan-item');
        document.querySelectorAll('.drop-target').forEach(n => n.classList.remove('drop-target'));
      });
    });

    el.planner.querySelectorAll('[data-note-cell]').forEach(cell => {
      const area = cell.querySelector('.note-area');
      if (!area || area.readOnly) return;
      cell.addEventListener('dragover', e => {
        if (!state.dragPayload) return;
        const targetId = noteId(area.dataset.date,area.dataset.period);
        const sourceId = noteId(state.dragPayload.sourceDate,state.dragPayload.sourcePeriod);
        if (targetId === sourceId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        cell.classList.add('drop-target');
      });
      cell.addEventListener('dragleave', e => {
        if (!cell.contains(e.relatedTarget)) cell.classList.remove('drop-target');
      });
      cell.addEventListener('drop', async e => {
        if (!state.dragPayload) return;
        e.preventDefault();
        cell.classList.remove('drop-target');
        const payload = state.dragPayload;
        state.dragPayload = null;
        document.body.classList.remove('moving-plan-item');
        await movePayload(payload, area.dataset.date, area.dataset.period);
      });

      const moveBtn = cell.querySelector('.move-note-btn');
      moveBtn?.addEventListener('mousedown', e => e.preventDefault());
      moveBtn?.addEventListener('click', () => openMoveDialog(area));
    });
  }

  async function saveNote(planDate, periodKey, body, id) {
    state.saveTimers.delete(id);
    if (!navigator.onLine) {
      setSaveStatus('Hors ligne · gardé sur cet appareil', 'error');
      return;
    }
    setSaveStatus('Sauvegarde…', 'saving');
    try {
      await api('', { method:'POST', body: JSON.stringify({ action:'save_note', plan_date:planDate, period_key:periodKey, body }) });
      localStorage.removeItem(`${DRAFT_PREFIX}${id}`);
      document.querySelector(`[data-note-cell="${CSS.escape(id)}"]`)?.classList.remove('dirty');
      setSaveStatus('Sauvegardé', 'saved');
    } catch {
      setSaveStatus('À resynchroniser', 'error');
    }
  }

  async function persistBody(planDate, periodKey, body) {
    const id = noteId(planDate,periodKey);
    body = renumberNumberedLines(body).replace(/^\s+|\s+$/g,'');
    state.notes.set(id,body);
    localStorage.setItem(`${DRAFT_PREFIX}${id}`,body);
    const visible = document.querySelector(`.note-area[data-date="${CSS.escape(planDate)}"][data-period="${CSS.escape(periodKey)}"]`);
    if (visible) {
      visible.value = body;
      visible.closest('[data-note-cell]')?.classList.add('dirty');
      if (state.view === 'day') {
        visible.style.height='auto';
        visible.style.height=`${Math.max(93,visible.scrollHeight)}px`;
      }
    }
    if (!navigator.onLine) {
      setSaveStatus('Hors ligne · gardé sur cet appareil','error');
      return;
    }
    try {
      await api('',{method:'POST',body:JSON.stringify({action:'save_note',plan_date:planDate,period_key:periodKey,body})});
      localStorage.removeItem(`${DRAFT_PREFIX}${id}`);
      visible?.closest('[data-note-cell]')?.classList.remove('dirty');
      setSaveStatus('Sauvegardé','saved');
    } catch {
      setSaveStatus('À resynchroniser','error');
      throw new Error('save failed');
    }
  }

  async function movePayload(payload, targetDate, targetPeriod) {
    const sourceId = noteId(payload.sourceDate,payload.sourcePeriod);
    const targetId = noteId(targetDate,targetPeriod);
    if (sourceId === targetId) return;

    const currentSource = state.notes.get(sourceId) ?? payload.sourceBody;
    let sourceBody = payload.sourceBody;
    if (currentSource === payload.sourceBody) {
      sourceBody = currentSource.slice(0,payload.start) + currentSource.slice(payload.end);
    } else {
      const needle = payload.text;
      const idx = currentSource.indexOf(needle);
      sourceBody = idx >= 0 ? currentSource.slice(0,idx) + currentSource.slice(idx+needle.length) : currentSource;
    }
    sourceBody = renumberNumberedLines(sourceBody.replace(/\n{3,}/g,'\n\n').trim());

    let targetBody = state.notes.get(targetId);
    if (targetBody === undefined) {
      try {
        const data = await api(`?from=${targetDate}&to=${targetDate}`);
        const note = (data.notes || []).find(n => n.period_key === targetPeriod);
        targetBody = note?.body || '';
      } catch { targetBody = ''; }
    }
    const movedText = payload.text.trim();
    targetBody = targetBody.trim() ? `${targetBody.trimEnd()}\n${movedText}` : movedText;
    targetBody = renumberNumberedLines(targetBody);

    setSaveStatus('Déplacement…','saving');
    try {
      await Promise.all([
        persistBody(payload.sourceDate,payload.sourcePeriod,sourceBody),
        persistBody(targetDate,targetPeriod,targetBody),
      ]);
      toast('Élément déplacé et numérotation ajustée.');
    } catch {
      toast('Le déplacement est gardé localement; il sera resynchronisé.');
    }
  }

  function ensureMoveDialog() {
    if (document.getElementById('moveDialog')) return;
    const dialog = document.createElement('dialog');
    dialog.id = 'moveDialog';
    dialog.className = 'move-dialog';
    dialog.innerHTML = `<form method="dialog" id="moveForm">
      <h2>Déplacer cet élément</h2>
      <p class="move-preview" id="movePreview"></p>
      <label for="moveTarget">Destination</label>
      <select id="moveTarget" required></select>
      <div class="move-help">Sur ordinateur, tu peux aussi sélectionner du texte et le glisser directement vers une autre case visible.</div>
      <div class="move-actions">
        <button type="button" class="secondary-button" id="cancelMove">Annuler</button>
        <button type="submit" class="primary-button">Déplacer</button>
      </div>
    </form>`;
    document.body.appendChild(dialog);
    dialog.querySelector('#cancelMove').addEventListener('click',()=>dialog.close());
    dialog.querySelector('#moveForm').addEventListener('submit',async e=>{
      e.preventDefault();
      const value = dialog.querySelector('#moveTarget').value;
      if (!value || !state.movePayload) return;
      const [date,period] = value.split('|');
      dialog.close();
      const payload = state.movePayload;
      state.movePayload = null;
      await movePayload(payload,date,period);
    });
  }

  async function openMoveDialog(area) {
    const payload = selectionPayload(area,true);
    if (!payload) { toast('Sélectionne une ligne ou place le curseur dans l’élément à déplacer.'); return; }
    state.movePayload = payload;
    ensureMoveDialog();
    const dialog = document.getElementById('moveDialog');
    const select = dialog.querySelector('#moveTarget');
    const preview = dialog.querySelector('#movePreview');
    preview.textContent = payload.text.trim().replace(/\s+/g,' ').slice(0,180);
    select.innerHTML = '<option value="">Chargement des destinations…</option>';
    if (!dialog.open) dialog.showModal();

    const center = parseISO(payload.sourceDate);
    let from = addDays(center,-14);
    let to = addDays(center,35);
    if (iso(from) < SCHOOL_START) from = parseISO(SCHOOL_START);
    if (iso(to) > SCHOOL_END) to = parseISO(SCHOOL_END);
    try {
      const data = await api(`?from=${iso(from)}&to=${iso(to)}`);
      const options = [];
      for (const rec of data.calendar || []) {
        if (rec.day_kind !== 'school') continue;
        const date = parseISO(rec.plan_date);
        for (const p of PERIODS) {
          const course = courseFor(rec,p.key);
          if (!course) continue;
          if (rec.plan_date === payload.sourceDate && p.key === payload.sourcePeriod) continue;
          options.push({
            value:`${rec.plan_date}|${p.key}`,
            label:`${capitalize(dateFr(date,{weekday:'short',day:'numeric',month:'short'}))} · ${course} · ${p.label}`,
          });
        }
      }
      select.innerHTML = '<option value="">Choisir une case…</option>' + options.map(o=>`<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join('');
    } catch {
      select.innerHTML = '<option value="">Impossible de charger les destinations</option>';
    }
  }

  async function retryDrafts() {
    if (!state.key || !navigator.onLine) return;
    const drafts = [];
    for (let i=0;i<localStorage.length;i++) {
      const k=localStorage.key(i);
      if (k?.startsWith(DRAFT_PREFIX)) drafts.push(k);
    }
    for (const k of drafts) {
      const id=k.slice(DRAFT_PREFIX.length); const idx=id.lastIndexOf(':');
      if (idx < 0) continue;
      const d=id.slice(0,idx), p=id.slice(idx+1), body=localStorage.getItem(k)||'';
      try { await api('',{method:'POST',body:JSON.stringify({action:'save_note',plan_date:d,period_key:p,body})}); localStorage.removeItem(k); } catch { break; }
    }
    if (drafts.length) loadCurrent();
  }

  function shift(direction) {
    if (state.view === 'week') state.focusDate = addDays(state.focusDate, 7*direction);
    else state.focusDate = nextWeekday(state.focusDate, direction);
    if (iso(state.focusDate) < SCHOOL_START) state.focusDate = parseISO(SCHOOL_START);
    if (iso(state.focusDate) > SCHOOL_END) state.focusDate = parseISO(SCHOOL_END);
    loadCurrent();
  }

  function goToday() {
    state.focusDate = usefulDate(new Date());
    loadCurrent();
  }

  function showAccess(message='') {
    el.shell.hidden = true;
    el.accessError.textContent = message;
    el.accessKey.value = '';
    if (!el.accessDialog.open) el.accessDialog.showModal();
    setTimeout(() => el.accessKey.focus(), 60);
  }

  async function unlockFromForm(event) {
    event.preventDefault();
    const candidate = el.accessKey.value.trim();
    if (!candidate) return;
    el.unlock.disabled = true; el.unlock.textContent = 'Vérification…'; el.accessError.textContent='';
    const ok = await validateKey(candidate);
    el.unlock.disabled = false; el.unlock.textContent = 'Ouvrir';
    if (!ok) { el.accessError.textContent = 'Cette clé n’est pas valide.'; return; }
    state.key = candidate;
    localStorage.setItem(ACCESS_STORAGE,candidate);
    el.accessDialog.close(); el.shell.hidden = false;
    await loadCurrent();
  }

  function updateNetwork() {
    el.network.textContent = navigator.onLine ? 'En ligne' : 'Hors ligne';
    if (navigator.onLine) retryDrafts();
  }

  function installHelp() {
    if (state.installPrompt) {
      state.installPrompt.prompt();
      return;
    }
    const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    toast(isiOS ? 'Sur iPhone/iPad : Partager → Sur l’écran d’accueil.' : 'Dans le navigateur : menu → Installer l’application / Ajouter à l’écran d’accueil.', 4500);
  }

  function injectEnhancementStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .move-note-btn{position:absolute;right:7px;top:35px;z-index:7;width:27px;height:27px;border:1px solid rgba(7,87,127,.2);border-radius:8px;background:rgba(255,255,255,.92);color:#07577f;font-weight:900;cursor:pointer;opacity:0;transform:translateY(-2px);transition:.15s ease;box-shadow:0 2px 8px rgba(20,55,75,.08)}
      [data-note-cell]:hover .move-note-btn,[data-note-cell]:focus-within .move-note-btn,[data-note-cell].has-selection .move-note-btn{opacity:1;transform:none}
      .day-card .move-note-btn{top:36px;right:8px}
      .drop-target{box-shadow:inset 0 0 0 3px rgba(11,107,150,.55)!important;background:#eef9fd!important}
      .drop-target .course-strip{filter:saturate(1.1)}
      .moving-plan-item .plan-cell:not(.special),.moving-plan-item .day-card:not(.special){transition:box-shadow .12s ease,background .12s ease}
      .move-dialog{width:min(92vw,520px);border:0;border-radius:20px;padding:0;color:#153247;box-shadow:0 28px 80px rgba(5,40,60,.28)}
      .move-dialog::backdrop{background:rgba(3,31,49,.62);backdrop-filter:blur(5px)}
      .move-dialog form{padding:26px;display:grid;gap:13px}
      .move-dialog h2{margin:0;font-size:1.35rem}
      .move-dialog label{font-size:.82rem;font-weight:800}
      .move-dialog select{width:100%;border:1px solid #bfcdd5;border-radius:11px;padding:11px 12px;background:#fff;color:#153247}
      .move-preview{margin:0;padding:10px 12px;border-radius:10px;background:#f1f6f8;color:#4d6472;font-size:.86rem;line-height:1.4;max-height:90px;overflow:auto}
      .move-help{font-size:.78rem;color:#71838e;line-height:1.4}
      .move-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:2px}
      .move-actions button{padding:0 16px}
      .note-area[readonly]{cursor:default}
      @media(max-width:700px){.move-note-btn{opacity:.72}.move-dialog form{padding:21px}.move-actions{display:grid;grid-template-columns:1fr 1fr}.move-actions button{width:100%}}
      @media print{.move-note-btn{display:none!important}}
    `;
    document.head.appendChild(style);
  }

  function wireUi() {
    el.prev.addEventListener('click',()=>shift(-1));
    el.next.addEventListener('click',()=>shift(1));
    el.today.addEventListener('click',goToday);
    el.segmented.forEach(btn => btn.addEventListener('click',()=>{
      if (state.view === btn.dataset.view) return;
      state.view = btn.dataset.view;
      localStorage.setItem(VIEW_STORAGE,state.view);
      loadCurrent();
    }));
    el.accessForm.addEventListener('submit',unlockFromForm);
    el.toggleKey.addEventListener('click',()=>{
      const show = el.accessKey.type === 'password';
      el.accessKey.type = show ? 'text' : 'password';
      el.toggleKey.textContent = show ? 'Masquer' : 'Afficher';
    });
    el.settings.addEventListener('click',()=>el.settingsDialog.showModal());
    el.resetKey.addEventListener('click',()=>{
      localStorage.removeItem(ACCESS_STORAGE); state.key=''; el.settingsDialog.close(); showAccess('Entre la nouvelle clé d’accès.');
    });
    el.install.addEventListener('click',installHelp);
    el.installHelp.addEventListener('click',installHelp);
    addEventListener('online',updateNetwork); addEventListener('offline',updateNetwork);
    addEventListener('beforeinstallprompt',(e)=>{ e.preventDefault(); state.installPrompt=e; el.install.hidden=false; });
    addEventListener('appinstalled',()=>{ state.installPrompt=null; el.install.hidden=true; toast('Application installée.'); });
  }

  async function boot() {
    injectEnhancementStyles();
    ensureMoveDialog();
    wireUi(); updateNetwork();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
    if (!state.key) { showAccess(); return; }
    try {
      await api('?action=ping');
      el.shell.hidden = false;
      await loadCurrent();
    } catch {
      localStorage.removeItem(ACCESS_STORAGE); state.key=''; showAccess('Ta clé d’accès doit être entrée de nouveau.');
    }
  }

  boot();
})();