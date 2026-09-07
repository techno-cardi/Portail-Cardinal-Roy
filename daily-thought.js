(() => {
  const TIMEZONE = 'America/Toronto';
  const DATA_URL = 'daily-thoughts.txt?v=20260907-0920';
  const STYLE_ID = 'daily-thought-style';
  const POPOVER_ID = 'daily-thought-popover';
  const LEGACY_SELECTOR = '#daily-thought, #daily-thought-fallback';
  let thoughts = new Map();
  let attempts = 0;
  let bootstrapTimer = 0;

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

  const setText = (node, value) => {
    if (node && node.textContent !== value) node.textContent = value;
  };

  const removeLegacyThoughts = () => {
    document.querySelectorAll(LEGACY_SELECTOR).forEach(node => node.remove());
  };

  const cleanTicker = ticker => {
    if (!ticker) return;
    ticker.querySelectorAll(':scope > .daily-thought-control').forEach(node => node.remove());
    const wrapper = ticker.querySelector(':scope > .school-news-badges');
    if (!wrapper) return;
    const dateBadge = wrapper.querySelector('.school-news-badge');
    if (dateBadge) ticker.insertBefore(dateBadge, wrapper);
    wrapper.remove();
  };

  const ensureStyles = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #daily-thought,
      #daily-thought-fallback{display:none!important}
      .daily-thought-standalone{
        width:min(820px,100%);
        min-height:29px;
        margin:-2px 0 6px;
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
          justify-content:center;
          margin:0 0 7px;
        }
        .daily-thought-trigger{
          min-height:32px;
          padding:6px 9px;
          font-size:.7rem;
        }
        .daily-thought-popover{
          right:auto;
          left:50%;
          transform:translateX(-50%);
          width:min(360px,calc(100vw - 24px));
          padding:12px 13px;
        }
        .daily-thought-popover::before{
          right:auto;
          left:50%;
          transform:translateX(-50%) rotate(45deg);
        }
        .daily-thought-popover-quote{font-size:.9rem}
      }

      @media(prefers-reduced-motion:reduce){
        .daily-thought-trigger{transition:none}
      }
    `;
    document.head.appendChild(style);
  };

  const closePopover = (returnFocus = false) => {
    const button = document.querySelector('.daily-thought-trigger');
    const popover = document.getElementById(POPOVER_ID);
    if (!button || !popover || popover.hidden) return;
    popover.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    if (returnFocus) button.focus();
  };

  const updateContent = () => {
    const popover = document.getElementById(POPOVER_ID);
    if (!popover) return;
    const item = thoughts.get(dateKey(new Date()));
    const quote = popover.querySelector('.daily-thought-popover-quote');
    const author = popover.querySelector('.daily-thought-popover-author');
    if (item) {
      setText(quote, `« ${item.quote} »`);
      setText(author, `- ${item.author}`);
      return;
    }
    setText(quote, 'Aucune pensée planifiée aujourd’hui.');
    setText(author, '');
  };

  const createControl = () => {
    const control = document.createElement('span');
    control.className = 'daily-thought-control';
    control.innerHTML = `
      <button type="button" class="daily-thought-trigger" aria-expanded="false" aria-haspopup="dialog" aria-controls="${POPOVER_ID}" title="Afficher la pensée du jour">
        <span aria-hidden="true">✦</span><span>Pensée du jour</span>
      </button>
      <span id="${POPOVER_ID}" class="daily-thought-popover" role="dialog" aria-label="Pensée du jour" hidden>
        <span class="daily-thought-popover-title">Pensée du jour</span>
        <span class="daily-thought-popover-quote">Chargement…</span>
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
    return control;
  };

  const placeControl = () => {
    removeLegacyThoughts();

    const host = document.querySelector('.search-stage-inner');
    const intro = host?.querySelector('.search-intro');
    if (!host || !intro) return false;

    ensureStyles();
    const ticker = document.getElementById('school-news-ticker');
    cleanTicker(ticker);

    let standalone = host.querySelector('.daily-thought-standalone');
    if (!standalone) {
      standalone = document.createElement('div');
      standalone.className = 'daily-thought-standalone';
      standalone.setAttribute('aria-label', 'Pensée du jour');
    }

    let control = standalone.querySelector('.daily-thought-control');
    if (!control) {
      document.querySelectorAll('.daily-thought-control').forEach(node => node.remove());
      control = createControl();
      standalone.appendChild(control);
    }

    if (ticker) {
      if (ticker.nextElementSibling !== standalone) ticker.insertAdjacentElement('afterend', standalone);
    } else if (standalone.parentElement !== host || standalone.nextElementSibling !== intro) {
      host.insertBefore(standalone, intro);
    }

    updateContent();
    return true;
  };

  const loadThoughts = async () => {
    try {
      const response = await fetch(DATA_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      thoughts = parseData(await response.text());
      updateContent();
    } catch (error) {
      console.warn('Pensée du jour indisponible :', error);
      const popover = document.getElementById(POPOVER_ID);
      if (popover) {
        setText(popover.querySelector('.daily-thought-popover-quote'), 'Pensée du jour indisponible.');
        setText(popover.querySelector('.daily-thought-popover-author'), '');
      }
    }
  };

  const bootstrap = () => {
    const placed = placeControl();
    attempts += 1;
    const tickerReady = Boolean(document.getElementById('school-news-ticker'));
    if ((!placed || !tickerReady) && attempts < 40) {
      bootstrapTimer = window.setTimeout(bootstrap, 150);
    }
  };

  document.addEventListener('click', () => closePopover());
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closePopover(true);
  });

  ensureStyles();
  removeLegacyThoughts();
  bootstrap();
  loadThoughts();
  window.addEventListener('load', placeControl, { once: true });

  window.setInterval(updateContent, 60 * 1000);
})();
