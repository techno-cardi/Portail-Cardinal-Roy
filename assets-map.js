window.PORTAL_ASSETS = Object.assign(window.PORTAL_ASSETS || {}, {
  "__mozaik__": "assets/vendor/moz.png",
  "https://appsp.ca/admin/images/suiviscolaire.png": "assets/vendor/encadrement-sae.png",
  "https://appsp.ca/images/monhoraire.png": "assets/vendor/mon-horaire.png",
  "https://appsp.ca/images/plandetravail.png": "assets/vendor/plan-de-travail.png",
  "https://cdn.jsdelivr.net/npm/fluentui-emoji@0.0.9/icons/modern/red-apple.svg": "assets/vendor/services-educatifs.svg",
  "https://cssc.gouv.qc.ca/wp-content/uploads/2020/06/csscapitale_diapo_couleur.png": "assets/vendor/cssc.png",
  "https://cssdn.gouv.qc.ca/wp-content/uploads/2025/04/72f9e1d4-a691-41c7-ab09-04f6ea4b4f82.gif": "assets/vendor/scolago.gif",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR6Hh2x1MfBsP45vdYHd7O98ZKj5_QOsqzzIJ52kVvye6Ppx5Zf4LwDpGN_&s=10": "assets/vendor/papercut.png",
  "https://ised-isde.canada.ca/opic/recherche-marques/media/1617737.png": "assets/vendor/telus-health.png",
  "https://mdp.cssc.gouv.qc.ca/ico/apple-touch-icon.png": "assets/vendor/mot-de-passe.png",
  "https://mkt.c2-itsm.com/hubfs/webinar%20logo.png": "assets/vendor/c2atom.png",
  "https://repro.cssc.gouv.qc.ca/images/header.jpg": "assets/vendor/repro-plus.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/5/5f/Google_Drive_icon_%282026%29.svg": "assets/vendor/google-drive.svg",
  "https://www.google.com/chrome/static/images/chrome-logo-m100.svg": "assets/vendor/chrome.svg"
});

/*
 * Ressources essentielles et vocabulaire de recherche du personnel.
 * Ce bloc s'exécute AVANT ui-polish afin que les nouvelles fiches soient
 * indexées nativement par le portail. Les ajustements de placement rendus
 * après ui-polish sont idempotents et les observers se déconnectent.
 */
