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
    if (mode === 'week') {
      return `<div class="plan-cell ${special?'special':''} ${period.compact?'compact':''}" data-note-cell="${id}">
        <span class="dirty-dot" aria-hidden="true"></span>
        <div class="course-strip ${course?'has-course':''}">${course ? escapeHtml(course) : '&nbsp;'}</div>
        <textarea class="note-area" data-date="${d}" data-period="${period.key}" aria-label="${escapeHtml(period.label)} — ${escapeHtml(dateFr(date,{weekday:'long',day:'numeric',month:'long'}))}">${escapeHtml(value)}</textarea>
      </div>`;
    }
    return `<article class="day-card ${special?'special':''}" data-note-cell="${id}">
      <div class="day-period"><strong>${escapeHtml(period.label)}</strong><span>${escapeHtml(period.time)}</span></div>
      <div class="day-card-main">
        <span class="dirty-dot" aria-hidden="true"></span>
        <div class="course-strip ${course?'has-course':''}">${course ? escapeHtml(course) : '&nbsp;'}</div>
        <textarea class="note-area" data-date="${d}" data-period="${period.key}" aria-label="${escapeHtml(period.label)} — ${escapeHtml(dateFr(date,{weekday:'long',day:'numeric',month:'long'}))}">${escapeHtml(value)}</textarea>
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

  function bindPlannerEvents() {
    el.planner.querySelectorAll('[data-open-day]').forEach(btn => btn.addEventListener('click', () => {
      state.focusDate = parseISO(btn.dataset.openDay);
      state.view = 'day';
      localStorage.setItem(VIEW_STORAGE,'day');
      loadCurrent();
    }));

    el.planner.querySelectorAll('.note-area').forEach(area => {
      area.addEventListener('input', () => {
        const id = noteId(area.dataset.date, area.dataset.period);
        const body = area.value;
        state.notes.set(id, body);
        localStorage.setItem(`${DRAFT_PREFIX}${id}`, body);
        area.closest('[data-note-cell]')?.classList.add('dirty');
        setSaveStatus('Modification…', 'saving');
        if (state.view === 'day') {
          area.style.height = 'auto'; area.style.height = `${Math.max(93,area.scrollHeight)}px`;
        }
        clearTimeout(state.saveTimers.get(id));
        state.saveTimers.set(id, setTimeout(() => saveNote(area.dataset.date, area.dataset.period, body, id), 700));
      });
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
