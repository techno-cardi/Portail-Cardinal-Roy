(() => {
  const source = document.getElementById('legacy-source');
  const app = document.getElementById('app');
  if (!source || !app) return;

  const FAVORITES_KEY = 'cardi-guide-favorites-v1';
  const DRIVE_URL = 'https://drive.google.com/drive/folders/0ACOxqc1_36isUk9PVA';
  const DRIVE_LOGO = 'assets/vendor/google-drive.svg';

  const stripLeadingEmoji = value => (value || '')
    .replace(/^[\s\p{Extended_Pictographic}\uFE0F•·–—→←⚡✓✔✕✖]+/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const normalize = value => (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9 -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const escapeHtml = value => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const cleanBody = root => {
    root.querySelectorAll('.keywords,.keyword,.badge,.card-icon').forEach(el => el.remove());
    root.querySelectorAll('p').forEach(p => {
      const text = normalize(p.textContent);
      if (text.includes('appsp s ecrit exactement ainsi')) {
        p.innerHTML = 'Connectez-vous à <strong>AppSP</strong> avec votre compte institutionnel Google ou Microsoft.';
      }
    });
    root.querySelectorAll('.callout strong').forEach(strong => {
      const text = normalize(strong.textContent);
      if (/^(a retenir|a connaitre|important|attention)/.test(text)) {
        strong.textContent = text.startsWith('attention') ? 'Note : ' : 'Bon à savoir : ';
      }
    });
    root.querySelectorAll('a[target="_blank"]').forEach(a => a.setAttribute('rel', 'noopener noreferrer'));
  };

  const fallbackEmoji = (id, title = '') => {
    const text = normalize(`${id} ${title}`);
    if (/appsp|connexion|compte|authent/.test(text)) return '🔐';
    if (/mozaik|presence|retard/.test(text)) return '✅';
    if (/sortie|expulsion|retrait/.test(text)) return '🚪';
    if (/avis|note|suivi/.test(text)) return '📝';
    if (/reservation|horaire|convocation|examen|reprise/.test(text)) return '📅';
    if (/chromebook|ordinateur|portable/.test(text)) return '💻';
    if (/courriel|parent|message/.test(text)) return '✉️';
    if (/plan de classe/.test(text)) return '🪑';
    if (/intervention|adaptation|mesure/.test(text)) return '🧩';
    if (/drive|document|dossier/.test(text)) return '📁';
    if (/chrome|web|navigateur/.test(text)) return '🌐';
    if (/absence|plan de travail/.test(text)) return '📋';
    if (/tutoriel|video/.test(text)) return '🎥';
    return '📌';
  };

  const items = [...source.querySelectorAll('.searchable')].map((node, index) => {
    const rawTitle = node.dataset.title || node.querySelector('h2,h3')?.textContent || `Procédure ${index + 1}`;
    const title = stripLeadingEmoji(rawTitle);
    const subtitle = stripLeadingEmoji(node.querySelector('.card-sub')?.textContent || '');
    const id = node.id || `procedure-${index + 1}`;
    const keywords = node.dataset.keywords || '';
    const originalIcon = node.dataset.icon || '';
    const logoNode = node.querySelector('.card-head img, .app-logo');
    const logoSrc = logoNode?.src || logoNode?.getAttribute('src') || '';
    const logoAlt = stripLeadingEmoji(logoNode?.getAttribute('alt') || '');

    let body;
    const cardBody = node.querySelector('.card-body');
    if (cardBody) {
      body = cardBody.cloneNode(true);
    } else {
      body = document.createElement('div');
      [...node.children].forEach(child => {
        if (child.matches('h1,h2,h3,.card-head,.keywords,.keyword,.badge')) return;
        const clone = child.cloneNode(true);
        if (clone.matches('.tools')) {
          clone.querySelectorAll('button').forEach(button => button.remove());
          if (!clone.querySelector('a')) return;
        }
        body.appendChild(clone);
      });
    }

    cleanBody(body);
    body.querySelectorAll('.steps > li').forEach(li => {
      if (li.querySelector(':scope > .step-content')) return;
      const wrapper = document.createElement('div');
      wrapper.className = 'step-content';
      [...li.childNodes].forEach(child => wrapper.appendChild(child));
      li.appendChild(wrapper);
    });

    return {
      id,
      title,
      subtitle,
      keywords,
      originalIcon,
      logoSrc,
      logoAlt,
      body,
      haystack: normalize(`${title} ${subtitle} ${keywords} ${logoAlt} ${body.textContent}`)
    };
  });

  const categoryRules = [
    { id:'commencer', label:'Commencer', icon:'🔐', description:'Accès, comptes et réglages de base.' },
    { id:'classe', label:'Gérer la classe', icon:'🧑‍🏫', description:'Présences, avis, sorties et fonctionnement quotidien.' },
    { id:'suivi', label:'Suivre un élève', icon:'📝', description:'Traces, communications, plans et mesures d’adaptation.' },
    { id:'organisation', label:'Organiser', icon:'📅', description:'Réservations, locaux, examens et matériel.' },
    { id:'outils', label:'Outils et ressources', icon:'🧰', description:'Drive, Chrome, logiciels et ressources communes.' }
  ];

  const exactCategoryById = new Map([
    ['connexion-appsp','commencer'], ['chrome','commencer'],
    ['sortie','classe'], ['presences','classe'], ['avis','classe'], ['planclasse','classe'],
    ['tourtable','suivi'], ['pi','suivi'], ['notes','suivi'], ['courriels','suivi'], ['aide-eleve-services-appui','suivi'],
    ['reservation','organisation'], ['chromebook','organisation'], ['monhoraire','organisation'],
    ['drive','outils']
  ]);

  const categoryFor = item => {
    const exact = exactCategoryById.get(item.id);
    if (exact) return exact;

    const text = normalize(`${item.id} ${item.title} ${item.subtitle}`);
    if (/sortie|expulsion|avis|presence|retard|plan de classe|comportement|discipline/.test(text)) return 'classe';
    if (/suivi|note evolutive|tour de table|plan d intervention|adaptation|parent|courriel|absence|plan de travail|tuteur/.test(text)) return 'suivi';
    if (/reservation|reserver|chromebook|chariot|local|examen|reprise|convocation|horaire|recuperation/.test(text)) return 'organisation';
    if (/drive|microsoft|google|wordq|lexibar|antidote|ressource|tutoriel/.test(text)) return 'outils';
    if (/connexion|premier|commencer|nouveau|favori|lancement|chrome/.test(text)) return 'commencer';
    return 'outils';
  };

  const groups = categoryRules.map(rule => ({ ...rule, items: [] }));
  const groupById = new Map(groups.map(group => [group.id, group]));
  items.forEach(item => groupById.get(categoryFor(item))?.items.push(item));

  const appsp = items.find(item => item.id === 'connexion-appsp' || normalize(item.title).includes('appsp'));
  if (appsp) {
    const first = appsp.body.querySelector('p');
    if (first) first.innerHTML = 'Connectez-vous à <strong>AppSP</strong> avec votre compte institutionnel Google ou Microsoft.';
  }

  const driveQuickItem = {
    id:'drive-commun-quick',
    title:'Drive commun',
    subtitle:'Dossier partagé du personnel',
    logoSrc:DRIVE_LOGO,
    logoAlt:'Logo Google Drive',
    externalUrl:DRIVE_URL,
    dataQuickResource:'drive-commun'
  };
  const preferredQuickIds = ['sortie','avis','reservation','chromebook','courriels','planclasse'];
  const quickItems = [items.find(item => item.id === 'sortie'), driveQuickItem]
    .concat(preferredQuickIds.slice(1).map(id => items.find(item => item.id === id)))
    .filter(Boolean);
  const launchItem = {
    id:'page-lancement-cardinal-roy',
    title:'Page de lancement Cardinal-Roy',
    subtitle:'Accéder rapidement aux outils de l’école',
    originalIcon:'🚀',
    logoSrc: appsp?.logoSrc || '',
    logoAlt: appsp?.logoAlt || 'AppSP',
    externalUrl:'https://appsp.ca/lancement/cardinal-roy/'
  };
  quickItems.push(launchItem);
  items.forEach(item => {
    if (quickItems.length < 8 && !quickItems.includes(item) && item.id !== 'pi' && item.id !== 'presences') quickItems.push(item);
  });

  const realApps = [];
  const seenLogos = new Set();
  [...items]
    .sort((a,b) => {
      const score = item => /appsp|mozaik|mes suivis|portail/i.test(`${item.title} ${item.logoAlt}`) ? 0 : 1;
      return score(a) - score(b);
    })
    .forEach(item => {
      if (!item.logoSrc || seenLogos.has(item.logoSrc) || realApps.length >= 5) return;
      seenLogos.add(item.logoSrc);
      realApps.push(item);
    });

  const visualFor = (item, className='item-visual') => item.logoSrc
    ? `<span class="${className} real-logo"><img src="${escapeHtml(item.logoSrc)}" alt="${escapeHtml(item.logoAlt || item.title)}"></span>`
    : `<span class="${className} emoji-visual" aria-hidden="true">${item.originalIcon || fallbackEmoji(item.id,item.title)}</span>`;

  let favorites;
  try {
    favorites = new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'));
  } catch {
    favorites = new Set();
  }
  const saveFavorites = () => localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));

  app.innerHTML = `
    <header class="site-header">
      <div class="page masthead">
        <div class="school-mark" aria-label="École secondaire Cardinal-Roy">
          <div class="official-logo" role="img" aria-label="Logo de l’École secondaire Cardinal-Roy"></div>
        </div>
        <div class="masthead-copy">
          <h1>Portail Cardinal-Roy</h1>
          <p>Cardinal-Roy · procédures et ressources du quotidien</p>
        </div>
      </div>

      <div class="search-stage">
        <div class="page search-stage-inner">
          <div class="search-intro">
            <h2>Qu’est-ce que vous cherchez?</h2>
            <p>Tapez un mot, une application ou une situation : les suggestions apparaissent pendant que vous écrivez.</p>
          </div>
          <div class="search-shell">
            <span class="search-glass" aria-hidden="true">🔎</span>
            <input id="guide-search" name="guide-search" type="search" autocomplete="off" aria-autocomplete="list" aria-controls="search-suggestions" aria-expanded="false" placeholder="Ex. absence prolongée, Mozaïk, Chromebook, sortie de classe…">
            <span class="search-key" aria-hidden="true">Ctrl K</span>
            <div id="search-suggestions" class="search-suggestions" role="listbox" hidden></div>
          </div>
          <div class="search-under">
            <span id="search-status" class="search-status" aria-live="polite"></span>
            <button type="button" class="favorites-jump" id="favorites-jump"><span aria-hidden="true">★</span> Mes favoris <span id="favorites-count">${favorites.size}</span></button>
          </div>
          ${realApps.length ? `<div class="app-ribbon" aria-label="Applications utilisées dans le guide">
            <span class="app-ribbon-label">Applications</span>
            ${realApps.map(item => `<button type="button" class="app-chip" data-open-id="${escapeHtml(item.id)}">${visualFor(item,'app-chip-icon')}<span>${escapeHtml(item.logoAlt.replace(/^Logo\s+/i,'') || item.title)}</span></button>`).join('')}
          </div>` : ''}
        </div>
      </div>
    </header>

    <nav class="section-nav" aria-label="Sections du guide">
      <div class="page section-nav-inner">
        ${groups.filter(group => group.items.length).map(group => `<a href="#section-${group.id}"><span aria-hidden="true">${group.icon}</span>${group.label}</a>`).join('')}
      </div>
    </nav>

    <main class="page main-layout">
      <section class="favorites-area" id="favorites-area" aria-labelledby="favorites-title" ${favorites.size ? '' : 'hidden'}>
        <div class="section-heading-row">
          <div><h2 id="favorites-title">Mes favoris</h2><p>Vos procédures épinglées sur cet appareil.</p></div>
        </div>
        <div id="favorite-links" class="favorite-links"></div>
      </section>

      <section class="quick-area" aria-labelledby="quick-title">
        <div class="quick-main">
          <div class="section-heading-row">
            <div><h2 id="quick-title">Accès rapide</h2><p>Les tâches les plus fréquentes, sans passer par toute la liste.</p></div>
          </div>
          <div class="quick-links">
            ${quickItems.map(item => item.externalUrl
              ? `<a href="${escapeHtml(item.externalUrl)}" target="_blank" rel="noopener noreferrer"${item.dataQuickResource ? ` data-quick-resource="${escapeHtml(item.dataQuickResource)}"` : ''}>${visualFor(item,'quick-visual')}<span class="quick-label">${escapeHtml(item.title)}</span><span aria-hidden="true">↗</span></a>`
              : `<a href="#${item.id}">${visualFor(item,'quick-visual')}<span class="quick-label">${escapeHtml(item.title)}</span><span aria-hidden="true">→</span></a>`
            ).join('')}
          </div>
        </div>
        <aside class="shortcut-note" aria-labelledby="shortcut-title">
          <h2 id="shortcut-title">📋 Raccourci Windows</h2>
          <p><span class="key-row"><kbd>Windows</kbd><span>+</span><kbd>V</kbd></span> ouvre l’historique du presse-papiers. À la première utilisation, choisissez <strong>Activer</strong>.</p>
        </aside>
      </section>

      <section class="directory" aria-labelledby="directory-title">
        <div class="directory-intro">
          <h2 id="directory-title">Toutes les procédures</h2>
          <p>Parcourez les sections ou utilisez la recherche au-dessus pour aller directement au bon endroit.</p>
        </div>
        <div id="category-sections"></div>
      </section>
    </main>

    <footer class="site-footer">
      <div class="page footer-row">
        <span>École secondaire Cardinal-Roy</span>
        <button type="button" id="print-guide">🖨️ Imprimer le guide</button>
      </div>
    </footer>`;

  const categoryHost = document.getElementById('category-sections');

  const renderProcedure = item => {
    const details = document.createElement('details');
    details.className = 'procedure';
    details.id = item.id;
    details.dataset.search = item.haystack;

    const summary = document.createElement('summary');
    summary.innerHTML = `
      ${visualFor(item,'procedure-visual')}
      <span class="procedure-labels">
        <span class="procedure-title">${escapeHtml(item.title)}</span>
        ${item.subtitle ? `<span class="procedure-subtitle">${escapeHtml(item.subtitle)}</span>` : ''}
      </span>
      <button type="button" class="favorite-button" data-favorite-id="${escapeHtml(item.id)}" aria-label="Ajouter ${escapeHtml(item.title)} aux favoris" aria-pressed="false" title="Ajouter aux favoris">☆</button>`;

    const content = document.createElement('div');
    content.className = 'procedure-content';
    content.appendChild(item.body);
    details.append(summary, content);
    return details;
  };

  groups.forEach(group => {
    if (!group.items.length) return;
    const section = document.createElement('section');
    section.className = 'category-section';
    section.id = `section-${group.id}`;
    section.dataset.category = group.id;
    section.innerHTML = `<header class="category-heading"><h2><span aria-hidden="true">${group.icon}</span>${group.label}</h2><p>${group.description}</p></header><div class="procedure-list"></div>`;
    const list = section.querySelector('.procedure-list');
    group.items.forEach(item => list.appendChild(renderProcedure(item)));
    categoryHost.appendChild(section);
  });

  const favoritesArea = document.getElementById('favorites-area');
  const favoriteLinks = document.getElementById('favorite-links');
  const favoritesCount = document.getElementById('favorites-count');
  const itemById = new Map(items.map(item => [item.id,item]));

  const syncFavoriteButtons = () => {
    document.querySelectorAll('[data-favorite-id]').forEach(button => {
      const active = favorites.has(button.dataset.favoriteId);
      button.textContent = active ? '★' : '☆';
      button.classList.toggle('is-favorite', active);
      button.setAttribute('aria-pressed', String(active));
      button.setAttribute('title', active ? 'Retirer des favoris' : 'Ajouter aux favoris');
      const item = itemById.get(button.dataset.favoriteId);
      if (item) button.setAttribute('aria-label', `${active ? 'Retirer' : 'Ajouter'} ${item.title} ${active ? 'des' : 'aux'} favoris`);
    });
  };

  const renderFavorites = () => {
    favoritesCount.textContent = favorites.size;
    favoritesArea.hidden = favorites.size === 0;
    favoriteLinks.innerHTML = [...favorites]
      .map(id => itemById.get(id))
      .filter(Boolean)
      .map(item => `<a href="#${item.id}">${visualFor(item,'favorite-visual')}<span>${escapeHtml(item.title)}</span><span aria-hidden="true">→</span></a>`)
      .join('');
    syncFavoriteButtons();
  };

  const toggleFavorite = id => {
    if (!itemById.has(id)) return;
    favorites.has(id) ? favorites.delete(id) : favorites.add(id);
    saveFavorites();
    renderFavorites();
  };

  const openTarget = id => {
    const target = document.getElementById(id);
    if (!target?.classList.contains('procedure')) return;
    target.open = true;
    history.replaceState(null, '', `#${id}`);
    requestAnimationFrame(() => {
      if (typeof window.PORTAL_SCROLL_AND_FLASH === 'function') window.PORTAL_SCROLL_AND_FLASH(target, 'start');
      else target.scrollIntoView({ behavior:'smooth', block:'start' });
    });
  };

  document.addEventListener('click', event => {
    const favorite = event.target.closest('[data-favorite-id]');
    if (favorite) {
      event.preventDefault();
      event.stopPropagation();
      toggleFavorite(favorite.dataset.favoriteId);
      return;
    }

    const openButton = event.target.closest('[data-open-id]');
    if (openButton) {
      event.preventDefault();
      openTarget(openButton.dataset.openId);
      return;
    }

    const anchor = event.target.closest('a[href^="#"]');
    if (!anchor) return;
    const id = decodeURIComponent(anchor.getAttribute('href').slice(1));
    const target = document.getElementById(id);
    if (target?.classList.contains('procedure')) {
      event.preventDefault();
      openTarget(id);
    }
  });

  document.getElementById('favorites-jump')?.addEventListener('click', () => {
    if (favorites.size) favoritesArea.scrollIntoView({behavior:'smooth',block:'start'});
    else document.querySelector('.favorite-button')?.focus();
  });

  document.getElementById('print-guide')?.addEventListener('click', () => window.print());

  renderFavorites();

  if (location.hash) {
    const id = decodeURIComponent(location.hash.slice(1));
    setTimeout(() => openTarget(id), 80);
  }

  source.replaceChildren();
})();