(() => {
  const root = document.getElementById('legacy-source');
  const app = document.getElementById('app');
  if (!root || !app) return;

  const URLS = {
    rapportTemps: 'https://drive.google.com/file/d/1Qj0N1yZ5HaTGG6Lwwu-EHwJSChT_QeTY/view?usp=drivesdk',
    tableauConges: 'https://drive.google.com/file/d/1LPWyvNYbTb_EnYxfkOz3COhJlN5GyUIP/view?usp=drivesdk',
    scolagoProcedure: 'https://drive.google.com/file/d/1pHwCWDhyfpxQrKcS9C_sQheCn_MgloLo/view?usp=drivesdk',
    scolagoNote: 'https://drive.google.com/file/d/1y1srLHm6OkX2THIFrL2hhjMLrvmynYO1/view?usp=drivesdk',
    scolagoGuide: 'https://drive.google.com/file/d/1u9d8nVSjTo-ZWGTwsnQLAsfUdemlfZoG/view?usp=drivesdk',
    evaluationFolder: 'https://drive.google.com/drive/folders/17HlDgSBz2S39X0U4PsHcdCdqb8KLV56V',
    evaluationPolicy: 'https://drive.google.com/file/d/1_XmHEr_DSiTL8a8644XF-hFkI-drf7sW/view?usp=drivesdk',
    codeVie: 'https://drive.google.com/file/d/1FRcGX7XrniuuV-NTRG-4d2gL8Ku7bSFs/view?usp=drivesdk',
    agenda: 'https://drive.google.com/file/d/1_5MMb2NN5nK5G7_s8hwH1OR5o_MvpetO/view?usp=drivesdk',
    servicesAppui: 'https://drive.google.com/drive/folders/10NTTdwd5PYoLIvxKlgdAfIO1pXb7UcCZ',
    piMemo: 'https://docs.google.com/document/d/1WFIkGcj3SFwGC7DnBG5b9euWwYyNpB3j/edit?usp=drivesdk',
    interventions: 'https://drive.google.com/file/d/1x3FtPGjXHO98NtOc2zvgWUVCVqPhZFcP/view?usp=drivesdk'
  };

  const ICONS = {
    dates: 'assets/portal/dates.svg',
    absence: 'assets/portal/scolago-absence.svg',
    etude: 'assets/portal/etude-surveillee.svg',
    commotion: 'assets/portal/commotion.svg',
    sortie: 'assets/portal/sortie.svg',
    aide: 'assets/portal/aide-eleve.svg',
    evaluation: 'assets/portal/evaluation.svg',
    regles: 'assets/portal/regles.svg',
    temps: 'assets/portal/rapport-temps.svg'
  };

  const addKeywords = (node, keywords) => {
    if (!node || !keywords) return;
    const current = node.dataset.keywords || '';
    node.dataset.keywords = `${current} ${keywords}`.replace(/\s+/g, ' ').trim();
  };

  const setCardImage = (node, src, alt) => {
    if (!node || !src) return;
    const head = node.querySelector('.card-head');
    if (!head) return;
    head.querySelectorAll(':scope > .card-icon').forEach(el => el.remove());
    let img = head.querySelector(':scope > img.portal-generated-icon');
    if (!img) {
      img = document.createElement('img');
      img.className = 'app-logo portal-generated-icon';
      head.prepend(img);
    }
    img.src = src;
    img.alt = alt || '';
    node.dataset.icon = '';
  };

  const addCard = ({ id, title, subtitle, keywords, image, imageAlt, body }) => {
    let card = root.querySelector(`#${CSS.escape(id)}`);
    if (card) {
      addKeywords(card, keywords);
      if (image) setCardImage(card, image, imageAlt || title);
      return card;
    }
    card = document.createElement('section');
    card.className = 'card searchable';
    card.id = id;
    card.dataset.title = title;
    card.dataset.keywords = keywords;
    card.dataset.icon = '';
    card.innerHTML = `
      <div class="card-head">
        <img class="app-logo portal-generated-icon" src="${image}" alt="${imageAlt || title}">
        <div>
          <h3>${title}</h3>
          <div class="card-sub">${subtitle}</div>
        </div>
      </div>
      <div class="card-body">${body}</div>`;
    root.appendChild(card);
    return card;
  };

  addCard({
    id: 'scolago-absence-personnel',
    title: 'Déclarer une absence — Scolago',
    subtitle: 'Procédure du personnel enseignant pour signaler une absence et préparer le remplacement',
    image: ICONS.absence,
    imageAlt: 'Icône de déclaration d’absence dans Scolago',
    keywords: [
      'Scolago scola go scolago absence absences absent absente m absenter s absenter je suis absent je suis absente déclarer absence declarer absence signaler absence annoncer absence',
      'absence enseignant absence enseignante absence prof absence professeur absence personnel absence travail maladie malade congé conge congés conges urgence rendez-vous rendez vous',
      'suppléance suppleance suppléant suppleant suppléante suppleante remplacement remplaçant remplacant remplaçante remplacante remplacer se faire remplacer remplacement enseignant remplacement prof',
      'remplaçant à trouver remplacant a trouver suppléant à trouver suppleant a trouver remplacement cours remplacer cours remplacer période remplacer periode',
      'procédurier procedurier procédure procedure note service guide enseignant guide prof Scolago enseignant Scolago professeur',
      'absence dernière minute absence derniere minute absence journée absence journee absence demi journée absence demi journee absence matin absence après-midi absence apres midi'
    ].join(' '),
    body: `
      <p>Utilisez ces documents pour déclarer une absence dans <strong>Scolago</strong> et vérifier les étapes à suivre lorsqu’un remplacement ou de la suppléance est nécessaire.</p>
      <div class="links">
        <a class="btn primary" href="${URLS.scolagoProcedure}" target="_blank" rel="noopener noreferrer">Procédurier — absences du personnel enseignant (2026)</a>
        <a class="btn" href="${URLS.scolagoNote}" target="_blank" rel="noopener noreferrer">Note de service — Scolago (2026)</a>
        <a class="btn" href="${URLS.scolagoGuide}" target="_blank" rel="noopener noreferrer">Guide Scolago pour les enseignants</a>
      </div>`
  });

  addCard({
    id: 'rapport-temps-travail',
    title: 'Rapport de temps de travail',
    subtitle: 'Suppléance, remplacement et heures de travail à déclarer',
    image: ICONS.temps,
    imageAlt: 'Icône de feuille de temps et horloge',
    keywords: [
      'rapport temps rapport de temps rapport temps travail rapport de temps de travail feuille temps feuille de temps timesheet temps travail temps de travail heures heures travail heures travaillées heure travaillée heure travail',
      'suppléance suppleance suppléant suppleant suppléante suppleante remplacement remplacements remplaçant remplacant remplaçante remplacante remplacer remplacement prof remplacement professeur remplacement enseignant',
      'période remplacée periode remplacee périodes remplacées periodes remplacees cours remplacé cours remplace cours remplacés cours remplaces remplacement période remplacement periode',
      'déclarer heures declarer heures inscrire heures déclarer temps declarer temps inscrire temps faire rapport temps remplir rapport temps formulaire temps formulaire heures',
      'paie paies payé paye paiement rémunération remuneration salaire heures payées heures payees suppléance payée suppleance payee remplacement payé remplacement paye',
      'congé conge absence personnel enseignant personnel remplacement occasionnel tâche tache travail supplémentaire travail supplementaire temps supplémentaire temps supplementaire'
    ].join(' '),
    body: `
      <p>Ce formulaire sert à déclarer du temps de travail, notamment lorsqu’il faut inscrire des <strong>heures de suppléance</strong>, de <strong>remplacement</strong> ou d’autres heures à transmettre.</p>
      <div class="links">
        <a class="btn primary" href="${URLS.rapportTemps}" target="_blank" rel="noopener noreferrer">Ouvrir le rapport de temps de travail</a>
        <a class="btn" href="${URLS.tableauConges}" target="_blank" rel="noopener noreferrer">Consulter le tableau des congés et motifs</a>
      </div>`
  });

  addCard({
    id: 'evaluation-bulletin-planification',
    title: 'Évaluation, bulletin et planification',
    subtitle: 'Documents de référence pour évaluer, consigner les résultats et planifier l’année',
    image: ICONS.evaluation,
    imageAlt: 'Icône d’évaluation, bulletin et planification',
    keywords: [
      'évaluation evaluation évaluations evaluations évaluer evaluer épreuve epreuve épreuves epreuves examen examens',
      'bulletin bulletins note notes résultat resultats résultats resultat consignation consigner résultats consigner resultats Mozaïk Mozaik étape etape étapes etapes fin étape fin etape',
      'normes modalités normes et modalités normes modalites modalité modalite nature moments nature et moments évaluations evaluation',
      'politique évaluation politique evaluation politique des apprentissages cadre évaluation cadre evaluation cadres évaluation cadres evaluation',
      'planification planification annuelle planification globale planification globale annuelle PGA pondération ponderation pourcentage compétence competence compétences competences',
      'première communication premiere communication communication parents rencontres parents moyenne moyenne groupe jugement professionnel critères criteres critère critere correction grille évaluation grille evaluation',
      'résultats scolaires resultats scolaires note bulletin date bulletin remise bulletin fin étape bulletin scolaire'
    ].join(' '),
    body: `
      <p>Retrouvez au même endroit les documents de référence liés à l’évaluation, aux bulletins, aux normes et modalités et à la planification annuelle.</p>
      <div class="links">
        <a class="btn primary" href="${URLS.evaluationFolder}" target="_blank" rel="noopener noreferrer">Ouvrir le dossier Évaluation, bulletin et planification</a>
        <a class="btn" href="${URLS.evaluationPolicy}" target="_blank" rel="noopener noreferrer">Politique d’évaluation des apprentissages (2025)</a>
      </div>`
  });

  addCard({
    id: 'code-vie-regles',
    title: 'Règles et code de vie 2026-2027',
    subtitle: 'Présence, retards, tricherie, lois et règles de l’école',
    image: ICONS.regles,
    imageAlt: 'Icône de guide des règles de l’école',
    keywords: [
      'code vie code de vie règles regles règlement reglement règlements reglements règles école regles ecole règlement école reglement ecole agenda scolaire règles agenda regles agenda',
      'présence presence absent absence absences retard retards retardataire ponctualité ponctualite assiduité assiduite',
      'tricherie tricher copier copie plagiat plagier fraude fraude scolaire intégrité integrite académique academique',
      'cellulaire cellulaires téléphone telephone téléphone cell telephone cell écouteurs ecouteurs appareil électronique appareil electronique',
      'comportement discipline manquement conséquences consequences sanction sanctions retenue suspension expulsion respect règles classe regles classe',
      'loi lois alcool drogue vapotage cigarette violence intimidation harcèlement harcelement tenue vestimentaire nourriture règles école regles ecole'
    ].join(' '),
    body: `
      <p>Consultez les règles communes de l’école et les repères 2026-2027 concernant notamment la présence, les retards, la tricherie et les principales règles de vie.</p>
      <div class="links">
        <a class="btn primary" href="${URLS.codeVie}" target="_blank" rel="noopener noreferrer">Ouvrir le code de vie 2026-2027</a>
        <a class="btn" href="${URLS.agenda}" target="_blank" rel="noopener noreferrer">Consulter l’agenda 2026-2027</a>
      </div>`
  });

  addCard({
    id: 'aide-eleve-services-appui',
    title: 'Aide pour un élève — services d’appui et plan d’intervention',
    subtitle: 'Référer un élève, consulter les services d’appui et préparer un PI',
    image: ICONS.aide,
    imageAlt: 'Icône de soutien à un élève',
    keywords: [
      'aide élève aide eleve élève difficulté eleve difficulte élève en difficulté eleve en difficulte élève a besoin aide eleve a besoin aide quoi faire élève quoi faire eleve',
      'services appui service appui services d appui référence referer référer referer élève référer eleve demande aide demande soutien besoin soutien soutien élève soutien eleve',
      'services professionnels service professionnel professionnel professionnels orthopédagogie orthopedagogie orthopédagogue orthopedagogue psychoéducation psychoeducation psychoéducateur psychoeducateur psychologie psychologue éducateur educateur spécialisé specialise',
      'plan intervention plan d intervention PI p.i. plan intervention élève plan intervention eleve aide mémoire pi aide memoire pi banque libellés banque libelles objectif objectifs moyens mesure mesures adaptation adaptations',
      'difficulté apprentissage difficulte apprentissage difficultés apprentissage difficultes apprentissage lecture écriture ecriture math comportement anxiété anxiete motivation organisation TDAH tdah dyslexie dysorthographie trouble apprentissage',
      'DAP dossier aide particulière dossier aide particuliere dossier aide plan aide suivi élève suivi eleve intervention interventions progression interventions seuils actions',
      'groupe difficile sos groupe S.O.S. Groupe aide groupe gestion groupe gestion classe climat classe'
    ].join(' '),
    body: `
      <p>Point de départ lorsqu’un élève présente des difficultés et que vous cherchez les ressources d’appui, une démarche de référence ou des outils pour un plan d’intervention.</p>
      <div class="links">
        <a class="btn primary" href="${URLS.servicesAppui}" target="_blank" rel="noopener noreferrer">Ouvrir Référence aux services d’appui</a>
        <a class="btn" href="${URLS.piMemo}" target="_blank" rel="noopener noreferrer">Aide-mémoire — plan d’intervention (2025)</a>
        <a class="btn" href="${URLS.interventions}" target="_blank" rel="noopener noreferrer">Progression des interventions (2026)</a>
      </div>`
  });

  const FUTURE_KEYWORDS = {
    'sos-groupe': [
      'SOS S.O.S. s o s sosgroupe sos groupe aide groupe soutien groupe',
      'groupe difficile groupe difficil groupe diffile groupe dure groupe tough groupe rough classe difficile classe dure classe rough classe tough',
      'difficulté groupe difficulte groupe difficultés groupe difficultes groupe problème groupe probleme groupe problématique groupe problematique',
      'gestion groupe gestion de groupe gestion classe gestion de classe comportement groupe comportements groupe élèves difficiles eleves difficiles',
      'groupe ingérable groupe ingerable groupe ingérable groupe ingerable classe ingérable classe ingerable bordel classe chaos classe ça va mal ca va mal groupe marche pas groupe ne marche pas',
      'climat classe climat groupe dynamique groupe dynamique classe aide enseignant aide prof observation classe sociogramme interventions groupe'
    ].join(' '),
    'commotion-cerebrale': [
      'commotion commotions commotion cérébrale commotion cerebrale concussion',
      'coup tête coup tete choc tête choc tete cogné tête cogne tete frappé tête frappe tete mal tête mal tete étourdi etourdi étourdissement etourdissement nausée nausee',
      'blessure tête blessure tete blessure cerveau accident tête accident tete protocole commotion santé élève sante eleve retour progressif repos médical medical'
    ].join(' '),
    'etude-surveillee': [
      'étude surveillée etude surveillee étude surveille etude surveille',
      'reprise examen reprise examens reprise évaluation reprise evaluation examen manqué examen manque évaluation manquée evaluation manquee',
      'faire reprendre examen faire reprise où envoyer élève ou envoyer eleve local reprise convocation reprise examen étude examen etude examen'
    ].join(' '),
    'sortie-educative': [
      'sortie sortie scolaire sortie éducative sortie educative activité spéciale activite speciale activité éducative activite educative',
      'organiser sortie planifier sortie permission parent autorisation parentale formulaire sortie autobus transport accompagnateur voyage visite excursion activité hors école activite hors ecole'
    ].join(' '),
    'dates-importantes-2026-2027': [
      'dates importantes date importantes calendrier dates école ecole calendrier annuel année scolaire annee scolaire',
      'fin étape fin etape bulletin remise notes remise résultats resultats parents rencontre parents journées pédagogiques journees pedagogiques pedago'
    ].join(' '),
    'plandetravail': [
      'absence prolongée absence prolongee longue absence élève absent longtemps eleve absent longtemps plan travail absence travaux absence devoirs absence',
      'sport étude sport etude SAE SAÉ compétition competition voyage discipline plan de travail plus de trois jours plus de 3 jours'
    ].join(' ')
  };

  const FUTURE_ICONS = {
    'sos-groupe': [ICONS.aide, 'Icône de soutien à un groupe ou à un élève'],
    'commotion-cerebrale': [ICONS.commotion, 'Icône de commotion cérébrale'],
    'etude-surveillee': [ICONS.etude, 'Icône d’étude surveillée et de reprise d’évaluation'],
    'sortie-educative': [ICONS.sortie, 'Icône de sortie ou activité éducative'],
    'dates-importantes-2026-2027': [ICONS.dates, 'Icône de calendrier des dates importantes']
  };

  const updateFutureCards = () => {
    let missing = 0;
    Object.entries(FUTURE_KEYWORDS).forEach(([id, keywords]) => {
      const node = root.querySelector(`#${CSS.escape(id)}`);
      if (!node) { missing += 1; return; }
      if (node.dataset.findabilityEnhanced !== 'true') {
        addKeywords(node, keywords);
        node.dataset.findabilityEnhanced = 'true';
      }
    });
    Object.entries(FUTURE_ICONS).forEach(([id, [src, alt]]) => {
      const node = root.querySelector(`#${CSS.escape(id)}`);
      if (!node) return;
      setCardImage(node, src, alt);
    });
    return missing === 0;
  };

  updateFutureCards();
  const sourceObserver = new MutationObserver(() => {
    if (updateFutureCards()) sourceObserver.disconnect();
  });
  sourceObserver.observe(root, { childList: true, subtree: true });
  window.setTimeout(() => sourceObserver.disconnect(), 8000);

  const desiredCategories = {
    'scolago-absence-personnel': 'formulaires',
    'rapport-temps-travail': 'formulaires',
    'evaluation-bulletin-planification': 'organisation-scolaire',
    'code-vie-regles': 'classe',
    'aide-eleve-services-appui': 'suivi',
    'mise-a-jour-recuperation': 'organisation',
    'etude-surveillee': 'organisation',
    'sos-groupe': 'classe',
    'commotion-cerebrale': 'suivi',
    'sortie-educative': 'organisation'
  };

  const applyRenderedTweaks = () => {
    const nav = document.querySelector('.section-nav-inner');
    const organisation = document.getElementById('section-organisation');
    const heading = organisation?.querySelector('.category-heading h2');
    const description = organisation?.querySelector('.category-heading p');
    const navLink = nav?.querySelector('a[href="#section-organisation"]');
    const forms = document.querySelector('#section-formulaires .procedure-list');
    const schoolOrg = document.querySelector('#section-organisation-scolaire .procedure-list');
    const classList = document.querySelector('#section-classe .procedure-list');
    const followList = document.querySelector('#section-suivi .procedure-list');
    const logistics = document.querySelector('#section-organisation .procedure-list');

    if (!organisation || !heading || !navLink || !forms || !schoolOrg || !classList || !followList || !logistics) return false;

    heading.innerHTML = '<span aria-hidden="true">🗂️</span>Réservations et logistique';
    if (description) description.textContent = 'Réservations, locaux, reprises, examens et matériel.';
    navLink.innerHTML = '<span aria-hidden="true">🗂️</span>Réservations et logistique';

    const targets = { formulaires: forms, 'organisation-scolaire': schoolOrg, classe: classList, suivi: followList, organisation: logistics };
    let allPresent = true;
    Object.entries(desiredCategories).forEach(([id, category]) => {
      const procedure = document.getElementById(id);
      if (!procedure) { allPresent = false; return; }
      const target = targets[category];
      if (target && procedure.parentElement !== target) target.appendChild(procedure);
    });
    return allPresent;
  };

  let tweakTimer = null;
  const scheduleTweaks = () => {
    if (tweakTimer) return;
    tweakTimer = window.setTimeout(() => {
      tweakTimer = null;
      if (applyRenderedTweaks()) renderObserver.disconnect();
    }, 80);
  };

  const renderObserver = new MutationObserver(scheduleTweaks);
  renderObserver.observe(app, { childList: true, subtree: true });
  scheduleTweaks();
  window.setTimeout(() => {
    applyRenderedTweaks();
    renderObserver.disconnect();
  }, 6000);
})();
