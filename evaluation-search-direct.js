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
      keywords: 'nature moment moments evaluation evaluations évaluation évaluations evaluer évaluer quand dates calendrier periode périodes période'
    },
    {
      id: 'attentes-exigences',
      title: 'Attentes et exigences',
      url: 'https://drive.google.com/drive/folders/18URlr-7b2TmnzZqL4TdOOGlNI2V7TfJW',
      keywords: 'attente attentes exigence exigences pedagogique pédagogiques consigne consignes criteres critères reussite réussite travaux remise cours regles règles'
    },
    {
      id: 'planification-annuelle',
      title: 'Planification annuelle',
      url: 'https://drive.google.com/drive/folders/15dleRqnqz8ZldCzWrogMAJONlVBta3IY',
      keywords: 'planification annuelle planif globale enseignant enseignants progression apprentissages repartition répartition sequence séquence contenu année annee plan cours'
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

  resources.forEach(resource => {
    resource.titleNorm = normalize(resource.title);
    resource.searchText = normalize(`${resource.title} ${resource.keywords}`);
  });

  let activeIndex = -1;
  let current = [];

  const findMatches = raw => {
    const query = normalize(raw);
    if (!query) return [];
    const tokens = query.split(' ').filter(token => token.length > 1);
    if (!tokens.length) return [];

    return resources
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
    const links = [...suggestions.querySelectorAll('[data-drive-search-resource]')];
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
         data-drive-search-resource="${escapeHtml(resource.id)}"
         href="${escapeHtml(resource.url)}" target="_blank" rel="noopener noreferrer">
        <span class="suggestion-visual emoji-visual" aria-hidden="true">📁</span>
        <span class="suggestion-copy">
          <strong>${escapeHtml(resource.title)}</strong>
          <small>Dossier du Drive commun</small>
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
    const link = event.target.closest('[data-drive-search-resource]');
    if (!link) return;
    const links = [...suggestions.querySelectorAll('[data-drive-search-resource]')];
    activeIndex = links.indexOf(link);
    syncActive();
  });

  window.PORTAL_EVALUATION_SEARCH_RESOURCES = resources.map(({id, title, url}) => ({id, title, url}));
})();
