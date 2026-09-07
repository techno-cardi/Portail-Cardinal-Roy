(() => {
  'use strict';

  const VERSION = '2.0';
  const source = document.getElementById('legacy-source');
  const app = document.getElementById('app');
  if (!source || !app) return;

  const normalize = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9+ -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const STOPWORDS = new Set([
    'a','au','aux','avec','ce','ces','comment','dans','de','des','du','en','est','et','faire','il','je','j','la','le','les',
    'ma','mes','mon','nous','ou','pour','que','qui','quoi','sa','se','ses','sur','un','une','va','veux','votre','vous'
  ]);

  const RESOURCE_ALIASES = {
    'declaration-evenements-risque': [
      'harcelement','harcellement','intimidation','violence','agression','menace','accident travail','accident du travail',
      'blessure au travail','situation dangereuse','cnesst','csst','sst','quasi accident','presque accident','signaler un danger'
    ],
    'sos-groupe': ['mon groupe va mal','ma classe va mal','groupe difficile','classe difficile','groupe ingerable','classe ingerable','aide gestion classe'],
    'rfeef': ['me faire rembourser','remboursement','facture','recu','depense','frais deplacement','kilometrage','stationnement'],
    'c2atom': ['billet informatique','ticket informatique','bug informatique','bogue','ordi brise','ordinateur brise','probleme informatique','support ti'],
    'plandetravail': ['eleve absent longtemps','absence longue','absence prolongee','travail pour eleve absent','quoi envoyer eleve absent'],
    'reservation': ['reserver chromebook','reserver local','convoquer eleve','convocation','reprise examen','recuperation'],
    'etude-surveillee': ['reprendre examen','reprise evaluation','eleve absent examen','faire reprendre examen'],
    'mise-a-jour-recuperation': ['rattraper matiere','eleve a manque matiere','mise a jour ou recuperation','reprendre notion'],
    'sortie-educative': ['sortie scolaire','sortie educative','activite speciale','organiser sortie','permission sortie'],
    'commotion-cerebrale': ['coup a la tete','choc tete','mal de tete apres choc','commotion','concussion'],
    'calendrier-scolaire-2026-2027': ['calendrier scolaire','conges','pedagogiques','relache','vacances','journees de classe'],
    'dates-importantes-2026-2027': ['dates importantes','fin etape','rencontre parents','portes ouvertes','gala','bal finissants'],
    'rapport-temps-travail': ['rapport de temps','heures remplacement','heures suppleance','declarer heures','temps supplementaire'],
    'scolago': ['absence personnel','suppleance','remplacement prof','disponibilite suppleance'],
    'papercut': ['installer imprimante','ajouter imprimante','photocopieur','print deploy','imprimante ecole']
  };

  const SYNONYM_GROUPS = [
    ['harcelement','harcellement','intimidation','violence','agression','menace'],
    ['accident','incident','blessure','blesse','danger','risque'],
    ['remboursement','rembourser','frais','depense','facture','recu'],
    ['billet','ticket','support','soutien','depannage','informatique','bug','bogue','panne'],
    ['absence','absent','manque','manquee'],
    ['reserver','reservation','reserve'],
    ['recuperation','recup','rattrapage'],
    ['examen','evaluation','epreuve'],
    ['groupe','classe'],
    ['difficile','ingerable','rough','tough'],
    ['horaire','calendrier','agenda'],
    ['conge','vacances','relache'],
    ['imprimante','photocopieur','impression'],
    ['motdepasse','mdp','password']
  ].map(group => group.map(normalize));

  const synonymIndex = new Map();
  SYNONYM_GROUPS.forEach(group => group.forEach(word => synonymIndex.set(word, group)));

  const INTENT_BOOSTS = [
    { re: /harcel|intimid|violence|agression|cnesst|csst|accident.*travail|bless.*travail|situation.*risque|danger/, id: 'declaration-evenements-risque', boost: 260 },
    { re: /(groupe|classe).*(diffic|inger|rough|tough|va mal)|va mal.*(groupe|classe)/, id: 'sos-groupe', boost: 250 },
    { re: /rembours|facture|recu|depense|kilometr|stationnement/, id: 'rfeef', boost: 235 },
    { re: /billet.*informat|ticket.*informat|probleme.*informat|ordi.*(brise|panne)|bug|bogue/, id: 'c2atom', boost: 230 },
    { re: /(absence|absent).*(long|prolong)|travail.*eleve.*absent/, id: 'plandetravail', boost: 225 },
    { re: /sortie.*(scolaire|educative)|activite.*speciale/, id: 'sortie-educative', boost: 220 },
    { re: /commotion|concussion|choc.*tete|coup.*tete/, id: 'commotion-cerebrale', boost: 220 },
    { re: /horaire.*locaux|occupation.*locaux/, id: 'horaire-locaux-2026-2027', boost: 220 },
    { re: /horaire.*(prof|enseign)/, id: 'horaire-enseignants-2026-2027', boost: 220 },
    { re: /calendrier.*scolaire|journee.*pedago|semaine.*relache/, id: 'calendrier-scolaire-2026-2027', boost: 215 },
    { re: /reprise.*(examen|evaluation)|reprendre.*(examen|evaluation)/, id: 'etude-surveillee', boost: 190 }
  ];

  const FRESHNESS_OVERRIDES = {
    'dates-importantes-2026-2027': { updatedAt: '2026-09-07', cadenceDays: 60 },
    'calendrier-scolaire-2026-2027': { updatedAt: '2026-09-01', cadenceDays: 150 }
  };

  const MONTHS = {
    janvier:1, fevrier:2, mars:3, avril:4, mai:5, juin:6,
    juillet:7, aout:8, septembre:9, octobre:10, novembre:11, decembre:12
  };

  const extractExplicitDate = text => {
    const normalized = normalize(text);
    const match = normalized.match(/(?:mis a jour(?: le)?|mise a jour(?: le)?|version du|actualise(?: le)?|date du dernier depot)\s*:?[ ]*(\d{1,2})\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\s+(20\d{2})/);
    if (!match) return '';
    const day = Number(match[1]);
    const month = MONTHS[match[2]];
    const year = Number(match[3]);
    if (!month || day < 1 || day > 31) return '';
    return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  };

  const cadenceFor = id => {
    if (/horaire/.test(id)) return 60;
    if (/calendrier|dates-importantes/.test(id)) return 150;
    if (/evaluation|code-vie|regles/.test(id)) return 240;
    return 365;
  };

  const categoryOf = node => {
    const section = node.closest('.category-section');
    return section?.querySelector('.category-heading h2')?.textContent?.replace(/\s+/g,' ').trim() || 'Autres';
  };

  const visualHtmlOf = node => node.querySelector('summary .procedure-visual')?.outerHTML || '';

  const linksOf = node => [...node.querySelectorAll('.procedure-content a[href], a[href]')]
    .map(link => ({
      href: link.getAttribute('href') || '',
      text: link.textContent.replace(/\s+/g,' ').trim(),
      external: /^https?:\/\//i.test(link.getAttribute('href') || '')
    }))
    .filter((link,index,array) => link.href && array.findIndex(other => other.href === link.href && other.text === link.text) === index);

  const sourceNodeFor = id => source.querySelector(`#${CSS.escape(id)}`);

  const buildResource = node => {
    const id = node.id;
    const src = sourceNodeFor(id);
    const title = node.querySelector('.procedure-title')?.textContent?.replace(/\s+/g,' ').trim() || id;
    const subtitle = node.querySelector('.procedure-subtitle')?.textContent?.replace(/\s+/g,' ').trim() || '';
    const renderedText = node.textContent || '';
    const sourceText = src?.textContent || '';
    const datasetSearch = node.dataset.search || '';
    const sourceKeywords = src?.dataset?.keywords || '';
    const aliases = RESOURCE_ALIASES[id] || [];
    const explicitDate = extractExplicitDate(`${renderedText} ${sourceText}`);
    const freshnessOverride = FRESHNESS_OVERRIDES[id] || {};
    const updatedAt = freshnessOverride.updatedAt || explicitDate || '';
    const cadenceDays = freshnessOverride.cadenceDays || cadenceFor(id);
    const searchText = normalize([title, subtitle, datasetSearch, sourceKeywords, renderedText, sourceText, ...aliases].join(' '));
    const words = [...new Set(searchText.split(' ').filter(Boolean))];

    return {
      id,
      title,
      subtitle,
      category: categoryOf(node),
      aliases,
      searchText,
      words,
      links: linksOf(node),
      visualHtml: visualHtmlOf(node),
      updatedAt,
      cadenceDays,
      node
    };
  };

  const levenshteinWithin = (a, b, maxDistance) => {
    if (a === b) return 0;
    if (!maxDistance || Math.abs(a.length - b.length) > maxDistance) return maxDistance + 1;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let previous = Array.from({length:b.length + 1}, (_,i) => i);
    for (let i = 1; i <= a.length; i += 1) {
      const current = [i];
      let rowMin = current[0];
      for (let j = 1; j <= b.length; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        const value = Math.min(
          current[j - 1] + 1,
          previous[j] + 1,
          previous[j - 1] + cost
        );
        current[j] = value;
        rowMin = Math.min(rowMin, value);
      }
      if (rowMin > maxDistance) return maxDistance + 1;
      previous = current;
    }
    return previous[b.length];
  };

  const tokenScore = (token, resource) => {
    if (!token) return 0;
    const title = normalize(resource.title);
    if (title.split(' ').includes(token)) return 44;
    if (title.includes(token)) return 34;
    if (resource.searchText.includes(token)) return 19;

    const synonyms = synonymIndex.get(token) || [];
    const synonymHit = synonyms.find(word => word !== token && resource.searchText.includes(word));
    if (synonymHit) return 13;

    const maxDistance = token.length >= 8 ? 2 : token.length >= 4 ? 1 : 0;
    if (!maxDistance) return 0;
    for (const word of resource.words) {
      if (Math.abs(word.length - token.length) > maxDistance) continue;
      if (levenshteinWithin(token, word, maxDistance) <= maxDistance) return 9;
    }
    return 0;
  };

  let resources = [];
  let byId = new Map();

  const refresh = () => {
    resources = [...document.querySelectorAll('.procedure[id]')]
      .map(buildResource)
      .filter(resource => resource.id);
    byId = new Map(resources.map(resource => [resource.id, resource]));
    api.resources = resources;
    api.byId = byId;
    return resources;
  };

  const search = (rawQuery, limit = 7) => {
    const query = normalize(rawQuery);
    if (!query) return [];
    const tokens = query.split(' ').filter(token => token && !STOPWORDS.has(token));
    const effectiveTokens = tokens.length ? tokens : query.split(' ').filter(Boolean);

    const scored = resources.map(resource => {
      let score = 0;
      const title = normalize(resource.title);
      const aliasText = normalize(resource.aliases.join(' '));

      if (title === query) score += 210;
      else if (title.startsWith(query)) score += 155;
      else if (title.includes(query)) score += 115;
      if (resource.searchText.includes(query)) score += 52;
      if (aliasText.includes(query)) score += 90;

      for (const token of effectiveTokens) {
        const part = tokenScore(token, resource);
        if (!part) return null;
        score += part;
      }

      INTENT_BOOSTS.forEach(intent => {
        if (intent.id === resource.id && intent.re.test(query)) score += intent.boost;
      });

      if (resource.id === 'applications-cssc') score -= 32;
      return { resource, score };
    }).filter(Boolean);

    return scored
      .sort((a,b) => b.score - a.score || a.resource.title.localeCompare(b.resource.title,'fr'))
      .slice(0, Math.max(1, limit))
      .map(entry => ({...entry.resource, score: entry.score}));
  };

  const ageDays = isoDate => {
    if (!isoDate) return null;
    const date = new Date(`${isoDate}T12:00:00`);
    if (Number.isNaN(date.getTime())) return null;
    return Math.floor((Date.now() - date.getTime()) / 86400000);
  };

  const audit = () => {
    const seenIds = new Set();
    const duplicateIds = [];
    const malformedLinks = [];
    const insecureLinks = [];
    const noLinks = [];
    const weakSearch = [];
    const orphaned = [];
    const stale = [];
    const urlUsage = new Map();

    resources.forEach(resource => {
      if (seenIds.has(resource.id)) duplicateIds.push(resource.id);
      seenIds.add(resource.id);
      if (!resource.links.length) noLinks.push(resource.id);
      if (resource.searchText.length < normalize(resource.title).length + 20) weakSearch.push(resource.id);
      if (!resource.node.closest('.category-section')) orphaned.push(resource.id);

      resource.links.forEach(link => {
        if (!/^(https?:\/\/|mailto:|#)/i.test(link.href)) malformedLinks.push({id:resource.id, href:link.href});
        if (/^http:\/\//i.test(link.href)) insecureLinks.push({id:resource.id, href:link.href});
        if (/^https?:\/\//i.test(link.href)) {
          const list = urlUsage.get(link.href) || [];
          list.push(resource.id);
          urlUsage.set(link.href, list);
        }
      });

      const age = ageDays(resource.updatedAt);
      if (age !== null && age > resource.cadenceDays) stale.push({id:resource.id, title:resource.title, updatedAt:resource.updatedAt, ageDays:age});
    });

    const sharedUrls = [...urlUsage.entries()]
      .filter(([,ids]) => new Set(ids).size > 1)
      .map(([href,ids]) => ({href, ids:[...new Set(ids)]}));

    return {
      version: VERSION,
      generatedAt: new Date().toISOString(),
      totalResources: resources.length,
      totalCategories: new Set(resources.map(resource => resource.category)).size,
      totalExternalLinks: resources.reduce((sum,resource) => sum + resource.links.filter(link => link.external).length, 0),
      duplicateIds,
      malformedLinks,
      insecureLinks,
      noLinks,
      weakSearch,
      orphaned,
      stale,
      sharedUrls
    };
  };

  const api = {
    version: VERSION,
    resources,
    byId,
    normalize,
    refresh,
    search,
    audit,
    get: id => byId.get(id) || null,
    ageDays
  };

  window.PORTAL_REGISTRY = api;
  refresh();
  document.documentElement.dataset.portalRegistry = VERSION;
  window.dispatchEvent(new CustomEvent('portal:registry-ready', {detail:{version:VERSION, count:resources.length}}));
})();
