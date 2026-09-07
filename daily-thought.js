(() => {
  const TIMEZONE = 'America/Toronto';
  const DATA_URL = 'daily-thoughts.txt?v=20260907-0932';
  const STYLE_ID = 'daily-thought-style';
  const POPOVER_ID = 'daily-thought-popover';
  const LEGACY_SELECTOR = '#daily-thought, #daily-thought-fallback, .daily-thought-standalone';
  const mobileQuery = window.matchMedia('(max-width:620px)');
  let thoughts = new Map();
  let retryTimer = 0;

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

  const removeLegacyThoughts = () => {
    document.querySelectorAll(LEGACY_SELECTOR).forEach(node => node.remove());
  };

  const ensureStyles = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #daily-thought,
      #daily-thought-fallback,
      .daily-thought-standalone{display:none!important}

      .school-news-ticker.has-daily-thought{
        grid-template-columns:auto minmax(0,1fr) auto auto!important;
      }
      .school-news-ticker>.daily-thought-control{
        grid-column:4;
        grid-row:1;
        align-self:start;
        justify-self:end;
        position:relative;
        display:inline-flex;
        align-items:center;
        flex:0 0 auto;
        z-index:8;
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
        .school-news-ticker>.daily-thought-control{display:none!important}
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

    control.querySelector('.daily-thought-popover-quote').textContent = `« ${item.quote} »`;
    control.querySelector('.daily-thought-popover-author').textContent = `- ${item.author}`;

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

  const removeControl = () => {
    closePopover();
    document.querySelectorAll('.daily-thought-control').forEach(node => node.remove());
    document.getElementById('school-news-ticker')?.classList.remove('has-daily-thought');
  };

  const syncControl = () => {
    removeLegacyThoughts();
    ensureStyles();

    const item = currentItem();
    const ticker = document.getElementById('school-news-ticker');
    if (!item || mobileQuery.matches || !ticker || ticker.hidden) {
      removeControl();
      return false;
    }

    ticker.classList.add('has-daily-thought');
    let control = ticker.querySelector(':scope > .daily-thought-control');
    if (!control) {
      document.querySelectorAll('.daily-thought-control').forEach(node => node.remove());
      control = createControl(item);
      ticker.appendChild(control);
    } else {
      const quote = control.querySelector('.daily-thought-popover-quote');
      const author = control.querySelector('.daily-thought-popover-author');
      if (quote) quote.textContent = `« ${item.quote} »`;
      if (author) author.textContent = `- ${item.author}`;
    }
    return true;
  };

  const retryPlacement = (remaining = 40) => {
    window.clearTimeout(retryTimer);
    if (syncControl() || remaining <= 0 || !currentItem() || mobileQuery.matches) return;
    retryTimer = window.setTimeout(() => retryPlacement(remaining - 1), 150);
  };

  const loadThoughts = async () => {
    try {
      const response = await fetch(DATA_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      thoughts = parseData(await response.text());
      retryPlacement();
    } catch (error) {
      console.warn('Pensée du jour indisponible :', error);
      thoughts = new Map();
      removeControl();
    }
  };

  document.addEventListener('click', () => closePopover());
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closePopover(true);
  });

  const handleViewportChange = () => {
    if (mobileQuery.matches) removeControl();
    else retryPlacement();
  };
  if (typeof mobileQuery.addEventListener === 'function') {
    mobileQuery.addEventListener('change', handleViewportChange);
  } else if (typeof mobileQuery.addListener === 'function') {
    mobileQuery.addListener(handleViewportChange);
  }

  ensureStyles();
  removeLegacyThoughts();
  loadThoughts();
  window.addEventListener('load', () => retryPlacement(), { once: true });

  window.setInterval(() => {
    if (currentItem()) syncControl();
    else removeControl();
  }, 60 * 1000);
})();
