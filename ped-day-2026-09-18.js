(() => {
  'use strict';

  const VERSION = '1.2';
  const RESOURCE_ID = 'journee-pedagogique-2026-09-18';
  const RESOURCE_URL = 'https://drive.google.com/file/d/1S7mZootQb4dddOYHKOU19_yyEqeWu3fG/view?usp=drivesdk';
  const EXPIRES_AT = Date.parse('2026-09-19T00:00:00-04:00');
  const KEYWORDS = [
    'pédago pedago pédagogie pedagogie journée pédago journee pedago journée pédagogique journee pedagogique journée ped journee ped pédagogique pedagogique JP journée pédagogique 18 septembre journee pedagogique 18 septembre',
    'vendredi 18 septembre 2026 vendredi 18 septembre horaire ordre du jour OJ horaire journée pédagogique horaire journee pedagogique',
    '8 h 30 8h30 14 h 54 14h54 formation rencontres travail personnel travail équipe travail equipe diner dîner',
    'surveillance active surveillants élèves eleves stratégies intervention strategies intervention',
    'Découvertes decouvertes 1er cycle 3e secondaire veille active secteur',
    'orthopédagogie orthopedagogie français francais mathématique mathematique',
    'santé sante médications urgence medications urgence secouristes TES secrétariat secretariat',
    'Étude surveillée etude surveillee Portes ouvertes portes ouvertes ski alpin SKIBEC',
    'Nature et moments des évaluations nature moments evaluations Attentes et exigences attentes exigences planifications globales planification globale P.I PI plans intervention',
    'examens décembre examens decembre session examens personnel enseignant enseignants prof profs'
  ].join(' ');

  const normalize = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9 -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const expired = () => Date.now() >= EXPIRES_AT;
  const isPedDayText = value => {
    const text = normalize(value);
    return text.includes('18 septembre') && (text.includes('pedago') || text.includes('pedagog'));
  };

  const getImportantDatesCard = () => {
    const direct = document.getElementById('dates-importantes-2026-2027');
    if (direct) return direct;
    return [...document.querySelectorAll('.procedure')].find(node =>
      normalize(node.querySelector('.procedure-title')?.textContent).includes('dates importantes')
    ) || null;
  };

  const findImportantDateEntry = () => {
    const card = getImportantDatesCard();
    if (!card) return null;

    const matches = [...card.querySelectorAll('*')]
      .filter(node => isPedDayText(node.textContent))
      .filter(node => ![...node.children].some(child => isPedDayText(child.textContent)))
      .sort((a, b) => (a.textContent || '').length - (b.textContent || '').length);

    if (!matches.length) return null;

    const candidate = matches[0];
    const preferred = candidate.closest('a,button,li,p,[role="listitem"],[data-date],.date-item,.important-date,.event-item,.date-row');
    if (preferred && card.contains(preferred) && isPedDayText(preferred.textContent)) return preferred;
    return candidate;
  };

  const removeImportantDateEntry = () => {
    const entry = findImportantDateEntry();
    if (entry && (entry.textContent || '').trim().length <= 500) entry.remove();
  };

  const openSchedule = event => {
    if (expired()) {
      remove();
      return;
    }

    const details = document.getElementById(RESOURCE_ID);
    if (!details) return;

    event?.preventDefault?.();
    event?.stopPropagation?.();
    details.open = true;
    history.replaceState(null, '', `#${RESOURCE_ID}`);
    requestAnimationFrame(() => details.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    window.setTimeout(() => window.PORTAL_FLASH_TARGET?.(details), 450);
  };

  const linkImportantDateEntry = () => {
    const entry = findImportantDateEntry();
    if (!entry || entry.dataset.pedDayLink === '2026-09-18') return Boolean(entry);

    entry.dataset.pedDayLink = '2026-09-18';
    entry.classList.add('ped-day-important-link');
    entry.style.cursor = 'pointer';
    entry.title = 'Ouvrir l’horaire de la journée pédagogique du 18 septembre';

    if (entry.matches('a')) {
      entry.href = `#${RESOURCE_ID}`;
      entry.removeAttribute('target');
    } else {
      entry.setAttribute('role', 'link');
      if (!entry.hasAttribute('tabindex')) entry.tabIndex = 0;
    }

    entry.addEventListener('click', openSchedule);
    entry.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') openSchedule(event);
    });
    return true;
  };

  const remove = () => {
    document.getElementById(RESOURCE_ID)?.remove();
    removeImportantDateEntry();
    window.PORTAL_REGISTRY?.refresh?.();
  };

  const mount = () => {
    if (expired()) {
      remove();
      window.PORTAL_PED_DAY_2026_09_18 = 'expired';
      return true;
    }

    const list = document.querySelector('#section-organisation-scolaire .procedure-list');
    if (!list) return false;

    let details = document.getElementById(RESOURCE_ID);
    if (!details) {
      details = document.createElement('details');
      details.className = 'procedure';
      details.id = RESOURCE_ID;

      const anchor = list.querySelector('#dates-importantes-2026-2027')
        || list.querySelector('#calendrier-scolaire-2026-2027')
        || list.firstElementChild;
      if (anchor) anchor.insertAdjacentElement('afterend', details);
      else list.prepend(details);
    }

    details.dataset.search = KEYWORDS;
    details.dataset.expires = '2026-09-19';
    details.innerHTML = `
      <summary>
        <span class="procedure-visual emoji-visual" aria-hidden="true">🗓️</span>
        <span class="procedure-labels">
          <span class="procedure-title">Horaire de la journée pédagogique du 18 septembre</span>
          <span class="procedure-subtitle">Vendredi 18 septembre 2026 · 8 h 30 à 14 h 54</span>
        </span>
      </summary>
      <div class="procedure-content">
        <p><strong>Journée pédagogique du vendredi 18 septembre.</strong> L’horaire prévoit différentes formations, rencontres de secteur et périodes de travail personnel ou d’équipe selon les membres du personnel concernés.</p>
        <p>Le document comprend notamment la formation sur la surveillance active, des rencontres Découvertes et d’orthopédagogie, la veille active de 3e secondaire, la formation sur les particularités de santé et les médications d’urgence, le comité Étude surveillée, les Portes ouvertes Découvertes et la rencontre SKIBEC.</p>
        <div class="callout"><strong>Horaire général :</strong> 8 h 30 à 14 h 54, avec dîner de 12 h à 13 h.</div>
        <div class="links">
          <a class="btn primary" href="${RESOURCE_URL}" target="_blank" rel="noopener noreferrer">Ouvrir l’horaire complet</a>
        </div>
      </div>`;

    linkImportantDateEntry();
    window.PORTAL_REGISTRY?.refresh?.();
    window.PORTAL_PED_DAY_2026_09_18 = VERSION;
    return true;
  };

  if (!mount()) {
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (mount() || attempts >= 100) window.clearInterval(timer);
    }, 50);
  }

  // La fiche des dates importantes peut finir de se rendre après la fiche temporaire.
  // On réessaie brièvement afin de rendre le 18 septembre cliquable sans dépendre
  // de l’ordre exact des scripts du portail.
  let linkAttempts = 0;
  const linkTimer = window.setInterval(() => {
    linkAttempts += 1;
    if (expired()) {
      removeImportantDateEntry();
      window.clearInterval(linkTimer);
      return;
    }
    if (linkImportantDateEntry() || linkAttempts >= 100) window.clearInterval(linkTimer);
  }, 50);

  const delay = EXPIRES_AT - Date.now();
  if (delay > 0 && delay < 2147483000) {
    window.setTimeout(() => {
      remove();
      window.PORTAL_PED_DAY_2026_09_18 = 'expired';
      // Le moteur de recherche construit son index au chargement. Un rechargement
      // unique à l'expiration garantit que la fiche et la date du 18 septembre
      // disparaissent aussi des résultats si le portail est resté ouvert.
      window.setTimeout(() => window.location.reload(), 100);
    }, delay + 250);
  }
})();
