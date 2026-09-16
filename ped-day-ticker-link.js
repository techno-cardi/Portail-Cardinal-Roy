(() => {
  'use strict';

  const RESOURCE_ID = 'journee-pedagogique-2026-09-18';
  const RESOURCE_URL = 'https://drive.google.com/file/d/1S7mZootQb4dddOYHKOU19_yyEqeWu3fG/view?usp=drivesdk';
  const EXPIRES_AT = Date.parse('2026-09-19T00:00:00-04:00');
  const normalize = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  const isTargetSlide = ticker => {
    const text = normalize(ticker.querySelector('.school-news-text')?.textContent);
    const date = normalize(ticker.querySelector('.school-news-date')?.textContent);
    return text === 'pedagogique'
      && (date.includes('18 sept') || date.includes("aujourd'hui") || date.includes('aujourd’hui'));
  };

  const openFile = event => {
    if (Date.now() >= EXPIRES_AT || !document.getElementById(RESOURCE_ID)) return;
    event?.preventDefault?.();
    event?.stopPropagation?.();
    window.open(RESOURCE_URL, '_blank', 'noopener,noreferrer');
  };

  const wireTicker = ticker => {
    if (!ticker || ticker.dataset.pedDayTickerWired === '1') return true;
    const track = ticker.querySelector('.school-news-track');
    const next = ticker.querySelector('.school-news-next');
    if (!track || !next) return false;

    ticker.dataset.pedDayTickerWired = '1';

    const sync = () => {
      const targetSlide = isTargetSlide(ticker);
      const expired = Date.now() >= EXPIRES_AT || !document.getElementById(RESOURCE_ID);

      if (targetSlide && expired) {
        track.style.visibility = 'hidden';
        window.setTimeout(() => {
          next.click();
          track.style.removeProperty('visibility');
        }, 0);
        return;
      }

      const clickable = targetSlide && !expired;
      track.classList.toggle('ped-day-ticker-link', clickable);
      if (clickable) {
        track.setAttribute('role', 'link');
        track.setAttribute('tabindex', '0');
        track.setAttribute('title', 'Ouvrir directement l’horaire de la journée pédagogique du 18 septembre');
        track.dataset.pedDayLink = '2026-09-18';
        track.dataset.pedDayUrl = RESOURCE_URL;
      } else {
        track.removeAttribute('role');
        track.removeAttribute('tabindex');
        track.removeAttribute('title');
        delete track.dataset.pedDayLink;
        delete track.dataset.pedDayUrl;
      }
    };

    track.addEventListener('click', event => {
      if (track.dataset.pedDayLink === '2026-09-18') openFile(event);
    });
    track.addEventListener('keydown', event => {
      if (track.dataset.pedDayLink !== '2026-09-18') return;
      if (event.key === 'Enter' || event.key === ' ') openFile(event);
    });

    new MutationObserver(sync).observe(track, { childList: true, subtree: true, characterData: true });
    sync();
    return true;
  };

  if (!document.getElementById('ped-day-ticker-link-style')) {
    const style = document.createElement('style');
    style.id = 'ped-day-ticker-link-style';
    style.textContent = `
      .school-news-track.ped-day-ticker-link{
        cursor:pointer;border-radius:7px;padding:3px 6px;margin:-3px -6px;
        transition:background .15s ease,box-shadow .15s ease
      }
      .school-news-track.ped-day-ticker-link:hover,
      .school-news-track.ped-day-ticker-link:focus-visible{
        background:rgba(255,255,255,.13);box-shadow:0 0 0 2px rgba(255,255,255,.18);outline:none
      }
      .school-news-track.ped-day-ticker-link .school-news-text{text-decoration:underline;text-underline-offset:3px}
    `;
    document.head.appendChild(style);
  }

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    const ticker = document.getElementById('school-news-ticker');
    if (wireTicker(ticker) || attempts >= 200) window.clearInterval(timer);
  }, 50);
})();
