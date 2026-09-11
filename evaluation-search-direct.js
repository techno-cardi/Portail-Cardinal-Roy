(() => {
  'use strict';

  const input = document.getElementById('guide-search');
  const suggestions = document.getElementById('search-suggestions');
  const status = document.getElementById('search-status');
  if (!input || !suggestions) return;

  const resources = [
    {
      id: 'nature-moments-evaluations',
      title: 'Nature et moments des évaluations',
      url: 'https://drive.google.com/drive/folders/1LTgKPbES9IixST2V-jolWxA7s6SMV6jT',
      subtitle: 'Drive commun',
      keywords: 'nature moment moments evaluation evaluations évaluation évaluations evaluer évaluer quand dates calendrier periode périodes période'
    },
    {
      id: 'attentes-exigences',
      title: 'Attentes et exigences',
      url: 'https://drive.google.com/drive/folders/18URlr-7b2TmnzZqL4TdOOGlNI2V7TfJW',
      subtitle: 'Drive commun',
      keywords: 'attente attentes exigence exigences pedagogique pédagogiques consigne consignes criteres critères reussite réussite travaux remise cours regles règles'
    },
    {
      id: 'planification-annuelle',
      title: 'Planification annuelle',
      url: 'https://drive.google.com/drive/folders/15dleRqnqz8ZldCzWrogMAJONlVBta3IY',
      subtitle: 'Drive commun',
      keywords: 'planification annuelle planif globale progression apprentissages repartition répartition sequence séquence contenu année annee plan cours'
    },
    {
      id: 'horaires-locaux',
      title: 'Horaires des locaux',
      sourceTitleWords: ['horaire', 'locaux'],
      keywords: 'horaire horaires local locaux salle salles classe classes occupation disponibilite disponibilité réservation reservation local libre locaux libres'
    },
    {
      id: 'horaires-enseignants',
      title: 'Horaires des enseignants',
      sourceTitleWords: ['horaire', 'enseignant'],
      keywords: 'horaire horaires enseignant enseignants prof profs professeur professeurs personnel grille grilles cours emploi du temps'
    },
    {
      id: 'horaires-surveillance',
      title: 'Horaires de surveillance',
      sourceTitleWords: ['horaire', 'surveillance'],
      keywords: 'horaire horaires surveillance surveillances surveillant surveillants diner dîner dineurs dîneurs bibliotheque bibliothèque pause pauses midi'
    }
  ];

  const normalize = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9+ -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const escapeHtml = value => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const existingLinkFor = titleWords => {
    if (!Array.isArray(titleWords) || !titleWords.length) return '';
    const words = titleWords.map(normalize);
    const procedure = [...document.querySelectorAll('.procedure')].find(node => {
      const title = normalize(node.querySelector('.procedure-title')?.textContent || '');
      return words.every(word => title.includes(word));
    });
    if (!procedure) return '';
    const link = procedure.querySelector(
      '.procedure-content a.btn.primary[href^="http"], .procedure-content a.btn[href^="http"], .procedure-content a[href^="http"]'
    );
    return link?.href || '';
  };

  resources.forEach(resource => {
    if (!resource.url && resource.sourceTitleWords) {
      resource.url = existingLinkFor(resource.sourceTitleWords);
    }
    resource.titleNorm = normalize(resource.title);
    resource.searchText = normalize(`${resource.title} ${resource.keywords}`);
  });

  const usableResources = resources.filter(resource => resource.url);

  let activeIndex = -1;
  let current = [];

  const findMatches = raw => {
    const query = normalize(raw);
    if (!query) return [];
    const tokens = query.split(' ').filter(token => token.length > 1);
    if (!tokens.length) return [];

    return usableResources
      .map(resource => {
        if (!tokens.every(token => resource.searchText.includes(token))) return null;
        let score = 0;
        if (resource.titleNorm === query) score += 500;
        else if (resource.titleNorm.startsWith(query)) score += 350;
        else if (resource.titleNorm.includes(query)) score += 300;
        if (resource.searchText.includes(query)) score += 170;
        tokens.forEach(token => {
          if (resource.titleNorm.split(' ').includes(token)) score += 70;
          else if (resource.titleNorm.includes(token)) score += 55;
          else score += 25;
        });
        return { resource, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || a.resource.title.localeCompare(b.resource.title, 'fr'))
      .map(result => result.resource);
  };

  const syncActive = () => {
    const links = [...suggestions.querySelectorAll('[data-direct-search-resource]')];
    links.forEach((link, index) => {
      const active = index === activeIndex;
      link.classList.toggle('is-active', active);
      link.setAttribute('aria-selected', String(active));
    });
  };

  const render = () => {
    current = findMatches(input.value);
    activeIndex = -1;
    if (!current.length) return;

    suggestions.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    if (status) status.textContent = `${current.length} ressource${current.length > 1 ? 's' : ''}`;

    suggestions.innerHTML = current.map(resource => `
      <a class="suggestion" role="option" aria-selected="false"
         data-direct-search-resource="${escapeHtml(resource.id)}"
         href="${escapeHtml(resource.url)}" target="_blank" rel="noopener noreferrer">
        <span class="suggestion-visual emoji-visual" aria-hidden="true">📁</span>
        <span class="suggestion-copy">
          <strong>${escapeHtml(resource.title)}</strong>
          ${resource.subtitle ? `<small>${escapeHtml(resource.subtitle)}</small>` : ''}
        </span>
        <span class="suggestion-arrow" aria-hidden="true">↗</span>
      </a>`).join('');
  };

  const renderAfterMainSearch = () => window.setTimeout(render, 0);
  input.addEventListener('input', renderAfterMainSearch);
  input.addEventListener('focus', renderAfterMainSearch);

  input.addEventListener('keydown', event => {
    current = findMatches(input.value);
    if (!current.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopImmediatePropagation();
      activeIndex = activeIndex < current.length - 1 ? activeIndex + 1 : 0;
      syncActive();
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopImmediatePropagation();
      activeIndex = activeIndex > 0 ? activeIndex - 1 : current.length - 1;
      syncActive();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopImmediatePropagation();
      const resource = current[activeIndex >= 0 ? activeIndex : 0];
      if (resource) window.open(resource.url, '_blank', 'noopener,noreferrer');
    }
  }, true);

  suggestions.addEventListener('mousemove', event => {
    const link = event.target.closest('[data-direct-search-resource]');
    if (!link) return;
    const links = [...suggestions.querySelectorAll('[data-direct-search-resource]')];
    activeIndex = links.indexOf(link);
    syncActive();
  });

  window.PORTAL_DIRECT_SEARCH_RESOURCES = usableResources.map(({id, title, url}) => ({id, title, url}));
  window.PORTAL_EVALUATION_SEARCH_RESOURCES = window.PORTAL_DIRECT_SEARCH_RESOURCES;
})();
