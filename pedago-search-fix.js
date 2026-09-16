(() => {
  'use strict';

  const RESOURCE_ID = 'journee-pedagogique-2026-09-18';
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
      <button type="button" class="suggestion" role="option" aria-selected="false" data-pedago-search-result="${RESOURCE_ID}">
        <span class="suggestion-visual emoji-visual" aria-hidden="true">🗓️</span>
        <span class="suggestion-copy">
          <strong>${title}</strong>
          <small>${subtitle}</small>
        </span>
        <span class="suggestion-arrow" aria-hidden="true">→</span>
      </button>`;
    input.setAttribute('aria-expanded', 'true');
    if (status) status.textContent = '1 suggestion';
    return true;
  };

  const openPedago = event => {
    const card = getCard();
    if (!card) return;
    event?.preventDefault?.();
    event?.stopPropagation?.();
    card.open = true;
    history.replaceState(null, '', `#${RESOURCE_ID}`);
    requestAnimationFrame(() => {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => window.PORTAL_FLASH_TARGET?.(card), 500);
    });
  };

  // La page avait deux moteurs qui réécrivaient le même menu de suggestions.
  // Pour les recherches « péd... », on prend la main en phase capture afin que
  // le résultat ne soit plus remplacé une fraction de seconde plus tard.
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
      openPedago(event);
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
    openPedago(event);
  }, true);
})();
