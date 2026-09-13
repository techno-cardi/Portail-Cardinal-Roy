(() => {
  'use strict';

  const API_URL = 'https://ojyswaxuqwnqilrvtjll.supabase.co/functions/v1/planner-api';
  const ACCESS_STORAGE = 'cr-planner-access-v1';

  const $ = (s, root = document) => root.querySelector(s);

  function toast(message, ms = 2600) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), ms);
  }

  async function api(options = {}) {
    const key = localStorage.getItem(ACCESS_STORAGE) || '';
    if (!key) throw new Error('Mot de passe absent sur cet appareil.');
    const headers = new Headers(options.headers || {});
    headers.set('x-planner-key', key);
    headers.set('content-type', 'application/json');
    const res = await fetch(API_URL, { ...options, headers, cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
    return data;
  }

  function ensurePasswordDialog() {
    let dialog = document.getElementById('passwordDialog');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'passwordDialog';
    dialog.className = 'settings-dialog agenda-password-dialog';
    dialog.innerHTML = `
      <form id="passwordForm">
        <h2>Changer mon mot de passe</h2>
        <p>Choisis un mot de passe personnel d’au moins 8 caractères. Il remplacera immédiatement la clé actuelle sur tous tes appareils.</p>
        <label for="newAgendaPassword">Nouveau mot de passe</label>
        <input id="newAgendaPassword" type="password" minlength="8" maxlength="128" autocomplete="new-password" required>
        <label for="confirmAgendaPassword">Confirmer le mot de passe</label>
        <input id="confirmAgendaPassword" type="password" minlength="8" maxlength="128" autocomplete="new-password" required>
        <div class="dialog-error" id="passwordError" aria-live="polite"></div>
        <div class="agenda-dialog-actions">
          <button type="button" class="secondary-button" id="cancelPasswordBtn">Annuler</button>
          <button type="submit" class="primary-button" id="savePasswordBtn">Enregistrer</button>
        </div>
      </form>`;
    document.body.appendChild(dialog);

    const form = $('#passwordForm', dialog);
    const error = $('#passwordError', dialog);
    $('#cancelPasswordBtn', dialog).addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      error.textContent = '';
      const next = $('#newAgendaPassword', dialog).value.trim();
      const confirm = $('#confirmAgendaPassword', dialog).value.trim();
      if (next.length < 8) { error.textContent = 'Le mot de passe doit contenir au moins 8 caractères.'; return; }
      if (next !== confirm) { error.textContent = 'Les deux mots de passe ne correspondent pas.'; return; }
      const btn = $('#savePasswordBtn', dialog);
      btn.disabled = true;
      btn.textContent = 'Enregistrement…';
      try {
        await api({ method: 'POST', body: JSON.stringify({ action: 'change_password', new_password: next }) });
        localStorage.setItem(ACCESS_STORAGE, next);
        dialog.close();
        toast('Mot de passe changé. Reconnexion…');
        setTimeout(() => location.reload(), 650);
      } catch (err) {
        error.textContent = err.message || 'Impossible de changer le mot de passe.';
        btn.disabled = false;
        btn.textContent = 'Enregistrer';
      }
    });
    return dialog;
  }

  function openPasswordDialog() {
    const settings = document.getElementById('settingsDialog');
    if (settings?.open) settings.close();
    const dialog = ensurePasswordDialog();
    $('#newAgendaPassword', dialog).value = '';
    $('#confirmAgendaPassword', dialog).value = '';
    $('#passwordError', dialog).textContent = '';
    if (!dialog.open) dialog.showModal();
    setTimeout(() => $('#newAgendaPassword', dialog)?.focus(), 40);
  }

  function waitForWeekGrid(timeoutMs = 6000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const tick = () => {
        const grid = document.querySelector('.week-grid');
        if (grid) { resolve(grid); return; }
        if (Date.now() - start > timeoutMs) { reject(new Error('La semaine n’a pas fini de charger.')); return; }
        setTimeout(tick, 80);
      };
      tick();
    });
  }

  function ensurePrintHeading() {
    let heading = document.getElementById('printWeekHeading');
    if (heading) return heading;
    heading = document.createElement('div');
    heading.id = 'printWeekHeading';
    heading.className = 'print-week-heading';
    const planner = document.getElementById('planner');
    planner?.parentNode?.insertBefore(heading, planner);
    return heading;
  }

  async function printWeek() {
    const currentView = document.querySelector('[data-view].active')?.dataset.view || 'week';
    try {
      if (currentView !== 'week') document.querySelector('[data-view="week"]')?.click();
      await waitForWeekGrid();
      const heading = ensurePrintHeading();
      const weekTitle = document.getElementById('periodTitle')?.textContent?.trim() || 'Semaine';
      heading.innerHTML = `<div><strong>Agenda</strong><span>${weekTitle}</span></div><small>2026-2027 · Cardinal-Roy</small>`;
      document.body.classList.add('printing-agenda');
      setTimeout(() => window.print(), 80);
      const restore = () => {
        document.body.classList.remove('printing-agenda');
        if (currentView === 'day') document.querySelector('[data-view="day"]')?.click();
        window.removeEventListener('afterprint', restore);
      };
      window.addEventListener('afterprint', restore);
    } catch (err) {
      toast(err.message || 'Impossible de préparer l’impression.', 3500);
    }
  }

  function start() {
    const changePassword = document.getElementById('changePasswordBtn');
    if (changePassword) changePassword.addEventListener('click', openPasswordDialog);

    const printBtn = document.getElementById('printBtn');
    if (printBtn) printBtn.addEventListener('click', printWeek);

    const printSettings = document.getElementById('printWeekBtn');
    if (printSettings) printSettings.addEventListener('click', () => {
      const settings = document.getElementById('settingsDialog');
      if (settings?.open) settings.close();
      printWeek();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
