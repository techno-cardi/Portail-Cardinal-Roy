(() => {
  const VERSION = '1.0';
  const TIMEZONE = 'America/Toronto';
  const SCHOOL_YEAR_END = '2027-06-23';
  const CHRISTMAS_BREAK = '2026-12-21';
  const SPRING_BREAK = '2027-03-01';

  const normalize = value => (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9 -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Tous les déclencheurs sont des requêtes complètes. Aucun mot partiel,
  // préfixe ou mot noyé dans une phrase ne peut déclencher un easter egg.
  const HELP_LINKS = [
    ['SOS Groupe', 'sos-groupe'],
    ['Étude surveillée', 'etude-surveillee'],
    ['Plan de travail', 'plandetravail']
  ];

  const NO_SCHOOL_DAYS = new Set([
    '2026-09-07', '2026-09-18', '2026-10-05', '2026-10-12',
    '2026-11-19', '2026-11-20', '2027-01-05', '2027-01-25',
    '2027-02-19', '2027-03-08', '2027-03-26', '2027-03-29',
    '2027-04-09', '2027-04-19', '2027-05-07', '2027-05-21',
    '2027-05-24', '2027-06-04'
  ]);

  const VACATIONS = [
    { date: '2026-09-07', label: 'Fête du Travail' },
    { date: '2026-10-12', label: 'Action de grâce' },
    { date: CHRISTMAS_BREAK, label: 'vacances de Noël' },
    { date: SPRING_BREAK, label: 'relâche' },
    { date: '2027-03-26', label: 'Vendredi saint' },
    { date: '2027-03-29', label: 'Lundi de Pâques' },
    { date: '2027-05-24', label: 'Journée nationale des patriotes' },
    { date: '2027-06-24', label: 'vacances d’été' }
  ];

  const addRange = (startKey, endKey) => {
    let cursor = Date.parse(`${startKey}T12:00:00Z`);
    const end = Date.parse(`${endKey}T12:00:00Z`);
    while (cursor <= end) {
      NO_SCHOOL_DAYS.add(new Date(cursor).toISOString().slice(0, 10));
      cursor += 86400000;
    }
  };
  addRange('2026-12-21', '2027-01-04');
  addRange('2027-03-01', '2027-03-05');

  const dateFromKey = key => new Date(`${key}T12:00:00Z`);
  const weekdayForKey = key => dateFromKey(key).getUTCDay();
  const isSchoolDay = key => {
    const weekday = weekdayForKey(key);
    return weekday >= 1 && weekday <= 5 && !NO_SCHOOL_DAYS.has(key);
  };

  const quebecDateKey = value => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE,
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(value);
    const fields = {};
    parts.forEach(part => {
      if (part.type !== 'literal') fields[part.type] = part.value;
    });
    return `${fields.year}-${fields.month}-${fields.day}`;
  };

  const formatDate = key => new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(dateFromKey(key));

  const schoolDaysBetween = (today, target, includeTarget = false) => {
    if (target <= today) return 0;
    let cursor = dateFromKey(today);
    const end = dateFromKey(target);
    let count = 0;
    while (cursor < end || (includeTarget && cursor.getTime() === end.getTime())) {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      if (cursor > end) break;
      const key = cursor.toISOString().slice(0, 10);
      if ((!includeTarget && key === target) || key > target) break;
      if (isSchoolDay(key)) count += 1;
    }
    return count;
  };

  const plural = (count, singular, pluralForm) => `${count} ${count === 1 ? singular : pluralForm}`;
  const daysUntilWeekday = (today, targetWeekday) => {
    const weekday = weekdayForKey(today);
    return (targetWeekday - weekday + 7) % 7;
  };

  const linksHtml = links => `
    <div class="search-extra-actions">
      ${links.map(([label, id]) => `<a class="btn" href="#${id}" data-extra-target="${id}">${label}</a>`).join('')}
    </div>`;

  const card = (title, message, options = {}) => `
    <div class="no-suggestion search-extra-egg" role="status">
      <div class="search-extra-title">${title}</div>
      <div class="search-extra-copy">${message}</div>
      ${options.links ? linksHtml(options.links) : ''}
    </div>`;

  const nextVacationCard = today => {
    const next = VACATIONS.find(item => item.date > today);
    if (!next) return card('Vacances', 'L’année scolaire est terminée. Mission accomplie. 🎉');
    const count = next.date === '2027-06-24'
      ? schoolDaysBetween(today, SCHOOL_YEAR_END, true)
      : schoolDaysBetween(today, next.date, false);
    return card(
      'Prochaine pause',
      `Il reste <strong>${plural(count, 'jour d’école', 'jours d’école')}</strong> avant ${next.label}.<br><span class="search-extra-muted">${formatDate(next.date)}</span>`
    );
  };

  const schoolCountdownCard = (today, target, label, includeTarget = false) => {
    if (today >= target) {
      return card(label, `Cette date est déjà passée pour l’année scolaire 2026-2027.`);
    }
    const count = schoolDaysBetween(today, target, includeTarget);
    return card(
      label,
      `Il reste <strong>${plural(count, 'jour d’école', 'jours d’école')}</strong> avant ${label.toLowerCase()}.<br><span class="search-extra-muted">${formatDate(target)}</span>`
    );
  };

  const fridayCard = today => {
    const days = daysUntilWeekday(today, 5);
    if (days === 0) return card('Vendredi', 'Oui. On y est. Bon vendredi. 😎');
    return card('Vendredi', `Encore <strong>${plural(days, 'jour', 'jours')}</strong>. On y arrive.`);
  };

  const mondayCard = today => {
    const days = daysUntilWeekday(today, 1);
    if (days === 0) return card('Lundi', 'Oui. C’est bien lundi. Toutes nos condoléances. ☕');
    return card('Lundi', `Tu penses déjà à lundi? Il est dans <strong>${plural(days, 'jour', 'jours')}</strong>.`);
  };

  const EASTER_EGGS = new Map([
    ['combien de jours', ({ today }) => nextVacationCard(today)],
    ['c est quand les vacances', ({ today }) => nextVacationCard(today)],
    ['vendredi', ({ today }) => fridayCard(today)],
    ['lundi', ({ today }) => mondayCard(today)],
    ['cafe', () => card('Café', '☕ Ressource essentielle non répertoriée dans le portail.')],
    ['j ai besoin d aide', () => card(
      'Besoin d’aide?',
      'T’es probablement à deux clics de la bonne ressource.',
      { links: HELP_LINKS }
    )],
    ['ca marche pas', () => card(
      'Ça marche pas',
      'As-tu essayé de fermer l’onglet et de faire semblant que ça n’est jamais arrivé? 😅'
    )],
    ['vendredi 4h', () => card(
      'Vendredi 16 h',
      'Le portail recommande officiellement de ne plus entreprendre de gros projet.'
    )],
    ['vendredi 16h', () => card(
      'Vendredi 16 h',
      'Le portail recommande officiellement de ne plus entreprendre de gros projet.'
    )],
    ['ete', ({ today }) => schoolCountdownCard(today, SCHOOL_YEAR_END, 'les vacances d’été', true)],
    ['noel', ({ today }) => schoolCountdownCard(today, CHRISTMAS_BREAK, 'les vacances de Noël')],
    ['relache', ({ today }) => schoolCountdownCard(today, SPRING_BREAK, 'la relâche')],
    ['juin', ({ today }) => {
      const count = schoolDaysBetween(today, SCHOOL_YEAR_END, true);
      const suffix = today <= SCHOOL_YEAR_END
        ? ` Il reste <strong>${plural(count, 'jour d’école', 'jours d’école')}</strong>.`
        : '';
      return card('Juin', `Le mois où tout devient urgent en même temps.${suffix}`);
    }],
    ['survivre', () => card(
      'Survivre',
      'Le portail n’a pas encore de procédure officielle pour ça. Mais ceci peut aider :',
      { links: HELP_LINKS }
    )]
  ]);

  const injectStyle = () => {
    if (document.getElementById('search-extra-easter-egg-style')) return;
    const style = document.createElement('style');
    style.id = 'search-extra-easter-egg-style';
    style.textContent = `
      .search-extra-egg{
        padding:15px 17px;text-align:center;color:#5f1020;background:#fff8fa;
        border:1px solid rgba(127,20,39,.24);border-radius:14px;
        box-shadow:0 8px 24px rgba(72,12,27,.07);animation:extraEggReveal .22s ease-out both
      }
      .search-extra-title{font-family:"IBM Plex Serif",Georgia,serif;font-size:1.02rem;font-weight:800;color:#731326}
      .search-extra-copy{margin-top:4px;line-height:1.4}
      .search-extra-muted{color:#86616a;font-size:.82rem}
      .search-extra-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:7px;margin-top:10px}
      .search-extra-actions .btn{font-size:.78rem}
      @keyframes extraEggReveal{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}
      @media(prefers-reduced-motion:reduce){.search-extra-egg{animation:none}}
    `;
    document.head.appendChild(style);
  };

  const attach = () => {
    const input = document.getElementById('guide-search');
    const suggestions = document.getElementById('search-suggestions');
    const status = document.getElementById('search-status');
    if (!input || !suggestions || window.PORTAL_SEARCH_ENGINE !== '2.0') return false;
    if (input.dataset.extraEasterEggsBound === 'true') return true;

    injectStyle();
    input.dataset.extraEasterEggsBound = 'true';
    window.PORTAL_EXTRA_EGGS = VERSION;

    const currentEgg = () => EASTER_EGGS.get(normalize(input.value)) || null;

    const showEgg = event => {
      const builder = currentEgg();
      if (!builder) return;
      event?.stopImmediatePropagation();
      const today = quebecDateKey(new Date());
      suggestions.hidden = false;
      suggestions.innerHTML = builder({ today });
      input.setAttribute('aria-expanded', 'true');
      if (status) status.textContent = '';
    };

    input.addEventListener('input', showEgg, true);
    input.addEventListener('focus', showEgg, true);
    input.addEventListener('keydown', event => {
      if (!currentEgg()) return;
      if (event.key === 'Enter' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        event.stopImmediatePropagation();
        showEgg();
      }
    }, true);

    suggestions.addEventListener('click', event => {
      const link = event.target.closest('[data-extra-target]');
      if (!link) return;
      const target = document.getElementById(link.dataset.extraTarget);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      history.replaceState(null, '', `#${link.dataset.extraTarget}`);
    });

    return true;
  };

  if (!attach()) {
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (attach() || attempts >= 120) window.clearInterval(timer);
    }, 100);
  }
})();