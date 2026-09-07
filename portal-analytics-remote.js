(() => {
  'use strict';

  const ENDPOINT = 'https://ojyswaxuqwnqilrvtjll.supabase.co/functions/v1/portal-analytics';
  const analytics = window.PORTAL_ANALYTICS;
  if (!analytics || analytics.remoteAvailable) return;

  const isProduction = location.origin === 'https://techno-cardi.github.io';

  const send = payload => {
    if (!isProduction) return;
    try {
      fetch(ENDPOINT, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        keepalive: true,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {});
    } catch {
      // Les statistiques distantes ne doivent jamais nuire au portail.
    }
  };

  const localRecordSearch = analytics.recordSearch.bind(analytics);
  const localRecordOpen = analytics.recordOpen.bind(analytics);

  analytics.recordSearch = (rawQuery, resultCount) => {
    const result = localRecordSearch(rawQuery, resultCount);
    send({ type: 'search', query: rawQuery, resultCount });
    return result;
  };

  analytics.recordOpen = id => {
    const result = localRecordOpen(id);
    send({ type: 'open', resourceId: id });
    return result;
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
})();
