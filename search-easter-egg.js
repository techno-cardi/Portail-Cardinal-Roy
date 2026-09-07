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
    suggestions.innerHTML = '<div class="no-suggestion search-easter-egg" role="status"><span class="search-easter-egg-copy">Ouf! Ça va bien aller! Pas besoin de sacrer après le portail, il fait de son mieux</span> <span class="search-easter-egg-face" aria-hidden="true">🥸</span>.</div>';
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
        position:relative;
        overflow:hidden;
        padding:16px 18px;
        text-align:center;
        font-weight:700;
        color:#5f1020;
        background:#fff8fa;
        border:1px solid rgba(127,20,39,.24);
        border-radius:14px;
        animation:sacreSurprise 1.35s cubic-bezier(.2,.8,.2,1) both;
        transform-origin:center;
      }
      .search-easter-egg::after{
        content:'';
        position:absolute;
        inset:-35%;
        pointer-events:none;
        background:radial-gradient(circle,rgba(255,255,255,.92) 0 7%,rgba(255,255,255,0) 32%);
        opacity:0;
        animation:sacreFlash .7s ease-out 1;
      }
      .search-easter-egg-face{
        display:inline-block;
        font-size:1.12em;
        animation:sacreFace 1.05s ease-in-out .08s both;
      }
      @keyframes sacreSurprise{
        0%{transform:scale(.985);background:#fff8fa;box-shadow:0 0 0 0 rgba(127,20,39,0)}
        14%{transform:translateX(-3px) rotate(-.35deg) scale(1.01);background:#f7dce4;box-shadow:0 0 0 5px rgba(127,20,39,.16),0 10px 24px rgba(76,13,29,.14)}
        28%{transform:translateX(3px) rotate(.35deg) scale(1.015);background:#fff;box-shadow:0 0 0 2px rgba(127,20,39,.08),0 7px 18px rgba(76,13,29,.10)}
        44%{transform:translateX(-2px) rotate(-.2deg) scale(1.01);background:#f6e0e6;box-shadow:0 0 0 6px rgba(127,20,39,.18),0 11px 25px rgba(76,13,29,.15)}
        62%{transform:translateX(2px) rotate(.15deg);background:#fff;box-shadow:0 0 0 3px rgba(127,20,39,.10),0 8px 19px rgba(76,13,29,.10)}
        80%{transform:scale(1.006);background:#fff4f7;box-shadow:0 0 0 4px rgba(127,20,39,.12),0 8px 20px rgba(76,13,29,.11)}
        100%{transform:none;background:#fff8fa;box-shadow:none}
      }
      @keyframes sacreFlash{
        0%,16%{opacity:0;transform:translateX(-35%) rotate(8deg)}
        30%{opacity:.9}
        55%{opacity:0;transform:translateX(45%) rotate(8deg)}
        100%{opacity:0}
      }
      @keyframes sacreFace{
        0%{transform:scale(.8) rotate(-10deg)}
        35%{transform:scale(1.35) rotate(12deg)}
        60%{transform:scale(.98) rotate(-5deg)}
        82%{transform:scale(1.12) rotate(3deg)}
        100%{transform:none}
      }
      @media(prefers-reduced-motion:reduce){
        .search-easter-egg,.search-easter-egg::after,.search-easter-egg-face{animation:none!important}
        .search-easter-egg{box-shadow:0 0 0 4px rgba(127,20,39,.12)}
      }
    `;
    document.head.appendChild(style);
  }
})();