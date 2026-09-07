(() => {
  const STYLE_ID = 'daily-thought-popover-style';
  const POPOVER_ID = 'daily-thought-popover';
  let contentObserver = null;
  let bootstrapTimer = 0;
  let attempts = 0;

  const ensureStyles = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* La vieille présentation ne doit jamais être visible. */
      #daily-thought.daily-thought{display:none!important}

      .daily-thought-button-row{
        width:min(820px,100%);
        min-height:30px;
        margin:0 0 5px;
        display:flex;
        justify-content:flex-end;
        align-items:center;
        position:relative;
        z-index:8;
      }
      .daily-thought-control{
        position:relative;
        display:inline-flex;
        align-items:center;
        width:auto;
        max-width:100%;
      }
      .daily-thought-trigger{
        appearance:none;
        -webkit-appearance:none;
        display:inline-flex;
        align-items:center;
        justify-content:center;
        gap:5px;
        width:auto;
        min-height:30px;
        padding:5px 9px;
        border:1px solid rgba(255,255,255,.34);
        border-radius:7px;
        background:rgba(255,255,255,.08);
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
        top:calc(100% + 8px);
        right:0;
        width:min(430px,calc(100vw - 32px));
        padding:13px 15px 12px;
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
        right:28px;
        top:-6px;
        width:10px;
        height:10px;
        transform:rotate(45deg);
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
        .daily-thought-button-row{
          min-height:32px;
          margin-bottom:5px;
          justify-content:flex-end;
        }
        .daily-thought-trigger{
          min-height:32px;
          padding:6px 9px;
          font-size:.7rem;
        }
        .daily-thought-popover{
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

  ensureStyles();

  const legacyBlock = () => document.getElementById('daily-thought');

  const forceHideLegacy = legacy => {
    if (!legacy) return;
    legacy.hidden = true;
    legacy.setAttribute('aria-hidden', 'true');
    legacy.style.setProperty('display', 'none', 'important');
  };

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
    forceHideLegacy(legacy);
    const quote = legacy.querySelector('.daily-thought-quote')?.textContent?.trim() || '';
    const author = legacy.querySelector('.daily-thought-author')?.textContent?.trim() || '';
    if (!quote) return false;
    popover.querySelector('.daily-thought-popover-quote').textContent = quote;
    popover.querySelector('.daily-thought-popover-author').textContent = author;
    return true;
  };

  const ensureControl = () => {
    const legacy = legacyBlock();
    const host = document.querySelector('.search-stage-inner');
    const ticker = document.getElementById('school-news-ticker');
    const intro = host?.querySelector('.search-intro');

    if (!legacy || !host || !intro) {
      if (!legacy) document.querySelector('.daily-thought-button-row')?.remove();
      return false;
    }

    forceHideLegacy(legacy);

    let row = host.querySelector('.daily-thought-button-row');
    if (!row) {
      row = document.createElement('div');
      row.className = 'daily-thought-button-row';
      row.setAttribute('aria-label', 'Pensée du jour');
      host.insertBefore(row, ticker || intro);
    }

    let control = row.querySelector('.daily-thought-control');
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
      row.appendChild(control);

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

    syncContent();

    if (!contentObserver) {
      contentObserver = new MutationObserver(syncContent);
      contentObserver.observe(legacy, { childList: true, subtree: true, characterData: true });
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

  window.setTimeout(() => {
    if (bootstrapTimer) window.clearTimeout(bootstrapTimer);
    const host = document.querySelector('.search-stage-inner');
    if (!host) return;
    const observer = new MutationObserver(() => ensureControl());
    observer.observe(host, { childList: true, subtree: true });
  }, 12000);
})();