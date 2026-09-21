(() => {
  'use strict';

  const CONFIG_URL = 'portal-maintenance.json';
  const VERSION = '1.0';
  const suggestionHost = () => document.getElementById('search-suggestions');
  const searchInput = () => document.getElementById('guide-search');

  const normalize = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9+ -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const levenshteinWithin = (a, b, maxDistance) => {
    if (a === b) return 0;
    if (!maxDistance || Math.abs(a.length - b.length) > maxDistance) return maxDistance + 1;
    let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let i = 1; i <= a.length; i += 1) {
      const current = [i];
      let rowMin = current[0];
      for (let j = 1; j <= b.length; j += 1) {
        const value = Math.min(
          current[j - 1] + 1,
          previous[j] + 1,
          previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
        current[j] = value;
        rowMin = Math.min(rowMin, value);
      }
      if (rowMin > maxDistance) return maxDistance + 1;
      previous = current;
    }
    return previous[b.length];
  };

  const tokenMatches = (queryTokens, rawTerm) => {
    const term = normalize(rawTerm);
    if (!term) return false;
    if (term.includes(' ')) return normalize(queryTokens.join(' ')).includes(term);
    return queryTokens.some(token => {
      if (token === term || token.includes(term) || term.includes(token)) return true;
      const maxDistance = Math.max(token.length, term.length) >= 8 ? 2 : Math.max(token.length, term.length) >= 4 ? 1 : 0;
      return maxDistance > 0 && levenshteinWithin(token, term, maxDistance) <= maxDistance;
    });
  };

  const matchesDirectIntent = (query, entry) => {
    const normalizedQuery = normalize(query);
    if (normalizedQuery.length < 3) return false;
    const queryTokens = normalizedQuery.split(' ').filter(Boolean);
    const groups = Array.isArray(entry.search_required_groups) ? entry.search_required_groups : [];
    return groups.length > 0 && groups.every(group => Array.isArray(group) && group.some(term => tokenMatches(queryTokens, term)));
  };

  const markResource = entry => {
    const node = document.getElementById(entry.resource_id);
    if (!node) return;
    node.dataset.directFileUrl = entry.url;
    node.dataset.directFileTitle = entry.title;
    node.dataset.directFileAction = entry.action_label;
    node.dataset.directFileKey = entry.key;

    const exact = [...node.querySelectorAll('a[href]')].find(anchor => anchor.href === entry.url || anchor.getAttribute('href') === entry.url);
    if (exact) {
      exact.href = entry.url;
      exact.target = '_blank';
      exact.rel = 'noopener noreferrer';
      exact.dataset.directFileLink = entry.key;
    }
  };

  const visualFor = entry => {
    const node = document.getElementById(entry.resource_id);
    const visual = node?.querySelector('summary .procedure-visual')?.cloneNode(true);
    if (visual) {
      visual.classList.remove('procedure-visual');
      visual.classList.add('suggestion-visual');
      return visual;
    }
    const fallback = document.createElement('span');
    fallback.className = 'suggestion-visual emoji-visual';
    fallback.setAttribute('aria-hidden', 'true');
    fallback.textContent = '📄';
    return fallback;
  };

  const makeSuggestion = entry => {
    const anchor = document.createElement('a');
    anchor.className = 'suggestion subresource-suggestion direct-file-suggestion';
    anchor.href = entry.url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.setAttribute('role', 'option');
    anchor.dataset.directFileSuggestion = entry.key;
    anchor.dataset.searchSubresource = `direct-file-${entry.key}`;
    anchor.dataset.subresourceId = `direct-file-${entry.key}`;
    anchor.appendChild(visualFor(entry));

    const copy = document.createElement('span');
    copy.className = 'suggestion-copy';
    const strong = document.createElement('strong');
    strong.textContent = entry.title;
    const small = document.createElement('small');
    small.textContent = entry.action_label;
    copy.append(strong, small);
    anchor.appendChild(copy);

    const arrow = document.createElement('span');
    arrow.className = 'suggestion-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '↗';
    anchor.appendChild(arrow);
    anchor.addEventListener('click', () => window.PORTAL_ANALYTICS?.recordOpen?.(entry.resource_id));
    return anchor;
  };

  const renderDirectSearch = entries => {
    const input = searchInput();
    const suggestions = suggestionHost();
    if (!input || !suggestions) return;

    suggestions.querySelectorAll('[data-direct-file-suggestion]').forEach(node => node.remove());
    const query = input.value.trim();
    if (query.length < 2) return;

    const entry = entries.find(candidate => matchesDirectIntent(query, candidate));
    if (!entry) return;

    suggestions.querySelectorAll(`.smart-suggestion[data-open-id="${CSS.escape(entry.resource_id)}"]`).forEach(node => node.remove());
    suggestions.prepend(makeSuggestion(entry));
    [...suggestions.querySelectorAll('.suggestion')].slice(7).forEach(node => node.remove());
    suggestions.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };

  const decorateUpdates = entries => {
    const urls = new Map(entries.map(entry => [entry.url, entry]));
    document.querySelectorAll('#portal-updates a.portal-update-item[href]').forEach(anchor => {
      const rawHref = anchor.getAttribute('href') || '';
      const entry = urls.get(rawHref) || entries.find(candidate => anchor.href === candidate.url);
      if (!entry) return;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.dataset.directFileUpdate = entry.key;
      const action = anchor.querySelector('.portal-update-action');
      if (action && action.textContent !== entry.action_label) action.textContent = entry.action_label;
    });
  };

  const attachSearch = entries => {
    const input = searchInput();
    if (!input || input.dataset.directFilesAttached === 'true') return;
    input.dataset.directFilesAttached = 'true';
    const queue = () => queueMicrotask(() => queueMicrotask(() => renderDirectSearch(entries)));
    input.addEventListener('input', queue);
    input.addEventListener('focus', queue);
    queue();
  };

  const start = async () => {
    try {
      const response = await fetch(`${CONFIG_URL}?v=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const config = await response.json();
      const entries = Object.entries(config.direct_files || {})
        .map(([key, value]) => ({ key, ...value }))
        .filter(entry => entry.resource_id && /^https:\/\//i.test(entry.url || '') && entry.action_label);
      if (!entries.length) return;

      window.PORTAL_DIRECT_FILES = entries;
      entries.forEach(markResource);
      decorateUpdates(entries);

      const updatesHost = document.getElementById('portal-updates') || document.body;
      new MutationObserver(() => decorateUpdates(entries)).observe(updatesHost, { childList: true, subtree: true });

      const attachWhenReady = () => {
        if (window.PORTAL_REGISTRY && document.documentElement.dataset.portalUpgrades) attachSearch(entries);
        else window.setTimeout(attachWhenReady, 60);
      };
      attachWhenReady();

      document.documentElement.dataset.directFiles = VERSION;
      window.dispatchEvent(new CustomEvent('portal:direct-files-ready', { detail: { version: VERSION, count: entries.length } }));
    } catch (error) {
      console.warn('Navigation directe vers les fichiers indisponible :', error);
    }
  };

  start();
})();
