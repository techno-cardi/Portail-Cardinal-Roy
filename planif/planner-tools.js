(() => {
  'use strict';

  const API_URL = 'https://ojyswaxuqwnqilrvtjll.supabase.co/functions/v1/planner-api';
  const ACCESS_STORAGE = 'cr-planner-access-v1';

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  }

  function splitNoteId(id) {
    const i = String(id || '').lastIndexOf(':');
    return i < 0 ? ['', ''] : [id.slice(0, i), id.slice(i + 1)];
  }

  function formatDate(dateISO) {
    const [y, m, d] = dateISO.split('-').map(Number);
    return new Intl.DateTimeFormat('fr-CA', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(y, m - 1, d, 12));
  }

  function formatMoment(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('fr-CA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d);
  }

  function toast(message, ms = 2200) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), ms);
  }

  async function api(path = '', options = {}) {
    const key = localStorage.getItem(ACCESS_STORAGE) || '';
    if (!key) throw new Error('Clé d’accès absente.');
    const headers = new Headers(options.headers || {});
    headers.set('x-planner-key', key);
    if (options.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
    const res = await fetch(`${API_URL}${path}`, { ...options, headers, cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
    return data;
  }

  function parseBody(body) {
    const raw = String(body || '').replace(/\r/g, '');
    if (!raw) return [];
    return raw.split('\n').map(line => {
      const m = line.match(/^\s*\d+\.\s*(.*)$/);
      return m ? { kind: 'numbered', text: m[1] } : { kind: 'plain', text: line };
    });
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

  function bodyFromCell(cell) {
    const editor = $('.block-editor', cell);
    if (!editor) return '';
    const blocks = [];
    for (const node of editor.children) {
      if (!node.classList.contains('editor-block')) continue;
      if (node.classList.contains('drag-placeholder') || node.classList.contains('drag-source')) continue;
      const text = $('.block-text', node)?.textContent?.replace(/[\r\n]+/g, ' ') ?? '';
      blocks.push({ kind: node.dataset.kind === 'numbered' ? 'numbered' : 'plain', text });
    }
    return serializeBlocks(blocks);
  }

  async function saveCellNow(cell) {
    const [planDate, periodKey] = splitNoteId(cell?.dataset.noteCell || '');
    if (!planDate || !periodKey) return '';
    const body = bodyFromCell(cell);
    await api('', { method: 'POST', body: JSON.stringify({ action: 'save_note', plan_date: planDate, period_key: periodKey, body }) });
    return body;
  }

  async function fetchNote(planDate, periodKey) {
    const data = await api(`?from=${encodeURIComponent(planDate)}&to=${encodeURIComponent(planDate)}`);
    return (data.notes || []).find(n => n.period_key === periodKey)?.body || '';
  }

  function injectStyles() {
    if (document.getElementById('plannerToolsStyles')) return;
    const style = document.createElement('style');
    style.id = 'plannerToolsStyles';
    style.textContent = `
      .planner-tools-dialog{width:min(94vw,560px);border:0;border-radius:20px;padding:0;color:#153247;box-shadow:0 28px 80px rgba(5,40,60,.28)}
      .planner-tools-dialog::backdrop{background:rgba(3,31,49,.58);backdrop-filter:blur(4px)}
      .planner-tools-dialog form,.planner-tools-dialog .pt-shell{padding:24px;display:grid;gap:13px}
      .planner-tools-dialog h2{margin:0;font-size:1.28rem}.planner-tools-dialog p{margin:0;color:#647984;line-height:1.42}
      .pt-course-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border-radius:12px;background:#f2f6f8}
      .pt-course-head strong{font-size:.95rem}.pt-course-head span{font-weight:850;font-size:.85rem;color:#496878}
      .pt-actions{display:grid;gap:8px}.pt-action{width:100%;min-height:45px;text-align:left;padding:10px 12px;border:1px solid #cbd8df;border-radius:11px;background:#fff;color:#173246;font-weight:750;cursor:pointer}
      .pt-action:hover{background:#f1f7fa;border-color:#a8c5d3}.pt-action small{display:block;margin-top:3px;color:#718591;font-weight:500;line-height:1.3}
      .pt-action:disabled{opacity:.45;cursor:default;background:#f5f7f8}
      .pt-close{justify-self:end;border:0;background:#edf3f6;color:#173246;border-radius:10px;padding:9px 13px;font-weight:800;cursor:pointer}
      .pt-list{display:grid;gap:7px;max-height:52vh;overflow:auto;padding-right:2px}.pt-item{display:grid;grid-template-columns:auto 1fr;gap:9px;align-items:start;text-align:left;width:100%;border:1px solid #cfdae0;background:#fff;border-radius:11px;padding:10px 11px;cursor:pointer;color:#173246}
      .pt-item:hover{background:#f2f8fb;border-color:#a9c7d6}.pt-item-num{font-weight:900;color:#07577f}.pt-item-text{line-height:1.35}
      .pt-history{display:grid;gap:8px;max-height:52vh;overflow:auto}.pt-version{border:1px solid #d3dde2;border-radius:12px;padding:10px 11px;background:#fff;display:grid;gap:6px}.pt-version-head{display:flex;justify-content:space-between;gap:10px;align-items:center}.pt-version-label{font-weight:850;font-size:.82rem}.pt-version-time{font-size:.75rem;color:#71838e}.pt-version-preview{font-size:.84rem;color:#415b69;line-height:1.35;white-space:pre-wrap;max-height:76px;overflow:hidden}.pt-restore{justify-self:end;border:1px solid #b9ccd6;background:#f5f9fb;border-radius:9px;padding:7px 10px;font-weight:800;color:#16455f;cursor:pointer}
      .pt-choice-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}.pt-choice-row button{min-height:44px;border:1px solid #bfd0d9;border-radius:10px;background:#fff;font-weight:800;color:#173246;cursor:pointer}.pt-choice-row button.primary{background:#07577f;color:#fff;border-color:#07577f}
      .pt-checklist{display:grid;gap:7px;max-height:50vh;overflow:auto}.pt-check{display:grid;grid-template-columns:auto auto 1fr;gap:9px;align-items:start;border:1px solid #d1dce2;border-radius:11px;padding:10px 11px;background:#fff}.pt-check input{width:18px;height:18px;margin:1px 0 0}.pt-check-num{font-weight:900;color:#07577f}.pt-check-text{line-height:1.35}.pt-check-note{font-size:.77rem;color:#71838e;margin-top:2px}.pt-primary-wide{min-height:45px;border:0;border-radius:11px;background:#07577f;color:#fff;font-weight:850;cursor:pointer;padding:0 16px}
      @media(max-width:600px){.planner-tools-dialog form,.planner-tools-dialog .pt-shell{padding:20px}.pt-choice-row{grid-template-columns:1fr}.course-strip-number{min-width:34px;text-align:right}}
    `;
    document.head.appendChild(style);
  }

  function ensureDialog() {
    let d = document.getElementById('plannerToolsDialog');
    if (d) return d;
    d = document.createElement('dialog');
    d.id = 'plannerToolsDialog';
    d.className = 'planner-tools-dialog';
    document.body.appendChild(d);
    d.addEventListener('click', e => {
      if (e.target === d) d.close();
    });
    return d;
  }

  function shell(title = '') {
    const d = ensureDialog();
    d.innerHTML = `<div class="pt-shell"><h2>${escapeHtml(title)}</h2><div id="ptBody"></div><button type="button" class="pt-close">Fermer</button></div>`;
    $('.pt-close', d).addEventListener('click', () => d.close());
    if (!d.open) d.showModal();
    return { dialog: d, body: $('#ptBody', d) };
  }

  function currentContext(numberEl) {
    const strip = numberEl.closest('.course-strip');
    const cell = numberEl.closest('[data-note-cell]');
    if (!strip || !cell) return null;
    const [planDate, periodKey] = splitNoteId(cell.dataset.noteCell || '');
    const group = strip.dataset.courseGroup || $('.course-strip-name', strip)?.textContent?.trim() || '';
    const courseNo = numberEl.textContent.trim();
    if (!planDate || !periodKey || !group) return null;
    return { strip, cell, planDate, periodKey, group, courseNo };
  }

  async function ensureMeta() {
    const meta = window.CRPlannerCourseMeta;
    if (!meta) throw new Error('Métadonnées de cours indisponibles.');
    await meta.ensureCalendar();
    return meta;
  }

  async function showCourseMenu(ctx) {
    const meta = await ensureMeta();
    const { dialog, body } = shell('Options du cours');
    const currentBody = bodyFromCell(ctx.cell);
    const numbered = parseBody(currentBody).filter(b => b.kind === 'numbered');
    const paired = meta.pairedSec3(ctx.group);
    body.innerHTML = `
      <div class="pt-course-head"><strong>${escapeHtml(ctx.group)}</strong><span>${escapeHtml(ctx.courseNo)} · ${escapeHtml(formatDate(ctx.planDate))}</span></div>
      <div class="pt-actions">
        <button class="pt-action" data-act="finish" ${numbered.length ? '' : 'disabled'}>Fin du cours…<small>Coche ce qui a été fait; ce qui reste peut être reporté d’un coup au prochain cours.</small></button>
        <button class="pt-action" data-act="carry" ${numbered.length ? '' : 'disabled'}>Reporter un élément au prochain cours<small>Déplace une seule ligne numérotée vers la prochaine rencontre de ce groupe.</small></button>
        ${paired ? `<button class="pt-action" data-act="pair">Copier la planif vers ${escapeHtml(paired)}<small>Copie cette période vers la prochaine rencontre du groupe parallèle.</small></button>` : ''}
        <button class="pt-action" data-act="checkpoint">Créer un point de restauration<small>Garde volontairement l’état actuel dans l’historique synchronisé.</small></button>
        <button class="pt-action" data-act="history">Voir l’historique de cette période<small>Versions enregistrées dans Supabase, donc accessibles sur tes autres appareils.</small></button>
      </div>`;

    $('[data-act="finish"]', body)?.addEventListener('click', () => finishCourse(ctx));
    $('[data-act="carry"]', body)?.addEventListener('click', () => chooseCarry(ctx));
    $('[data-act="pair"]', body)?.addEventListener('click', () => copyToPaired(ctx));
    $('[data-act="checkpoint"]', body)?.addEventListener('click', async () => {
      try {
        await saveCellNow(ctx.cell);
        await api('', { method: 'POST', body: JSON.stringify({ action: 'checkpoint', plan_date: ctx.planDate, period_key: ctx.periodKey, label: 'Point de restauration manuel' }) });
        toast('Point de restauration enregistré.');
      } catch (e) { toast(e.message || 'Impossible de créer le point de restauration.', 3500); }
    });
    $('[data-act="history"]', body)?.addEventListener('click', () => showHistory(ctx));
    return dialog;
  }

  async function finishCourse(ctx) {
    try {
      const meta = await ensureMeta();
      const destination = await meta.nextCourse(ctx.group, ctx.planDate);
      const bodyNow = bodyFromCell(ctx.cell);
      const blocks = parseBody(bodyNow);
      const numbered = blocks.map((b, i) => ({ ...b, blockIndex: i })).filter(b => b.kind === 'numbered');
      if (!numbered.length) { toast('Aucun élément numéroté dans ce cours.'); return; }

      const { body } = shell('Fin du cours');
      body.innerHTML = `<p>Coche les éléments réellement faits. Les éléments décochés seront ${destination ? `reportés au <strong>${escapeHtml(formatDate(destination.date))}</strong> · ${escapeHtml(ctx.group)} · #${destination.courseNumber ?? '?'}` : 'laissés ici, puisqu’aucun prochain cours n’a été trouvé'}.</p>
        <div class="pt-checklist">${numbered.map((b, i) => `<label class="pt-check"><input type="checkbox" checked data-block-index="${b.blockIndex}"><span class="pt-check-num">${i + 1}.</span><span><span class="pt-check-text">${escapeHtml(b.text)}</span><div class="pt-check-note">Fait</div></span></label>`).join('')}</div>
        <button type="button" class="pt-primary-wide" id="ptFinishCourse">Terminer le cours</button>`;

      $('#ptFinishCourse', body).addEventListener('click', async e => {
        e.currentTarget.disabled = true;
        try {
          await saveCellNow(ctx.cell);
          const latestBody = bodyFromCell(ctx.cell);
          const latestBlocks = parseBody(latestBody);
          const unchecked = new Set($$('.pt-check input:not(:checked)', body).map(input => Number(input.dataset.blockIndex)));
          if (!unchecked.size) {
            await api('', { method: 'POST', body: JSON.stringify({ action: 'checkpoint', plan_date: ctx.planDate, period_key: ctx.periodKey, label: 'Fin du cours — tout fait' }) });
            toast('Cours terminé · tout a été fait.');
            ensureDialog().close();
            return;
          }
          if (!destination) throw new Error('Aucun prochain cours trouvé pour reporter les éléments.');

          const carry = [];
          const sourceBlocks = latestBlocks.filter((b, i) => {
            if (unchecked.has(i) && b.kind === 'numbered') { carry.push({ kind: 'numbered', text: b.text }); return false; }
            return true;
          });
          const destBody = await fetchNote(destination.date, destination.periodKey);
          const destBlocks = parseBody(destBody);
          if (destBlocks.length === 1 && destBlocks[0].kind === 'plain' && !destBlocks[0].text.trim()) destBlocks.length = 0;
          destBlocks.push(...carry);
          await api('', { method: 'POST', body: JSON.stringify({
            action: 'bulk_save',
            label: `Fin du cours ${ctx.group} ${ctx.courseNo}`,
            changes: [
              { plan_date: ctx.planDate, period_key: ctx.periodKey, body: serializeBlocks(sourceBlocks) },
              { plan_date: destination.date, period_key: destination.periodKey, body: serializeBlocks(destBlocks) },
            ],
          }) });
          toast(`${carry.length} élément${carry.length > 1 ? 's' : ''} reporté${carry.length > 1 ? 's' : ''}.`);
          setTimeout(() => location.reload(), 500);
        } catch (err) {
          e.currentTarget.disabled = false;
          toast(err.message || 'Impossible de terminer le cours.', 3500);
        }
      });
    } catch (e) { toast(e.message || 'Impossible d’ouvrir le bilan du cours.', 3500); }
  }

  async function chooseCarry(ctx) {
    try {
      const meta = await ensureMeta();
      const destination = await meta.nextCourse(ctx.group, ctx.planDate);
      if (!destination) { toast('Aucun prochain cours trouvé.'); return; }
      const bodyNow = bodyFromCell(ctx.cell);
      const blocks = parseBody(bodyNow);
      const numbered = blocks.map((b, i) => ({ ...b, blockIndex: i })).filter(b => b.kind === 'numbered');
      if (!numbered.length) { toast('Aucun élément numéroté à reporter.'); return; }
      const { body } = shell('Reporter au prochain cours');
      body.innerHTML = `<p>Destination : <strong>${escapeHtml(formatDate(destination.date))}</strong> · ${escapeHtml(ctx.group)} · #${destination.courseNumber ?? '?'}</p><div class="pt-list">${numbered.map((b, i) => `<button type="button" class="pt-item" data-block-index="${b.blockIndex}"><span class="pt-item-num">${i + 1}.</span><span class="pt-item-text">${escapeHtml(b.text)}</span></button>`).join('')}</div>`;
      $$('.pt-item', body).forEach(btn => btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          await saveCellNow(ctx.cell);
          const sourceBody = bodyFromCell(ctx.cell);
          const sourceBlocks = parseBody(sourceBody);
          const index = Number(btn.dataset.blockIndex);
          const item = sourceBlocks[index];
          if (!item || item.kind !== 'numbered') throw new Error('Cet élément a changé. Réessaie.');
          sourceBlocks.splice(index, 1);
          const destBody = await fetchNote(destination.date, destination.periodKey);
          const destBlocks = parseBody(destBody);
          if (destBlocks.length === 1 && destBlocks[0].kind === 'plain' && !destBlocks[0].text.trim()) destBlocks.length = 0;
          destBlocks.push({ kind: 'numbered', text: item.text });
          await api('', { method: 'POST', body: JSON.stringify({
            action: 'bulk_save',
            label: `Report vers ${ctx.group} #${destination.courseNumber ?? ''}`.trim(),
            changes: [
              { plan_date: ctx.planDate, period_key: ctx.periodKey, body: serializeBlocks(sourceBlocks) },
              { plan_date: destination.date, period_key: destination.periodKey, body: serializeBlocks(destBlocks) },
            ],
          }) });
          toast(`Reporté au ${formatDate(destination.date)}.`);
          setTimeout(() => location.reload(), 500);
        } catch (e) { btn.disabled = false; toast(e.message || 'Déplacement impossible.', 3500); }
      }));
    } catch (e) { toast(e.message || 'Impossible de trouver le prochain cours.', 3500); }
  }

  async function copyToPaired(ctx) {
    try {
      const meta = await ensureMeta();
      const other = meta.pairedSec3(ctx.group);
      if (!other) return;
      const destination = await meta.nextCourse(other, ctx.planDate, { includeSame: true });
      if (!destination) { toast(`Aucun prochain cours de ${other} trouvé.`); return; }
      await saveCellNow(ctx.cell);
      const sourceBody = bodyFromCell(ctx.cell);
      const destBody = await fetchNote(destination.date, destination.periodKey);
      const { body } = shell(`Copier vers ${other}`);
      body.innerHTML = `<p>Destination proposée : <strong>${escapeHtml(formatDate(destination.date))}</strong> · ${escapeHtml(other)} · #${destination.courseNumber ?? '?'}</p>
        ${destBody.trim() ? '<p>Cette période contient déjà une planification. Que veux-tu faire?</p>' : '<p>La période de destination est vide.</p>'}
        <div class="pt-choice-row">
          ${destBody.trim() ? '<button type="button" data-mode="append">Ajouter à la fin</button>' : ''}
          <button type="button" class="primary" data-mode="replace">${destBody.trim() ? 'Remplacer' : 'Copier'}</button>
        </div>`;
      $$('[data-mode]', body).forEach(btn => btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          let finalBody = sourceBody;
          if (btn.dataset.mode === 'append' && destBody.trim()) {
            const destBlocks = parseBody(destBody);
            const sourceBlocks = parseBody(sourceBody);
            finalBody = serializeBlocks([...destBlocks, ...sourceBlocks]);
          }
          await api('', { method: 'POST', body: JSON.stringify({
            action: 'bulk_save',
            label: `Copie depuis ${ctx.group} ${ctx.courseNo}`,
            changes: [{ plan_date: destination.date, period_key: destination.periodKey, body: finalBody }],
          }) });
          toast(`Planif copiée vers ${other}.`);
          setTimeout(() => location.reload(), 500);
        } catch (e) { btn.disabled = false; toast(e.message || 'Copie impossible.', 3500); }
      }));
    } catch (e) { toast(e.message || 'Copie impossible.', 3500); }
  }

  async function showHistory(ctx) {
    try {
      await saveCellNow(ctx.cell);
      const data = await api(`?action=history&plan_date=${encodeURIComponent(ctx.planDate)}&period_key=${encodeURIComponent(ctx.periodKey)}`);
      const history = data.history || [];
      const { body } = shell(`Historique · ${ctx.group} ${ctx.courseNo}`);
      if (!history.length) {
        body.innerHTML = '<p>Aucune ancienne version pour cette période pour le moment.</p>';
        return;
      }
      body.innerHTML = `<div class="pt-history">${history.map(h => {
        const preview = String(h.body || '').trim() || '(planification vide)';
        return `<div class="pt-version"><div class="pt-version-head"><span class="pt-version-label">${escapeHtml(h.label || 'Version')}</span><span class="pt-version-time">${escapeHtml(formatMoment(h.created_at))}</span></div><div class="pt-version-preview">${escapeHtml(preview)}</div><button type="button" class="pt-restore" data-history-id="${h.id}">Restaurer</button></div>`;
      }).join('')}</div>`;
      $$('[data-history-id]', body).forEach(btn => btn.addEventListener('click', async () => {
        if (!confirm('Restaurer cette version? La version actuelle sera conservée dans l’historique.')) return;
        btn.disabled = true;
        try {
          await api('', { method: 'POST', body: JSON.stringify({ action: 'restore_history', id: Number(btn.dataset.historyId) }) });
          toast('Version restaurée.');
          setTimeout(() => location.reload(), 500);
        } catch (e) { btn.disabled = false; toast(e.message || 'Restauration impossible.', 3500); }
      }));
    } catch (e) { toast(e.message || 'Historique indisponible.', 3500); }
  }

  function bind() {
    document.addEventListener('click', e => {
      const number = e.target.closest('.course-strip-number');
      if (!number) return;
      e.preventDefault();
      e.stopPropagation();
      const ctx = currentContext(number);
      if (ctx) showCourseMenu(ctx).catch(err => toast(err.message || 'Options indisponibles.', 3500));
    }, true);
    document.addEventListener('keydown', e => {
      const number = e.target.closest?.('.course-strip-number');
      if (!number || (e.key !== 'Enter' && e.key !== ' ')) return;
      e.preventDefault();
      const ctx = currentContext(number);
      if (ctx) showCourseMenu(ctx).catch(err => toast(err.message || 'Options indisponibles.', 3500));
    });
  }

  function start() {
    injectStyles();
    bind();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
