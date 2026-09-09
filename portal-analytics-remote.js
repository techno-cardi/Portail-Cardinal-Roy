(() => {
  'use strict';

  const ENDPOINT = 'https://ojyswaxuqwnqilrvtjll.supabase.co/functions/v1/portal-analytics';
  const VISIT_KEY = 'cardi-portal-visit-v1';
  const VISIT_WINDOW_MS = 30 * 60 * 1000;
  const analytics = window.PORTAL_ANALYTICS;
  if (!analytics || analytics.remoteAvailable) return;

  const isProduction = location.origin === 'https://techno-cardi.github.io';
  const searchCooldown = new Map();

  const send = payload => {
    if (!isProduction) return Promise.resolve(false);
    try {
      return fetch(ENDPOINT, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        keepalive: true,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(response => response.ok).catch(() => false);
    } catch {
      return Promise.resolve(false);
    }
  };

  const localRecordSearch = analytics.recordSearch.bind(analytics);
  const localRecordOpen = analytics.recordOpen.bind(analytics);

  analytics.recordSearch = (rawQuery, resultCount) => {
    const result = localRecordSearch(rawQuery, resultCount);
    const key = String(rawQuery || '').trim().toLowerCase();
    const now = Date.now();
    const last = searchCooldown.get(key) || 0;
    if (key.length >= 2 && now - last >= 10000) {
      searchCooldown.set(key, now);
      send({ type: 'search', query: rawQuery, resultCount });
    }
    return result;
  };

  analytics.recordOpen = id => {
    const result = localRecordOpen(id);
    send({ type: 'open', resourceId: id });
    return result;
  };

  analytics.remoteHealth = async () => {
    const response = await fetch(`${ENDPOINT}?health=1`, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      headers: { 'accept': 'application/json' }
    });
    if (!response.ok) throw new Error(`Analytics Supabase indisponibles (${response.status})`);
    return response.json();
  };

  analytics.remoteSnapshot = async (days = 30) => {
    if (!isProduction) throw new Error('Analytics Supabase désactivées hors du portail publié');
    const requested = Number(days);
    const safeDays = Number.isFinite(requested) ? Math.max(1, Math.min(365, Math.trunc(requested))) : 30;
    const response = await fetch(`${ENDPOINT}?days=${safeDays}`, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      headers: { 'accept': 'application/json' }
    });
    if (!response.ok) throw new Error(`Analytics Supabase indisponibles (${response.status})`);
    return response.json();
  };

  analytics.remoteAvailable = true;
  analytics.remoteEnabled = isProduction;
  analytics.remoteEndpoint = ENDPOINT;
  document.documentElement.dataset.portalAnalyticsRemote = isProduction ? 'supabase' : 'local-only';

  if (isProduction) {
    let lastVisit = 0;
    try { lastVisit = Number(localStorage.getItem(VISIT_KEY) || 0); } catch {}
    const now = Date.now();
    if (!Number.isFinite(lastVisit) || now - lastVisit >= VISIT_WINDOW_MS) {
      try { localStorage.setItem(VISIT_KEY, String(now)); } catch {}
      send({ type: 'visit' });
    }
  }
})();
