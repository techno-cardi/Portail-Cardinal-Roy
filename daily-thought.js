(() => {
  const TIMEZONE = 'America/Toronto';
  const DATA_URL = 'daily-thoughts.txt?v=20260907-finalfix';
  const STYLE_ID = 'daily-thought-style';
  const POPOVER_ID = 'daily-thought-popover';
  const HOST_SELECTOR = '.search-stage-inner';
  const INTRO_SELECTOR = '.search-intro';
  const TICKER_SELECTOR = '#school-news-ticker';
  const MAX_RETRIES = 50;
  let thoughts = new Map();
  let retryTimer = 0;
  let retries = 0;

  const dateKey = value => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(value);
    const fields = {};
    parts.forEach(part => {
      if (part.type !== 'literal') fields[part.type] = part.value;
    });
    return `${fields.year}-${fields.month}-${fields.day}`;
  };

  const parseData = text => {
    const map = new Map();
    text.split(/\r?\n/).forEach(line => {
      const match = line.match(/^(\d{4}-\d{2}-\d{2})\s+\|\s+«\s*(.*?)\s*»\s+—\s+(.+)$/);
      if (match) map.set(match[1], { quote: match[2].trim(), author: match[3].trim() });
    });
    return map;
  };

  const currentItem = () => thoughts.get(dateKey(new Date())) || null;

  const ensureStyles = () => {
    document.getElementById(STYLE_ID)?.remove();
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #daily-thought,
      #daily-thought-fallback,
      .daily-thought-button-row{display:none!important}

      .daily-thought-standalone{
        width:min(820px,100%);
        min-height:29px;
        margin:-2px 0 6px;
        display:flex!important;
        justify-content:flex-end;
        align-items:center;
        position:relative;
        z-index:8;
      }
      .daily-thought-control{
        position:relative;
        display:inline-flex;
        align-items:center;
        flex:0 0 auto;
      }
      .daily-thought-trigger{
        appearance:none;
        -webkit-appearance:none;
        display:inline-flex;
        align-items:center;
        justify-content:center;
        gap:5px;
        min-height:29px;
        padding:5px 8px;
        border:1px solid rgba(255,255,255,.36);
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
      .daily-thought-popover-author:empty{display:none}

      @media(max-width:620px){
        .daily-thought-standalone{
          width:100%;
          margin:0 0 7px;
          justify-content:center;
        }
        .daily-thought-popover{
          right:50%;
          transform:translateX(50%);
        }
        .daily-thought-popover::before{
          right:50%;
          margin-right:-5px;
        }
      }
      @media(prefers-reduced-motion:reduce){
        .daily-thought-trigger{transition:none}
      }
    `;
    document.head.appendChild(style);
  };

  const removeLegacy = host => {
    document.querySelectorAll('#daily-thought, #daily-thought-fallback, .daily-thought-button-row').forEach(node => node.remove());
    document.querySelectorAll('.daily-thought-control').forEach(node => {
      if (!node.closest('.daily-thought-standalone')) node.remove();
    });

    const ticker = host?.querySelector(TICKER_SELECTOR);
    if (!ticker) return;
    ticker.classList.remove('has-daily-thought');
    ticker.querySelectorAll(':scope > .daily-thought-control, :scope > .daily-thought-standalone').forEach(node => node.remove());

    ticker.querySelectorAll(':scope > .school-news-badges').forEach(wrapper => {
      [...wrapper.children].forEach(child => {
        if (child.classList.contains('school-news-badge')) ticker.insertBefore(child, wrapper);
      });
      wrapper.remove();
    });
  };

  const closePopover = (returnFocus = false) => {
    const standalone = document.querySelector(`${HOST_SELECTOR} > .daily-thought-standalone`);
    const button = standalone?.querySelector('.daily-thought-trigger');
    const popover = standalone?.querySelector(`#${POPOVER_ID}`);
    if (!button || !popover || popover.hidden) return;
    popover.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    if (returnFocus) button.focus();
  };

  const updateControlText = (control, item) => {
    const quote = control.querySelector('.daily-thought-popover-quote');
    const author = control.querySelector('.daily-thought-popover-author');
    if (quote) quote.textContent = `« ${item.quote} »`;
    if (author) author.textContent = `- ${item.author}`;
  };

  const createControl = item => {
    const control = document.createElement('span');
    control.className = 'daily-thought-control';
    control.innerHTML = `
      <button type="button" class="daily-thought-trigger" aria-expanded="false" aria-haspopup="dialog" aria-controls="${POPOVER_ID}" title="Afficher la pensée du jour">
        <span aria-hidden="true">✦</span><span>Pensée du jour</span>
      </button>
      <span id="${POPOVER_ID}" class="daily-thought-popover" role="dialog" aria-label="Pensée du jour" hidden>
        <span class="daily-thought-popover-title">Pensée du jour</span>
        <span class="daily-thought-popover-quote"></span>
        <span class="daily-thought-popover-author"></span>
      </span>`;
    updateControlText(control, item);

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
    return control;
  };

  const removeStandalone = host => {
    closePopover();
    host?.querySelectorAll(':scope > .daily-thought-standalone').forEach(node => node.remove());
  };

  const placeControl = (allowWithoutTicker = false) => {
    const host = document.querySelector(HOST_SELECTOR);
    const intro = host?.querySelector(INTRO_SELECTOR);
    if (!host || !intro) return false;

    removeLegacy(host);
    const item = currentItem();
    if (!item) {
      removeStandalone(host);
      return true;
    }

    const ticker = host.querySelector(TICKER_SELECTOR);
    if (!ticker && !allowWithoutTicker) return false;

    let standalone = host.querySelector(':scope > .daily-thought-standalone');
    host.querySelectorAll(':scope > .daily-thought-standalone').forEach(node => {
      if (node !== standalone) node.remove();
    });
    if (!standalone) {
      standalone = document.createElement('div');
      standalone.className = 'daily-thought-standalone';
      standalone.setAttribute('aria-label', 'Pensée du jour');
    }

    let control = standalone.querySelector(':scope > .daily-thought-control');
    if (!control) {
      standalone.replaceChildren();
      control = createControl(item);
      standalone.appendChild(control);
    } else {
      updateControlText(control, item);
    }

    if (ticker) {
      if (ticker.nextElementSibling !== standalone) ticker.insertAdjacentElement('afterend', standalone);
    } else if (standalone.nextElementSibling !== intro) {
      host.insertBefore(standalone, intro);
    }
    return true;
  };

  const retryPlacement = () => {
    window.clearTimeout(retryTimer);
    if (placeControl(false)) return;
    retries += 1;
    if (retries < MAX_RETRIES) {
      retryTimer = window.setTimeout(retryPlacement, 120);
      return;
    }
    placeControl(true);
  };

  const loadThoughts = async () => {
    try {
      const response = await fetch(DATA_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      thoughts = parseData(await response.text());
    } catch (error) {
      console.warn('Pensée du jour indisponible :', error);
      thoughts = new Map();
    }
    retries = 0;
    retryPlacement();
  };

  document.addEventListener('click', () => closePopover());
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closePopover(true);
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) placeControl(true);
  });

  ensureStyles();
  loadThoughts();
  window.addEventListener('load', () => {
    retries = 0;
    retryPlacement();
  }, { once: true });
})();
