(() => {
  const SAE_ICON_URL = 'assets/vendor/encadrement-sae.png';
  let scheduled = false;

  const bindSectionLink = link => {
    if (!link || link.dataset.portalIntegrityBound === 'true') return;
    link.dataset.portalIntegrityBound = 'true';
    link.addEventListener('click', event => {
      const href = link.getAttribute('href') || '';
      if (!href.startsWith('#section-')) return;
      const target = document.querySelector(href);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', href);
    });
  };

  const repairStructure = () => {
    const host = document.getElementById('category-sections');
    const nav = document.querySelector('.section-nav-inner');
    if (!host || !nav) return false;

    // Garde la section SAÉ juste après « Gérer la classe », même si un autre
    // script reconstruit la navigation après son insertion initiale.
    const saeSection = document.getElementById('section-encadrement-sae');
    const classeSection = document.getElementById('section-classe');
    if (saeSection && classeSection && classeSection.nextElementSibling !== saeSection) {
      classeSection.insertAdjacentElement('afterend', saeSection);
    }

    if (saeSection && !nav.querySelector('a[href="#section-encadrement-sae"]')) {
      const link = document.createElement('a');
      link.href = '#section-encadrement-sae';
      link.className = 'section-nav-link';
      link.innerHTML = `<img src="${SAE_ICON_URL}" alt="" aria-hidden="true" style="width:20px;height:20px;object-fit:contain;border-radius:5px;vertical-align:middle"><span>Système d’encadrement SAÉ</span>`;
      const classeLink = nav.querySelector('a[href="#section-classe"]');
      if (classeLink) classeLink.insertAdjacentElement('afterend', link);
      else nav.prepend(link);
      bindSectionLink(link);
    }

    // Le calendrier des dates importantes fait partie de l'organisation scolaire.
    // Ce placement centralisé évite qu'un ordre différent des MutationObserver
    // fasse disparaître la fiche d'une catégorie ou de la navigation par recherche.
    const schoolList = document.querySelector('#section-organisation-scolaire .procedure-list');
    const dates = document.getElementById('dates-importantes-2026-2027');
    if (schoolList && dates && dates.parentElement !== schoolList) {
      const schoolCalendar = document.getElementById('calendrier-scolaire-2026-2027');
      if (schoolCalendar?.parentElement === schoolList) schoolCalendar.insertAdjacentElement('afterend', dates);
      else schoolList.prepend(dates);
    }

    nav.querySelectorAll('a[href^="#section-"]').forEach(bindSectionLink);
    return true;
  };

  const scheduleRepair = () => {
    if (scheduled) return;
    scheduled = true;
    Promise.resolve().then(() => {
      scheduled = false;
      repairStructure();
    });
  };

  const observer = new MutationObserver(scheduleRepair);
  const observeStructure = () => {
    const host = document.getElementById('category-sections');
    const nav = document.querySelector('.section-nav-inner');
    if (!host || !nav) return false;
    observer.disconnect();
    observer.observe(host, { childList: true, subtree: true });
    observer.observe(nav, { childList: true, subtree: true });
    return true;
  };

  repairStructure();
  if (!observeStructure()) {
    const bootstrapObserver = new MutationObserver(() => {
      if (repairStructure() && observeStructure()) bootstrapObserver.disconnect();
    });
    bootstrapObserver.observe(document.getElementById('app') || document.body, { childList: true, subtree: true });
    window.setTimeout(() => bootstrapObserver.disconnect(), 12000);
  }

  // Après le chargement, une dernière passe couvre aussi les navigateurs qui
  // planifient différemment les callbacks de MutationObserver.
  window.addEventListener('load', repairStructure, { once: true });

  // Garde-fou éditorial pour la banque de pensées du jour.
  // La citation prévue le 12 mai a été remplacée par une création neutre de la banque de réserve.
  const repairDailyThought = () => {
    const block = document.getElementById('daily-thought');
    if (!block || block.dataset.thoughtDate !== '2027-05-12') return;

    const quote = block.querySelector('.daily-thought-quote');
    const author = block.querySelector('.daily-thought-author');
    const safeQuote = '« Les petites avancées construisent de grands chemins. »';
    const safeAuthor = '- Auteur inconnu';

    if (quote && quote.textContent !== safeQuote) quote.textContent = safeQuote;
    if (author && author.textContent !== safeAuthor) author.textContent = safeAuthor;
  };

  const thoughtObserver = new MutationObserver(repairDailyThought);
  thoughtObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
  repairDailyThought();

  // Les dates du calendrier scolaire gardent leur pensée prévue. Les autres jours
  // utilisent une création neutre de la banque de réserve : la barre reste donc
  // toujours visible sans consommer la séquence prévue pour les jours de classe.
  const RESERVE_THOUGHTS = [
    'Les petites avancées construisent de grands chemins.',
    'Apprendre, c’est ajouter une fenêtre à sa façon de voir.',
    'Une question bien posée ouvre déjà une porte.',
    'La curiosité donne du relief aux journées ordinaires.',
    'Une idée peut commencer toute petite et voyager très loin.',
    'Chaque découverte ajoute une couleur à la journée.',
    'Le plaisir d’apprendre tient parfois dans un simple pourquoi.',
    'Un nouveau mot peut ouvrir tout un paysage.',
    'Une journée ordinaire peut contenir une découverte extraordinaire.',
    'Ce qu’on apprend aujourd’hui peut éclairer demain.',
    'Une question peut être le début d’une belle aventure.',
    'Une explication claire peut transformer une difficulté en découverte.',
    'Chaque essai ajoute quelque chose à ce qu’on sait déjà.',
    'Le savoir grandit chaque fois qu’on le met en mouvement.',
    'Une bonne question peut rendre le monde un peu plus intéressant.',
    'Le plaisir de comprendre vaut souvent le détour.',
    'Une phrase peut contenir tout un horizon.',
    'Il y a de la beauté dans une idée qui devient claire.',
    'Une petite découverte peut changer la couleur d’une journée.',
    'Chaque mot appris rend le monde un peu plus précis.',
    'Les idées les plus simples peuvent avoir de grandes destinations.',
    'Une page tournée peut ouvrir une nouvelle direction.',
    'Le temps donné à comprendre n’est jamais tout à fait perdu.',
    'Les connaissances se construisent une pièce à la fois.',
    'Un peu de curiosité suffit pour commencer.',
    'Chaque réponse peut faire naître une nouvelle question.',
    'Chaque apprentissage ajoute une petite lumière à la carte.',
    'Une pensée bien formulée voyage plus facilement.',
    'Il y a toujours quelque chose à remarquer quand on regarde vraiment.',
    'Chaque journée peut contenir son petit moment de découverte.',
    'Il suffit parfois d’un exemple pour que tout s’éclaire.',
    'Le savoir avance souvent par petits pas silencieux.'
  ];

  const dailyDateKey = value => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(value);
    const fields = {};
    parts.forEach(part => { if (part.type !== 'literal') fields[part.type] = part.value; });
    return `${fields.year}-${fields.month}-${fields.day}`;
  };

  const reserveIndex = key => {
    let hash = 2166136261;
    for (const char of key) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) % RESERVE_THOUGHTS.length;
  };

  const ensureDailyThoughtStyle = () => {
    if (document.getElementById('daily-thought-style')) return;
    const style = document.createElement('style');
    style.id = 'daily-thought-style';
    style.textContent = `
      .daily-thought{
        width:min(820px,100%);margin:0 0 8px;padding:8px 11px;display:flex;align-items:baseline;gap:9px;
        color:#fff;border:1px solid rgba(255,255,255,.18);border-left:3px solid rgba(255,255,255,.62);
        border-radius:9px;background:rgba(255,255,255,.055);box-shadow:inset 0 1px 0 rgba(255,255,255,.04);
        animation:dailyThoughtIn .32s ease-out both
      }
      .daily-thought-label{flex:0 0 auto;white-space:nowrap;color:#f5d8e0;font-size:.69rem;font-weight:800;letter-spacing:.045em;text-transform:uppercase}
      .daily-thought-text{min-width:0;font-size:.84rem;line-height:1.32}
      .daily-thought-quote{font-style:italic;font-family:"IBM Plex Serif",Georgia,serif}
      .daily-thought-author{margin-left:.35em;color:#f6dde3;font-style:normal;font-weight:700;white-space:nowrap}
      @keyframes dailyThoughtIn{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}
      @media(max-width:620px){
        .daily-thought{display:block;margin-bottom:8px;padding:8px 10px 9px;text-align:center}
        .daily-thought-label{display:block;margin-bottom:3px;font-size:.66rem}
        .daily-thought-text{display:block;font-size:.86rem;line-height:1.35}
        .daily-thought-author{white-space:normal}
      }
      @media(prefers-reduced-motion:reduce){.daily-thought{animation:none}}
    `;
    document.head.appendChild(style);
  };

  let fallbackSyncing = false;
  const syncFallbackThought = () => {
    if (fallbackSyncing) return;
    fallbackSyncing = true;
    try {
      const host = document.querySelector('.search-stage-inner');
      const intro = host?.querySelector('.search-intro');
      if (!host || !intro) return;

      const scheduledThought = document.getElementById('daily-thought');
      let fallback = document.getElementById('daily-thought-fallback');
      if (scheduledThought) {
        fallback?.remove();
        return;
      }

      ensureDailyThoughtStyle();
      const key = dailyDateKey(new Date());
      const quote = RESERVE_THOUGHTS[reserveIndex(key)];
      if (!fallback) {
        fallback = document.createElement('aside');
        fallback.id = 'daily-thought-fallback';
        fallback.className = 'daily-thought';
        fallback.setAttribute('aria-label', 'Pensée du jour');
        fallback.innerHTML = `
          <span class="daily-thought-label">✦ Pensée du jour</span>
          <span class="daily-thought-text">
            <span class="daily-thought-quote"></span>
            <span class="daily-thought-author">- Auteur inconnu</span>
          </span>`;
      }
      fallback.querySelector('.daily-thought-quote').textContent = `« ${quote} »`;
      fallback.dataset.thoughtDate = key;
      fallback.dataset.thoughtSource = 'reserve';

      const ticker = document.getElementById('school-news-ticker');
      const reference = ticker || intro;
      if (fallback.parentElement !== host || fallback.nextElementSibling !== reference) host.insertBefore(fallback, reference);
    } finally {
      fallbackSyncing = false;
    }
  };

  const thoughtHost = document.querySelector('.search-stage-inner');
  if (thoughtHost) {
    const fallbackObserver = new MutationObserver(syncFallbackThought);
    fallbackObserver.observe(thoughtHost, { childList: true });
  }
  syncFallbackThought();
  window.setInterval(syncFallbackThought, 60 * 1000);
})();
