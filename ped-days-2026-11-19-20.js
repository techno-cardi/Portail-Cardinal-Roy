(() => {
  'use strict';

  const RESOURCE_ID = 'journees-pedagogiques-2026-11-19-20';
  const RESOURCE_URL = 'https://drive.google.com/file/d/1j3SULKwLt8EiBvHtsSo9XuAyB6m9puQ2/view';
  const STARTS_AT = Date.parse('2026-11-17T00:00:00-05:00');
  const EXPIRES_AT = Date.parse('2026-11-20T23:59:00-05:00');

  const remove = () => {
    const node = document.getElementById(RESOURCE_ID);
    if (!node) return;
    node.remove();
    window.PORTAL_REGISTRY?.refresh?.();
  };

  const mount = () => {
    if (Date.now() < STARTS_AT || Date.now() >= EXPIRES_AT) {
      remove();
      return true;
    }

    const list = document.querySelector('#section-organisation-scolaire .procedure-list');
    if (!list) return false;

    let card = document.getElementById(RESOURCE_ID);
    if (!card) {
      card = document.createElement('details');
      card.className = 'procedure';
      card.id = RESOURCE_ID;
      const after = list.querySelector('#dates-importantes-2026-2027')
        || list.querySelector('#calendrier-scolaire-2026-2027');
      if (after) after.insertAdjacentElement('afterend', card);
      else list.prepend(card);
    }

    card.dataset.search = [
      'pédago pedago péda peda pédagogie pedagogie pédagogique pedagogique',
      'journée pédagogique journee pedagogique journées pédagogiques journees pedagogiques',
      'horaire pédago horaire pedagogique 19 novembre 20 novembre 2026',
      'jeudi vendredi télétravail teletravail ordre du jour personnel enseignant'
    ].join(' ');
    card.dataset.expires = '2026-11-20T23:59:00-05:00';
    card.innerHTML = [
      '<summary>',
      '<span class="procedure-visual emoji-visual" aria-hidden="true">📚</span>',
      '<span class="procedure-labels">',
      '<span class="procedure-title">Horaire des journées pédagogiques - 19 et 20 novembre</span>',
      '<span class="procedure-subtitle">Jeudi 19 et vendredi 20 novembre 2026</span>',
      '</span>',
      '</summary>',
      '<div class="procedure-content">',
      '<p>Consultez l’horaire des journées pédagogiques du <strong>jeudi 19 novembre</strong> et du <strong>vendredi 20 novembre (télétravail)</strong>.</p>',
      '<div class="links">',
      '<a class="btn primary" href="' + RESOURCE_URL + '" target="_blank" rel="noopener noreferrer">Accéder au fichier</a>',
      '</div>',
      '</div>'
    ].join('');

    window.PORTAL_REGISTRY?.refresh?.();
    return true;
  };

  if (!mount()) {
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (mount() || attempts >= 100) window.clearInterval(timer);
    }, 50);
  }

  const delay = EXPIRES_AT - Date.now();
  if (delay > 0 && delay < 2147483000) {
    window.setTimeout(() => {
      remove();
      // Recharger la recherche et les Nouveautés déjà construites dans l'onglet.
      window.location.reload();
    }, delay + 100);
  }
})();
