(() => {
  'use strict';

  const VERSION = '1.0';
  const TRIGGERS = new Set([
    'télétravail',
    'télé-travail',
    'télé travail',
    'pédago télétravail',
    'pédago en télétravail',
    'pédagogique télétravail',
    'pédagogique en télétravail',
    'pédagogiques télétravail',
    'pédagogiques en télétravail',
    'journée pédagogique télétravail',
    'journée pédagogique en télétravail',
    'journées pédagogiques télétravail',
    'journées pédagogiques en télétravail'
  ]);

  const TELEWORK_DAYS = [
    'Vendredi 20 novembre 2026',
    'Lundi 25 janvier 2027',
    'Vendredi 19 février 2027',
    'Lundi 8 mars 2027',
    'Mardi 29 juin 2027'
  ];

  const normalize = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9 -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const NORMALIZED_TRIGGERS = new Set([...TRIGGERS].map(normalize));
  const isTeleworkQuery = input => NORMALIZED_TRIGGERS.has(normalize(input?.value));

  const injectStyle = () => {
    if (document.getElementById('telework-search-style')) return;
    const style = document.createElement('style');
    style.id = 'telework-search-style';
    style.textContent = `
      .telework-search-card{
        padding:15px 17px;color:#5f1020;background:#fff8fa;
        border:1px solid rgba(127,20,39,.24);border-radius:14px;
        box-shadow:0 8px 24px rgba(72,12,27,.07)
      }
      .telework-search-card .search-extra-title{
        font-family:"IBM Plex Serif",Georgia,serif;font-size:1.02rem;
        font-weight:800;color:#731326;text-align:center
      }
      .telework-search-card .search-extra-copy{margin-top:7px;line-height:1.45}
      .telework-search-list{margin:8px 0 0;padding-left:1.35rem;text-align:left}
      .telework-search-list li+li{margin-top:3px}
    `;
    document.head.appendChild(style);
  };

  const resultHtml = () => `
    <div class="no-suggestion search-extra-egg telework-search-card" role="status">
      <div class="search-extra-title">Pédagogiques en télétravail 2026-2027</div>
      <div class="search-extra-copy">
        Les pédagogiques en télétravail pour 2026-2027 sont :
        <ul class="telework-search-list">
          ${TELEWORK_DAYS.map(day => `<li>${day}</li>`).join('')}
        </ul>
      </div>
    </div>`;

  const attach = () => {
    const input = document.getElementById('guide-search');
    const suggestions = document.getElementById('search-suggestions');
    const status = document.getElementById('search-status');
    if (!input || !suggestions || window.PORTAL_SEARCH_ENGINE !== '2.0') return false;
    if (input.dataset.teleworkSearchBound === 'true') return true;

    injectStyle();
    input.dataset.teleworkSearchBound = 'true';
    window.PORTAL_TELEWORK_SEARCH = VERSION;

    const showResult = event => {
      if (!isTeleworkQuery(input)) return;
      event?.stopImmediatePropagation();
      suggestions.hidden = false;
      suggestions.innerHTML = resultHtml();
      input.setAttribute('aria-expanded', 'true');
      if (status) status.textContent = '1 résultat';
    };

    input.addEventListener('input', showResult, true);
    input.addEventListener('focus', showResult, true);
    input.addEventListener('keydown', event => {
      if (!isTeleworkQuery(input)) return;
      if (event.key === 'Enter' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        event.stopImmediatePropagation();
        showResult();
      }
    }, true);

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
