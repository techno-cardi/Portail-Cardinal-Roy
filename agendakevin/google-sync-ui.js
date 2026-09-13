(() => {
  'use strict';

  const API_URL = 'https://ojyswaxuqwnqilrvtjll.supabase.co/functions/v1/planner-api';
  const ACCESS_STORAGE = 'cr-planner-access-v1';
  const SCHOOL_START = '2026-08-24';
  const SCHOOL_END = '2027-06-24';
  const $ = (s, root = document) => root.querySelector(s);

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

  async function api(path = '', options = {}) {
    const key = localStorage.getItem(ACCESS_STORAGE) || '';
    if (!key) throw new Error('Mot de passe absent sur cet appareil.');
    const headers = new Headers(options.headers || {});
    headers.set('x-planner-key', key);
    if (options.body) headers.set('content-type', 'application/json');
    const res = await fetch(`${API_URL}${path}`, { ...options, headers, cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
    return data;
  }

  function injectStyles() {
    if ($('#googleSyncStyles')) return;
    const style = document.createElement('style');
    style.id = 'googleSyncStyles';
    style.textContent = `
      .google-sync-dialog{width:min(94vw,690px);border:0;border-radius:20px;padding:0;color:#153247;box-shadow:0 28px 80px rgba(5,40,60,.30)}
      .google-sync-dialog::backdrop{background:rgba(3,31,49,.60);backdrop-filter:blur(5px)}
      .gs-shell{padding:24px;display:grid;gap:15px}.gs-head{display:flex;justify-content:space-between;gap:15px;align-items:flex-start}.gs-head h2{margin:0;font-size:1.35rem}.gs-head p{margin:4px 0 0;color:#667d89;line-height:1.4}.gs-close{border:0;border-radius:10px;background:#edf3f6;color:#173246;padding:8px 11px;font-weight:850;cursor:pointer}
      .gs-status{padding:10px 12px;border-radius:11px;background:#f1f5f7;border:1px solid #d9e2e7;font-size:.84rem;font-weight:750}.gs-status.on{background:#edf8f1;border-color:#b9dec7;color:#26633f}
      .gs-steps{margin:0;padding-left:22px;display:grid;gap:8px;line-height:1.42;font-size:.9rem}.gs-field{display:grid;gap:6px}.gs-field label{font-size:.8rem;font-weight:850}.gs-field input{width:100%;border:1px solid #bdccd5;border-radius:10px;padding:10px 11px;outline:0;font:inherit}.gs-field input:focus{border-color:#0b6b96;box-shadow:0 0 0 3px rgba(11,107,150,.11)}.gs-secret-row{display:grid;grid-template-columns:1fr auto;gap:7px}.gs-secret-row button,.gs-copy-code,.gs-save,.gs-disable,.gs-backfill{border:1px solid #bfd0d9;border-radius:10px;background:#fff;color:#173246;padding:9px 11px;font-weight:800;cursor:pointer}.gs-copy-code{justify-self:start}.gs-backfill{background:#f3f8fa;border-color:#b6cbd6}.gs-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap}.gs-save{background:#07577f;color:#fff;border-color:#07577f}.gs-disable{color:#8c3434}.gs-note{font-size:.78rem;color:#6f818c;line-height:1.4}.gs-link{color:#07577f;font-weight:800}.gs-error{min-height:1em;color:#a13737;font-size:.82rem;font-weight:700}
      @media(max-width:600px){.gs-shell{padding:19px 16px}.gs-secret-row{grid-template-columns:1fr}.gs-actions{display:grid;grid-template-columns:1fr}.gs-actions button{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function ensureDialog() {
    let dialog = $('#googleSyncDialog');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'googleSyncDialog';
    dialog.className = 'google-sync-dialog';
    document.body.appendChild(dialog);
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    return dialog;
  }

  async function copyText(text, success) {
    try {
      await navigator.clipboard.writeText(text);
      toast(success);
    } catch {
      toast('Copie impossible automatiquement. Sélectionne le texte manuellement.', 3500);
    }
  }

  async function syncExisting(button, errorEl) {
    button.disabled = true;
    errorEl.textContent = '';
    try {
      const data = await api(`?action=year_plan&from=${SCHOOL_START}&to=${SCHOOL_END}`);
      const notes = (data.notes || []).filter(n => /^p[1-5]$/.test(n.period_key) && String(n.body || '').trim());
      if (!notes.length) { toast('Aucune planification existante à synchroniser.'); return; }
      let done = 0;
      for (let i = 0; i < notes.length; i += 4) {
        const batch = notes.slice(i, i + 4);
        await Promise.all(batch.map(n => api('', {
          method: 'POST',
          body: JSON.stringify({ action: 'save_note', plan_date: n.plan_date, period_key: n.period_key, body: n.body }),
        })));
        done += batch.length;
        button.textContent = `Synchronisation… ${done}/${notes.length}`;
      }
      toast(`${notes.length} cours existants envoyés vers Google Agenda.`, 4200);
      button.textContent = 'Planif existante synchronisée';
    } catch (err) {
      errorEl.textContent = err.message || 'Synchronisation initiale impossible.';
      button.disabled = false;
      button.textContent = 'Synchroniser la planif déjà inscrite';
    }
  }

  async function openDialog() {
    const settings = document.getElementById('settingsDialog');
    if (settings?.open) settings.close();
    const dialog = ensureDialog();
    dialog.innerHTML = '<div class="gs-shell"><div class="gs-status">Préparation de la synchronisation…</div></div>';
    if (!dialog.open) dialog.showModal();

    try {
      const [status, prepared] = await Promise.all([
        api('?action=google_sync_status'),
        api('', { method: 'POST', body: JSON.stringify({ action: 'google_sync_prepare' }) }),
      ]);
      const secret = prepared.secret || '';
      dialog.innerHTML = `
        <div class="gs-shell">
          <div class="gs-head">
            <div><h2>Synchronisation Google Agenda</h2><p>Une fois branchée, chaque sauvegarde d’un cours met aussi à jour la description de l’événement correspondant.</p></div>
            <button type="button" class="gs-close">Fermer</button>
          </div>
          <div class="gs-status ${status.enabled ? 'on' : ''}">${status.enabled ? 'Synchronisation active' : 'Synchronisation non configurée'}</div>
          <ol class="gs-steps">
            <li>Ouvre <a class="gs-link" href="https://script.google.com/home/projects/create" target="_blank" rel="noopener">Google Apps Script</a> et crée un projet.</li>
            <li>Copie le code préparé ci-dessous dans <strong>Code.gs</strong>.</li>
            <li>Dans <strong>Paramètres du projet → Propriétés du script</strong>, ajoute <strong>AGENDA_SYNC_SECRET</strong> avec le secret affiché ici.</li>
            <li>Fais <strong>Déployer → Nouveau déploiement → Application Web</strong>, exécuter en tant que <strong>Moi</strong>, accès <strong>Toute personne</strong>, puis autorise ton compte Google.</li>
            <li>Colle ensuite l’URL qui se termine par <strong>/exec</strong> ci-dessous et active la synchro.</li>
          </ol>
          <button type="button" class="gs-copy-code" id="gsCopyCode">Copier le code Apps Script</button>
          <div class="gs-field">
            <label>Secret à mettre dans AGENDA_SYNC_SECRET</label>
            <div class="gs-secret-row"><input id="gsSecret" type="password" readonly value="${escapeHtml(secret)}"><button type="button" id="gsCopySecret">Copier</button></div>
          </div>
          <div class="gs-field"><label for="gsUrl">URL du déploiement Apps Script</label><input id="gsUrl" type="url" placeholder="https://script.google.com/macros/s/.../exec" autocomplete="off"></div>
          <div class="gs-error" id="gsError"></div>
          ${status.enabled ? '<button type="button" class="gs-backfill" id="gsBackfill">Synchroniser la planif déjà inscrite</button>' : ''}
          <div class="gs-actions">
            ${status.enabled ? '<button type="button" class="gs-disable" id="gsDisable">Désactiver</button>' : ''}
            <button type="button" class="gs-save" id="gsSave">${status.enabled ? 'Remplacer le déploiement' : 'Activer la synchronisation'}</button>
          </div>
          <div class="gs-note">Le secret n’est jamais placé dans GitHub. Il est conservé dans Supabase et dans les propriétés privées de ton projet Apps Script.</div>
        </div>`;

      $('.gs-close', dialog).addEventListener('click', () => dialog.close());
      $('#gsCopySecret', dialog).addEventListener('click', () => copyText(secret, 'Secret copié.'));
      $('#gsCopyCode', dialog).addEventListener('click', async () => {
        try {
          const res = await fetch('google-calendar-sync.gs.txt', { cache: 'no-store' });
          if (!res.ok) throw new Error();
          await copyText(await res.text(), 'Code Apps Script copié.');
        } catch { toast('Impossible de charger le code Apps Script.', 3500); }
      });
      $('#gsBackfill', dialog)?.addEventListener('click', e => syncExisting(e.currentTarget, $('#gsError', dialog)));
      $('#gsSave', dialog).addEventListener('click', async e => {
        const url = $('#gsUrl', dialog).value.trim();
        const error = $('#gsError', dialog);
        error.textContent = '';
        if (!url) { error.textContent = 'Colle l’URL /exec du déploiement Apps Script.'; return; }
        e.currentTarget.disabled = true;
        e.currentTarget.textContent = 'Activation…';
        try {
          await api('', { method: 'POST', body: JSON.stringify({ action: 'google_sync_configure', url }) });
          toast('Synchronisation Google Agenda activée.');
          dialog.close();
        } catch (err) {
          error.textContent = err.message || 'Activation impossible.';
          e.currentTarget.disabled = false;
          e.currentTarget.textContent = status.enabled ? 'Remplacer le déploiement' : 'Activer la synchronisation';
        }
      });
      $('#gsDisable', dialog)?.addEventListener('click', async e => {
        e.currentTarget.disabled = true;
        try {
          await api('', { method: 'POST', body: JSON.stringify({ action: 'google_sync_configure', url: '' }) });
          toast('Synchronisation Google Agenda désactivée.');
          dialog.close();
        } catch (err) {
          $('#gsError', dialog).textContent = err.message || 'Impossible de désactiver.';
          e.currentTarget.disabled = false;
        }
      });
    } catch (err) {
      dialog.innerHTML = `<div class="gs-shell"><div class="gs-head"><div><h2>Synchronisation Google Agenda</h2></div><button type="button" class="gs-close">Fermer</button></div><div class="gs-error">${escapeHtml(err.message || 'Impossible de préparer la synchronisation.')}</div></div>`;
      $('.gs-close', dialog).addEventListener('click', () => dialog.close());
    }
  }

  function start() {
    injectStyles();
    const btn = document.getElementById('googleSyncBtn');
    if (btn) btn.addEventListener('click', openDialog);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
