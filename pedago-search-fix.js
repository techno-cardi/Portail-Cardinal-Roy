(() => {
  'use strict';

  const RESOURCE_ID = 'journee-pedagogique-2026-09-18';
  const RESOURCE_URL = 'https://drive.google.com/file/d/1S7mZootQb4dddOYHKOU19_yyEqeWu3fG/view?usp=drivesdk';
  const suggestions = document.getElementById('search-suggestions');
  const status = document.getElementById('search-status');
  if (!suggestions) return;

  const normalize = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9 -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const isPedagoQuery = value => {
    const query = normalize(value);
    return /^ped/.test(query) && query.length >= 3;
  };

  const getInput = () => document.getElementById('guide-search');
  const getCard = () => document.getElementById(RESOURCE_ID);

  const renderPedago = input => {
    const card = getCard();
    if (!card) return false;

    const title = card.querySelector('.procedure-title')?.textContent?.trim()
      || 'Horaire de la journée pédagogique du 18 septembre';
    const subtitle = card.querySelector('.procedure-subtitle')?.textContent?.trim()
      || 'Vendredi 18 septembre 2026';

    suggestions.hidden = false;
    suggestions.innerHTML = `
      <a class="suggestion" role="option" aria-selected="false"
         data-pedago-search-result="${RESOURCE_ID}"
         href="${RESOURCE_URL}" target="_blank" rel="noopener noreferrer">
        <span class="suggestion-visual emoji-visual" aria-hidden="true">🗓️</span>
        <span class="suggestion-copy">
          <strong>${title}</strong>
          <small>${subtitle}</small>
        </span>
        <span class="suggestion-arrow" aria-hidden="true">↗</span>
      </a>`;
    input.setAttribute('aria-expanded', 'true');
    if (status) status.textContent = '1 suggestion';
    return true;
  };

  const openFile = event => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    window.open(RESOURCE_URL, '_blank', 'noopener,noreferrer');
  };

  // La page a deux moteurs qui écrivent dans le même menu. Pour les recherches
  // « péd... », on prend la main en phase capture afin que le bon résultat reste
  // stable pendant la saisie.
  document.addEventListener('input', event => {
    const input = getInput();
    if (event.target !== input || !isPedagoQuery(input.value)) return;
    event.stopPropagation();
    event.stopImmediatePropagation();
    renderPedago(input);
  }, true);

  document.addEventListener('keydown', event => {
    const input = getInput();
    if (event.target !== input || !isPedagoQuery(input.value)) return;

    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openFile(event);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const result = suggestions.querySelector('[data-pedago-search-result]');
      result?.classList.add('is-active');
      result?.setAttribute('aria-selected', 'true');
    }
  }, true);

  document.addEventListener('click', event => {
    const result = event.target.closest?.('[data-pedago-search-result]');
    if (!result) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openFile(event);
  }, true);
})();
