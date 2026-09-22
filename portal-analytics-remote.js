(() => {
  'use strict';

  const ENDPOINT = 'https://ojyswaxuqwnqilrvtjll.supabase.co/functions/v1/portal-analytics';
  const VISITOR_KEY = 'cardi-portal-anonymous-visitor-v1';
  const VISIT_KEY = 'cardi-portal-visit-v2';
  const VISIT_WINDOW_MS = 30 * 60 * 1000;
  const analytics = window.PORTAL_ANALYTICS;
  if (!analytics) return;

  const isProduction = location.origin === 'https://techno-cardi.github.io';
  const isHealthAudit = new URLSearchParams(location.search).has('health');
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

  const isUuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));

  const createUuid = () => {
    if (crypto?.randomUUID) return crypto.randomUUID();
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  };

  const getVisitorId = () => {
    try {
      const existing = localStorage.getItem(VISITOR_KEY) || '';
      if (isUuid(existing)) return existing;
      const created = createUuid();
      localStorage.setItem(VISITOR_KEY, created);
      return created;
    } catch {
      try { return createUuid(); } catch { return ''; }
    }
  };

  if (!analytics.remoteHooksInstalled) {
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

    analytics.remoteHooksInstalled = true;
  }

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
  analytics.anonymousUniqueVisitors = true;
  document.documentElement.dataset.portalAnalyticsRemote = isProduction ? 'supabase' : 'local-only';

  if (isProduction && !isHealthAudit && !document.documentElement.dataset.portalUniqueVisitAttempted) {
    document.documentElement.dataset.portalUniqueVisitAttempted = 'true';
    let lastVisit = 0;
    try { lastVisit = Number(localStorage.getItem(VISIT_KEY) || 0); } catch {}
    const now = Date.now();
    if (!Number.isFinite(lastVisit) || now - lastVisit >= VISIT_WINDOW_MS) {
      const visitorId = getVisitorId();
      if (visitorId) {
        send({ type: 'visit', visitorId }).then(success => {
          if (!success) return;
          try { localStorage.setItem(VISIT_KEY, String(Date.now())); } catch {}
        });
      }
    }
  }
})();
