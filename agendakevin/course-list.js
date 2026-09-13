(() => {
  'use strict';

  const API_URL = 'https://ojyswaxuqwnqilrvtjll.supabase.co/functions/v1/planner-api';
  const ACCESS_STORAGE = 'cr-planner-access-v1';
  const SCHOOL_START = '2026-08-24';
  const SCHOOL_END = '2027-06-24';
  const GROUPS = ['FRA3SE-31', 'FRA3SE-32', 'FRA5SE-51'];
  const GROUP_COLORS = {
    'FRA3SE-31': '#7ae7bf',
    'FRA3SE-32': '#46d6db',
    'FRA5SE-51': '#fbd75b',
  };

  let yearData = null;
  let yearLoadedAt = 0;
  let activeGroup = 'FRA3SE-31';
  let showEmpty = false;

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  }

  function toast(message, ms = 2600) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), ms);
  }

  async function api(path) {
    const key = localStorage.getItem(ACCESS_STORAGE) || '';
    if (!key) throw new Error('Mot de passe absent sur cet appareil.');
    const res = await fetch(`${API_URL}${path}`, {
      headers: { 'x-planner-key': key },
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
    return data;
  }

  function formatDate(dateISO) {
    const [y, m, d] = dateISO.split('-').map(Number);
    return new Intl.DateTimeFormat('fr-CA', {
      day: 'numeric', month: 'long', year: 'numeric',
    }).format(new Date(y, m - 1, d, 12));
  }

  function parseBody(body) {
    const raw = String(body || '').replace(/\r/g, '').trimEnd();
    if (!raw) return [];
    return raw.split('\n').map(line => {
      const m = line.match(/^\s*\d+\.\s*(.*)$/);
      return m ? { kind: 'numbered', text: m[1] } : { kind: 'plain', text: line };
    });
  }

  function bodyFromVisibleCell(cell) {
    const editor = $('.block-editor', cell);
    if (!editor) return null;
    const lines = [];
    let n = 0;
    for (const node of editor.children) {
      if (!node.classList.contains('editor-block')) continue;
      if (node.classList.contains('drag-source') || node.classList.contains('drag-placeholder')) continue;
      const text = $('.block-text', node)?.textContent?.replace(/[\r\n]+/g, ' ') ?? '';
      if (node.dataset.kind === 'numbered') lines.push(`${++n}. ${text}`.trimEnd());
      else lines.push(text);
    }
    while (lines.length && !lines.at(-1).trim()) lines.pop();
    return lines.join('\n');
  }

  function overlayVisibleNotes(notesMap) {
    $$('[data-note-cell]').forEach(cell => {
      const id = cell.dataset.noteCell || '';
      const split = id.lastIndexOf(':');
      if (split < 0) return;
      const body = bodyFromVisibleCell(cell);
      if (body == null) return;
      notesMap.set(id, body);
    });
  }

  async function loadYear({ force = false } = {}) {
    if (!force && yearData && Date.now() - yearLoadedAt < 30000) return yearData;
    const data = await api(`?action=year_plan&from=${SCHOOL_START}&to=${SCHOOL_END}`);
    yearData = data;
    yearLoadedAt = Date.now();
    return data;
  }

  function buildCourses(group, data) {
    const meta = window.CRPlannerCourseMeta;
    if (!meta) return [];
    const notesMap = new Map((data.notes || []).map(n => [`${n.plan_date}:${n.period_key}`, n.body || '']));
    overlayVisibleNotes(notesMap);

    const rows = [];
    for (const rec of data.calendar || []) {
      if (rec.day_kind !== 'school' || !rec.cycle_day) continue;
      for (const periodKey of ['p1', 'p2', 'p3', 'p4', 'p5']) {
        if (meta.courseAt(rec.plan_date, periodKey) !== group) continue;
        const body = notesMap.get(`${rec.plan_date}:${periodKey}`) || '';
        rows.push({
          date: rec.plan_date,
          periodKey,
          courseNumber: meta.courseNumber(group, rec.plan_date),
          body,
        });
      }
    }
    return rows;
  }

  function injectStyles() {
    if ($('#courseListStyles')) return;
    const style = document.createElement('style');
    style.id = 'courseListStyles';
    style.textContent = `
      .header-course-button{height:42px;min-width:62px;padding:0 11px;border:1px solid rgba(255,255,255,.26);border-radius:12px;background:rgba(255,255,255,.10);color:#fff;cursor:pointer;font-weight:800}
      .header-course-button:hover{background:rgba(255,255,255,.18)}
      .course-list-dialog{width:min(94vw,900px);height:min(88vh,900px);border:0;border-radius:20px;padding:0;color:#153247;box-shadow:0 28px 80px rgba(5,40,60,.30)}
      .course-list-dialog::backdrop{background:rgba(3,31,49,.60);backdrop-filter:blur(5px)}
      .cl-shell{height:100%;display:grid;grid-template-rows:auto auto 1fr;padding:22px 24px 18px;gap:13px}
      .cl-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.cl-top h2{margin:0;font-size:1.35rem}.cl-top p{margin:3px 0 0;color:#6a7f8b;font-size:.84rem}.cl-close{border:0;border-radius:10px;background:#edf3f6;color:#173246;padding:8px 11px;font-weight:850;cursor:pointer}
      .cl-controls{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.cl-tabs{display:flex;gap:6px;flex-wrap:wrap}.cl-tab{border:1px solid #c6d3da;border-radius:10px;background:#fff;color:#173246;padding:8px 11px;font-weight:850;cursor:pointer;box-shadow:inset 0 3px 0 var(--group-color)}.cl-tab.active{background:#173f56;color:#fff;border-color:#173f56}.cl-empty-toggle{display:flex;align-items:center;gap:7px;color:#607580;font-size:.8rem;font-weight:700}.cl-empty-toggle input{width:16px;height:16px}
      .cl-list{overflow:auto;padding:3px 8px 12px 1px}.cl-loading{display:grid;place-items:center;min-height:220px;color:#6c808b;font-weight:750}.cl-course{padding:14px 4px 17px;border-bottom:1px solid #d8e0e5}.cl-course:last-child{border-bottom:0}.cl-title{font-size:.99rem;line-height:1.3;margin:0 0 8px;color:#122f41}.cl-title strong{text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px}.cl-items{margin:0;padding-left:24px;display:grid;gap:4px;color:#1d3544;font-size:.92rem;line-height:1.42}.cl-plain{margin:4px 0;color:#1d3544;font-size:.92rem;line-height:1.42;white-space:pre-wrap}.cl-empty{color:#8798a2;font-style:italic;font-size:.86rem}.cl-none{padding:32px 8px;text-align:center;color:#71858f}.cl-count{font-size:.75rem;color:#7b8c95;margin-left:7px;font-weight:650;text-decoration:none!important}
      @media(max-width:600px){.header-course-button{min-width:52px;padding:0 8px;font-size:.78rem}.course-list-dialog{width:96vw;height:92vh}.cl-shell{padding:18px 15px 14px}.cl-course{padding-top:12px}.cl-title{font-size:.94rem}.cl-items,.cl-plain{font-size:.88rem}}
      @media print{.course-list-dialog{display:none!important}}
    `;
    document.head.appendChild(style);
  }

  function ensureDialog() {
    let dialog = $('#courseListDialog');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'courseListDialog';
    dialog.className = 'course-list-dialog';
    dialog.innerHTML = `
      <div class="cl-shell">
        <div class="cl-top">
          <div><h2>Planification par cours</h2><p>Une vue continue de ta planification, regroupée par groupe.</p></div>
          <button type="button" class="cl-close">Fermer</button>
        </div>
        <div class="cl-controls">
          <div class="cl-tabs">${GROUPS.map(g => `<button type="button" class="cl-tab" data-group="${g}" style="--group-color:${GROUP_COLORS[g]}">${g}</button>`).join('')}</div>
          <label class="cl-empty-toggle"><input id="clShowEmpty" type="checkbox">Afficher les cours sans planif</label>
        </div>
        <div class="cl-list" id="courseListBody"></div>
      </div>`;
    document.body.appendChild(dialog);
    $('.cl-close', dialog).addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    $$('.cl-tab', dialog).forEach(btn => btn.addEventListener('click', () => {
      activeGroup = btn.dataset.group;
      renderCurrent();
    }));
    $('#clShowEmpty', dialog).addEventListener('change', e => {
      showEmpty = e.currentTarget.checked;
      renderCurrent();
    });
    return dialog;
  }

  function courseBodyHtml(body) {
    const blocks = parseBody(body);
    const numbered = blocks.filter(b => b.kind === 'numbered');
    const plain = blocks.filter(b => b.kind === 'plain' && b.text.trim());
    let html = '';
    if (numbered.length) html += `<ol class="cl-items">${numbered.map(b => `<li>${escapeHtml(b.text)}</li>`).join('')}</ol>`;
    if (plain.length) html += plain.map(b => `<div class="cl-plain">${escapeHtml(b.text)}</div>`).join('');
    return html || '<div class="cl-empty">Aucune planification inscrite.</div>';
  }

  function renderCurrent() {
    const dialog = ensureDialog();
    $$('.cl-tab', dialog).forEach(btn => btn.classList.toggle('active', btn.dataset.group === activeGroup));
    const bodyEl = $('#courseListBody', dialog);
    if (!yearData) { bodyEl.innerHTML = '<div class="cl-loading">Chargement…</div>'; return; }
    const all = buildCourses(activeGroup, yearData);
    const rows = showEmpty ? all : all.filter(r => String(r.body || '').trim());
    if (!rows.length) {
      bodyEl.innerHTML = '<div class="cl-none">Aucun cours planifié à afficher pour ce groupe.</div>';
      return;
    }
    bodyEl.innerHTML = rows.map(r => `
      <section class="cl-course">
        <h3 class="cl-title"><strong>Cours #${r.courseNumber ?? '?'} - ${escapeHtml(formatDate(r.date))}</strong></h3>
        ${courseBodyHtml(r.body)}
      </section>`).join('');
  }

  async function openCourseList() {
    const dialog = ensureDialog();
    if (!dialog.open) dialog.showModal();
    $('#courseListBody', dialog).innerHTML = '<div class="cl-loading">Chargement de la planification…</div>';
    try {
      const meta = window.CRPlannerCourseMeta;
      if (!meta) throw new Error('Les métadonnées de cours ne sont pas encore prêtes.');
      await meta.ensureCalendar();
      await loadYear({ force: true });
      renderCurrent();
    } catch (err) {
      $('#courseListBody', dialog).innerHTML = `<div class="cl-none">${escapeHtml(err.message || 'Impossible de charger la planification.')}</div>`;
    }
  }

  function start() {
    injectStyles();
    const btn = document.getElementById('courseListBtn');
    if (btn) btn.addEventListener('click', openCourseList);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
