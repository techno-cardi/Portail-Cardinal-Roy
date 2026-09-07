(() => {
  const STYLE_ID = 'daily-thought-popover-style';
  const POPOVER_ID = 'daily-thought-popover';
  let tickerObserver = null;
  let contentObserver = null;
  let bootstrapTimer = 0;
  let attempts = 0;

  const ensureStyles = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* L'ancien bloc demeure la source de données, mais ne prend plus de place. */
      #daily-thought.daily-thought{display:none!important}

      .school-news-ticker{overflow:visible!important;position:relative;z-index:4}
      .school-news-badges{
        min-width:0;
        display:flex;
        align-items:center;
        gap:6px;
        position:relative;
      }
      .daily-thought-standalone{
        width:min(820px,100%);
        margin:0 0 6px;
        display:flex;
        justify-content:flex-start;
      }
      .daily-thought-control{
        position:relative;
        display:inline-flex;
        align-items:center;
        flex:0 0 auto;
      }
      .daily-thought-trigger{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        gap:5px;
        min-height:29px;
        padding:5px 8px;
        border:1px solid rgba(255,255,255,.3);
        border-radius:6px;
        background:rgba(255,255,255,.075);
        color:#fff;
        font:800 .71rem/1.1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
        letter-spacing:.01em;
        white-space:nowrap;
        cursor:pointer;
        -webkit-tap-highlight-color:transparent;
        transition:background .16s ease,border-color .16s ease,color .16s ease;
      }
      .daily-thought-trigger:hover,
      .daily-thought-trigger:focus-visible,
      .daily-thought-trigger[aria-expanded="true"]{
        background:#fff;
        border-color:#fff;
        color:#7f1427;
        outline:none;
      }
      .daily-thought-popover{
        position:absolute;
        z-index:90;
        top:calc(100% + 9px);
        left:50%;
        width:min(430px,calc(100vw - 32px));
        padding:13px 15px 12px;
        transform:translateX(-50%);
        border:1px solid rgba(127,20,39,.18);
        border-radius:10px;
        background:#fff;
        color:#4f101d;
        box-shadow:0 14px 34px rgba(42,8,17,.2);
        text-align:left;
      }
      .daily-thought-popover[hidden]{display:none!important}
      .daily-thought-popover::before{
        content:'';
        position:absolute;
        left:50%;
        top:-6px;
        width:10px;
        height:10px;
        transform:translateX(-50%) rotate(45deg);
        border-left:1px solid rgba(127,20,39,.16);
        border-top:1px solid rgba(127,20,39,.16);
        background:#fff;
      }
      .daily-thought-popover-title{
        display:block;
        margin-bottom:5px;
        color:#7f1427;
        font-size:.68rem;
        font-weight:850;
        letter-spacing:.045em;
        text-transform:uppercase;
      }
      .daily-thought-popover-quote{
        display:block;
        font-family:"IBM Plex Serif",Georgia,serif;
        font-size:.92rem;
        font-style:italic;
        line-height:1.42;
      }
      .daily-thought-popover-author{
        display:block;
        margin-top:6px;
        color:#7b5660;
        font-size:.78rem;
        font-weight:700;
        line-height:1.3;
      }

      @media(max-width:620px){
        .school-news-badges{
          width:100%;
          justify-content:center;
          flex-wrap:wrap;
        }
        .daily-thought-standalone{
          justify-content:center;
          margin-bottom:7px;
        }
        .daily-thought-trigger{
          min-height:32px;
          padding:6px 9px;
          font-size:.7rem;
        }
        .daily-thought-popover{
          top:calc(100% + 7px);
          width:min(360px,calc(100vw - 24px));
          padding:12px 13px;
        }
        .daily-thought-popover-quote{font-size:.9rem}
      }

      @media(prefers-reduced-motion:reduce){
        .daily-thought-trigger{transition:none}
      }
    `;
    document.head.appendChild(style);
  };

  const legacyBlock = () => document.getElementById('daily-thought');

  const closePopover = (returnFocus = false) => {
    const button = document.querySelector('.daily-thought-trigger');
    const popover = document.getElementById(POPOVER_ID);
    if (!button || !popover || popover.hidden) return;
    popover.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    if (returnFocus) button.focus();
  };

  const syncContent = () => {
    const legacy = legacyBlock();
    const popover = document.getElementById(POPOVER_ID);
    if (!legacy || !popover) return false;
    const quote = legacy.querySelector('.daily-thought-quote')?.textContent?.trim() || '';
    const author = legacy.querySelector('.daily-thought-author')?.textContent?.trim() || '';
    if (!quote) return false;
    popover.querySelector('.daily-thought-popover-quote').textContent = quote;
    popover.querySelector('.daily-thought-popover-author').textContent = author;
    return true;
  };

  const ensureControl = () => {
    const legacy = legacyBlock();
    if (!legacy) {
      document.querySelector('.daily-thought-control')?.remove();
      document.querySelector('.daily-thought-standalone')?.remove();
      return false;
    }

    ensureStyles();

    let control = document.querySelector('.daily-thought-control');
    if (!control) {
      control = document.createElement('span');
      control.className = 'daily-thought-control';
      control.innerHTML = `
        <button type="button" class="daily-thought-trigger" aria-expanded="false" aria-haspopup="dialog" aria-controls="${POPOVER_ID}">
          <span aria-hidden="true">✦</span><span>Pensée du jour</span>
        </button>
        <span id="${POPOVER_ID}" class="daily-thought-popover" role="dialog" aria-label="Pensée du jour" hidden>
          <span class="daily-thought-popover-title">Pensée du jour</span>
          <span class="daily-thought-popover-quote"></span>
          <span class="daily-thought-popover-author"></span>
        </span>`;

      const button = control.querySelector('.daily-thought-trigger');
      const popover = control.querySelector('.daily-thought-popover');
      button.addEventListener('click', event => {
        event.stopPropagation();
        const willOpen = popover.hidden;
        closePopover();
        popover.hidden = !willOpen;
        button.setAttribute('aria-expanded', String(willOpen));
      });
      popover.addEventListener('click', event => event.stopPropagation());
    }

    const ticker = document.getElementById('school-news-ticker');
    const host = document.querySelector('.search-stage-inner');
    const intro = host?.querySelector('.search-intro');
    const tickerVisible = ticker && !ticker.hidden;

    if (tickerVisible) {
      let badges = ticker.querySelector('.school-news-badges');
      if (!badges) {
        const badge = ticker.querySelector('.school-news-badge');
        if (badge) {
          badges = document.createElement('span');
          badges.className = 'school-news-badges';
          ticker.insertBefore(badges, badge);
          badges.appendChild(badge);
        }
      }
      if (badges && control.parentElement !== badges) badges.appendChild(control);
      document.querySelector('.daily-thought-standalone')?.remove();
    } else if (host && intro) {
      let standalone = host.querySelector('.daily-thought-standalone');
      if (!standalone) {
        standalone = document.createElement('div');
        standalone.className = 'daily-thought-standalone';
        host.insertBefore(standalone, ticker || intro);
      }
      if (control.parentElement !== standalone) standalone.appendChild(control);
    }

    syncContent();

    if (!contentObserver) {
      contentObserver = new MutationObserver(syncContent);
      contentObserver.observe(legacy, { childList: true, subtree: true, characterData: true });
    }

    if (ticker && !tickerObserver) {
      tickerObserver = new MutationObserver(() => {
        closePopover();
        ensureControl();
      });
      tickerObserver.observe(ticker, { attributes: true, attributeFilter: ['hidden'] });
    }

    return true;
  };

  document.addEventListener('click', () => closePopover());
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closePopover(true);
  });

  const bootstrap = () => {
    ensureControl();
    attempts += 1;
    if (attempts < 120) bootstrapTimer = window.setTimeout(bootstrap, 100);
  };

  bootstrap();
  window.addEventListener('load', ensureControl, { once: true });

  // Après les premières secondes, un observateur léger couvre les rares
  // reconstructions du ticker ou de la pensée sans scruter toute la page en continu.
  window.setTimeout(() => {
    if (bootstrapTimer) window.clearTimeout(bootstrapTimer);
    const host = document.querySelector('.search-stage-inner');
    if (!host) return;
    const observer = new MutationObserver(() => ensureControl());
    observer.observe(host, { childList: true, subtree: true });
  }, 12000);
})();