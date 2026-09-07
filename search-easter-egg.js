(() => {
  const input = document.getElementById('guide-search');
  const suggestions = document.getElementById('search-suggestions');
  const status = document.getElementById('search-status');
  if (!input || !suggestions) return;

  const normalize = value => (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9 -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Correspondance volontairement exacte : aucun déclenchement pendant
  // que la personne est encore en train d'écrire le mot.
  const SACRES = new Set([
    'tabarnak',
    'calice',
    'esti',
    'osti',
    'marde',
    'criss',
    'crisse'
  ]);

  const isEasterEgg = value => SACRES.has(normalize(value));

  const showEasterEgg = event => {
    if (!isEasterEgg(input.value)) return;
    event?.stopImmediatePropagation();
    suggestions.hidden = false;
    suggestions.innerHTML = '<div class="no-suggestion search-easter-egg" role="status">Ouf! Ça va bien aller! Pas besoin de sacrer après le portail, il fait de son mieux 🥸.</div>';
    input.setAttribute('aria-expanded', 'true');
    if (status) status.textContent = '';
  };

  // Capture permet à l'easter egg de passer avant le moteur de recherche normal
  // seulement lorsqu'un des mots ci-dessus est écrit au complet.
  input.addEventListener('input', showEasterEgg, true);
  input.addEventListener('focus', showEasterEgg, true);
  input.addEventListener('keydown', event => {
    if (!isEasterEgg(input.value)) return;
    if (event.key === 'Enter' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopImmediatePropagation();
      showEasterEgg();
    }
  }, true);

  if (!document.getElementById('search-easter-egg-style')) {
    const style = document.createElement('style');
    style.id = 'search-easter-egg-style';
    style.textContent = `
      .search-easter-egg{
        padding:16px 18px;
        text-align:center;
        font-weight:700;
        color:#5f1020;
        background:#fff8fa;
      }
    `;
    document.head.appendChild(style);
  }
})();