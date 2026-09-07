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
  // que la personne est encore en train d'écrire le mot ou la phrase.
  const SACRES = new Set([
    'tabarnak',
    'calice',
    'esti',
    'osti',
    'marde',
    'criss',
    'crisse'
  ]);
  const COUNTDOWN_QUERY = 'il reste';

  const isSacreEgg = value => SACRES.has(normalize(value));
  const isCountdownEgg = value => normalize(value) === COUNTDOWN_QUERY;
  const isSpecialEgg = value => isSacreEgg(value) || isCountdownEgg(value);

  // Calendrier scolaire officiel Cardinal-Roy 2026-2027.
  // Une journée d'école est un jour de semaine compris entre le 28 août et
  // le 23 juin, moins les congés, la relâche et les journées pédagogiques.
  // Cette définition donne exactement 180 jours de classe.
  const SCHOOL_YEAR = {
    start: '2026-08-28',
    end: '2027-06-23',
    halloween: '2026-10-31',
    christmasBreak: '2026-12-21',
    springBreak: '2027-03-01'
  };

  const NO_SCHOOL_DAYS = new Set([
    // Journées pédagogiques fixes.
    '2026-09-18', '2026-10-05', '2026-11-19', '2026-11-20',
    '2027-01-05', '2027-01-25', '2027-02-19', '2027-03-08',
    '2027-04-09', '2027-04-19', '2027-05-07', '2027-05-21', '2027-06-04',
    // Congés isolés.
    '2026-09-07', '2026-10-12', '2027-03-26', '2027-03-29', '2027-05-24'
  ]);

  const addRangeToSet = (set, startKey, endKey) => {
    let cursor = Date.parse(`${startKey}T12:00:00Z`);
    const end = Date.parse(`${endKey}T12:00:00Z`);
    while (cursor <= end) {
      set.add(new Date(cursor).toISOString().slice(0, 10));
      cursor += 86400000;
    }
  };

  // Vacances des Fêtes et semaine de relâche.
  addRangeToSet(NO_SCHOOL_DAYS, '2026-12-21', '2027-01-04');
  addRangeToSet(NO_SCHOOL_DAYS, '2027-03-01', '2027-03-05');

  const HOLIDAY_BLOCKS = [
    { start: '2026-09-07', label: 'Fête du Travail' },
    { start: '2026-10-12', label: 'Action de grâce' },
    { start: '2026-12-21', label: 'Congé des Fêtes' },
    { start: '2027-03-26', label: 'Vendredi saint' },
    { start: '2027-03-29', label: 'Lundi de Pâques' },
    { start: '2027-05-24', label: 'Journée nationale des patriotes' }
  ];

  const weekdayForKey = key => new Date(`${key}T12:00:00Z`).getUTCDay();
  const buildSchoolDays = () => {
    const days = [];
    let cursor = Date.parse(`${SCHOOL_YEAR.start}T12:00:00Z`);
    const end = Date.parse(`${SCHOOL_YEAR.end}T12:00:00Z`);
    while (cursor <= end) {
      const key = new Date(cursor).toISOString().slice(0, 10);
      const weekday = weekdayForKey(key);
      if (weekday >= 1 && weekday <= 5 && !NO_SCHOOL_DAYS.has(key)) days.push(key);
      cursor += 86400000;
    }
    return days;
  };

  const SCHOOL_DAYS = buildSchoolDays();

  const quebecDateKey = value => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Toronto',
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

  const schoolDaysBetween = (today, target, includeTarget = false) => SCHOOL_DAYS.filter(key =>
    key > today && (includeTarget ? key <= target : key < target)
  ).length;

  const formatNumber = value => String(value).replace('.', ',');
  const formatWeeks = schoolDays => {
    const weeks = Math.round((schoolDays / 5) * 10) / 10;
    const label = weeks > 1 ? 'semaines de cours' : 'semaine de cours';
    return `${formatNumber(weeks)} ${label}`;
  };

  const dayLabel = count => `${count} ${count === 1 ? 'jour d’école' : 'jours d’école'}`;

  const countdownLine = (days, label) => `
    <div class="search-countdown-line">
      <span><strong>${dayLabel(days)}</strong> ${label}</span>
      <span class="search-countdown-weeks">(${formatWeeks(days)})</span>
    </div>`;

  const buildCountdown = () => {
    const today = quebecDateKey(new Date());

    if (today > SCHOOL_YEAR.end) {
      return `
        <div class="no-suggestion search-countdown-egg search-countdown-ended" role="status">
          <div class="search-countdown-title">Il reste...</div>
          <div class="search-countdown-finished">Année scolaire terminée! 🎉</div>
          <div class="search-countdown-refresh">Il faut actualiser le calendrier.</div>
        </div>`;
    }

    const lines = [];
    const nextHoliday = HOLIDAY_BLOCKS.find(item => item.start >= today);
    if (nextHoliday) {
      const days = schoolDaysBetween(today, nextHoliday.start, false);
      lines.push(countdownLine(days, 'avant le prochain <strong>CONGÉ</strong>'));
    }

    if (today <= SCHOOL_YEAR.halloween) {
      lines.push(countdownLine(
        schoolDaysBetween(today, SCHOOL_YEAR.halloween, false),
        'avant l’Halloween'
      ));
    }

    if (today <= SCHOOL_YEAR.christmasBreak) {
      lines.push(countdownLine(
        schoolDaysBetween(today, SCHOOL_YEAR.christmasBreak, false),
        'avant les vacances de Noël'
      ));
    }

    if (today <= SCHOOL_YEAR.springBreak) {
      lines.push(countdownLine(
        schoolDaysBetween(today, SCHOOL_YEAR.springBreak, false),
        'avant la relâche'
      ));
    }

    // Le 23 juin est lui-même le dernier jour d'école : il est inclus dans le
    // nombre de jours restant avant la fin de l'année scolaire.
    lines.push(countdownLine(
      schoolDaysBetween(today, SCHOOL_YEAR.end, true),
      'avant la fin de l’année scolaire'
    ));

    return `
      <div class="no-suggestion search-countdown-egg" role="status">
        <div class="search-countdown-title">Il reste...</div>
        <div class="search-countdown-list">${lines.join('')}</div>
        <div class="search-countdown-note">Compté avec les vrais jours de classe - les pédagogiques, congés et la relâche sont exclus.</div>
      </div>`;
  };

  const showSacreEgg = () => {
    suggestions.hidden = false;
    suggestions.innerHTML = '<div class="no-suggestion search-easter-egg" role="status"><span class="search-easter-egg-copy">Ouf! Ça va bien aller! Pas besoin de sacrer après le portail, il fait de son mieux</span> <span class="search-easter-egg-face" aria-hidden="true">🥸</span>.</div>';
    input.setAttribute('aria-expanded', 'true');
    if (status) status.textContent = '';
  };

  const showCountdownEgg = () => {
    suggestions.hidden = false;
    suggestions.innerHTML = buildCountdown();
    input.setAttribute('aria-expanded', 'true');
    if (status) status.textContent = '';
  };

  const showEasterEgg = event => {
    if (!isSpecialEgg(input.value)) return;
    event?.stopImmediatePropagation();
    if (isCountdownEgg(input.value)) showCountdownEgg();
    else showSacreEgg();
  };

  // Capture permet aux easter eggs de passer avant le moteur de recherche normal
  // seulement lorsque leur déclencheur est écrit au complet.
  input.addEventListener('input', showEasterEgg, true);
  input.addEventListener('focus', showEasterEgg, true);
  input.addEventListener('keydown', event => {
    if (!isSpecialEgg(input.value)) return;
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
      .search-countdown-egg{
        padding:15px 17px 13px;
        color:#4f101d;
        background:linear-gradient(180deg,#fffafd,#fff5f8);
        border:1px solid rgba(127,20,39,.22);
        border-radius:14px;
        box-shadow:0 8px 24px rgba(72,12,27,.08);
        text-align:left;
        animation:countdownReveal .28s ease-out both;
      }
      .search-countdown-title{
        margin-bottom:8px;
        color:#731326;
        font-family:"IBM Plex Serif",Georgia,serif;
        font-size:1.08rem;
        font-weight:800;
      }
      .search-countdown-list{
        display:grid;
        gap:5px;
      }
      .search-countdown-line{
        display:flex;
        align-items:baseline;
        justify-content:space-between;
        gap:14px;
        padding:4px 0;
        line-height:1.3;
      }
      .search-countdown-line + .search-countdown-line{
        border-top:1px solid rgba(127,20,39,.08);
      }
      .search-countdown-weeks{
        flex:0 0 auto;
        color:#805662;
        font-size:.82rem;
        white-space:nowrap;
      }
      .search-countdown-note{
        margin-top:9px;
        padding-top:7px;
        border-top:1px solid rgba(127,20,39,.12);
        color:#84616a;
        font-size:.72rem;
        line-height:1.3;
      }
      .search-countdown-ended{
        text-align:center;
        padding:18px;
      }
      .search-countdown-ended .search-countdown-title{margin-bottom:5px}
      .search-countdown-finished{
        font-size:1rem;
        font-weight:800;
      }
      .search-countdown-refresh{
        margin-top:3px;
        color:#805662;
        font-size:.84rem;
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
      @keyframes countdownReveal{
        from{opacity:0;transform:translateY(-3px) scale(.995)}
        to{opacity:1;transform:none}
      }
      @media(max-width:620px){
        .search-countdown-egg{padding:14px 14px 12px}
        .search-countdown-line{
          display:block;
          padding:6px 0;
        }
        .search-countdown-weeks{
          display:block;
          margin-top:2px;
          white-space:normal;
        }
      }
      @media(prefers-reduced-motion:reduce){
        .search-easter-egg,.search-easter-egg::after,.search-easter-egg-face,.search-countdown-egg{animation:none!important}
        .search-easter-egg{box-shadow:0 0 0 4px rgba(127,20,39,.12)}
      }
    `;
    document.head.appendChild(style);
  }
})();