(() => {
  'use strict';

  const input = document.getElementById('guide-search');
  const suggestions = document.getElementById('search-suggestions');
  const status = document.getElementById('search-status');
  if (!input || !suggestions) return;

  window.PORTAL_SEARCH_ENGINE = '2.0';

  const normalize = value => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[’']/g, ' ').replace(/[^a-z0-9+ -]/g, ' ').replace(/\s+/g, ' ').trim();
  const escapeHtml = value => String(value || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const MOZAIK_LOGO = 'assets/vendor/moz.png';
  const PED_DAY_URL = 'https://drive.google.com/file/d/1SUkoCJa-kxqqFMQQDMBTskOIFqdM3Wwt/view?usp=drivesdk';

  const patchVisual = container => {
    if (!container) return;
    container.classList.add('real-logo');
    container.classList.remove('emoji-visual');
    container.innerHTML = `<img src="${MOZAIK_LOGO}" alt="Logo Mozaïk-Portail">`;
  };
  const patchMozaikVisuals = () => {
    ['presences','avis'].forEach(id => {
      patchVisual(document.querySelector(`#${id} summary .procedure-visual`));
      patchVisual(document.querySelector(`.quick-links a[href="#${id}"] .quick-visual`));
      patchVisual(document.querySelector(`.app-ribbon [data-open-id="${id}"] .app-chip-icon`));
      patchVisual(document.querySelector(`#favorite-links a[href="#${id}"] .favorite-visual`));
    });
  };
  patchMozaikVisuals();
  const favoriteHost = document.getElementById('favorite-links');
  if (favoriteHost) new MutationObserver(patchMozaikVisuals).observe(favoriteHost, { childList:true, subtree:true });

  if (!document.getElementById('portal-search-engine-style')) {
    const style = document.createElement('style');
    style.id = 'portal-search-engine-style';
    style.textContent = `
      .procedure,.subresource-search-target{scroll-margin-top:115px}
      .suggestion.is-active{background:#f5e8ec!important;box-shadow:inset 4px 0 0 #7f1427}
      .suggestion-copy small{display:block}
      .asset-fallback-holder{display:grid!important;place-items:center!important}
      .asset-fallback{font-size:1.35rem;line-height:1}
      #back-to-top{position:fixed;right:22px;bottom:22px;z-index:500;display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:10px 15px;border:1px solid rgba(127,20,39,.22);border-radius:999px;background:#fff;color:#7f1427;box-shadow:0 9px 24px rgba(45,18,24,.18);font:700 .86rem/1.1 "IBM Plex Sans",sans-serif;cursor:pointer;opacity:0;visibility:hidden;transform:translateY(10px);transition:opacity .18s ease,transform .18s ease,visibility .18s ease,background .18s ease,color .18s ease}
      #back-to-top.is-visible{opacity:1;visibility:visible;transform:translateY(0)}
      #back-to-top:hover{background:#7f1427;color:#fff}
      #back-to-top .back-top-arrow{font-size:1.05rem;line-height:1}
      @media(max-width:620px){#back-to-top{right:14px;bottom:14px;padding:10px 13px}}
      @media(prefers-reduced-motion:reduce){#back-to-top{transition:none}}
    `;
    document.head.appendChild(style);
  }

  const fallbackSymbol = img => {
    const text = normalize(`${img.alt || ''} ${img.src || ''} ${img.closest('.procedure,.resource-box')?.textContent || ''}`);
    if (/papercut|repro|imprim|photocop/.test(text)) return '🖨️';
    if (/c2atom|informatique|support|soutien/.test(text)) return '🛠️';
    if (/cssc|centre de services/.test(text)) return '🏫';
    if (/telus|pae|aide aux employes/.test(text)) return '🤝';
    if (/scolago|suppleance|remplacement/.test(text)) return '👥';
    if (/chrome/.test(text)) return '🌐';
    if (/drive/.test(text)) return '📁';
    if (/mozaik/.test(text)) return '✅';
    if (/appsp/.test(text)) return '🔐';
    return '📌';
  };
  const applyImageFallback = img => {
    if (!(img instanceof HTMLImageElement) || img.dataset.portalFallback === '1') return;
    img.dataset.portalFallback = '1';
    const holder = img.closest('.real-logo,.procedure-visual,.quick-visual,.resource-logo,.app-chip-icon,.favorite-visual,.suggestion-visual') || img.parentElement;
    if (!holder) return;
    img.style.display = 'none';
    holder.classList.add('asset-fallback-holder');
    if (!holder.querySelector('.asset-fallback')) {
      const span = document.createElement('span');
      span.className = 'asset-fallback';
      span.setAttribute('aria-hidden','true');
      span.textContent = fallbackSymbol(img);
      holder.appendChild(span);
    }
  };
  document.addEventListener('error', event => {
    if (event.target instanceof HTMLImageElement) applyImageFallback(event.target);
  }, true);
  document.querySelectorAll('img').forEach(img => {
    if (img.complete && img.naturalWidth === 0) applyImageFallback(img);
  });

  const visualForElement = element => {
    const img = element?.querySelector('img:not([style*="display: none"])');
    if (img?.src) return `<span class="suggestion-visual real-logo"><img src="${escapeHtml(img.src)}" alt=""></span>`;
    return `<span class="suggestion-visual emoji-visual" aria-hidden="true">${escapeHtml(element?.textContent?.trim() || '📌')}</span>`;
  };

  const internalEntries = [];
  document.querySelectorAll('.procedure').forEach(node => {
    const title = node.querySelector('.procedure-title')?.textContent?.trim() || node.id;
    const subtitle = node.querySelector('.procedure-subtitle')?.textContent?.trim() || '';
    const haystack = normalize(`${title} ${subtitle} ${node.dataset.search || ''} ${node.querySelector('.procedure-content')?.textContent || ''}`);
    internalEntries.push({
      kind:'internal', type:'procedure', id:node.id, title, subtitle, node, haystack,
      titleNorm:normalize(title), subtitleNorm:normalize(subtitle), words:[...new Set(haystack.split(' ').filter(Boolean))],
      visual:visualForElement(node.querySelector('summary .procedure-visual'))
    });
  });
  document.querySelectorAll('.subresource-search-target').forEach(node => {
    const title = node.dataset.searchLabel || node.querySelector('h4')?.textContent?.trim() || node.id;
    const subtitle = 'Applications CSSC';
    const haystack = normalize(`${title} ${node.dataset.searchKeywords || ''} ${node.textContent || ''}`);
    internalEntries.push({
      kind:'internal', type:'subresource', id:node.id, parentId:node.closest('.procedure')?.id || 'applications-cssc', title, subtitle, node, haystack,
      titleNorm:normalize(title), subtitleNorm:normalize(subtitle), words:[...new Set(haystack.split(' ').filter(Boolean))],
      visual:visualForElement(node.querySelector('.resource-logo'))
    });
  });

  const linkFromProcedure = (procedureId, linkText = '') => {
    const procedure = document.getElementById(procedureId);
    const links = [...(procedure?.querySelectorAll('.procedure-content a[href^="http"]') || [])];
    if (!links.length) return '';
    if (linkText) {
      const wanted = normalize(linkText);
      const match = links.find(link => normalize(link.textContent).includes(wanted));
      if (match?.href) return match.href;
    }
    return links[0]?.href || '';
  };

  const directTemplates = [
    { id:'nature-moments-evaluations', title:'Nature et moments des évaluations', url:'https://drive.google.com/drive/folders/1LTgKPbES9IixST2V-jolWxA7s6SMV6jT', subtitle:'Drive commun', icon:'📁', keywords:'nature moment moments evaluation evaluations évaluation évaluations evaluer évaluer quand dates calendrier periode périodes période' },
    { id:'attentes-exigences', title:'Attentes et exigences', url:'https://drive.google.com/drive/folders/18URlr-7b2TmnzZqL4TdOOGlNI2V7TfJW', subtitle:'Drive commun', icon:'📁', keywords:'attente attentes exigence exigences consigne consignes criteres critères reussite réussite travaux remise cours regles règles' },
    { id:'planification-annuelle', title:'Planification annuelle', url:'https://drive.google.com/drive/folders/15dleRqnqz8ZldCzWrogMAJONlVBta3IY', subtitle:'Drive commun', icon:'📁', keywords:'planification annuelle planif globale progression apprentissages repartition répartition sequence séquence contenu année annee plan cours' },
    { id:'horaire-locaux-direct', title:'Horaire des locaux', procedureId:'horaire-locaux-2026-2027', linkText:'horaire des locaux', icon:'🏫', keywords:'horaire horaires local locaux salle salles classe classes occupation disponibilite disponibilité réservation reservation local libre locaux libres' },
    { id:'horaire-enseignants-direct', title:'Horaire des enseignants', procedureId:'horaire-enseignants-2026-2027', linkText:'horaire des enseignants', icon:'🧑‍🏫', keywords:'horaire horaires enseignant enseignants prof profs professeur professeurs personnel grille grilles cours emploi du temps' },
    { id:'tableau-depannage-direct', title:'Tableau de disponibilités de dépannage 2026-2027', procedureId:'tableau-depannage-2026-2027', linkText:'ouvrir le tableau de dépannage', subtitle:'Organisation scolaire', icon:'👥', keywords:'tableau disponibilités disponibilite disponibilité dépannage depannage suppléance suppleance suppléant suppleant remplacement remplaçant remplacant urgence dépannage obligatoire depannage obligatoire rouge dépannage volontaire depannage volontaire vert enseignant enseignants prof profs professeur professeurs personnel période périodes periode periodes jour jours cycle 2026 2027', excludeBareQueries:['horaire'] },
    { id:'surveillance-dineurs-direct', title:'Surveillance des dîneurs', procedureId:'horaires-surveillance-2026-2027', linkText:'surveillance des dîneurs', icon:'👀', keywords:'horaire horaires surveillance surveillances surveillant surveillants diner dîner dineur dîneur dineurs dîneurs midi' },
    { id:'surveillance-bibliotheque-direct', title:'Surveillance bibliothèque', procedureId:'horaires-surveillance-2026-2027', linkText:'surveillance bibliothèque', icon:'👀', keywords:'horaire horaires surveillance surveillances surveillant surveillants bibliotheque bibliothèque pause pauses midi' },
    { id:'pedago-2026-09-18-direct', title:'Horaire de la journée pédagogique du 18 septembre', url:PED_DAY_URL, subtitle:'Vendredi 18 septembre 2026', icon:'🗓️', requiresElement:'journee-pedagogique-2026-09-18', keywords:'pédago pedago pédagogie pedagogie journée pédago journee pedago journée pédagogique journee pedagogique pédagogique pedagogique vendredi 18 septembre 2026 ordre du jour OJ JP', excludeBareQueries:['horaire'] }
  ].map(resource => ({ ...resource, titleNorm:normalize(resource.title), searchText:normalize(`${resource.title} ${resource.keywords || ''}`) }));

  const resolvedDirectResources = () => directTemplates
    .filter(resource => !resource.requiresElement || document.getElementById(resource.requiresElement))
    .map(resource => ({ ...resource, kind:'direct', url:resource.url || linkFromProcedure(resource.procedureId, resource.linkText) }))
    .filter(resource => /^https?:\/\//i.test(resource.url || ''));

  const publishDirectRegistry = resources => {
    const simple = resources.map(({id,title,url}) => ({id,title,url}));
    window.PORTAL_DIRECT_SEARCH_RESOURCES = simple;
    window.PORTAL_EVALUATION_SEARCH_RESOURCES = simple;
  };
  publishDirectRegistry(resolvedDirectResources());

  const STOP_WORDS = new Set(['a','à','au','aux','de','des','du','et','la','le','les','un','une','pour','dans','sur']);
  const ALIASES = new Map([
    ['ordi',['ordinateur','chromebook']], ['pc',['ordinateur']], ['paye',['paie','salaire']], ['paie',['paye','salaire']],
    ['mfa',['multifacteur','authenticator']], ['2fa',['multifacteur','authenticator']], ['tbi',['tableau','interactif']],
    ['photocopieuse',['photocopieur','reprographie']], ['photocopie',['reprographie','repro']], ['supp',['suppleance','remplacement']],
    ['remplacant',['suppleant','suppleance']], ['mdp',['mot','passe']], ['techno',['technopedagogue','informatique']]
  ]);

  const editDistance = (a,b) => {
    if (a === b) return 0;
    const previous = Array.from({length:b.length + 1}, (_,i) => i);
    for (let i=1;i<=a.length;i++) {
      let left = i;
      let diagonal = i - 1;
      for (let j=1;j<=b.length;j++) {
        const up = previous[j];
        const next = Math.min(left + 1, up + 1, diagonal + (a[i-1] === b[j-1] ? 0 : 1));
        previous[j] = next;
        diagonal = up;
        left = next;
      }
    }
    return previous[b.length];
  };

  const tokenScore = (entry, token) => {
    let best = -1;
    for (const candidate of [token, ...(ALIASES.get(token) || [])]) {
      if (entry.titleNorm.includes(candidate)) best = Math.max(best, 52);
      if (entry.subtitleNorm.includes(candidate)) best = Math.max(best, 34);
      if (entry.haystack.includes(candidate)) best = Math.max(best, 28);
      if (candidate.length < 3) continue;
      const threshold = candidate.length >= 8 ? 2 : 1;
      for (const word of entry.words) {
        if (word.length >= 3 && (word.startsWith(candidate) || candidate.startsWith(word))) best = Math.max(best, 22);
        else if (Math.abs(word.length - candidate.length) <= threshold) {
          const distance = editDistance(candidate, word);
          if (distance <= threshold) best = Math.max(best, 15 - distance * 4);
        }
      }
    }
    return best;
  };

  const scoreInternal = (entry, raw) => {
    const query = normalize(raw);
    let tokens = query.split(' ').filter(token => token.length > 1 && !STOP_WORDS.has(token));
    if (!tokens.length) tokens = query.split(' ').filter(token => token.length > 1);
    if (!tokens.length) return -1;
    let score = entry.titleNorm === query ? 500 : entry.titleNorm.startsWith(query) ? 350 : entry.titleNorm.includes(query) ? 300 : 0;
    if (entry.subtitleNorm.includes(query)) score += 140;
    if (entry.haystack.includes(query)) score += 170;
    for (const token of tokens) {
      const part = tokenScore(entry, token);
      if (part < 0) return -1;
      score += part;
    }
    if (entry.type === 'subresource') score += 8;
    return score;
  };

  const findDirectMatches = raw => {
    const query = normalize(raw);
    const tokens = query.split(' ').filter(token => token.length > 1);
    if (!tokens.length) return [];
    const resources = resolvedDirectResources();
    publishDirectRegistry(resources);
    return resources.map(resource => {
      if ((resource.excludeBareQueries || []).map(normalize).includes(query)) return null;
      if (!tokens.every(token => resource.searchText.includes(token))) return null;
      let score = resource.titleNorm === query ? 500 : resource.titleNorm.startsWith(query) ? 350 : resource.titleNorm.includes(query) ? 300 : 0;
      if (resource.searchText.includes(query)) score += 170;
      tokens.forEach(token => { score += resource.titleNorm.includes(token) ? 55 : 25; });
      return {resource,score};
    }).filter(Boolean)
      .sort((a,b) => b.score - a.score || a.resource.title.localeCompare(b.resource.title,'fr'))
      .slice(0,7).map(result => result.resource);
  };

  const findInternalMatches = raw => {
    const query = normalize(raw);
    let matches = internalEntries.map(entry => ({entry,score:scoreInternal(entry,query)}))
      .filter(result => result.score >= 0)
      .sort((a,b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title,'fr'));
    if (matches.some(result => result.entry.type === 'subresource') && !query.includes('applications cssc')) {
      matches = matches.filter(result => !(result.entry.type === 'procedure' && result.entry.id === 'applications-cssc'));
    }
    return matches.slice(0,7).map(result => result.entry);
  };

  const search = raw => {
    const direct = findDirectMatches(raw);
    return direct.length ? direct : findInternalMatches(raw);
  };

  const accentPattern = token => {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const map = {a:'[aàâäáãå]',c:'[cç]',e:'[eéèêë]',i:'[iîïíì]',o:'[oôöóòõ]',u:'[uùûüú]',y:'[yÿý]',n:'[nñ]'};
    return [...escaped].map(char => map[char.toLowerCase()] || char).join('');
  };
  const safeHighlight = (text,tokens) => {
    const escapedText = escapeHtml(text);
    const unique = [...new Set(tokens.filter(token => token.length >= 2))].sort((a,b) => b.length - a.length);
    if (!unique.length) return escapedText;
    try { return escapedText.replace(new RegExp(`(${unique.map(accentPattern).join('|')})`,'gi'),'<mark class="search-hit">$1</mark>'); }
    catch { return escapedText; }
  };

  let currentMatches = [];
  let activeIndex = -1;
  const hideSuggestions = () => {
    suggestions.hidden = true;
    suggestions.innerHTML = '';
    input.setAttribute('aria-expanded','false');
    if (status) status.textContent = '';
    currentMatches = [];
    activeIndex = -1;
  };
  const setActive = index => {
    const nodes = [...suggestions.querySelectorAll('.suggestion')];
    if (!nodes.length) { activeIndex = -1; return; }
    activeIndex = Math.max(0,Math.min(index,nodes.length - 1));
    nodes.forEach((node,i) => {
      const active = i === activeIndex;
      node.classList.toggle('is-active',active);
      node.setAttribute('aria-selected',String(active));
      if (active) node.scrollIntoView({block:'nearest'});
    });
  };

  const renderSuggestions = () => {
    const raw = input.value.trim();
    if (!raw) { hideSuggestions(); return; }
    currentMatches = search(raw);
    activeIndex = -1;
    const tokens = normalize(raw).split(/\s+/).filter(Boolean);
    suggestions.hidden = false;
    input.setAttribute('aria-expanded','true');
    if (status) status.textContent = currentMatches.length ? `${currentMatches.length} suggestion${currentMatches.length > 1 ? 's' : ''}` : 'Aucune suggestion';
    if (!currentMatches.length) {
      suggestions.innerHTML = '<div class="no-suggestion">Essayez un autre mot : application, tâche, élève, absence, réservation…</div>';
      return;
    }
    suggestions.innerHTML = currentMatches.map((entry,index) => entry.kind === 'direct'
      ? `<a class="suggestion" role="option" aria-selected="false" data-search-index="${index}" data-direct-search-resource="${escapeHtml(entry.id)}" href="${escapeHtml(entry.url)}" target="_blank" rel="noopener noreferrer"><span class="suggestion-visual emoji-visual" aria-hidden="true">${escapeHtml(entry.icon || '📁')}</span><span class="suggestion-copy"><strong>${safeHighlight(entry.title,tokens)}</strong>${entry.subtitle ? `<small>${safeHighlight(entry.subtitle,tokens)}</small>` : ''}</span><span class="suggestion-arrow" aria-hidden="true">↗</span></a>`
      : `<button type="button" class="suggestion" role="option" aria-selected="false" data-search-index="${index}" ${entry.type === 'subresource' ? `data-search-subresource="${escapeHtml(entry.id)}"` : `data-search-open="${escapeHtml(entry.id)}"`}>${entry.visual}<span class="suggestion-copy"><strong>${safeHighlight(entry.title,tokens)}</strong>${entry.subtitle ? `<small>${safeHighlight(entry.subtitle,tokens)}</small>` : ''}</span><span class="suggestion-arrow" aria-hidden="true">→</span></button>`
    ).join('');
  };

  const openInternal = entry => {
    if (!entry?.node) return;
    hideSuggestions();
    input.blur();
    const block = entry.type === 'subresource' ? 'center' : 'start';
    if (entry.type === 'subresource') {
      const parent = document.getElementById(entry.parentId);
      if (parent?.classList.contains('procedure')) parent.open = true;
    } else entry.node.open = true;
    history.replaceState(null,'',`#${entry.id}`);
    requestAnimationFrame(() => {
      if (typeof window.PORTAL_SCROLL_AND_FLASH === 'function') window.PORTAL_SCROLL_AND_FLASH(entry.node, block);
      else entry.node.scrollIntoView({behavior:'smooth',block});
    });
  };

  const activateIndex = index => {
    const entry = currentMatches[index];
    if (!entry) return;
    if (entry.kind === 'direct') {
      hideSuggestions();
      input.blur();
      window.open(entry.url,'_blank','noopener,noreferrer');
    } else openInternal(entry);
  };

  input.addEventListener('input',renderSuggestions);
  input.addEventListener('focus',renderSuggestions);
  input.addEventListener('keydown',event => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (suggestions.hidden) renderSuggestions();
      if (currentMatches.length) setActive(activeIndex < 0 ? 0 : activeIndex + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (suggestions.hidden) renderSuggestions();
      if (currentMatches.length) setActive(activeIndex < 0 ? currentMatches.length - 1 : activeIndex - 1);
    } else if (event.key === 'Enter') {
      if (!currentMatches.length) renderSuggestions();
      const index = activeIndex >= 0 ? activeIndex : 0;
      if (currentMatches[index]) {
        event.preventDefault();
        event.stopPropagation();
        activateIndex(index);
      }
    } else if (event.key === 'Escape') {
      input.value = '';
      hideSuggestions();
      input.blur();
    }
  });

  suggestions.addEventListener('mousemove',event => {
    const node = event.target.closest('.suggestion[data-search-index]');
    if (node) setActive(Number(node.dataset.searchIndex));
  });
  suggestions.addEventListener('click',event => {
    const direct = event.target.closest('[data-direct-search-resource]');
    if (direct) {
      window.setTimeout(hideSuggestions,0);
      return;
    }
    const button = event.target.closest('.suggestion[data-search-index]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    activateIndex(Number(button.dataset.searchIndex));
  });
  document.addEventListener('click',event => {
    if (!event.target.closest('.search-shell')) hideSuggestions();
  });
  document.addEventListener('keydown',event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      event.stopImmediatePropagation();
      input.focus();
      input.select();
    }
  },true);

  let backToTop = document.getElementById('back-to-top');
  if (!backToTop) {
    backToTop = document.createElement('button');
    backToTop.type = 'button';
    backToTop.id = 'back-to-top';
    backToTop.setAttribute('aria-label','Retour en haut et fermer les fiches ouvertes');
    backToTop.title = 'Retour en haut et fermer les fiches ouvertes';
    backToTop.innerHTML = '<span class="back-top-arrow" aria-hidden="true">↑</span><span>Retour en haut</span>';
    document.body.appendChild(backToTop);
  }
  const updateBackToTop = () => backToTop.classList.toggle('is-visible',window.scrollY > 520);
  updateBackToTop();
  window.addEventListener('scroll',updateBackToTop,{passive:true});
  backToTop.addEventListener('click',() => {
    document.querySelectorAll('.procedure[open]').forEach(procedure => { procedure.open = false; });
    window.PORTAL_CLEAR_FLASH?.();
    input.value = '';
    hideSuggestions();
    history.replaceState(null,'',`${location.pathname}${location.search}`);
    window.scrollTo({top:0,behavior:'smooth'});
  });

  if (location.hash) {
    const id = decodeURIComponent(location.hash.slice(1));
    const entry = internalEntries.find(candidate => candidate.id === id);
    if (entry) window.setTimeout(() => openInternal(entry),120);
  }
})();