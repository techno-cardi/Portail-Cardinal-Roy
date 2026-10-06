(() => {
  const root = document.getElementById('legacy-source');
  if (!root) return;

  const URLS = {
    absencesProlongees: 'https://drive.google.com/file/d/13132IYLhGN-9RtfOtpMGiF9Ygn552CmQ/view?usp=drivesdk',
    misesAJour: 'https://drive.google.com/file/d/1U0w6HqhsmsXLX4DGh5olu3_2SHlONSSB/view?usp=drivesdk',
    etudeSurveillee: 'https://drive.google.com/file/d/1oErx2Xyu3gIDGTmWTc2y1nJaFPl-K7zM/view?usp=drivesdk',
    etudeSurveilleeDepart: 'https://drive.google.com/file/d/12YBznVgyomW8O0Fhtdzeoh7TmSi_O-Im/view',
    sosGroupe: 'https://drive.google.com/file/d/1NZd8m5X1MC3ZBhjDE-X01UbLHyXyd5zJ/view?usp=drivesdk',
    commotion: 'https://drive.google.com/file/d/12XT_0ra4HdMArr3rfLVknSP316nHboT2/view?usp=drivesdk',
    sortieAutorisation: 'https://drive.google.com/file/d/1WensOESymMJx7jDgCt45hqB1qK79TlkT/view?usp=drivesdk',
    sortieVehicule: 'https://drive.google.com/file/d/1rvrnUSk2SSft4HscNEimzuANme94iM6Z/view?usp=drivesdk',
    rolesSae: 'https://drive.google.com/file/d/18GQEIR1dJdNcCzgOr7aAgQdyby2ZpI1l/view?usp=drivesdk',
    conseilsTuteurs: 'https://drive.google.com/file/d/1-7f2YsaL5GlYRUY-SdIVwmxacB5DQbej/view?usp=drivesdk',
    reservation: 'https://appsp.ca/reservation/'
  };

  const addKeywords = (node, keywords) => {
    if (!node) return;
    const current = node.dataset.keywords || '';
    node.dataset.keywords = `${current} ${keywords}`.replace(/\s+/g, ' ').trim();
  };

  const linksOf = node => {
    const body = node?.querySelector('.card-body') || node;
    if (!body) return null;
    let links = body.querySelector('.links');
    if (!links) {
      links = document.createElement('div');
      links.className = 'links';
      body.appendChild(links);
    }
    return links;
  };

  const addCard = ({id, title, subtitle, icon, keywords, body}) => {
    const existing = root.querySelector(`#${CSS.escape(id)}`);
    if (existing) return existing;
    const card = document.createElement('section');
    card.className = 'card searchable';
    card.id = id;
    card.dataset.icon = icon;
    card.dataset.title = title;
    card.dataset.keywords = keywords;
    card.innerHTML = `
      <div class="card-head">
        <div class="card-icon" aria-hidden="true">${icon}</div>
        <div>
          <h3>${title}</h3>
          <div class="card-sub">${subtitle}</div>
        </div>
      </div>
      <div class="card-body">${body}</div>`;
    root.appendChild(card);
    return card;
  };

  // --- Bonification : Plan de travail — absence prolongée SAÉ ---
  const plan = root.querySelector('#plandetravail');
  if (plan) {
    addKeywords(plan, [
      'absence prolongée absences prolongées absence prolongee absences prolongees absence longue longue absence plus de 3 jours trois jours élève absent eleve absent',
      'compétition competition tournoi voyage camp camp entraînement camp entrainement discipline sport sports art arts SAÉ SAE sport-arts-études sport arts études',
      'plan de travail travail à faire travail a faire travaux devoirs apprentissages essentiels notions essentielles Classroom ressources',
      'évaluation à distance evaluation a distance examen à distance examen a distance évaluation manquée evaluation manquee examen manqué examen manque',
      'reprise reprises reprise examen retour élève retour eleve retour en classe mise à jour mise a jour récupération recuperation récup recup',
      '48 h 48 heures AppSP coordination pédagogique coordination pedagogique avant absence pendant absence après absence apres absence'
    ].join(' '));

    const body = plan.querySelector('.card-body') || plan;
    if (!body.querySelector('.absence-prolongee-resource')) {
      const box = document.createElement('div');
      box.className = 'callout good absence-prolongee-resource';
      box.innerHTML = `
        <strong>Aide-mémoire pour les enseignants</strong>
        <p>Quoi prévoir avant, pendant et après une absence prolongée : apprentissages essentiels, travaux, évaluations, mises à jour et reprises au retour.</p>
        <a class="btn" href="${URLS.absencesProlongees}" target="_blank" rel="noopener noreferrer">Aide-mémoire — Absences prolongées SAÉ</a>`;
      const links = body.querySelector('.links');
      if (links) body.insertBefore(box, links); else body.appendChild(box);
    }
  }

  // --- Nouvelle fiche : Mise à jour ou récupération? ---
  addCard({
    id: 'mise-a-jour-recuperation',
    title: 'Mise à jour ou récupération?',
    subtitle: 'Choisir le bon service lorsqu’un élève doit reprendre ou consolider un apprentissage',
    icon: '🔄',
    keywords: [
      'mise à jour mises à jour mise a jour mises a jour update récupération recuperation récup recup',
      'différence mise à jour récupération difference mise a jour recuperation quoi choisir quel service lequel choisir',
      'apprentissage manqué apprentissage manque apprentissages manqués apprentissages manques notion manquée notion manquee notion pas vue cours manqué cours manque matière manquée matiere manquee',
      'élève absent eleve absent absence discipline absence SAÉ absence SAE compétition competition sport art discipline reconnue absence reconnue absence justifiée absence justifiee',
      'récupération matière recuperation matiere difficulté difficulte consolider consolidation reprendre notion reprendre apprentissage soutien pédagogique soutien pedagogique',
      'convocation convoquer élève convoquer eleve AppSP Réservation Reservation 48 h 48 heures délai 48 heures delai 48 heures',
      'voyage familial activité personnelle activite personnelle admissible non admissible absence non admissible absence admissible'
    ].join(' '),
    body: `
      <p>Repères pour choisir entre une <strong>mise à jour</strong> et une <strong>récupération</strong> selon la situation de l’élève, vérifier son admissibilité et respecter les modalités de convocation dans AppSP.</p>
      <div class="callout good"><strong>La différence :</strong> une <strong>mise à jour</strong> permet à un élève de reprendre un apprentissage manqué en raison d’une absence reconnue. Une <strong>récupération</strong> sert plutôt à consolider un apprentissage déjà enseigné.</div>
      <p>Consultez l’aide-mémoire pour choisir le bon service, vérifier les situations admissibles et connaître les règles de convocation.</p>
      <div class="links">
        <a class="btn primary" href="${URLS.misesAJour}" target="_blank" rel="noopener noreferrer">Ouvrir l’aide-mémoire</a>
        <a class="btn" href="${URLS.reservation}" target="_blank" rel="noopener noreferrer">Connexion à Réservation</a>
      </div>`
  });

  // --- Nouvelle fiche : Étude surveillée ---
  addCard({
    id: 'etude-surveillee',
    title: 'Étude surveillée',
    subtitle: 'Reprises d’évaluation, accueil temporaire et périodes sur convocation',
    icon: '📚',
    keywords: [
      'étude surveillée etude surveillee étude etude local étude local etude service étude service etude',
      'reprise reprise examen reprise d’examen reprise examen reprise évaluation reprise evaluation examen manqué examen manque évaluation manquée evaluation manquee faire un examen faire une reprise',
      'élève blessé eleve blesse blessure retrait discipline discipline sportive discipline artistique accueil temporaire',
      'récupération terminée recuperation terminee mise à jour terminée mise a jour terminee période restante periode restante',
      'convocation convoquer sur convocation AppSP Réservation Reservation 48 h 48 heures règle 48 heures regle 48 heures',
      'départ étude depart etude parent vient chercher élève quitte seul eleve quitte seul autorisation parentale',
      'liste élèves départ liste eleves depart liste des élèves qui n ont pas l autorisation de quitter élèves doivent rester eleves doivent rester élèves doivent demeurer eleves doivent demeurer refus de départ refus de depart interdiction de départ interdiction de depart',
      'autorisation de quitter autorisation départ autorisation depart non autorisé à quitter non autorise a quitter pas autorisé à quitter pas autorise a quitter départ après récupération depart apres recuperation départ après mise à jour depart apres mise a jour départ après reprise depart apres reprise',
      'SAÉ AM SAE AM SAÉ PM SAE PM 10 h 45 10h45 15 h 30 15h30 étude am etude am étude pm etude pm sport-arts-études sport études sport-etudes arts études arts-etudes'
    ].join(' '),
    body: `
      <p>Repères pour savoir quand utiliser l’étude surveillée, quels élèves peuvent y être convoqués et quelles modalités respecter pour une reprise d’évaluation ou un accueil temporaire.</p>
      <p>L’étude surveillée est un service accessible <strong>sur convocation</strong>. Elle peut notamment servir à faire reprendre une évaluation ou à accueillir temporairement un élève dans certaines situations particulières.</p>
      <div class="callout"><strong>À consulter :</strong> l’aide-mémoire précise les situations admissibles, la règle des 48 heures et les modalités de départ.</div>
      <div class="links">
        <a class="btn primary" href="${URLS.etudeSurveillee}" target="_blank" rel="noopener noreferrer">Ouvrir l’aide-mémoire</a>
        <a class="btn" href="${URLS.etudeSurveilleeDepart}" target="_blank" rel="noopener noreferrer">Consulter la liste des élèves qui n'ont pas l'autorisation de quitter</a>
        <a class="btn" href="${URLS.reservation}" target="_blank" rel="noopener noreferrer">Connexion à Réservation</a>
      </div>`
  });

  // --- Nouvelle fiche : S.O.S. Groupe ---
  addCard({
    id: 'sos-groupe',
    title: 'S.O.S. Groupe — soutien à un groupe difficile',
    subtitle: 'Soutien au comportement, à la dynamique du groupe et au climat de classe',
    icon: '👥',
    keywords: [
      'SOS Groupe S.O.S. Groupe SOS sos groupe aide groupe soutien groupe',
      'groupe difficile classe difficile groupe problématique groupe problematique classe problématique classe problematique',
      'gestion groupe gestion de groupe gestion classe gestion de classe climat climat de classe climat groupe mauvais climat climat difficile',
      'dynamique de groupe dynamique difficile problèmes groupe problemes groupe comportement groupe comportements difficiles élèves difficiles eleves difficiles plusieurs élèves plusieurs eleves',
      'interventions inefficaces interventions déjà faites interventions deja faites plusieurs interventions quoi faire aide enseignant aide enseignante soutien enseignant soutien enseignante accompagnement',
      'observation classe observation groupe sociogramme interrelations relations élèves relations eleves équipe equipe équipe-école equipe ecole',
      'entraide professionnelle intervention concertée intervention concertee prévention prevention améliorer climat ameliorer climat apprentissage apprentissages groupe dysfonctionnel'
    ].join(' '),
    body: `
      <p>Service d’accompagnement pour les enseignants lorsqu’un groupe demeure difficile à gérer malgré les interventions déjà mises en place.</p>
      <p>Lorsque plusieurs interventions ont déjà été réalisées, mais que la dynamique du groupe continue de nuire au climat de classe et aux apprentissages, <strong>S.O.S. Groupe</strong> peut soutenir l’équipe.</p>
      <div class="callout good"><strong>Le service peut notamment :</strong> aider à observer la dynamique du groupe, mieux comprendre les relations entre les élèves et déterminer des interventions concertées.</div>
      <div class="links"><a class="btn primary" href="${URLS.sosGroupe}" target="_blank" rel="noopener noreferrer">Voir l’offre de services S.O.S. Groupe</a></div>`
  });

  // --- Nouvelle fiche : Commotion cérébrale ---
  addCard({
    id: 'commotion-cerebrale',
    title: 'Commotion cérébrale — quoi faire?',
    subtitle: 'Suivi d’un élève après un choc à la tête ou une commotion soupçonnée',
    icon: '🧠',
    keywords: [
      'commotion commotion cérébrale commotion cerebrale commotions concussion choc tête choc tete coup tête coup tete tête tete traumatisme',
      'blessure tête blessure tete élève blessé eleve blesse sport SAÉ SAE sport-arts-études sport arts études',
      'billet médical billet medical médecin medecin diagnostic suspicion commotion soupçon commotion soupcon commotion protocole commotion protocole santé protocole sante',
      'repos relatif 48 heures repos retour progressif retour en classe retour école retour ecole retour aux activités retour aux activites',
      'reprise examens évaluation evaluation évaluations evaluations adaptation adaptations mesures adaptation mesures adaptatives parent parents',
      'discipline sportive discipline artistique responsable commotion Pascale Pelletier coup au crâne coup au crane mal de tête mal de tete symptômes symptomes'
    ].join(' '),
    body: `
      <p>Procédure à suivre lorsqu’un élève subit ou pourrait avoir subi une commotion cérébrale, de la déclaration de la situation jusqu’au retour progressif aux activités scolaires.</p>
      <p>Lorsqu’une commotion cérébrale est soupçonnée ou confirmée, certaines étapes doivent être respectées afin d’assurer un retour sécuritaire de l’élève à l’école.</p>
      <div class="callout"><strong>Le protocole précise notamment :</strong> les démarches médicales, les documents requis et les modalités du retour progressif aux activités scolaires.</div>
      <div class="links"><a class="btn primary" href="${URLS.commotion}" target="_blank" rel="noopener noreferrer">Ouvrir le protocole de commotions cérébrales</a></div>`
  });

  // --- Nouvelle fiche : Sortie éducative / activité spéciale ---
  addCard({
    id: 'sortie-educative',
    title: 'Organiser une sortie éducative ou une activité spéciale',
    subtitle: 'Formulaires et autorisations à prévoir avant une activité avec des élèves',
    icon: '🚌',
    keywords: [
      'sortie sortie scolaire sortie éducative sortie educative sortie pédagogique sortie pedagogique organiser sortie',
      'activité spéciale activite speciale activité scolaire activite scolaire organiser activité organiser activite excursion visite musée musee théâtre theatre voyage scolaire',
      'événement evenement activité extérieure activite exterieure activité parascolaire activite parascolaire',
      'formulaire sortie autorisation sortie demande autorisation autorisation direction formulaire autorisation direction approbation direction',
      'parents autorisation parentale consentement parent permission parent autorisation parents',
      'transport véhicule vehicule automobile voiture transport élève transport eleve conduire élève conduire eleve élève en véhicule eleve en vehicule sortie en véhicule sortie en vehicule',
      'accompagnateur accompagnateurs chauffeur déplacement deplacement activité avec élèves activite avec eleves'
    ].join(' '),
    body: `
      <p>Formulaires à utiliser pour faire autoriser une sortie ou une activité spéciale et, au besoin, encadrer le transport d’un élève en véhicule.</p>
      <p>Vous organisez une sortie éducative ou une activité spéciale avec des élèves? Retrouvez ici les formulaires à remplir selon la situation.</p>
      <div class="links">
        <a class="btn primary" href="${URLS.sortieAutorisation}" target="_blank" rel="noopener noreferrer">Demande d’autorisation — sortie éducative ou activité spéciale</a>
        <a class="btn" href="${URLS.sortieVehicule}" target="_blank" rel="noopener noreferrer">Autorisation parentale — transport d’un élève en véhicule</a>
      </div>`
  });

  // --- Bonification : Système d’encadrement SAÉ ---
  const encadrement = root.querySelector('#encadrement-sae');
  if (encadrement) {
    addKeywords(encadrement, [
      'qui contacter qui appeler qui voir personne ressource personnes ressources contact SAÉ contact SAE responsable SAÉ responsable SAE',
      'coordonnateur SAÉ coordonnateur SAE coordonnatrice pédagogique coordonnatrice pedagogique Francesco Pepe Esposito Sarah Robinson-Arsenault Pascale Pelletier',
      'discipline problème discipline probleme discipline sport art entraîneur entraineur mandataire partenaire absentéisme absenteisme retards',
      'calendrier compétition calendrier competition compétition competition logistique réussite scolaire reussite scolaire élève à risque eleve a risque retard scolaire',
      'reprises reprises évaluations reprises evaluations étude surveillée etude surveillee absence prolongée absence prolongee commotion commotion cérébrale commotion cerebrale',
      'retour progressif soutien enseignant soutien tuteur personne à contacter personne a contacter aide SAÉ aide SAE'
    ].join(' '));

    const body = encadrement.querySelector('.card-body') || encadrement;
    if (!body.querySelector('.sae-contacts-resource')) {
      const box = document.createElement('div');
      box.className = 'callout good sae-contacts-resource';
      box.innerHTML = `
        <strong>Qui contacter au SAÉ?</strong>
        <p>Consultez les rôles des personnes-ressources pour déterminer rapidement qui peut vous aider selon la situation : discipline sportive ou artistique, absence prolongée, réussite scolaire, reprise d’évaluation, commotion cérébrale ou autre besoin lié au SAÉ.</p>
        <a class="btn" href="${URLS.rolesSae}" target="_blank" rel="noopener noreferrer">Voir les rôles et personnes-ressources du SAÉ</a>`;
      body.appendChild(box);
    }
  }

  // --- Bonification : Tour de table / Tutorat ---
  const tourtable = root.querySelector('#tourtable');
  if (tourtable) {
    addKeywords(tourtable, [
      'tuteur tuteurs tutorat conseil tuteur conseils tuteur rôle tuteur role tuteur aide tuteur ressource tuteur suivi groupe suivi élève suivi eleve',
      'professionnel référence professionnel reference professionnel services complémentaires services complementaires TES confidence confidences élève se confie eleve se confie détresse detresse écoute ecoute empathie',
      'stratégie étude strategie etude stratégies étude strategies etude stratégies d’étude strategies d etude méthodes étude methodes etude apprendre étudier etudier',
      'organisation élève organisation eleve matériel oublié materiel oublie devoir non remis devoirs retard travail ponctualité ponctualite assiduité assiduite engagement scolaire motivation',
      'récupération recuperation climat classe relation enseignant élève relation enseignant eleve confiance élève confiance eleve rétroaction positive retroaction positive renforcement positif',
      'collaboration enseignants collaboration intervenants parents communication parents confidentialité confidentialite conseils intervention pistes intervention'
    ].join(' '));

    const body = tourtable.querySelector('.card-body') || tourtable;
    if (!body.querySelector('.conseils-tuteurs-resource')) {
      const box = document.createElement('div');
      box.className = 'callout good conseils-tuteurs-resource';
      box.innerHTML = `
        <strong>Ressource pour les tuteurs</strong>
        <p>Des pistes d’intervention pour mieux accompagner les élèves, soutenir leur organisation et leur engagement, gérer certaines situations fréquentes et collaborer efficacement avec les autres intervenants.</p>
        <a class="btn" href="${URLS.conseilsTuteurs}" target="_blank" rel="noopener noreferrer">💡 Consulter les conseils aux tuteurs</a>`;
      const links = body.querySelector('.links');
      if (links) body.insertBefore(box, links); else body.appendChild(box);
    }
  }

  // ui-polish classe automatiquement les nouvelles fiches à partir de leur texte.
  // On impose ensuite leur emplacement exact pour éviter les ambiguïtés de vocabulaire,
  // notamment « sortie éducative » vs « sortie de classe ».
  const desiredCategories = {
    'mise-a-jour-recuperation': 'section-organisation',
    'etude-surveillee': 'section-organisation',
    'sos-groupe': 'section-classe',
    'commotion-cerebrale': 'section-suivi',
    'sortie-educative': 'section-organisation'
  };

  const placeRenderedCards = () => {
    let ready = true;
    Object.entries(desiredCategories).forEach(([id, sectionId]) => {
      const procedure = document.getElementById(id);
      const list = document.querySelector(`#${CSS.escape(sectionId)} .procedure-list`);
      if (!procedure || !list) {
        ready = false;
        return;
      }
      if (procedure.parentElement !== list) list.appendChild(procedure);
    });
    return ready;
  };

  if (!placeRenderedCards()) {
    const observer = new MutationObserver(() => {
      if (placeRenderedCards()) observer.disconnect();
    });
    observer.observe(document.getElementById('app') || document.body, {childList: true, subtree: true});
    setTimeout(() => observer.disconnect(), 12000);
  }
})();
