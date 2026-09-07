(() => {
  'use strict';

  const registry = window.PORTAL_REGISTRY;
  const input = document.getElementById('guide-search');
  const suggestions = document.getElementById('search-suggestions');
  const status = document.getElementById('search-status');
  if (!registry || !input || !suggestions) return;

  const VERSION = '1.0';
  const RECENT_KEY = 'cardi-portal-recent-v1';
  const ANALYTICS_KEY = 'cardi-portal-analytics-v1';
  const MAX_RECENT = 6;
  const MAX_ANALYTICS_QUERIES = 100;
  const searchRecordCooldown = new Map();

  const safeJson = (value, fallback) => {
    try { return JSON.parse(value); } catch { return fallback; }
  };

  const readRecent = () => {
    const data = safeJson(localStorage.getItem(RECENT_KEY) || '[]', []);
    return Array.isArray(data) ? data.filter(item => item && registry.get(item.id)).slice(0, MAX_RECENT) : [];
  };

  const writeRecent = recent => localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));

  const defaultAnalytics = () => ({
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    totals: { searches: 0, noResults: 0, opens: 0 },
    searches: {},
    noResults: {},
    opens: {}
  });

  const readAnalytics = () => {
    const parsed = safeJson(localStorage.getItem(ANALYTICS_KEY) || '', null);
    return parsed && parsed.version === 1 ? parsed : defaultAnalytics();
  };

  const trimQueryMap = map => {
    const entries = Object.entries(map || {});
    if (entries.length <= MAX_ANALYTICS_QUERIES) return map;
    entries.sort((a,b) => new Date(b[1]?.last || 0) - new Date(a[1]?.last || 0));
    return Object.fromEntries(entries.slice(0, MAX_ANALYTICS_QUERIES));
  };

  const writeAnalytics = analytics => {
    analytics.updatedAt = new Date().toISOString();
    analytics.searches = trimQueryMap(analytics.searches);
    analytics.noResults = trimQueryMap(analytics.noResults);
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(analytics));
  };

  const privacySafeQuery = rawQuery => {
    const raw = String(rawQuery || '').trim();
    if (!raw) return '';
    if (/@/.test(raw) || /(?:\d[ .()-]*){7,}/.test(raw)) return '[requête privée]';
    return registry.normalize(raw).slice(0, 64);
  };

  const analytics = {
    snapshot: () => readAnalytics(),
    clear: () => {
      localStorage.removeItem(ANALYTICS_KEY);
      return defaultAnalytics();
    },
    recordSearch(rawQuery, resultCount) {
      const query = privacySafeQuery(rawQuery);
      if (!query || query.length < 2) return;
      const now = Date.now();
      const last = searchRecordCooldown.get(query) || 0;
      if (now - last < 10000) return;
      searchRecordCooldown.set(query, now);

      const data = readAnalytics();
      const timestamp = new Date().toISOString();
      data.totals.searches += 1;
      const current = data.searches[query] || { count: 0, last: timestamp, lastResultCount: 0 };
      current.count += 1;
      current.last = timestamp;
      current.lastResultCount = resultCount;
      data.searches[query] = current;

      if (resultCount === 0) {
        data.totals.noResults += 1;
        const missing = data.noResults[query] || { count: 0, last: timestamp };
        missing.count += 1;
        missing.last = timestamp;
        data.noResults[query] = missing;
      }
      writeAnalytics(data);
    },
    recordOpen(id) {
      const resource = registry.get(id);
      if (!resource) return;
      const data = readAnalytics();
      const timestamp = new Date().toISOString();
      data.totals.opens += 1;
      const current = data.opens[id] || { count: 0, last: timestamp, title: resource.title };
      current.count += 1;
      current.last = timestamp;
      current.title = resource.title;
      data.opens[id] = current;
      writeAnalytics(data);
    }
  };
  window.PORTAL_ANALYTICS = analytics;

  const renderRecent = () => {
    const stage = document.querySelector('.search-stage-inner');
    if (!stage) return;
    let host = stage.querySelector('.portal-recent');
    if (!host) {
      host = document.createElement('div');
      host.className = 'portal-recent';
      host.setAttribute('aria-label', 'Ressources récemment consultées');
      const under = stage.querySelector('.search-under');
      const ribbon = stage.querySelector('.app-ribbon');
      if (under) under.insertAdjacentElement('afterend', host);
      else if (ribbon) ribbon.insertAdjacentElement('beforebegin', host);
      else stage.appendChild(host);
    }

    const recent = readRecent();
    if (!recent.length) {
      host.hidden = true;
      host.innerHTML = '';
      return;
    }

    host.hidden = false;
    host.innerHTML = '<span class="portal-recent-label">Récemment consultés</span>';
    const list = document.createElement('div');
    list.className = 'portal-recent-list';
    recent.forEach(item => {
      const resource = registry.get(item.id);
      if (!resource) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'portal-recent-button';
      button.dataset.openId = resource.id;
      button.title = resource.title;
      button.textContent = resource.title;
      list.appendChild(button);
    });
    host.appendChild(list);
  };

  const recordRecent = id => {
    const resource = registry.get(id);
    if (!resource) return;
    const recent = readRecent().filter(item => item.id !== id);
    recent.unshift({ id, ts: new Date().toISOString() });
    writeRecent(recent);
    analytics.recordOpen(id);
    renderRecent();
  };

  const cloneSuggestionVisual = resource => {
    const visual = resource.node.querySelector('summary .procedure-visual')?.cloneNode(true);
    if (visual) {
      visual.classList.remove('procedure-visual');
      visual.classList.add('suggestion-visual');
      return visual;
    }
    const fallback = document.createElement('span');
    fallback.className = 'suggestion-visual emoji-visual';
    fallback.setAttribute('aria-hidden','true');
    fallback.textContent = '🔎';
    return fallback;
  };

  const makeSmartSuggestion = resource => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'suggestion smart-suggestion';
    button.setAttribute('role','option');
    button.dataset.openId = resource.id;
    button.dataset.smartSuggestion = 'true';
    button.appendChild(cloneSuggestionVisual(resource));

    const copy = document.createElement('span');
    copy.className = 'suggestion-copy';
    const strong = document.createElement('strong');
    strong.textContent = resource.title;
    copy.appendChild(strong);
    const small = document.createElement('small');
    small.textContent = resource.category;
    copy.appendChild(small);
    button.appendChild(copy);

    const arrow = document.createElement('span');
    arrow.className = 'suggestion-arrow';
    arrow.setAttribute('aria-hidden','true');
    arrow.textContent = '→';
    button.appendChild(arrow);
    return button;
  };

  const hasEasterEgg = () => Boolean(suggestions.querySelector('.search-easter-egg,.search-extra-egg,.search-countdown-line,.search-extra-title'));

  const renderSmartSuggestions = () => {
    const rawQuery = input.value.trim();
    if (rawQuery.length < 2 || hasEasterEgg()) return;
    registry.refresh();
    const matches = registry.search(rawQuery, 7);
    if (!matches.length) return;

    const preservedSubresources = [...suggestions.querySelectorAll('.subresource-suggestion')]
      .map(node => node.cloneNode(true));
    const preciseSubresourcePresent = preservedSubresources.length > 0;
    const ids = new Set();
    const fragment = document.createDocumentFragment();

    preservedSubresources.forEach(node => {
      const key = node.dataset.subresourceId || node.textContent;
      if (ids.has(key)) return;
      ids.add(key);
      fragment.appendChild(node);
    });

    matches.forEach(resource => {
      if (preciseSubresourcePresent && resource.id === 'applications-cssc') return;
      if (ids.has(resource.id)) return;
      ids.add(resource.id);
      fragment.appendChild(makeSmartSuggestion(resource));
    });

    const wrapper = document.createElement('div');
    wrapper.appendChild(fragment);
    [...wrapper.children].slice(7).forEach(node => node.remove());
    suggestions.replaceChildren(...wrapper.children);
    suggestions.hidden = false;
    input.setAttribute('aria-expanded','true');
    const count = suggestions.querySelectorAll('.suggestion').length;
    if (status) status.textContent = `${count} suggestion${count > 1 ? 's' : ''}`;
  };

  const queueSmartSuggestions = () => queueMicrotask(renderSmartSuggestions);
  input.addEventListener('input', queueSmartSuggestions);
  input.addEventListener('focus', queueSmartSuggestions);

  input.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || hasEasterEgg()) return;
    const top = suggestions.querySelector('.subresource-suggestion,.smart-suggestion');
    if (!top) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    top.click();
  }, true);

  let analyticsTimer = 0;
  const scheduleSearchAnalytics = () => {
    if (analyticsTimer) window.clearTimeout(analyticsTimer);
    const rawQuery = input.value.trim();
    if (rawQuery.length < 2) return;
    analyticsTimer = window.setTimeout(() => {
      analyticsTimer = 0;
      if (input.value.trim() !== rawQuery) return;
      const resultCount = registry.search(rawQuery, 50).length;
      analytics.recordSearch(rawQuery, resultCount);
    }, 700);
  };
  input.addEventListener('input', scheduleSearchAnalytics);

  document.addEventListener('click', event => {
    let id = '';
    const openButton = event.target.closest('[data-open-id]');
    if (openButton) id = openButton.dataset.openId || '';

    if (!id) {
      const summary = event.target.closest('.procedure > summary');
      if (summary) id = summary.parentElement?.id || '';
    }

    if (!id) {
      const procedure = event.target.closest('.procedure[id]');
      if (procedure && event.target.closest('a,button')) id = procedure.id;
    }

    if (id && registry.get(id)) window.setTimeout(() => recordRecent(id), 0);
  }, true);

  const formatDate = iso => {
    const date = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(date.getTime())) return iso;
    return new Intl.DateTimeFormat('fr-CA', {day:'numeric', month:'short', year:'numeric'}).format(date).replace(/\.$/,'');
  };

  const decorateFreshness = () => {
    registry.refresh();
    registry.resources.forEach(resource => {
      if (!resource.updatedAt) return;
      const labels = resource.node.querySelector('.procedure-labels');
      if (!labels || labels.querySelector('.portal-freshness')) return;
      const age = registry.ageDays(resource.updatedAt);
      const stale = age !== null && age > resource.cadenceDays;
      const badge = document.createElement('span');
      badge.className = `portal-freshness${stale ? ' is-stale' : ''}`;
      badge.dataset.updatedAt = resource.updatedAt;
      badge.textContent = stale
        ? `À vérifier · mise à jour du ${formatDate(resource.updatedAt)}`
        : `Mis à jour le ${formatDate(resource.updatedAt)}`;
      labels.appendChild(badge);
    });
  };

  renderRecent();
  decorateFreshness();
  if (location.hash) {
    const id = decodeURIComponent(location.hash.slice(1));
    if (registry.get(id)) window.setTimeout(() => recordRecent(id), 400);
  }

  document.documentElement.dataset.portalUpgrades = VERSION;
  window.dispatchEvent(new CustomEvent('portal:upgrades-ready', {detail:{version:VERSION}}));
})();
