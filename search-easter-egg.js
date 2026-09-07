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

  const PEDAGOGICAL_DAYS = new Set([
    '2026-09-18', '2026-10-05', '2026-11-19', '2026-11-20',
    '2027-01-05', '2027-01-25', '2027-02-19', '2027-03-08',
    '2027-04-09', '2027-04-19', '2027-05-07', '2027-05-21', '2027-06-04'
  ]);

  const NO_SCHOOL_DAYS = new Set([
    ...PEDAGOGICAL_DAYS,
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

  // Le début sert à annoncer l'interruption; end sert à expliquer les semaines
  // raccourcies lorsqu'une période de congé chevauche plusieurs semaines.
  const SCHOOL_INTERRUPTION_DAYS = [
    { start: '2026-09-07', type: 'conge', label: 'Fête du Travail', weekReason: 'congé de la Fête du Travail' },
    { start: '2026-09-18', type: 'pedago', label: 'journée pédagogique' },
    { start: '2026-10-05', type: 'pedago', label: 'journée pédagogique' },
    { start: '2026-10-12', type: 'conge', label: 'Action de grâce', weekReason: 'congé de l’Action de grâce' },
    { start: '2026-11-19', type: 'pedago', label: 'journée pédagogique' },
    { start: '2026-11-20', type: 'pedago', label: 'journée pédagogique' },
    { start: '2026-12-21', end: '2027-01-04', type: 'conge', label: 'vacances des Fêtes', weekReason: 'vacances des Fêtes' },
    { start: '2027-01-05', type: 'pedago', label: 'journée pédagogique' },
    { start: '2027-01-25', type: 'pedago', label: 'journée pédagogique' },
    { start: '2027-02-19', type: 'pedago', label: 'journée pédagogique' },
    { start: '2027-03-01', end: '2027-03-05', type: 'conge', label: 'semaine de relâche', weekReason: 'semaine de relâche' },
    { start: '2027-03-08', type: 'pedago', label: 'journée pédagogique' },
    { start: '2027-03-26', type: 'conge', label: 'Vendredi saint', weekReason: 'congé du Vendredi saint' },
    { start: '2027-03-29', type: 'conge', label: 'Lundi de Pâques', weekReason: 'congé du Lundi de Pâques' },
    { start: '2027-04-09', type: 'pedago', label: 'journée pédagogique' },
    { start: '2027-04-19', type: 'pedago', label: 'journée pédagogique' },
    { start: '2027-05-07', type: 'pedago', label: 'journée pédagogique' },
    { start: '2027-05-21', type: 'pedago', label: 'journée pédagogique' },
    { start: '2027-05-24', type: 'conge', label: 'Journée nationale des patriotes', weekReason: 'congé de la Journée nationale des patriotes' },
    { start: '2027-06-04', type: 'pedago', label: 'journée pédagogique' }
  ];

  const dateFromKey = key => new Date(`${key}T12:00:00Z`);
  const keyFromDate = value => value.toISOString().slice(0, 10);
  const addDaysKey = (key, amount) => {
    const value = dateFromKey(key);
    value.setUTCDate(value.getUTCDate() + amount);
    return keyFromDate(value);
  };
  const weekdayForKey = key => dateFromKey(key).getUTCDay();

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
  const SCHOOL_DAY_SET = new Set(SCHOOL_DAYS);

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

  const formatDate = key => new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(dateFromKey(key));

  const formatWeekDate = key => new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(dateFromKey(key));

  const formatDayMonth = key => new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long'
  }).format(dateFromKey(key));

  const formatWeekdayDayMonth = key => new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(dateFromKey(key));

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
  const courseDayLabel = count => `${count} ${count === 1 ? 'jour de cours' : 'jours de cours'}`;

  const countdownLine = (days, label) => `
    <div class="search-countdown-line">
      <span><strong>${dayLabel(days)}</strong> ${label}</span>
      <span class="search-countdown-weeks">(${formatWeeks(days)})</span>
    </div>`;

  const mondayOfWeek = key => {
    const weekday = weekdayForKey(key);
    const offset = weekday === 0 ? -6 : 1 - weekday;
    return addDaysKey(key, offset);
  };

  const schoolDaysInWeek = mondayKey => {
    let count = 0;
    for (let offset = 0; offset < 5; offset += 1) {
      if (SCHOOL_DAY_SET.has(addDaysKey(mondayKey, offset))) count += 1;
    }
    return count;
  };

  const weekReasonFor = mondayKey => {
    const fridayKey = addDaysKey(mondayKey, 4);
    const reasons = SCHOOL_INTERRUPTION_DAYS
      .filter(item => item.start <= fridayKey && (item.end || item.start) >= mondayKey)
      .map(item => {
        const itemEnd = item.end || item.start;
        const overlapStart = item.start > mondayKey ? item.start : mondayKey;
        const overlapEnd = itemEnd < fridayKey ? itemEnd : fridayKey;

        if (item.type === 'pedago') {
          return `journée pédagogique le ${formatWeekdayDayMonth(item.start)}`;
        }

        const reason = item.weekReason || `congé - ${item.label}`;
        if (item.start === itemEnd || overlapStart === overlapEnd) {
          return `${reason} le ${formatWeekdayDayMonth(overlapStart)}`;
        }
        return `${reason} du ${formatWeekdayDayMonth(overlapStart)} au ${formatWeekdayDayMonth(overlapEnd)}`;
      });
    return [...new Set(reasons)].join(' et ');
  };

  const upcomingWeeks = (today, limit = 10) => {
    const firstMonday = addDaysKey(mondayOfWeek(today), 7);
    const weeks = [];
    let monday = firstMonday;
    let offset = 1;
    while (weeks.length < limit && monday <= SCHOOL_YEAR.end) {
      const count = schoolDaysInWeek(monday);
      weeks.push({
        monday,
        count,
        offset,
        reason: count < 5 ? weekReasonFor(monday) : ''
      });
      monday = addDaysKey(monday, 7);
      offset += 1;
    }
    return weeks;
  };

  const shortWeekRelative = offset => {
    if (offset === 1) return 'la semaine prochaine';
    return `dans ${offset} semaines`;
  };

  const shortWeekReasonHtml = week => week?.reason
    ? ` <span class="search-week-reason">(${week.reason})</span>`
    : '';

  const buildShortWeeks = today => {
    const weeks = upcomingWeeks(today, 10);
    const nextShort = weeks.find(week => week.count < 5);

    const summary = nextShort
      ? `<div class="search-short-week-summary">
          <span class="search-short-week-kicker">Prochaine semaine courte</span>
          <strong>${courseDayLabel(nextShort.count)}</strong>${shortWeekReasonHtml(nextShort)} - semaine du ${formatWeekDate(nextShort.monday)}
          <span class="search-short-week-relative">(${shortWeekRelative(nextShort.offset)})</span>
        </div>`
      : `<div class="search-short-week-summary">
          <span class="search-short-week-kicker">Prochaine semaine courte</span>
          <strong>Aucune dans les 10 prochaines semaines.</strong>
        </div>`;

    const rows = weeks.map(week => `
      <div class="search-week-row${week.count < 5 ? ' is-short' : ''}">
        <span>Semaine du ${formatWeekDate(week.monday)}</span>
        <strong>${courseDayLabel(week.count)}${shortWeekReasonHtml(week)}</strong>
      </div>`).join('');

    const detailsLabel = weeks.length === 10
      ? 'Voir les 10 prochaines semaines'
      : `Voir les ${weeks.length} prochaines semaines`;

    return `
      <div class="search-short-weeks">
        ${summary}
        ${weeks.length ? `<details class="search-weeks-details">
          <summary>${detailsLabel}</summary>
          <div class="search-weeks-grid">${rows}</div>
        </details>` : ''}
      </div>`;
  };

  const buildNextInterruption = today => {
    // La première ligne affiche la prochaine interruption réelle. La petite ligne
    // sous celle-ci annonce ensuite l'interruption du même type qui viendra après.
    const next = SCHOOL_INTERRUPTION_DAYS.find(item => item.start > today);
    if (!next) return '';

    const isPedago = next.type === 'pedago';
    const noun = isPedago ? 'la prochaine journée pédagogique' : 'le prochain congé';
    const intro = isPedago ? 'la prochaine journée pédagogique' : 'le prochain congé';
    const days = schoolDaysBetween(today, next.start, false);
    const topDetail = isPedago
      ? ` <span class="search-interruption-name">(${formatWeekdayDayMonth(next.start)})</span>`
      : ` <span class="search-interruption-name">(${formatWeekdayDayMonth(next.start)} - ${next.label})</span>`;

    const following = SCHOOL_INTERRUPTION_DAYS.find(item =>
      item.type === next.type && item.start > next.start
    );

    const followingLine = following
      ? `<div class="search-interruption-date">Après ${isPedago ? 'celle-ci' : 'celui-ci'}, ${intro} sera le <strong>${formatDate(following.start)}</strong>${following.type === 'conge' ? ` <span class="search-interruption-name">(${following.label})</span>` : ''}.</div>`
      : '';

    return `
      ${countdownLine(days, `avant ${noun}${topDetail}`)}
      ${followingLine}`;
  };

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
    lines.push(buildNextInterruption(today));

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
        <div class="search-countdown-list">${lines.filter(Boolean).join('')}</div>
        ${buildShortWeeks(today)}
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
      .search-countdown-line + .search-countdown-line,
      .search-interruption-date + .search-countdown-line{
        border-top:1px solid rgba(127,20,39,.08);
      }
      .search-countdown-weeks{
        flex:0 0 auto;
        color:#805662;
        font-size:.82rem;
        white-space:nowrap;
      }
      .search-interruption-date{
        margin:-2px 0 3px;
        padding:0 0 6px;
        color:#78545d;
        font-size:.78rem;
        line-height:1.35;
      }
      .search-interruption-name{color:#906d76}
      .search-short-weeks{
        margin-top:11px;
        padding-top:10px;
        border-top:1px solid rgba(127,20,39,.15);
      }
      .search-short-week-summary{
        line-height:1.4;
        color:#5f2431;
      }
      .search-short-week-kicker{
        display:block;
        margin-bottom:2px;
        color:#7a1428;
        font-size:.7rem;
        font-weight:800;
        letter-spacing:.04em;
        text-transform:uppercase;
      }
      .search-short-week-relative{
        color:#86616a;
        font-size:.8rem;
        white-space:nowrap;
      }
      .search-week-reason{
        color:#86616a;
        font-weight:600;
        white-space:normal;
      }
      .search-weeks-details{
        margin-top:7px;
        border:1px solid rgba(127,20,39,.13);
        border-radius:10px;
        background:rgba(255,255,255,.55);
      }
      .search-weeks-details summary{
        cursor:pointer;
        padding:8px 10px;
        color:#741426;
        font-size:.8rem;
        font-weight:750;
        user-select:none;
      }
      .search-weeks-details[open] summary{
        border-bottom:1px solid rgba(127,20,39,.1);
      }
      .search-weeks-grid{
        display:grid;
        padding:3px 10px 7px;
      }
      .search-week-row{
        display:flex;
        justify-content:space-between;
        gap:12px;
        padding:5px 0;
        color:#68434c;
        font-size:.75rem;
        line-height:1.25;
      }
      .search-week-row + .search-week-row{
        border-top:1px solid rgba(127,20,39,.07);
      }
      .search-week-row.is-short{
        color:#6f1427;
      }
      .search-week-row strong{
        flex:0 0 auto;
        white-space:nowrap;
      }
      .search-week-row.is-short strong{
        max-width:58%;
        white-space:normal;
        text-align:right;
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
        .search-interruption-date{padding-bottom:7px}
        .search-short-week-relative{
          display:block;
          margin-top:1px;
          white-space:normal;
        }
        .search-week-row{
          display:block;
          padding:6px 0;
        }
        .search-week-row strong,
        .search-week-row.is-short strong{
          display:block;
          max-width:none;
          margin-top:2px;
          text-align:left;
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