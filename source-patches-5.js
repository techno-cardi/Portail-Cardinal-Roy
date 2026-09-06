(() => {
  const root = document.getElementById('legacy-source');
  if (!root) return;

  const MOZAIK_LOGO = 'assets/vendor/moz.png';
  const CSSC_LOGO = 'assets/vendor/cssc.png';
  const PERF_LOCAL_LOGO = 'assets/vendor/perf-20local-138294d2d1.png';
  const assetMap = window.PORTAL_ASSETS || {};

  const URLS = {
    rfeef: 'https://rfeef.cssc.gouv.qc.ca/',
    perfLocal: 'https://appsp.ca/formulaire/envoi.php?id=1',
    perfCentral: 'https://drive.google.com/file/d/1JM3oKD1UJ3xhqIlXqvaErvO1QKrBKwDD/view?usp=drive_link',
    horaireEnseignants: 'https://drive.google.com/file/d/1ptDonxP2Dx4FVUmY36PlppBYDc0HVRG5/view?usp=drivesdk',
    horaireLocaux: 'https://drive.google.com/file/d/13dpfWN2_Jws3V4bwptfamOe-VSahZvCd/view?usp=drivesdk',
    planNouvellePartie: 'https://drive.google.com/file/d/1TYRKzIvOm2iKM44iiKV2sozXnEStJ7vB/view?usp=drivesdk',
    planPartieExistante: 'https://drive.google.com/file/d/1TPVfnGKfqiZLMQ0C1KXR_lGXXFLlzSci/view?usp=drivesdk'
  };

  const normalize = value => (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9+ -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const localAssetFor = value => {
    if (!value) return '';
    const raw = String(value).trim();
    if (assetMap[raw]) return assetMap[raw];
    try {
      const absolute = new URL(raw, location.href).href;
      return assetMap[absolute] || '';
    } catch {
      return '';
    }
  };

  const localizeImage = img => {
    if (!(img instanceof HTMLImageElement)) return;
    const raw = img.getAttribute('src') || '';
    const local = localAssetFor(raw) || localAssetFor(img.src);
    if (local && raw !== local) {
      img.src = local;
      img.dataset.localAsset = 'true';
    }
  };

  const localizeImages = scope => {
    if (!scope) return;
    if (scope instanceof HTMLImageElement) localizeImage(scope);
    scope.querySelectorAll?.('img[src]').forEach(localizeImage);
  };

  const setMozaikLogo = id => {
    const card = root.querySelector(`#${CSS.escape(id)}`);
    if (!card) return;
    const head = card.querySelector('.card-head') || card;
    head.querySelectorAll(':scope > .card-icon').forEach(node => node.remove());

    let img = head.querySelector(':scope > img.app-logo, :scope > img');
    if (!img) {
      img = document.createElement('img');
      img.className = 'app-logo';
      head.prepend(img);
    }
    img.src = MOZAIK_LOGO;
    img.alt = 'Logo Mozaïk-Portail';
    img.classList.add('app-logo');
    card.dataset.icon = '';
  };

  const addSearchableCard = ({id, title, subtitle, keywords, icon = '', logo = '', logoAlt = '', body}) => {
    if (root.querySelector(`#${CSS.escape(id)}`)) return root.querySelector(`#${CSS.escape(id)}`);
    const card = document.createElement('section');
    card.className = 'card searchable';
    card.id = id;
    card.dataset.title = title;
    card.dataset.keywords = keywords;
    card.dataset.icon = icon;
    card.innerHTML = `
      <div class="card-head">
        ${logo ? `<img class="app-logo" src="${logo}" alt="${logoAlt || title}">` : ''}
        <div>
          <h3>${title}</h3>
          ${subtitle ? `<div class="card-sub">${subtitle}</div>` : ''}
        </div>
      </div>
      <div class="card-body">${body}</div>`;
    root.appendChild(card);
    return card;
  };

  const promoteResourceBox = ({sourceTitle, id, title, subtitle, keywords, icon, bodyText, buttonText}) => {
    const applications = root.querySelector('#applications-cssc');
    if (!applications || root.querySelector(`#${CSS.escape(id)}`)) return;
    const box = [...applications.querySelectorAll('.resource-box')]
      .find(node => normalize(node.querySelector('h4')?.textContent) === normalize(sourceTitle));
    const sourceLink = box?.querySelector('a[href]');
    if (!box || !sourceLink) return;
    const href = sourceLink.getAttribute('href') || sourceLink.href;
    addSearchableCard({
      id, title, subtitle, keywords, icon,
      body: `
        <p>${bodyText}</p>
        <div class="links"><a class="btn primary" href="${href}" target="_blank" rel="noopener noreferrer">${buttonText}</a></div>`
    });
    box.remove();
  };

  // Ces deux fiches doivent afficher le vrai logo Mozaïk avant que ui-polish.js
  // ne clone les visuels dans les cartes, les favoris et les accès rapides.
  setMozaikLogo('presences');
  setMozaikLogo('avis');

  // --- Formulaires administratifs ---
  addSearchableCard({
    id: 'rfeef',
    title: 'RFEEF — remboursement de frais',
    subtitle: 'Remboursement de frais encourus dans l’exercice des fonctions',
    keywords: 'RFEEF rfeef remboursement rembourser rembourse frais frais encourus dépense dépenses depense depenses facture factures reçu reçus recu recus paiement paie paye salaire argent remboursement dépense professionnelle depense professionnelle kilométrage kilometrage déplacement deplacement transport repas stationnement achat achats reçu de caisse recu de caisse frais professionnel frais professionnels',
    icon: '🧾',
    body: `
      <p><strong>RFEEF</strong> sert à transmettre une demande de remboursement pour des frais encourus dans l’exercice de vos fonctions.</p>
      <div class="callout"><strong>À chercher ici :</strong> dépenses admissibles, factures, reçus, frais de déplacement, repas, stationnement et autres frais professionnels.</div>
      <div class="links"><a class="btn primary" href="${URLS.rfeef}" target="_blank" rel="noopener noreferrer">Ouvrir RFEEF</a></div>`
  });

  addSearchableCard({
    id: 'perf-central',
    title: 'Demande au comité de perfectionnement central (CSSC)',
    subtitle: 'Formation, colloque, congrès et demande de perfectionnement',
    keywords: 'perfectionnement central comité central comite central CSSC formation formations libération liberation suppléance suppleance colloque congrès congres atelier développement professionnel developpement professionnel perfectionnement professionnel demande formulaire participation enseignant enseignante frais formation remplacement remplaçant remplacant',
    logo: CSSC_LOGO,
    logoAlt: 'Logo du Centre de services scolaire de la Capitale',
    body: `
      <p>Utilisez cette demande pour une activité de perfectionnement relevant du <strong>comité central du CSSC</strong>, notamment une formation, un colloque ou un congrès avec, au besoin, de la suppléance.</p>
      <div class="callout"><strong>À faire aussi :</strong> remplissez également la <a href="${URLS.perfLocal}" target="_blank" rel="noopener noreferrer">demande au comité de perfectionnement local</a>, au cas où la demande au comité central serait refusée.</div>
      <div class="links"><a class="btn primary" href="${URLS.perfCentral}" target="_blank" rel="noopener noreferrer">Ouvrir la demande au comité central</a></div>`
  });

  addSearchableCard({
    id: 'perf-local',
    title: 'Demande au comité de perfectionnement local',
    subtitle: 'Libération, formation et demande de perfectionnement',
    keywords: 'perfectionnement local comité local comite local formation formations libération liberation suppléance suppleance colloque congrès congres atelier développement professionnel developpement professionnel perfectionnement professionnel demande formulaire participation enseignant enseignante frais formation remplacement remplaçant remplacant',
    logo: PERF_LOCAL_LOGO,
    logoAlt: 'Comité de perfectionnement local',
    body: `
      <p>Ce formulaire sert à présenter une demande au <strong>comité de perfectionnement local</strong> pour une formation, une libération ou de la suppléance liée à une activité de perfectionnement.</p>
      <div class="callout"><strong>Ordre à suivre :</strong> faites d’abord la <a href="${URLS.perfCentral}" target="_blank" rel="noopener noreferrer">demande au comité de perfectionnement central (CSSC)</a>, puis remplissez aussi la demande au comité local.</div>
      <div class="links"><a class="btn primary" href="${URLS.perfLocal}" target="_blank" rel="noopener noreferrer">Remplir la demande au comité local</a></div>`
  });

  // Un formulaire CSSC déjà présent dans « Applications CSSC » devient une vraie
  // ressource de la catégorie Formulaires plutôt qu'une sous-carte cachée.
  promoteResourceBox({
    sourceTitle: 'Formulaire de déclaration des événements accidentels ou des situations jugées à risque',
    id: 'declaration-evenements-risque',
    title: 'Déclaration d’un événement accidentel ou d’une situation à risque',
    subtitle: 'Formulaire CSSC de déclaration',
    keywords: 'formulaire déclaration declaration événement accidentel evenement accidentel événements accidentels evenements accidentels incident incidents accident accidents accident travail accident du travail blessure blessures situation risque situation à risque situation a risque risque risques danger dangereux santé sécurité sante securite SST CNESST quasi accident presque accident déclaration incident declarer incident déclarer accident declarer accident',
    icon: '⚠️',
    bodyText: 'Utilisez ce formulaire pour déclarer un événement accidentel ou une situation que vous jugez à risque.',
    buttonText: 'Ouvrir le formulaire de déclaration'
  });

  // --- Calendriers et organisation scolaire ---
  addSearchableCard({
    id: 'horaire-enseignants-2026-2027',
    title: 'Horaire des enseignants 2026-2027',
    subtitle: 'Consulter l’horaire des profs et des enseignants',
    keywords: 'horaire enseignants enseignant enseignante enseignants enseignantes prof profs professeur professeurs 2026 2027 horaire prof horaire professeur horaire enseignant cours période periodes périodes groupe groupes matière matiere enseignement journée journee cycle école ecole cardinal roy personnel enseignant',
    icon: '🧑‍🏫',
    body: `
      <p>Consultez l’horaire des enseignants de Cardinal-Roy pour l’année scolaire 2026-2027.</p>
      <div class="callout"><strong>Version du 1er septembre 2026</strong> (date du dernier dépôt).</div>
      <div class="links"><a class="btn primary" href="${URLS.horaireEnseignants}" target="_blank" rel="noopener noreferrer">Voir l’horaire des enseignants</a></div>`
  });

  addSearchableCard({
    id: 'horaire-locaux-2026-2027',
    title: 'Horaire des locaux 2026-2027',
    subtitle: 'Consulter l’occupation des locaux et des salles',
    keywords: 'horaire locaux local salle salles classe classes occupation local occupation locaux disponibilité disponibilite libre occupé occupe 2026 2027 horaire local horaire locaux horaire salle où est ou est cours local cours salle cours prof enseignant professeur période periodes périodes groupe groupes école ecole cardinal roy',
    icon: '🏫',
    body: `
      <p>Consultez l’horaire d’occupation des locaux pour repérer où se donnent les cours et vérifier l’utilisation d’un local.</p>
      <div class="callout"><strong>Version du 1er septembre 2026</strong> (date du dernier dépôt).</div>
      <div class="links"><a class="btn primary" href="${URLS.horaireLocaux}" target="_blank" rel="noopener noreferrer">Voir l’horaire des locaux</a></div>`
  });

  addSearchableCard({
    id: 'plans-ecole',
    title: 'Plans de l’école',
    subtitle: 'Se repérer dans la nouvelle partie et la partie existante',
    keywords: 'plan plans école ecole cardinal roy bâtiment batiment bâtiments batiments nouvelle partie partie existante ancien bâtiment ancien batiment nouveau bâtiment nouveau batiment local locaux salle salles classe classes aile ailes étage etage étages etages corridor corridors se repérer se reperer orientation emplacement trouver local trouver salle où est ou est plan école plan ecole carte bâtiment carte batiment',
    icon: '🗺️',
    body: `
      <p>Utilisez les plans pour vous repérer dans l’école, trouver un local, une salle, une aile ou un secteur du bâtiment.</p>
      <div class="links">
        <a class="btn primary" href="${URLS.planNouvellePartie}" target="_blank" rel="noopener noreferrer">Plan — nouvelle partie</a>
        <a class="btn" href="${URLS.planPartieExistante}" target="_blank" rel="noopener noreferrer">Plan — partie existante</a>
      </div>`
  });

  // Le calendrier scolaire déjà présent dans « Applications CSSC » est déplacé
  // dans la nouvelle section d'organisation scolaire.
  promoteResourceBox({
    sourceTitle: 'Calendrier scolaire 2026-2027',
    id: 'calendrier-scolaire-2026-2027',
    title: 'Calendrier scolaire 2026-2027',
    subtitle: 'Congés, journées pédagogiques et principales dates de l’année',
    keywords: 'calendrier scolaire calendrier 2026 2027 année scolaire annee scolaire rentrée rentree congé conge congés conges journée pédagogique journee pedagogique journées pédagogiques journees pedagogiques pédago pedago relâche relache vacances noël noel pâques paques dates école ecole journée de classe journee de classe journées de classe journees de classe fin étape fin etape bulletin rencontre parents',
    icon: '🗓️',
    bodyText: 'Consultez le calendrier scolaire 2026-2027 pour les journées de classe, les congés, les journées pédagogiques et les principales dates de l’année.',
    buttonText: 'Voir le calendrier scolaire 2026-2027'
  });

  // Remplace toutes les images distantes déjà présentes dans la source par leur
  // copie locale conservée dans /assets/vendor lorsqu'elle existe.
  localizeImages(root);

  // Réorganise les catégories après le rendu principal sans toucher au moteur de
  // recherche : les procédures gardent leur identifiant et leurs mots-clés.
  let sectionsOrganized = false;
  const organizePortalSections = () => {
    if (sectionsOrganized) return true;
    const host = document.getElementById('category-sections');
    const nav = document.querySelector('.section-nav-inner');
    if (!host || !nav) return false;

    const ensureSection = ({id, label, icon, description}) => {
      let section = document.getElementById(`section-${id}`);
      if (!section) {
        section = document.createElement('section');
        section.className = 'category-section';
        section.id = `section-${id}`;
        section.dataset.category = id;
        section.innerHTML = `<header class="category-heading"><h2><span aria-hidden="true">${icon}</span>${label}</h2><p>${description}</p></header><div class="procedure-list"></div>`;
        host.appendChild(section);
      }
      return section;
    };

    const forms = ensureSection({
      id: 'formulaires', label: 'Formulaires', icon: '🧾',
      description: 'Remboursements, perfectionnement et demandes administratives.'
    });
    const schoolOrg = ensureSection({
      id: 'organisation-scolaire', label: 'Calendriers et organisation scolaire', icon: '🗓️',
      description: 'Calendriers, horaires, locaux et plans de l’école.'
    });

    const moveInto = (section, ids) => {
      const list = section.querySelector('.procedure-list');
      ids.forEach(id => {
        const procedure = document.getElementById(id);
        if (procedure?.classList.contains('procedure')) list.appendChild(procedure);
      });
    };

    moveInto(forms, ['rfeef','perf-central','perf-local','declaration-evenements-risque']);
    moveInto(schoolOrg, ['monhoraire','calendrier-scolaire-2026-2027','horaire-enseignants-2026-2027','horaire-locaux-2026-2027','plans-ecole']);

    // Retire toute section devenue vide, puis remet l'ensemble dans un ordre logique.
    [...host.querySelectorAll('.category-section')].forEach(section => {
      if (!section.querySelector('.procedure-list .procedure')) section.remove();
    });
    const order = ['commencer','classe','suivi','organisation','formulaires','organisation-scolaire','outils'];
    order.forEach(id => {
      const section = document.getElementById(`section-${id}`);
      if (section) host.appendChild(section);
    });

    const labels = {
      commencer:['🔐','Commencer'], classe:['🧑‍🏫','Gérer la classe'], suivi:['📝','Suivre un élève'],
      organisation:['📅','Organiser'], formulaires:['🧾','Formulaires'],
      'organisation-scolaire':['🗓️','Organisation scolaire'], outils:['🧰','Outils et ressources']
    };
    nav.innerHTML = order
      .filter(id => document.getElementById(`section-${id}`))
      .map(id => `<a href="#section-${id}"><span aria-hidden="true">${labels[id][0]}</span>${labels[id][1]}</a>`)
      .join('');
    nav.querySelectorAll('a[href^="#section-"]').forEach(link => {
      link.addEventListener('click', event => {
        const target = document.querySelector(link.getAttribute('href'));
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({behavior:'smooth', block:'start'});
        history.replaceState(null, '', link.getAttribute('href'));
      });
    });

    sectionsOrganized = true;
    return true;
  };

  // Certains patchs créent ensuite des visuels dans l'interface rendue. On les
  // localise aussi au moment où ils apparaissent, sans modifier les liens des apps.
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) localizeImages(node);
      });
    });
    organizePortalSections();
  });
  observer.observe(document.getElementById('app') || document.body, {childList:true, subtree:true});

  queueMicrotask(organizePortalSections);

  // Dernière passe lorsque le rendu principal est terminé.
  window.addEventListener('load', () => {
    localizeImages(document);
    organizePortalSections();
  }, {once:true});
})();