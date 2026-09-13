(() => {
  'use strict';

  const API_URL = 'https://ojyswaxuqwnqilrvtjll.supabase.co/functions/v1/planner-api';
  const SCHOOL_START = '2026-08-24';
  const SCHOOL_END = '2027-06-24';
  const ACCESS_STORAGE = 'cr-planner-access-v1';
  const VIEW_STORAGE = 'cr-planner-view-v1';
  const CACHE_PREFIX = 'cr-planner-range:';
  const DRAFT_PREFIX = 'cr-planner-draft:';
  const HISTORY_LIMIT = 60;

  // PÉRIODE AM retirée volontairement : elle n'est jamais utilisée.
  const PERIODS = [
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
    undo: document.getElementById('undoBtn'),
    redo: document.getElementById('redoBtn'),
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
    undoStack: [],
    redoStack: [],
    activeEdit: null,
    drag: null,
  };

  function localDate(y, m, d) { return new Date(y, m - 1, d, 12, 0, 0, 0); }
  function parseISO(s) { const [y, m, d] = s.split('-').map(Number); return localDate(y, m, d); }
  function iso(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
  function mondayOf(date) { const d = new Date(date); const day = d.getDay(); return addDays(d, day === 0 ? -6 : 1 - day); }
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
  function weekDates(date) { const m = mondayOf(date); return [0, 1, 2, 3, 4].map(i => addDays(m, i)); }
  function sameDay(a, b) { return iso(a) === iso(b); }
  function isToday(date) { return sameDay(date, new Date()); }
  function dateFr(date, options) { return new Intl.DateTimeFormat('fr-CA', options).format(date); }
  function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function noteId(dateISO, periodKey) { return `${dateISO}:${periodKey}`; }
  function splitNoteId(id) { const i = id.lastIndexOf(':'); return [id.slice(0, i), id.slice(i + 1)]; }
  function courseFor(day, periodKey) {
    if (!day || day.day_kind !== 'school' || !day.cycle_day) return '';
    return COURSES[day.cycle_day]?.[periodKey] || '';
  }
  function dayRecord(date) { return state.calendar.get(iso(date)) || null; }
  function isSpecial(rec) { return !!rec && rec.day_kind !== 'school'; }
  function escapeHtml(s) { return String(s).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c])); }
  function clampSchool(date) {
    if (iso(date) < SCHOOL_START) return parseISO(SCHOOL_START);
    if (iso(date) > SCHOOL_END) return parseISO(SCHOOL_END);
    return date;
  }

  function setSaveStatus(text, cls = '') {
    el.save.textContent = text;
    el.save.className = `save-status ${cls}`.trim();
  }
  function toast(message, ms = 2600) {
    el.toast.textContent = message;
    el.toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.toast.classList.remove('show'), ms);
  }

  async function api(path = '', options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set('x-planner-key', state.key);
    if (options.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
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
    try { await api('?action=ping'); return true; }
    catch { state.key = old; return false; }
  }

  function rangeForCurrentView() {
    if (state.view === 'week') {
      const days = weekDates(state.focusDate);
      return [iso(addDays(days[0], -7)), iso(addDays(days[4], 7))];
    }
    const d = iso(state.focusDate);
    return [d, d];
  }
  function cacheKey(from, to) { return `${CACHE_PREFIX}${from}:${to}`; }
  function mergeLoadedData(data) {
    for (const r of data.calendar || []) state.calendar.set(r.plan_date, r);
    for (const r of data.notes || []) state.notes.set(noteId(r.plan_date, r.period_key), r.body || '');
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith(DRAFT_PREFIX)) continue;
      const id = k.slice(DRAFT_PREFIX.length);
      const [date] = splitNoteId(id);
      if (state.calendar.has(date)) state.notes.set(id, localStorage.getItem(k) || '');
    }
  }
  async function loadCurrent({ merge = false, renderAfter = true } = {}) {
    if (!state.key) return;
    const [from, to] = rangeForCurrentView();
    state.loading = true;
    if (!merge) el.planner.innerHTML = '<div class="loading-card"><div><strong>Chargement de ta planification…</strong></div></div>';
    try {
      const data = await api(`?from=${from}&to=${to}`);
      localStorage.setItem(cacheKey(from, to), JSON.stringify(data));
      if (!merge) { state.calendar = new Map(); state.notes = new Map(); }
      mergeLoadedData(data);
      setSaveStatus('Synchronisé', 'saved');
    } catch (err) {
      const cached = localStorage.getItem(cacheKey(from, to));
      if (cached) {
        if (!merge) { state.calendar = new Map(); state.notes = new Map(); }
        mergeLoadedData(JSON.parse(cached));
        setSaveStatus('Hors ligne · copie locale', 'error');
      } else if (err.status === 401) {
        localStorage.removeItem(ACCESS_STORAGE);
        state.key = '';
        showAccess('Ta clé d’accès doit être entrée de nouveau.');
        return;
      } else if (!merge) {
        state.calendar = new Map(); state.notes = new Map();
        el.planner.innerHTML = '<div class="error-card"><div><strong>Impossible de charger la planification.</strong><br><small>Vérifie ta connexion puis réessaie.</small></div></div>';
        setSaveStatus('Connexion impossible', 'error');
        return;
      }
    } finally {
      state.loading = false;
    }
    if (renderAfter) render();
  }
  async function ensureDateLoaded(date) {
    const d = iso(date);
    if (state.calendar.has(d)) return;
    const from = iso(state.view === 'week' ? mondayOf(date) : date);
    const to = iso(state.view === 'week' ? addDays(mondayOf(date), 4) : date);
    try { mergeLoadedData(await api(`?from=${from}&to=${to}`)); }
    catch { }
  }

  function parseBody(body) {
    const raw = String(body || '').replace(/\r/g, '');
    if (!raw) return [{ kind: 'plain', text: '' }];
    const blocks = raw.split('\n').map(line => {
      const m = line.match(/^\s*\d+\.\s*(.*)$/);
      return m ? { kind: 'numbered', text: m[1] } : { kind: 'plain', text: line };
    });
    while (blocks.length > 1 && blocks.at(-1).kind === 'plain' && blocks.at(-1).text === '') blocks.pop();
    return blocks.length ? blocks : [{ kind: 'plain', text: '' }];
  }
  function serializeBlocks(blocks) {
    let n = 0;
    const lines = blocks.map(b => {
      const text = String(b.text ?? '').replace(/[\r\n]+/g, ' ').trimEnd();
      return b.kind === 'numbered' ? `${++n}. ${text}`.trimEnd() : text;
    });
    while (lines.length && !lines.at(-1).trim()) lines.pop();
    return lines.join('\n');
  }
  function editorBlocks(editor, { includePlaceholder = false } = {}) {
    const blocks = [];
    for (const node of editor.children) {
      if (!node.classList.contains('editor-block')) continue;
      if (node.classList.contains('drag-placeholder')) {
        if (includePlaceholder) blocks.push({ kind: 'numbered', text: state.drag?.item?.text || '' });
        continue;
      }
      if (node.classList.contains('drag-source')) continue;
      const text = node.querySelector('.block-text')?.textContent?.replace(/[\r\n]+/g, ' ') ?? '';
      blocks.push({ kind: node.dataset.kind === 'numbered' ? 'numbered' : 'plain', text });
    }
    return blocks.length ? blocks : [{ kind: 'plain', text: '' }];
  }
  function serializeEditor(editor) { return serializeBlocks(editorBlocks(editor)); }

  function blockHtml(block) {
    if (block.kind === 'numbered') {
      return `<div class="editor-block numbered-block" data-kind="numbered"><span class="number-badge" role="button" tabindex="0" aria-label="Glisser cet élément"></span><div class="block-text" contenteditable="true" role="textbox" spellcheck="true" data-placeholder="Écrire…">${escapeHtml(block.text)}</div></div>`;
    }
    return `<div class="editor-block plain-block" data-kind="plain"><div class="block-text" contenteditable="true" role="textbox" spellcheck="true" data-placeholder="Écrire…">${escapeHtml(block.text)}</div></div>`;
  }
  function editorHtml(value, dateISO, periodKey, special) {
    if (special) return '<div class="special-fill" aria-hidden="true"></div>';
    const blocks = parseBody(value);
    return `<div class="block-editor" data-date="${dateISO}" data-period="${periodKey}">${blocks.map(blockHtml).join('')}</div>`;
  }
  function refreshNumbers(editor) {
    if (!editor) return;
    let n = 0;
    for (const block of editor.querySelectorAll(':scope > .editor-block')) {
      if (block.classList.contains('drag-source')) continue;
      if (block.dataset.kind === 'numbered') {
        n += 1;
        const badge = block.querySelector('.number-badge');
        if (badge) badge.textContent = `${n}.`;
      }
    }
  }
  function refreshAllNumbers() { document.querySelectorAll('.block-editor').forEach(refreshNumbers); }

  function headingForWeek(days) {
    const first = days[0], last = days[4];
    if (first.getMonth() === last.getMonth()) return `Semaine du ${first.getDate()} au ${last.getDate()} ${dateFr(last, { month: 'long', year: 'numeric' })}`;
    return `Semaine du ${first.getDate()} ${dateFr(first, { month: 'long' })} au ${last.getDate()} ${dateFr(last, { month: 'long', year: 'numeric' })}`;
  }
  function dayHeaderHtml(date) {
    const rec = dayRecord(date), special = isSpecial(rec);
    const classes = ['day-head']; if (special) classes.push('special'); if (isToday(date)) classes.push('today');
    const cycle = rec?.cycle_day ? `<div class="cycle-diamond"><span>Jour ${rec.cycle_day}</span></div>` : '';
    const label = special ? `<div class="special-label">${escapeHtml(rec?.label || 'Sans cours')}</div>` : cycle;
    return `<button type="button" class="${classes.join(' ')}" data-open-day="${iso(date)}"><div class="day-name">${capitalize(dateFr(date, { weekday: 'long' }))}</div><div class="day-date">${dateFr(date, { day: 'numeric', month: 'long' })}</div>${label}</button>`;
  }
  function noteCellHtml(date, period, mode = 'week') {
    const d = iso(date), rec = dayRecord(date), special = isSpecial(rec), course = courseFor(rec, period.key);
    const id = noteId(d, period.key), value = state.notes.get(id) || '';
    if (mode === 'week') {
      return `<div class="plan-cell ${special ? 'special' : ''} ${period.compact ? 'compact' : ''}" data-note-cell="${id}"><span class="dirty-dot" aria-hidden="true"></span><div class="course-strip ${course ? 'has-course' : ''}">${course ? escapeHtml(course) : '&nbsp;'}</div>${editorHtml(value, d, period.key, special)}</div>`;
    }
    return `<article class="day-card ${special ? 'special' : ''}" data-note-cell="${id}"><div class="day-period"><strong>${escapeHtml(period.label)}</strong><span>${escapeHtml(period.time)}</span></div><div class="day-card-main"><span class="dirty-dot" aria-hidden="true"></span><div class="course-strip ${course ? 'has-course' : ''}">${course ? escapeHtml(course) : '&nbsp;'}</div>${editorHtml(value, d, period.key, special)}</div></article>`;
  }
  function renderWeek() {
    const days = weekDates(state.focusDate);
    el.title.textContent = headingForWeek(days);
    let html = '<div class="week-wrap"><div class="week-grid"><div class="grid-corner"></div>';
    html += days.map(dayHeaderHtml).join('');
    for (const p of PERIODS) {
      html += `<div class="period-side ${p.compact ? 'compact' : ''}"><strong>${escapeHtml(p.label)}</strong><span>${escapeHtml(p.time)}</span></div>`;
      html += days.map(d => noteCellHtml(d, p, 'week')).join('');
    }
    html += '</div></div>';
    el.planner.innerHTML = html;
  }
  function renderDay() {
    const d = state.focusDate, rec = dayRecord(d), special = isSpecial(rec);
    const cycleText = rec?.cycle_day ? `Jour ${rec.cycle_day}` : (rec?.label || 'Sans cours');
    el.title.textContent = `${capitalize(dateFr(d, { weekday: 'long' }))} ${dateFr(d, { day: 'numeric', month: 'long', year: 'numeric' })}`;
    el.planner.innerHTML = `<div class="day-view"><div class="mobile-day-head ${special ? 'special' : ''}"><div class="mobile-day-title"><strong>${capitalize(dateFr(d, { weekday: 'long', day: 'numeric', month: 'long' }))}</strong><span>${escapeHtml(cycleText)}</span></div>${rec?.cycle_day ? `<div class="cycle-diamond"><span>Jour ${rec.cycle_day}</span></div>` : `<div class="special-banner">${escapeHtml(rec?.label || 'Sans cours')}</div>`}</div><div class="day-cards">${PERIODS.map(p => noteCellHtml(d, p, 'day')).join('')}</div></div>`;
  }
  function render() {
    el.segmented.forEach(b => b.classList.toggle('active', b.dataset.view === state.view));
    if (state.view === 'week') renderWeek(); else renderDay();
    refreshAllNumbers();
    bindPlannerEvents();
    if (state.drag) restoreDragPreviewAfterRender();
    updateHistoryButtons();
  }

  function focusEnd(node) {
    node.focus();
    const range = document.createRange(); range.selectNodeContents(node); range.collapse(false);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
  }
  function editorId(editor) { return noteId(editor.dataset.date, editor.dataset.period); }
  function beginEdit(editor) {
    const id = editorId(editor);
    if (state.activeEdit?.id === id) return;
    commitActiveEdit();
    state.activeEdit = { id, before: state.notes.get(id) || '' };
  }
  function commitActiveEdit() {
    const s = state.activeEdit; if (!s) return;
    const after = state.notes.get(s.id) || '';
    state.activeEdit = null;
    if (after !== s.before) pushHistory('Modification', [{ id: s.id, before: s.before, after }]);
  }
  function markDirty(editor) {
    const id = editorId(editor), body = serializeEditor(editor);
    state.notes.set(id, body);
    localStorage.setItem(`${DRAFT_PREFIX}${id}`, body);
    editor.closest('[data-note-cell]')?.classList.add('dirty');
    setSaveStatus('Modification…', 'saving');
    clearTimeout(state.saveTimers.get(id));
    const [date, period] = splitNoteId(id);
    state.saveTimers.set(id, setTimeout(() => saveNote(date, period, body, id), 650));
  }
  async function saveNote(planDate, periodKey, body, id) {
    state.saveTimers.delete(id);
    if (!navigator.onLine) { setSaveStatus('Hors ligne · gardé sur cet appareil', 'error'); return; }
    setSaveStatus('Sauvegarde…', 'saving');
    try {
      await api('', { method: 'POST', body: JSON.stringify({ action: 'save_note', plan_date: planDate, period_key: periodKey, body }) });
      localStorage.removeItem(`${DRAFT_PREFIX}${id}`);
      document.querySelector(`[data-note-cell="${CSS.escape(id)}"]`)?.classList.remove('dirty');
      setSaveStatus('Sauvegardé', 'saved');
    } catch { setSaveStatus('À resynchroniser', 'error'); }
  }

  function updateHistoryButtons() {
    el.undo.disabled = !state.undoStack.length;
    el.redo.disabled = !state.redoStack.length;
    el.undo.title = state.undoStack.length ? `Annuler : ${state.undoStack.at(-1).label}` : 'Rien à annuler';
    el.redo.title = state.redoStack.length ? `Rétablir : ${state.redoStack.at(-1).label}` : 'Rien à rétablir';
  }
  function pushHistory(label, changes) {
    const useful = changes.filter(c => c.before !== c.after);
    if (!useful.length) return;
    state.undoStack.push({ label, changes: useful });
    if (state.undoStack.length > HISTORY_LIMIT) state.undoStack.shift();
    state.redoStack = [];
    updateHistoryButtons();
  }
  async function applyChanges(changes, useAfter = true) {
    setSaveStatus('Sauvegarde…', 'saving');
    for (const c of changes) {
      const body = useAfter ? c.after : c.before;
      state.notes.set(c.id, body);
      localStorage.setItem(`${DRAFT_PREFIX}${c.id}`, body);
    }
    render();
    await Promise.all(changes.map(async c => {
      const body = useAfter ? c.after : c.before;
      const [date, period] = splitNoteId(c.id);
      try {
        await api('', { method: 'POST', body: JSON.stringify({ action: 'save_note', plan_date: date, period_key: period, body }) });
        localStorage.removeItem(`${DRAFT_PREFIX}${c.id}`);
      } catch { }
    }));
    setSaveStatus(navigator.onLine ? 'Sauvegardé' : 'Hors ligne · gardé sur cet appareil', navigator.onLine ? 'saved' : 'error');
  }
  async function undo() {
    if (state.drag) { cancelDrag(); return; }
    commitActiveEdit();
    const entry = state.undoStack.pop(); if (!entry) return;
    state.redoStack.push(entry); updateHistoryButtons();
    await applyChanges(entry.changes, false);
    toast(`Annulé : ${entry.label}`);
  }
  async function redo() {
    commitActiveEdit();
    const entry = state.redoStack.pop(); if (!entry) return;
    state.undoStack.push(entry); updateHistoryButtons();
    await applyChanges(entry.changes, true);
    toast(`Rétabli : ${entry.label}`);
  }

  function convertPlainToNumbered(block, text = '') {
    block.dataset.kind = 'numbered'; block.className = 'editor-block numbered-block';
    block.innerHTML = `<span class="number-badge" role="button" tabindex="0" aria-label="Glisser cet élément"></span><div class="block-text" contenteditable="true" role="textbox" spellcheck="true" data-placeholder="Écrire…">${escapeHtml(text)}</div>`;
    return block.querySelector('.block-text');
  }
  function convertNumberedToPlain(block) {
    block.dataset.kind = 'plain'; block.className = 'editor-block plain-block';
    block.innerHTML = '<div class="block-text" contenteditable="true" role="textbox" spellcheck="true" data-placeholder="Écrire…"></div>';
    return block.querySelector('.block-text');
  }
  function makeBlock(kind, text = '') { const wrap = document.createElement('div'); wrap.innerHTML = blockHtml({ kind, text }); return wrap.firstElementChild; }
  function hasNumberedBefore(block) {
    let node = block.previousElementSibling;
    while (node) { if (node.dataset?.kind === 'numbered' && !node.classList.contains('drag-source')) return true; node = node.previousElementSibling; }
    return false;
  }
  function handleBlockKeydown(e, textEl) {
    if (state.drag) return;
    const block = textEl.closest('.editor-block'), editor = textEl.closest('.block-editor');
    if (!block || !editor) return;
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault(); beginEdit(editor);
      const kind = e.shiftKey ? 'plain' : ((block.dataset.kind === 'numbered' || hasNumberedBefore(block)) ? 'numbered' : 'plain');
      const newBlock = makeBlock(kind, ''); block.after(newBlock); refreshNumbers(editor); markDirty(editor); focusEnd(newBlock.querySelector('.block-text')); return;
    }
    if (e.key === 'Backspace' && !textEl.textContent) {
      e.preventDefault(); beginEdit(editor);
      if (block.dataset.kind === 'numbered') {
        const t = convertNumberedToPlain(block); refreshNumbers(editor); markDirty(editor); focusEnd(t);
      } else if (editor.querySelectorAll(':scope > .editor-block').length > 1) {
        const prev = block.previousElementSibling || block.nextElementSibling; block.remove(); refreshNumbers(editor); markDirty(editor); if (prev) focusEnd(prev.querySelector('.block-text'));
      }
    }
  }
  function sanitizeEditable(textEl) {
    const normalized = textEl.textContent.replace(/[\r\n]+/g, ' ');
    if (normalized !== textEl.textContent) textEl.textContent = normalized;
  }
  function handleBlockInput(textEl) {
    const block = textEl.closest('.editor-block'), editor = textEl.closest('.block-editor');
    if (!block || !editor) return;
    beginEdit(editor); sanitizeEditable(textEl);
    if (block.dataset.kind === 'plain') {
      const raw = textEl.textContent; const m = raw.match(/^\s*\d+\.\s*(.*)$/);
      if (m) { const newText = convertPlainToNumbered(block, m[1]); refreshNumbers(editor); markDirty(editor); focusEnd(newText); return; }
    }
    refreshNumbers(editor); markDirty(editor);
  }
  function plainPaste(e) {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text').replace(/[\r\n]+/g, ' ');
    const sel = getSelection(); if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0); range.deleteContents(); range.insertNode(document.createTextNode(text)); range.collapse(false); sel.removeAllRanges(); sel.addRange(range);
    e.target.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
  }
  function bindPlannerEvents() {
    el.planner.querySelectorAll('[data-open-day]').forEach(btn => btn.addEventListener('click', () => {
      if (state.drag) return; commitActiveEdit(); state.focusDate = parseISO(btn.dataset.openDay); state.view = 'day'; localStorage.setItem(VIEW_STORAGE, 'day'); loadCurrent();
    }));
    el.planner.querySelectorAll('.block-editor').forEach(editor => {
      editor.addEventListener('focusin', () => beginEdit(editor));
      editor.addEventListener('focusout', () => setTimeout(() => { if (!editor.contains(document.activeElement)) commitActiveEdit(); }, 0));
      editor.addEventListener('keydown', e => {
        const text = e.target.closest('.block-text'); if (text) handleBlockKeydown(e, text);
        const badge = e.target.closest('.number-badge'); if (badge && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); startDragFromKeyboard(badge); }
      });
      editor.addEventListener('input', e => { const t = e.target.closest('.block-text'); if (t) handleBlockInput(t); });
      editor.addEventListener('paste', e => { if (e.target.closest('.block-text')) plainPaste(e); });
      editor.addEventListener('pointerdown', e => { const badge = e.target.closest('.number-badge'); if (badge) startDrag(e, badge); });
    });
  }

  function dragUi() {
    let ghost = document.getElementById('dragGhost');
    if (!ghost) { ghost = document.createElement('div'); ghost.id = 'dragGhost'; ghost.className = 'drag-ghost'; document.body.appendChild(ghost); }
    let hud = document.getElementById('dragHud');
    if (!hud) { hud = document.createElement('div'); hud.id = 'dragHud'; hud.className = 'drag-hud'; hud.innerHTML = '<span>Déplacement en cours</span><button type="button" id="cancelDragBtn">Annuler</button>'; document.body.appendChild(hud); hud.querySelector('button').addEventListener('click', cancelDrag); }
    let prev = document.getElementById('dragPrevEdge'), next = document.getElementById('dragNextEdge');
    if (!prev) { prev = document.createElement('div'); prev.id = 'dragPrevEdge'; prev.className = 'drag-edge drag-edge-prev'; document.body.appendChild(prev); }
    if (!next) { next = document.createElement('div'); next.id = 'dragNextEdge'; next.className = 'drag-edge drag-edge-next'; document.body.appendChild(next); }
    return { ghost, hud, prev, next };
  }
  function showDragUi(itemText) {
    const ui = dragUi(); ui.ghost.textContent = itemText || 'Élément'; ui.ghost.classList.add('show'); ui.hud.classList.add('show'); ui.prev.classList.add('show'); ui.next.classList.add('show'); updateEdgeLabels(); document.body.classList.add('dragging-plan-item');
  }
  function hideDragUi() {
    const ui = dragUi(); ui.ghost.classList.remove('show'); ui.hud.classList.remove('show'); ui.prev.classList.remove('show', 'armed'); ui.next.classList.remove('show', 'armed'); document.body.classList.remove('dragging-plan-item');
  }
  function updateEdgeLabels() {
    const ui = dragUi();
    if (state.view === 'week') { ui.prev.textContent = '‹ Semaine précédente'; ui.next.textContent = 'Semaine suivante ›'; }
    else { ui.prev.textContent = '‹ Jour précédent'; ui.next.textContent = 'Jour suivant ›'; }
  }
  function positionGhost(x, y) { dragUi().ghost.style.transform = `translate3d(${x + 16}px,${y + 14}px,0)`; }
  function makePlaceholder() {
    const p = document.createElement('div'); p.className = 'editor-block numbered-block drag-placeholder'; p.dataset.kind = 'numbered'; p.innerHTML = '<span class="number-badge"></span><div class="block-text placeholder-text"></div>'; return p;
  }
  function placeholderIndex(editor, placeholder) {
    let index = 0;
    for (const n of editor.children) {
      if (n === placeholder) break;
      if (!n.classList?.contains('editor-block')) continue;
      if (n.classList.contains('drag-source')) continue;
      index += 1;
    }
    return index;
  }
  function placePlaceholder(editor, before = null) {
    const d = state.drag; if (!d) return;
    if (!d.placeholder) d.placeholder = makePlaceholder();
    d.placeholder.querySelector('.placeholder-text').textContent = d.item.text || '';
    const oldEditor = d.placeholder.parentElement;
    if (before) editor.insertBefore(d.placeholder, before); else editor.appendChild(d.placeholder);
    if (oldEditor && oldEditor !== editor) refreshNumbers(oldEditor);
    d.targetEditor = editor; d.targetDate = editor.dataset.date; d.targetPeriod = editor.dataset.period; d.targetId = editorId(editor); d.targetIndex = placeholderIndex(editor, d.placeholder); refreshNumbers(editor);
  }
  function clearPlaceholder() {
    const d = state.drag; if (!d?.placeholder) return;
    const old = d.placeholder.parentElement; d.placeholder.remove(); d.placeholder = null; if (old) refreshNumbers(old);
    d.targetEditor = null; d.targetId = null; d.targetDate = null; d.targetPeriod = null; d.targetIndex = null;
  }
  function nodeInsertionPoint(editor, y) {
    const d = state.drag;
    if (d?.placeholder?.parentElement === editor) {
      const pr = d.placeholder.getBoundingClientRect();
      if (y >= pr.top && y <= pr.bottom) return { keep: true, before: null };
    }
    const nodes = [...editor.querySelectorAll(':scope > .editor-block')].filter(n => !n.classList.contains('drag-placeholder') && !n.classList.contains('drag-source'));
    for (const node of nodes) { const r = node.getBoundingClientRect(); if (y < r.top + r.height / 2) return { keep: false, before: node }; }
    return { keep: false, before: null };
  }
  function updateDragTarget(x, y) {
    const d = state.drag; if (!d || d.navigating) return;
    const hit = document.elementFromPoint(x, y); const editor = hit?.closest?.('.block-editor'); if (!editor) return;
    const point = nodeInsertionPoint(editor, y);
    if (point.keep) { d.targetEditor = editor; d.targetDate = editor.dataset.date; d.targetPeriod = editor.dataset.period; d.targetId = editorId(editor); d.targetIndex = placeholderIndex(editor, d.placeholder); return; }
    placePlaceholder(editor, point.before);
  }
  function restoreDragPreviewAfterRender() {
    const d = state.drag; if (!d) return;
    const sourceEditor = document.querySelector(`.block-editor[data-date="${CSS.escape(d.sourceDate)}"][data-period="${CSS.escape(d.sourcePeriod)}"]`);
    if (sourceEditor) {
      const source = [...sourceEditor.querySelectorAll(':scope > .editor-block')][d.sourceIndex];
      if (source) { source.classList.add('drag-source'); d.sourceEl = source; }
      if (!d.targetId) {
        const siblings = [...sourceEditor.querySelectorAll(':scope > .editor-block')].filter(n => !n.classList.contains('drag-source'));
        placePlaceholder(sourceEditor, siblings[d.sourceIndex] || null);
      }
      refreshNumbers(sourceEditor);
    }
    showDragUi(d.item.text); positionGhost(d.lastX, d.lastY);
  }
  function startDrag(e, badge) {
    if (state.drag || (typeof e.button === 'number' && e.button > 0)) return;
    e.preventDefault(); commitActiveEdit();
    const block = badge.closest('.editor-block'), editor = badge.closest('.block-editor');
    if (!block || !editor || block.dataset.kind !== 'numbered') return;
    const all = [...editor.querySelectorAll(':scope > .editor-block')];
    const sourceIndex = all.indexOf(block), sourceId = editorId(editor), sourceBody = state.notes.get(sourceId) ?? serializeEditor(editor), sourceBlocks = parseBody(sourceBody), item = sourceBlocks[sourceIndex];
    if (!item || item.kind !== 'numbered') return;
    const rect = block.getBoundingClientRect();
    state.drag = { pointerId: e.pointerId ?? null, sourceId, sourceDate: editor.dataset.date, sourcePeriod: editor.dataset.period, sourceBody, sourceBlocks, sourceIndex, sourceOriginalRect: rect, item: { ...item }, sourceEl: block, placeholder: null, targetId: null, targetDate: null, targetPeriod: null, targetIndex: null, targetEditor: null, edgeDir: 0, edgeTimer: null, edgeConsumed: 0, navigating: false, lastX: e.clientX ?? rect.left, lastY: e.clientY ?? rect.top };
    block.classList.add('drag-source');
    placePlaceholder(editor, block.nextElementSibling);
    if (state.drag) state.drag.targetIndex = sourceIndex;
    refreshNumbers(editor); showDragUi(item.text); positionGhost(state.drag.lastX, state.drag.lastY);
    document.addEventListener('pointermove', onDragMove, { capture: true });
    document.addEventListener('pointerup', onDragEnd, { capture: true });
    document.addEventListener('pointercancel', cancelDrag, { capture: true });
    document.addEventListener('keydown', onDragKey, { capture: true });
  }
  function startDragFromKeyboard(badge) { const r = badge.getBoundingClientRect(); startDrag({ preventDefault() {}, button: 0, pointerId: null, clientX: r.left, clientY: r.top }, badge); }
  function edgeDirection(x) { if (x < 82) return -1; if (x > innerWidth - 82) return 1; return 0; }
  function handleEdge(x) {
    const d = state.drag; if (!d) return;
    const dir = edgeDirection(x), ui = dragUi(); ui.prev.classList.toggle('armed', dir === -1); ui.next.classList.toggle('armed', dir === 1);
    if (dir === 0) { d.edgeConsumed = 0; d.edgeDir = 0; clearTimeout(d.edgeTimer); d.edgeTimer = null; return; }
    if (d.edgeConsumed === dir || (d.edgeDir === dir && d.edgeTimer)) return;
    clearTimeout(d.edgeTimer); d.edgeDir = dir; d.edgeTimer = setTimeout(() => navigateDuringDrag(dir), 650);
  }
  async function navigateDuringDrag(dir) {
    const d = state.drag; if (!d) return;
    clearTimeout(d.edgeTimer); d.edgeTimer = null; d.edgeConsumed = dir; d.navigating = true; clearPlaceholder();
    let target = state.view === 'week' ? addDays(state.focusDate, 7 * dir) : nextWeekday(state.focusDate, dir); target = clampSchool(target);
    if (iso(target) === iso(state.focusDate)) { d.navigating = false; return; }
    await ensureDateLoaded(target); state.focusDate = target; render(); updateEdgeLabels(); d.navigating = false; positionGhost(d.lastX, d.lastY);
  }
  function onDragMove(e) {
    const d = state.drag; if (!d) return; if (d.pointerId !== null && e.pointerId !== d.pointerId) return;
    e.preventDefault(); d.lastX = e.clientX; d.lastY = e.clientY; positionGhost(e.clientX, e.clientY); handleEdge(e.clientX); if (!edgeDirection(e.clientX)) updateDragTarget(e.clientX, e.clientY);
  }
  function onDragKey(e) { if (e.key === 'Escape') { e.preventDefault(); cancelDrag(); } }
  function sourceAfterRemoval(d) { const blocks = d.sourceBlocks.map(b => ({ ...b })); blocks.splice(d.sourceIndex, 1); return blocks; }
  async function onDragEnd(e) {
    const d = state.drag; if (!d) return; if (d.pointerId !== null && e.pointerId !== d.pointerId) return;
    e.preventDefault(); if (!d.targetId || d.targetIndex == null) { cancelDrag(); return; }
    const targetId = d.targetId; let changes = [];
    if (targetId === d.sourceId) {
      const before = d.sourceBody, blocks = sourceAfterRemoval(d), insertAt = Math.max(0, Math.min(d.targetIndex, blocks.length)); blocks.splice(insertAt, 0, { ...d.item }); const after = serializeBlocks(blocks); changes = [{ id: d.sourceId, before, after }];
    } else {
      const sourceAfter = serializeBlocks(sourceAfterRemoval(d)), targetBefore = state.notes.get(targetId) || '';
      let targetBlocks = parseBody(targetBefore); if (targetBefore === '' && targetBlocks.length === 1 && targetBlocks[0].kind === 'plain' && targetBlocks[0].text === '') targetBlocks = [];
      const insertAt = Math.max(0, Math.min(d.targetIndex, targetBlocks.length)); targetBlocks.splice(insertAt, 0, { ...d.item }); const targetAfter = serializeBlocks(targetBlocks);
      changes = [{ id: d.sourceId, before: d.sourceBody, after: sourceAfter }, { id: targetId, before: targetBefore, after: targetAfter }];
    }
    finishDragUi();
    const real = changes.filter(c => c.before !== c.after);
    if (!real.length) { render(); toast('Élément laissé au même endroit'); return; }
    pushHistory('Déplacement', real); await applyChanges(real, true); toast('Élément déplacé · ↶ Annuler disponible');
  }
  function finishDragUi() {
    const d = state.drag; if (!d) return;
    clearTimeout(d.edgeTimer); if (d.placeholder?.parentElement) d.placeholder.remove(); if (d.sourceEl) d.sourceEl.classList.remove('drag-source'); hideDragUi();
    document.removeEventListener('pointermove', onDragMove, true); document.removeEventListener('pointerup', onDragEnd, true); document.removeEventListener('pointercancel', cancelDrag, true); document.removeEventListener('keydown', onDragKey, true);
    state.drag = null; refreshAllNumbers();
  }
  function cancelDrag(e) { if (e?.preventDefault) e.preventDefault(); if (!state.drag) return; finishDragUi(); render(); toast('Déplacement annulé'); }

  async function retryDrafts() {
    if (!state.key || !navigator.onLine) return;
    const drafts = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith(DRAFT_PREFIX)) drafts.push(k); }
    for (const k of drafts) { const id = k.slice(DRAFT_PREFIX.length), [d, p] = splitNoteId(id), body = localStorage.getItem(k) || ''; try { await api('', { method: 'POST', body: JSON.stringify({ action: 'save_note', plan_date: d, period_key: p, body }) }); localStorage.removeItem(k); } catch { break; } }
    if (drafts.length && !state.drag) loadCurrent();
  }
  function shift(direction) { if (state.drag) return; commitActiveEdit(); state.focusDate = state.view === 'week' ? addDays(state.focusDate, 7 * direction) : nextWeekday(state.focusDate, direction); state.focusDate = clampSchool(state.focusDate); loadCurrent(); }
  function goToday() { if (state.drag) return; commitActiveEdit(); state.focusDate = usefulDate(new Date()); loadCurrent(); }
  function showAccess(message = '') { el.shell.hidden = true; el.accessError.textContent = message; el.accessKey.value = ''; if (!el.accessDialog.open) el.accessDialog.showModal(); setTimeout(() => el.accessKey.focus(), 60); }
  async function unlockFromForm(event) {
    event.preventDefault(); const candidate = el.accessKey.value.trim(); if (!candidate) return;
    el.unlock.disabled = true; el.unlock.textContent = 'Vérification…'; el.accessError.textContent = '';
    const ok = await validateKey(candidate); el.unlock.disabled = false; el.unlock.textContent = 'Ouvrir'; if (!ok) { el.accessError.textContent = 'Cette clé n’est pas valide.'; return; }
    state.key = candidate; localStorage.setItem(ACCESS_STORAGE, candidate); el.accessDialog.close(); el.shell.hidden = false; await loadCurrent();
  }
  function updateNetwork() { el.network.textContent = navigator.onLine ? 'En ligne' : 'Hors ligne'; if (navigator.onLine) retryDrafts(); }
  function installHelp() { if (state.installPrompt) { state.installPrompt.prompt(); return; } const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent); toast(isiOS ? 'Sur iPhone/iPad : Partager → Sur l’écran d’accueil.' : 'Dans le navigateur : menu → Installer l’application / Ajouter à l’écran d’accueil.', 4500); }

  function injectRefinementStyles() {
    const style = document.createElement('style');
    style.id = 'planner-refinements-v4';
    style.textContent = `
      .block-editor{display:block!important;overflow:visible!important;max-height:none!important;height:auto!important;min-height:86px;padding:8px 10px!important;background:transparent!important;}
      .editor-block{position:relative;display:grid!important;grid-template-columns:auto minmax(0,1fr);align-items:start;gap:5px;margin:0!important;padding:1px 0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;min-height:24px;transition:transform .12s ease,background-color .12s ease;}
      .plain-block{grid-template-columns:minmax(0,1fr);}
      .number-badge{display:block!important;min-width:22px;padding:1px 1px 1px 0!important;margin:0!important;border:0!important;background:transparent!important;box-shadow:none!important;border-radius:0!important;color:#173246!important;font:inherit!important;font-weight:500!important;line-height:1.42!important;text-align:right;cursor:grab;user-select:none;-webkit-user-select:none;touch-action:none;}
      .number-badge:active{cursor:grabbing;}
      .block-text{display:block;min-width:0;min-height:22px;padding:1px 0!important;margin:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;outline:0;color:#173246;line-height:1.42;font-size:.9rem;white-space:pre-wrap;overflow-wrap:anywhere;}
      .block-text:focus{background:rgba(238,248,252,.32)!important;box-shadow:none!important;outline:0!important;}
      .block-text:empty:focus:before{content:attr(data-placeholder);color:#9aaab4;pointer-events:none;}
      .plan-cell,.day-card,.day-card-main{overflow:visible!important;}
      .plan-cell{height:auto!important;}
      .week-grid{grid-auto-rows:auto!important;}
      .day-card .block-editor{min-height:82px;}
      .day-card .block-text{font-size:.96rem;}
      .drag-source{display:none!important;}
      .drag-placeholder{background:rgba(219,241,250,.42)!important;border-top:2px solid rgba(11,107,150,.55)!important;border-bottom:2px solid rgba(11,107,150,.18)!important;padding-top:3px!important;padding-bottom:3px!important;}
      .drag-placeholder .block-text{pointer-events:none;color:#284c61!important;}
      .drag-placeholder .number-badge{color:#0b6b96!important;cursor:default;}
      .drag-ghost{position:fixed;left:0;top:0;z-index:10002;max-width:min(420px,70vw);padding:8px 11px;border-radius:10px;background:rgba(255,255,255,.96);border:1px solid #b9ccd7;color:#173246;font-size:.88rem;line-height:1.3;box-shadow:0 10px 28px rgba(13,48,68,.18);pointer-events:none;opacity:0;transition:opacity .08s ease;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .drag-ghost.show{opacity:1;}
      .drag-hud{position:fixed;left:50%;bottom:calc(18px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:10003;display:none;align-items:center;gap:10px;padding:7px 8px 7px 12px;background:#15394f;color:#fff;border-radius:12px;box-shadow:0 8px 24px rgba(0,25,40,.22);font-size:.8rem;}
      .drag-hud.show{display:flex;}
      .drag-hud button{border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.13);color:#fff;border-radius:8px;padding:5px 9px;font-weight:750;cursor:pointer;}
      .drag-edge{position:fixed;top:0;bottom:0;width:86px;z-index:10001;display:none;align-items:center;justify-content:center;padding:8px;background:rgba(7,87,127,.08);color:#07577f;font-size:.78rem;font-weight:800;text-align:center;pointer-events:none;}
      .drag-edge.show{display:flex;}
      .drag-edge.armed{background:rgba(7,87,127,.2);}
      .drag-edge-prev{left:0;}.drag-edge-next{right:0;}
      body.dragging-plan-item{user-select:none;-webkit-user-select:none;}
      body.dragging-plan-item .block-text{pointer-events:none;}
      .block-editor,.plan-cell,.day-card-main{scrollbar-width:none;}
      .block-editor::-webkit-scrollbar,.plan-cell::-webkit-scrollbar,.day-card-main::-webkit-scrollbar{display:none;}
      @media(max-width:700px){.block-editor{padding:8px 9px!important;}.number-badge{min-width:25px;padding-right:3px!important;}.block-text{font-size:.98rem;}.drag-hud span{display:none;}}
      @media print{.drag-ghost,.drag-hud,.drag-edge{display:none!important;}}
    `;
    document.head.appendChild(style);
  }

  function wireUi() {
    el.prev.addEventListener('click', () => shift(-1)); el.next.addEventListener('click', () => shift(1)); el.today.addEventListener('click', goToday);
    el.undo.addEventListener('click', undo); el.redo.addEventListener('click', redo);
    el.segmented.forEach(btn => btn.addEventListener('click', () => { if (state.drag || state.view === btn.dataset.view) return; commitActiveEdit(); state.view = btn.dataset.view; localStorage.setItem(VIEW_STORAGE, state.view); loadCurrent(); }));
    el.accessForm.addEventListener('submit', unlockFromForm);
    el.toggleKey.addEventListener('click', () => { const show = el.accessKey.type === 'password'; el.accessKey.type = show ? 'text' : 'password'; el.toggleKey.textContent = show ? 'Masquer' : 'Afficher'; });
    el.settings.addEventListener('click', () => el.settingsDialog.showModal());
    el.resetKey.addEventListener('click', () => { localStorage.removeItem(ACCESS_STORAGE); state.key = ''; el.settingsDialog.close(); showAccess('Entre la nouvelle clé d’accès.'); });
    el.install.addEventListener('click', installHelp); el.installHelp.addEventListener('click', installHelp);
    addEventListener('online', updateNetwork); addEventListener('offline', updateNetwork);
    addEventListener('beforeinstallprompt', e => { e.preventDefault(); state.installPrompt = e; el.install.hidden = false; });
    addEventListener('appinstalled', () => { state.installPrompt = null; el.install.hidden = true; toast('Application installée.'); });
    addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
      else if ((e.ctrlKey || e.metaKey) && ((e.shiftKey && e.key.toLowerCase() === 'z') || e.key.toLowerCase() === 'y')) { e.preventDefault(); redo(); }
    });
  }

  async function boot() {
    injectRefinementStyles(); dragUi(); wireUi(); updateNetwork(); updateHistoryButtons();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
    if (!state.key) { showAccess(); return; }
    try { await api('?action=ping'); el.shell.hidden = false; await loadCurrent(); }
    catch { localStorage.removeItem(ACCESS_STORAGE); state.key = ''; showAccess('Ta clé d’accès doit être entrée de nouveau.'); }
  }

  boot();
})();
