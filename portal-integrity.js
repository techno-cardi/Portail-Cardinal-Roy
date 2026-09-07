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
})();
