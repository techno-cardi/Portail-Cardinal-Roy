(() => {
  'use strict';

  let attempts = 0;
  const attach = () => {
    attempts += 1;
    if (window.PORTAL_ANALYTICS) {
      if (document.querySelector('script[data-portal-analytics-fresh]')) return;
      const script = document.createElement('script');
      script.src = 'portal-analytics-remote.js?v=20260921-unique1';
      script.dataset.portalAnalyticsFresh = 'true';
      document.body.appendChild(script);
      return;
    }
    if (attempts < 160) window.setTimeout(attach, 125);
  };

  attach();
})();
