(() => {
  'use strict';

  const GROUP_MAP_STATUS_REQUEST = 'PDC_NATIVE_GROUP_MAP_STATUS_REQUEST';
  const GROUP_MAP_STATUS = 'PDC_NATIVE_GROUP_MAP_STATUS';
  const GROUP_COLORS = {
    'FRA3SE-31': '#7ae7bf',
    'FRA3SE-32': '#46d6db',
    'FRA5SE-51': '#fbd75b',
  };
  const MONTH_EMOJIS = {
    0: ['⛄','❄️','🛷','🎿','🧤','🏔️','🌨️','🍵','☕','🧊','🏒','🌬️','🦌','🐧','🏡','🕯️'],
    1: ['❄️','🏂','⛷️','🧊','🧤','🍁','💝','🌹','🍫','🫶','☁️','🌂','🧣','🐻','🏔️','⛸️'],
    2: ['🌱','☘️','🌬️','🌂','🐣','🌷','🌼','🐦','🌈','🐰','🍀','🌿','🪴','🌻','🐛','🦗'],
    3: ['🌸','🌦️','🐣','🌷','🌻','🦋','🐝','🌼','🪻','🐞','☔','🌿','🐸','🌱','🌈','🎏'],
    4: ['🌸','☀️','🌿','🦋','🌻','🐝','🌺','🌼','🍃','🐛','🎑','🌷','🦜','🐢','🍓','🌾'],
    5: ['☀️','🏖️','🌊','🌺','⛱️','🍦','🐠','🩴','🧴','🌴','🍹','🐚','🦞','🌻','🎣','🏄'],
    6: ['☀️','🏕️','🌊','🍉','🌴','🎆','🎇','🔥','🏄','🐬','🎡','🌽','🍧','🎠','🦀','🌅'],
    7: ['🌻','☀️','🏖️','🍦','🌊','🎒','🍑','🍹','⛺','🌅','🎆','🏊','🐠','🍧','🌽','🎠'],
    8: ['🍂','📚','✏️','🏫','🍎','🎒','🍇','📐','📏','🖊️','🍁','🌾','🍄','🦔','🐝','🌰'],
    9: ['🍁','🎃','🌧️','🦃','🍂','🏈','🕷️','🕸️','🌽','🍄','🦇','👻','🌰','🍎','🧸','🌙'],
    10: ['❄️','🍁','🦃','🌨️','🧣','☁️','🧥','🍂','🌰','🕯️','🍵','☕','🎖️','🦔','🌧️','🍎'],
    11: ['🎄','⛄','🎁','🌟','❄️','🎅','🔔','🦌','🍪','🎶','🕯️','✨','🧦','🎉','🌨️','🏡'],
  };
  const NUMBER_EMOJIS = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];

  let clickTimer = 0;
  let activePublish = null;
  let lastTouchTap = { key: '', at: 0 };
  let suppressClickUntil = 0;

  const $ = (selector, root = document) => root.querySelector(selector);

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }

  function groupNumber(group) {
    return String(group || '').match(/(31|32|51)$/)?.[1] || '';
  }

  function parseNoteCell(strip) {
    const cell = strip.closest('[data-note-cell]');
    const id = cell?.dataset.noteCell || '';
    const split = id.lastIndexOf(':');
    if (!cell || split < 0) return null;
    return { cell, dateISO: id.slice(0, split), periodKey: id.slice(split + 1) };
  }

  function bodyFromCell(cell) {
    const editor = $('.block-editor', cell);
    if (!editor) return '';
    const lines = [];
    let number = 0;
    for (const block of editor.children) {
      if (!block.classList.contains('editor-block')) continue;
      if (block.classList.contains('drag-source') || block.classList.contains('drag-placeholder')) continue;
      const text = $('.block-text', block)?.textContent?.replace(/[\r\n]+/g, ' ').trimEnd() ?? '';
      if (block.dataset.kind === 'numbered') lines.push(`${++number}. ${text}`.trimEnd());
      else lines.push(text);
    }
    while (lines.length && !lines.at(-1).trim()) lines.pop();
    return lines.join('\n');
  }

  function courseInfoFromStrip(strip) {
    const parsed = parseNoteCell(strip);
    if (!parsed) return null;
    const group = strip.dataset.courseGroup || $('.course-strip-name', strip)?.textContent?.trim() || '';
    if (!group) return null;
    const meta = window.CRPlannerCourseMeta;
    const courseNumber = meta?.courseNumber?.(group, parsed.dateISO) ?? null;
    return {
      ...parsed,
      group,
      groupNumber: groupNumber(group),
      courseNumber,
      body: bodyFromCell(parsed.cell),
    };
  }

  function localDate(dateISO) {
    const [year, month, day] = String(dateISO).split('-').map(Number);
    return new Date(year, month - 1, day, 12);
  }

  function formatDate(dateISO) {
    const date = localDate(dateISO);
    const raw = new Intl.DateTimeFormat('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    return raw.replace(/^1\s+/, '1er ');
  }

  function seededEmojis(info) {
    const date = localDate(info.dateISO);
    const source = MONTH_EMOJIS[date.getMonth()] || MONTH_EMOJIS[8];
    let seed = 2166136261;
    const key = `${info.group}|${info.dateISO}|${info.courseNumber ?? ''}`;
    for (let i = 0; i < key.length; i += 1) {
      seed ^= key.charCodeAt(i);
      seed = Math.imul(seed, 16777619) >>> 0;
    }
    const available = [...source];
    const chosen = [];
    while (available.length && chosen.length < 5) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      chosen.push(available.splice(seed % available.length, 1)[0]);
    }
    return chosen.join('');
  }

  function titleFor(info) {
    const number = info.courseNumber == null ? 'Cours' : `Cours #${info.courseNumber}`;
    return `${number} (${formatDate(info.dateISO)}) ${seededEmojis(info)}`;
  }

  function noteLines(body) {
    return String(body || '').replace(/\r/g, '').split('\n').filter((line, index, array) => {
      if (line.trim()) return true;
      return index > 0 && index < array.length - 1;
    });
  }

  function planRichHtml(info, devoir = '', rappel = '') {
    const title = titleFor(info);
    const parts = [`<p><b><u>${escapeHtml(title)}</u></b></p>`];
    for (const line of noteLines(info.body)) {
      const numbered = line.match(/^\s*(\d+)\.\s*(.*)$/);
      if (numbered) {
        const n = Number(numbered[1]);
        const marker = NUMBER_EMOJIS[n - 1] || `${n}.`;
        parts.push(`<p>${marker} ${escapeHtml(numbered[2])}</p>`);
      } else if (line.trim()) {
        parts.push(`<p>${escapeHtml(line)}</p>`);
      }
    }
    if (String(devoir).trim()) parts.push(`<p><b>Devoir :</b> ${escapeHtml(String(devoir).trim())}</p>`);
    if (String(rappel).trim()) parts.push(`<p><b>Rappel :</b> ${escapeHtml(String(rappel).trim())}</p>`);
    return parts.join('');
  }

  function bridgeVersions() {
    return {
      native: document.documentElement.dataset.pdcNativePublisherVersion || '',
      userscript: document.documentElement.dataset.pdcClassroomBridgeVersion || '',
    };
  }

  function requestGroupMapStatus(timeout = 1600) {
    return new Promise(resolve => {
      const requestId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      let done = false;
      const finish = value => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        window.removeEventListener('message', onMessage);
        resolve(value);
      };
      const onMessage = event => {
        if (event.source !== window || event.origin !== location.origin || event.data?.type !== GROUP_MAP_STATUS) return;
        if (String(event.data.requestId || '') !== requestId) return;
        finish({ ok: Boolean(event.data.ok), groups: event.data.groups || {}, error: String(event.data.error || '') });
      };
      const timer = setTimeout(() => finish({ ok: false, groups: {}, error: 'Pont Chrome non détecté.' }), timeout);
      window.addEventListener('message', onMessage);
      window.postMessage({ type: GROUP_MAP_STATUS_REQUEST, requestId }, location.origin);
    });
  }

  function injectStyles() {
    if ($('#classroomAgendaStyles')) return;
    const style = document.createElement('style');
    style.id = 'classroomAgendaStyles';
    style.textContent = `
      .course-strip-name{cursor:pointer;touch-action:manipulation;user-select:none;-webkit-user-select:none}
      .course-strip-name:hover{text-decoration:underline;text-underline-offset:2px}
      .cr-classroom-dialog{width:min(94vw,720px);max-height:92vh;border:0;border-radius:20px;padding:0;color:#153247;box-shadow:0 30px 90px rgba(5,40,60,.32)}
      .cr-classroom-dialog::backdrop{background:rgba(3,31,49,.62);backdrop-filter:blur(5px)}
      .crp-shell{display:grid;gap:16px;padding:22px}.crp-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.crp-head h2{margin:0;font-size:1.3rem}.crp-head p{margin:4px 0 0;color:#6a7f8b;font-size:.84rem}.crp-close{border:0;border-radius:10px;background:#edf3f6;color:#173246;padding:8px 11px;font-weight:850;cursor:pointer}
      .crp-target{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid #d3dee4;border-radius:13px;padding:10px 12px;background:#f7fafb}.crp-target strong{font-size:.94rem}.crp-link-state{font-size:.77rem;color:#667b89;text-align:right}.crp-link-state.ok{color:#26704a}.crp-link-state.warn{color:#996b00}
      .crp-preview{border:1px solid #ccd8df;border-radius:14px;background:#fff;padding:15px 16px;max-height:300px;overflow:auto;line-height:1.45;font-size:.94rem}.crp-preview p{margin:0 0 7px}.crp-preview p:last-child{margin-bottom:0}
      .crp-addons{display:grid;gap:10px}.crp-addon{border:1px solid #d8e1e6;border-radius:12px;padding:10px 12px;background:#fafcfd}.crp-addon label{display:flex;align-items:center;gap:8px;font-weight:800;font-size:.86rem;cursor:pointer}.crp-addon textarea{width:100%;min-height:66px;margin-top:9px;border:1px solid #c7d4dc;border-radius:10px;padding:9px 10px;resize:vertical;font:inherit;color:#173246}.crp-addon textarea[hidden]{display:none}
      .crp-actions{display:flex;justify-content:flex-end;gap:9px;flex-wrap:wrap}.crp-secondary,.crp-primary{border:0;border-radius:11px;padding:10px 14px;font-weight:850;cursor:pointer}.crp-secondary{background:#edf3f6;color:#173246}.crp-primary{background:#07577f;color:#fff}.crp-primary:disabled{opacity:.5;cursor:wait}.crp-status{min-height:1.25em;font-size:.82rem;color:#657986}.crp-status.ok{color:#26704a}.crp-status.error{color:#a23737}.crp-status.warn{color:#996b00}.crp-generator-link{color:#07577f;font-weight:800;text-decoration:underline;text-underline-offset:2px}
      .cr-board{position:fixed;inset:0;z-index:2147483000;background:#f5f7f8;color:#102d3e;display:grid;grid-template-rows:auto 1fr;overflow:auto}.cr-board-head{position:sticky;top:0;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:22px clamp(22px,4vw,60px);background:var(--board-color);border-bottom:1px solid rgba(0,0,0,.15);z-index:2}.cr-board-title{display:flex;flex-direction:column;gap:4px}.cr-board-title strong{font-size:clamp(1.5rem,3vw,2.5rem)}.cr-board-title span{font-size:clamp(.9rem,1.5vw,1.15rem);font-weight:750;opacity:.72}.cr-board-close{border:1px solid rgba(0,0,0,.22);border-radius:12px;background:rgba(255,255,255,.65);padding:10px 14px;font-weight:850;cursor:pointer}.cr-board-body{width:min(1200px,92vw);margin:0 auto;padding:clamp(28px,5vw,64px) 0 70px}.cr-board-plan{display:grid;gap:clamp(15px,2.2vw,26px);font-size:clamp(1.25rem,2.8vw,2.35rem);line-height:1.3}.cr-board-item{display:grid;grid-template-columns:auto 1fr;gap:.5em;align-items:start}.cr-board-number{font-weight:900;color:#07577f}.cr-board-plain{padding-left:1.8em;color:#385465}
      @media(max-width:620px){.crp-shell{padding:18px 14px}.crp-target{align-items:flex-start;flex-direction:column}.crp-link-state{text-align:left}.crp-actions>*{flex:1}.cr-board-head{padding:16px}.cr-board-body{width:92vw;padding-top:28px}.cr-board-plan{font-size:1.35rem}}
      @media print{.cr-classroom-dialog,.cr-board{display:none!important}}
    `;
    document.head.appendChild(style);
  }

  function ensurePublishDialog() {
    let dialog = $('#classroomPublishDialog');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'classroomPublishDialog';
    dialog.className = 'cr-classroom-dialog';
    dialog.innerHTML = `
      <div class="crp-shell">
        <div class="crp-head">
          <div><h2>Publier dans Classroom</h2><p>Le bon groupe et le plan de cette période sont déjà sélectionnés.</p></div>
          <button type="button" class="crp-close">Fermer</button>
        </div>
        <div class="crp-target"><strong id="crpTarget"></strong><span class="crp-link-state" id="crpLinkState">Vérification du pont…</span></div>
        <div class="crp-preview" id="crpPreview"></div>
        <div class="crp-addons">
          <div class="crp-addon"><label><input type="checkbox" id="crpDevoirToggle"> Ajouter un devoir</label><textarea id="crpDevoir" hidden placeholder="Ex. Terminer OPUS p. 156-157"></textarea></div>
          <div class="crp-addon"><label><input type="checkbox" id="crpRappelToggle"> Ajouter un rappel</label><textarea id="crpRappel" hidden placeholder="Ex. Apporter le roman au prochain cours"></textarea></div>
        </div>
        <div class="crp-status" id="crpStatus"></div>
        <div class="crp-actions"><button type="button" class="crp-secondary" id="crpBoardBtn">Mode Tableau</button><button type="button" class="crp-primary" id="crpPublishBtn">Publier</button></div>
      </div>`;
    document.body.appendChild(dialog);

    $('.crp-close', dialog).addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    $('#crpDevoirToggle', dialog).addEventListener('change', event => {
      $('#crpDevoir', dialog).hidden = !event.currentTarget.checked;
      renderPublishPreview();
    });
    $('#crpRappelToggle', dialog).addEventListener('change', event => {
      $('#crpRappel', dialog).hidden = !event.currentTarget.checked;
      renderPublishPreview();
    });
    $('#crpDevoir', dialog).addEventListener('input', renderPublishPreview);
    $('#crpRappel', dialog).addEventListener('input', renderPublishPreview);
    $('#crpBoardBtn', dialog).addEventListener('click', () => {
      if (!activePublish?.info) return;
      dialog.close();
      openBoard(activePublish.info);
    });
    $('#crpPublishBtn', dialog).addEventListener('click', publishCurrent);
    return dialog;
  }

  function renderPublishPreview() {
    if (!activePublish?.info) return;
    const dialog = ensurePublishDialog();
    const devoir = $('#crpDevoirToggle', dialog).checked ? $('#crpDevoir', dialog).value : '';
    const rappel = $('#crpRappelToggle', dialog).checked ? $('#crpRappel', dialog).value : '';
    const html = planRichHtml(activePublish.info, devoir, rappel);
    $('#crpPreview', dialog).innerHTML = html;
    activePublish.richHtml = html;
  }

  function setPublishStatus(message, kind = '') {
    const el = $('#crpStatus', ensurePublishDialog());
    el.textContent = message || '';
    el.className = `crp-status ${kind}`.trim();
  }

  async function refreshBridgeState(info) {
    const dialog = ensurePublishDialog();
    const state = $('#crpLinkState', dialog);
    const versions = bridgeVersions();
    if (!versions.native || !versions.userscript) {
      state.className = 'crp-link-state warn';
      state.textContent = 'Mise à jour du pont/Tampermonkey requise';
      return;
    }
    const result = await requestGroupMapStatus();
    const linked = Boolean(result.ok && result.groups?.[info.groupNumber]);
    if (linked) {
      state.className = 'crp-link-state ok';
      state.textContent = `Groupe ${info.groupNumber} lié à Classroom`;
    } else {
      state.className = 'crp-link-state warn';
      state.innerHTML = `Groupe non lié · <a class="crp-generator-link" href="https://techno-cardi.github.io/Plan-de-cours/" target="_blank" rel="noopener">ouvrir le Générateur</a>`;
    }
  }

  async function openPublish(info) {
    const dialog = ensurePublishDialog();
    activePublish = { info, requestId: '', richHtml: '' };
    $('#crpTarget', dialog).textContent = `${info.group} · ${info.courseNumber == null ? 'cours sans numéro' : `cours #${info.courseNumber}`} · ${formatDate(info.dateISO)}`;
    $('#crpDevoirToggle', dialog).checked = false;
    $('#crpRappelToggle', dialog).checked = false;
    $('#crpDevoir', dialog).value = '';
    $('#crpRappel', dialog).value = '';
    $('#crpDevoir', dialog).hidden = true;
    $('#crpRappel', dialog).hidden = true;
    $('#crpPublishBtn', dialog).disabled = false;
    setPublishStatus(info.body.trim() ? '' : 'La planification de cette période est vide.', info.body.trim() ? '' : 'warn');
    renderPublishPreview();
    if (!dialog.open) dialog.showModal();
    refreshBridgeState(info);
  }

  function publishCurrent() {
    if (!activePublish?.info) return;
    const { info } = activePublish;
    if (!info.body.trim()) {
      setPublishStatus('Ajoute d’abord la planification du cours.', 'error');
      return;
    }
    const versions = bridgeVersions();
    if (!versions.native || !versions.userscript) {
      setPublishStatus('Le pont Classroom ou le userscript Tampermonkey n’est pas à jour sur cet ordinateur.', 'error');
      return;
    }
    renderPublishPreview();
    const requestId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    activePublish.requestId = requestId;
    const button = $('#crpPublishBtn', ensurePublishDialog());
    button.disabled = true;
    setPublishStatus(`Ouverture de Classroom pour le groupe ${info.groupNumber}…`);
    document.dispatchEvent(new CustomEvent('pdc:publish-course', {
      detail: {
        requestId,
        group: info.groupNumber,
        courseName: `Français SAÉ — Groupe ${info.groupNumber}`,
        courseSection: info.group.startsWith('FRA5') ? '5e secondaire' : '3e secondaire',
        richHtml: activePublish.richHtml,
        title: titleFor(info),
      }
    }));
  }

  function boardPlanHtml(info) {
    let number = 0;
    return noteLines(info.body).map(line => {
      const match = line.match(/^\s*\d+\.\s*(.*)$/);
      if (match) return `<div class="cr-board-item"><span class="cr-board-number">${++number}.</span><span>${escapeHtml(match[1])}</span></div>`;
      if (!line.trim()) return '';
      return `<div class="cr-board-plain">${escapeHtml(line)}</div>`;
    }).join('');
  }

  function closeBoard() {
    $('#classroomBoard')?.remove();
    document.body.style.overflow = '';
  }

  function openBoard(info) {
    closeBoard();
    const overlay = document.createElement('section');
    overlay.id = 'classroomBoard';
    overlay.className = 'cr-board';
    overlay.style.setProperty('--board-color', GROUP_COLORS[info.group] || '#d9edf7');
    overlay.innerHTML = `
      <div class="cr-board-head">
        <div class="cr-board-title"><strong>${escapeHtml(info.group)}${info.courseNumber == null ? '' : ` · Cours #${info.courseNumber}`}</strong><span>${escapeHtml(formatDate(info.dateISO))}</span></div>
        <button type="button" class="cr-board-close">Retour à l’Agenda</button>
      </div>
      <div class="cr-board-body"><div class="cr-board-plan">${boardPlanHtml(info) || '<div>Aucune planification inscrite.</div>'}</div></div>`;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    $('.cr-board-close', overlay).addEventListener('click', closeBoard);
  }

  function infoFromTarget(target) {
    const name = target.closest('.course-strip-name');
    const strip = name?.closest('.course-strip');
    return strip ? courseInfoFromStrip(strip) : null;
  }

  function handleClick(event) {
    if (Date.now() < suppressClickUntil) return;
    const info = infoFromTarget(event.target);
    if (!info) return;
    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => openPublish(info), 320);
  }

  function handleDoubleClick(event) {
    const info = infoFromTarget(event.target);
    if (!info) return;
    event.preventDefault();
    clearTimeout(clickTimer);
    openBoard(info);
  }

  function handleTouchDoubleTap(event) {
    if (event.pointerType !== 'touch') return;
    const info = infoFromTarget(event.target);
    if (!info) return;
    const key = `${info.dateISO}:${info.periodKey}:${info.group}`;
    const now = Date.now();
    if (lastTouchTap.key === key && now - lastTouchTap.at <= 310) {
      clearTimeout(clickTimer);
      suppressClickUntil = now + 450;
      lastTouchTap = { key: '', at: 0 };
      openBoard(info);
      return;
    }
    lastTouchTap = { key, at: now };
  }

  function handlePublishResult(event) {
    const detail = event.detail || {};
    if (!activePublish?.requestId || String(detail.requestId || '') !== activePublish.requestId) return;
    const button = $('#crpPublishBtn', ensurePublishDialog());
    button.disabled = false;
    if (detail.outcome === 'published' || detail.outcome === 'duplicate') {
      setPublishStatus(detail.outcome === 'duplicate' ? 'Cette publication existe déjà dans Classroom.' : 'Publié et vérifié dans Classroom.', 'ok');
    } else {
      setPublishStatus(detail.error || 'La publication Classroom a échoué.', 'error');
    }
  }

  function start() {
    injectStyles();
    ensurePublishDialog();
    document.addEventListener('click', handleClick);
    document.addEventListener('dblclick', handleDoubleClick);
    document.addEventListener('pointerup', handleTouchDoubleTap, true);
    document.addEventListener('pdc:publish-result', handlePublishResult);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && $('#classroomBoard')) closeBoard();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
