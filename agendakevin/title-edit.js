(() => {
  'use strict';

  const API_URL = 'https://ojyswaxuqwnqilrvtjll.supabase.co/functions/v1/planner-title';
  const ACCESS_STORAGE = 'cr-planner-access-v1';
  const DEFAULT_TITLE = 'Agenda';
  const $ = (s, root = document) => root.querySelector(s);

  function toast(message, ms = 2200) {
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
    if (options.body) headers.set('content-type', 'application/json');
    const res = await fetch(API_URL, { ...options, headers, cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
    return data;
  }

  function injectStyles() {
    if ($('#editableTitleStyles')) return;
    const style = document.createElement('style');
    style.id = 'editableTitleStyles';
    style.textContent = `
      .brand-title-editable{position:relative;display:inline-block;max-width:min(52vw,520px);outline:0;border-radius:7px;cursor:text;transition:background .15s ease,box-shadow .15s ease;padding:1px 5px;margin-left:-5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .brand-title-editable:hover{background:rgba(255,255,255,.11)}
      .brand-title-editable:focus{background:rgba(255,255,255,.16);box-shadow:0 0 0 2px rgba(255,255,255,.28);overflow:visible;text-overflow:clip}
      .brand-title-editable::after{content:'✎';font-size:.56em;opacity:0;margin-left:7px;vertical-align:middle;transition:opacity .15s ease}
      .brand-title-editable:hover::after,.brand-title-editable:focus::after{opacity:.6}
      @media(max-width:600px){.brand-title-editable{max-width:46vw}}
      @media print{.brand-title-editable::after{display:none!important}}
    `;
    document.head.appendChild(style);
  }

  function normalize(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 48);
  }

  async function loadTitle(el) {
    try {
      const data = await api();
      const title = normalize(data.title) || DEFAULT_TITLE;
      el.textContent = title;
      el.dataset.savedTitle = title;
      el.title = 'Cliquer pour modifier ce titre';
    } catch {
      el.dataset.savedTitle = normalize(el.textContent) || DEFAULT_TITLE;
    }
  }

  async function saveTitle(el) {
    const previous = el.dataset.savedTitle || DEFAULT_TITLE;
    const next = normalize(el.textContent);
    if (!next) {
      el.textContent = previous;
      toast('Le titre ne peut pas être vide.');
      return;
    }
    el.textContent = next;
    if (next === previous) return;
    el.dataset.saving = '1';
    try {
      const data = await api({ method: 'POST', body: JSON.stringify({ title: next }) });
      const saved = normalize(data.title) || next;
      el.textContent = saved;
      el.dataset.savedTitle = saved;
      toast('Titre enregistré.');
      document.dispatchEvent(new CustomEvent('agenda:title-changed', { detail: { title: saved } }));
    } catch (err) {
      el.textContent = previous;
      toast(err.message || 'Impossible d’enregistrer le titre.', 3200);
    } finally {
      delete el.dataset.saving;
    }
  }

  function start() {
    injectStyles();
    const title = document.querySelector('.brand h1');
    if (!title) return;
    title.classList.add('brand-title-editable');
    title.contentEditable = 'true';
    title.spellcheck = false;
    title.setAttribute('role', 'textbox');
    title.setAttribute('aria-label', 'Titre de l’Agenda');
    title.setAttribute('aria-multiline', 'false');

    title.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        title.blur();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        title.textContent = title.dataset.savedTitle || DEFAULT_TITLE;
        title.blur();
      }
    });
    title.addEventListener('paste', e => {
      e.preventDefault();
      const text = normalize(e.clipboardData?.getData('text/plain') || '');
      document.execCommand('insertText', false, text);
    });
    title.addEventListener('blur', () => saveTitle(title));
    loadTitle(title);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
