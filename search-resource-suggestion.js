(() => {
  const VERSION = '1.0';
  const FAILURE_THRESHOLD = 3;
  const FAILURE_DELAY_MS = 900;
  const MAIL_SUBJECT = 'Suggestion d’ajout d’une ressource sur le Portail Cardinal-Roy';

  const normalize = value => (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9+ -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const suggestionMailto = () => {
    const contact = document.querySelector('.techno-contact[href^="mailto:"]');
    const currentMailto = contact?.getAttribute('href') || '';
    if (!currentMailto.toLowerCase().startsWith('mailto:')) return '';

    // Réutilise exactement les destinataires du bouton « Joindre les technopédagogues ».
    // Seul le sujet change, ce qui évite de dupliquer les adresses dans le code.
    const recipients = currentMailto.split('?')[0];
    return `${recipients}?subject=${encodeURIComponent(MAIL_SUBJECT)}`;
  };

  const injectStyle = () => {
    if (document.getElementById('search-resource-suggestion-style')) return;
    const style = document.createElement('style');
    style.id = 'search-resource-suggestion-style';
    style.textContent = `
      .portal-resource-suggestion-row{
        margin-top:9px;padding-top:8px;border-top:1px solid rgba(127,20,39,.14);
        font-size:.86rem;line-height:1.35
      }
      .portal-resource-suggestion{
        color:#7f1427;font-weight:800;text-decoration:underline;text-underline-offset:2px
      }
      .portal-resource-suggestion:hover,.portal-resource-suggestion:focus-visible{
        color:#5b0e1b;text-decoration-thickness:2px
      }
    `;
    document.head.appendChild(style);
  };

  const attach = () => {
    const input = document.getElementById('guide-search');
    const suggestions = document.getElementById('search-suggestions');
    if (!input || !suggestions || window.PORTAL_SEARCH_ENGINE !== '2.0') return false;
    if (input.dataset.resourceSuggestionBound === 'true') return true;

    input.dataset.resourceSuggestionBound = 'true';
    window.PORTAL_RESOURCE_SUGGESTION = VERSION;
    injectStyle();

    const failedQueries = new Set();
    let failureTimer = 0;
    let offerUnlocked = false;

    const regularNoResult = () => {
      const emptyState = suggestions.querySelector('.no-suggestion');
      if (!emptyState || suggestions.querySelector('.suggestion')) return null;
      if (emptyState.classList.contains('search-extra-egg')) return null;
      if (emptyState.classList.contains('search-easter-egg')) return null;
      if (emptyState.querySelector('.search-countdown-line,.search-extra-title')) return null;
      return emptyState;
    };

    const decorateNoResult = () => {
      if (!offerUnlocked) return;
      const emptyState = regularNoResult();
      if (!emptyState || emptyState.querySelector('.portal-resource-suggestion-row')) return;

      const mailto = suggestionMailto();
      if (!mailto) return;

      const row = document.createElement('div');
      row.className = 'portal-resource-suggestion-row';
      row.innerHTML = 'Toujours rien? ';

      const link = document.createElement('a');
      link.className = 'portal-resource-suggestion';
      link.href = mailto;
      link.textContent = 'Suggérer un ajout au portail';
      row.appendChild(link);
      emptyState.appendChild(row);
    };

    const recordFailure = rawQuery => {
      const query = normalize(rawQuery);
      if (!query || failedQueries.has(query)) {
        decorateNoResult();
        return;
      }
      if (normalize(input.value) !== query || !regularNoResult()) return;

      failedQueries.add(query);
      offerUnlocked = failedQueries.size >= FAILURE_THRESHOLD;
      decorateNoResult();
    };

    const scheduleFailure = () => {
      if (failureTimer) window.clearTimeout(failureTimer);
      failureTimer = 0;

      const rawQuery = input.value.trim();
      if (!rawQuery || !regularNoResult()) {
        decorateNoResult();
        return;
      }

      const query = normalize(rawQuery);
      if (!query || failedQueries.has(query)) {
        decorateNoResult();
        return;
      }

      failureTimer = window.setTimeout(() => {
        failureTimer = 0;
        recordFailure(rawQuery);
      }, FAILURE_DELAY_MS);
    };

    // Le moteur principal met à jour la liste avant cet écouteur. Les easter eggs,
    // eux, interceptent leurs requêtes exactes en phase de capture et ne sont donc
    // jamais comptés comme des recherches ratées.
    input.addEventListener('input', scheduleFailure);
    input.addEventListener('focus', () => window.setTimeout(decorateNoResult, 0));
    input.addEventListener('keydown', event => {
      if (event.key !== 'Enter' || !regularNoResult()) return;
      if (failureTimer) window.clearTimeout(failureTimer);
      failureTimer = 0;
      recordFailure(input.value);
    });

    // Si le moteur rerend l'état vide après le troisième essai, le lien est remis
    // automatiquement sans modifier la logique interne du moteur de recherche.
    const observer = new MutationObserver(decorateNoResult);
    observer.observe(suggestions, { childList: true, subtree: false });

    return true;
  };

  if (!attach()) {
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (attach() || attempts >= 120) window.clearInterval(timer);
    }, 100);
  }
})();
