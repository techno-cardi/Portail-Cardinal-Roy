(() => {
  const root = document.getElementById('legacy-source');
  if (!root || root.querySelector('#dates-importantes-2026-2027')) return;

  const PDF_URL = 'https://drive.google.com/file/d/1bfyqip0TJWvj58fUznfQzTx4Oc21i3PN/view?usp=drivesdk';
  const GOOGLE_CALENDAR_URL = 'https://calendar.google.com/calendar/u/0?cid=Y184NTI3ZTI0YjZmOWRjOWYwMjg0MzlmY2Y1YzJhMzY1NzQ3NTY5OGM5ZTQxNTFhYzkzY2QyZDkyMDViMzIyYmFhQGdyb3VwLmNhbGVuZGFyLmdvb2dsZS5jb20';
  const OUTLOOK_ICAL_URL = 'https://calendar.google.com/calendar/ical/c_8527e24b6f9dc9f028439fcf5c2a3657475698c9e4151ac93cd2d9205b322baa%40group.calendar.google.com/public/basic.ics';

  const card = document.createElement('section');
  card.className = 'card searchable';
  card.id = 'dates-importantes-2026-2027';
  card.dataset.icon = '📅';
  card.dataset.title = 'Calendrier des dates importantes 2026-2027';
  card.dataset.keywords = [
    'calendrier dates importantes date importante dates école ecole cardinal roy 2026 2027 année scolaire annee scolaire organisation scolaire',
    'fin étape fin etape fins étapes fins etapes étape 1 etape 1 étape 2 etape 2 étape 3 etape 3 6 novembre 2026 5 février 2027 23 juin 2027',
    'bulletin bulletins résultats resultats remise résultats remise resultats consignation Mozaïk Mozaik SSO autre compétence autre competence première communication premiere communication',
    'rencontre parents rencontre parents enseignants assemblée générale parents assemblee generale parents',
    'session évaluation session evaluation session examens examens gels horaire épreuves uniques ministérielles epreuves uniques ministerielles',
    'portes ouvertes SAÉ SAE découvertes decouvertes soirée information soiree information fête rentrée fete rentree Halloween Noël Noel St-Valentin Saint-Valentin Pâques Paques',
    'gala méritas gala meritas gala sportif collation grades bal finissants photo finissant reprise photo semaine multiculturelle',
    'agenda calendrier partagé calendrier partage ajouter calendrier Google Agenda Google Calendar Outlook Microsoft 365 abonnement calendrier synchronisation iCal ics copier lien presse papier'
  ].join(' ');

  card.innerHTML = `
    <div class="card-head">
      <div class="card-icon" aria-hidden="true">📅</div>
      <div>
        <h3>Calendrier des dates importantes 2026-2027</h3>
        <div class="card-sub">Fins d’étapes, remises de résultats, rencontres de parents et principales activités de l’école</div>
      </div>
    </div>
    <div class="card-body">
      <p>Ce calendrier regroupe les principales échéances de l’année : <strong>fins d’étapes</strong>, consignation des résultats dans <strong>Mozaïk</strong>, rencontres de parents, portes ouvertes, sessions d’évaluation et activités de l’école.</p>

      <div class="links">
        <a class="btn primary" href="${PDF_URL}" target="_blank" rel="noopener noreferrer">Consulter le calendrier des dates importantes (PDF)</a>
        <a class="btn" href="${GOOGLE_CALENDAR_URL}" target="_blank" rel="noopener noreferrer">Ajouter à Google Agenda</a>
      </div>

      <div class="callout good">
        <strong>Ajouter le calendrier partagé à Google Agenda</strong>
        <ol>
          <li>Cliquez sur <strong>Ajouter à Google Agenda</strong> ci-dessus.</li>
          <li>Connectez-vous avec votre compte Google scolaire si nécessaire.</li>
          <li>Confirmez l’ajout du calendrier <strong>Cardinal-Roy — Dates importantes 2026-2027</strong>. Il apparaîtra ensuite dans vos autres agendas et les changements s’y mettront à jour automatiquement.</li>
        </ol>
      </div>

      <div class="callout outlook-calendar-help">
        <strong>Ajouter le calendrier dans Outlook</strong>
        <p>Outlook a besoin du lien d’abonnement iCal du calendrier. Vous n’avez pas à le chercher : copiez-le directement ici.</p>
        <p><button type="button" class="btn primary calendar-copy-link" data-copy-value="${OUTLOOK_ICAL_URL}">📋 Copier le lien pour Outlook</button> <span class="calendar-copy-status" aria-live="polite"></span></p>
        <ol>
          <li>Cliquez sur <strong>Copier le lien pour Outlook</strong> ci-dessus.</li>
          <li>Dans Outlook sur le web, ouvrez <strong>Calendrier</strong>, puis <strong>Ajouter un calendrier</strong>.</li>
          <li>Choisissez <strong>S’abonner à partir du web</strong>.</li>
          <li>Collez le lien avec <strong>Ctrl + V</strong>, donnez un nom au calendrier, puis cliquez sur <strong>Importer</strong> ou <strong>Enregistrer</strong>.</li>
        </ol>
        <p><strong>À privilégier :</strong> l’abonnement à partir du web permet à Outlook de recevoir les changements du calendrier. Évitez d’importer seulement un fichier .ics, car cette méthode crée plutôt une copie ponctuelle.</p>
      </div>
    </div>`;

  root.appendChild(card);

  const copyText = async value => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    textarea.remove();
    return ok;
  };

  const bindCopyButton = procedure => {
    const copyButton = procedure?.querySelector('.calendar-copy-link');
    const copyStatus = procedure?.querySelector('.calendar-copy-status');
    if (!copyButton || copyButton.dataset.copyBound === 'true') return;
    copyButton.dataset.copyBound = 'true';

    copyButton.addEventListener('click', async () => {
      const value = copyButton.dataset.copyValue || '';
      try {
        const copied = await copyText(value);
        if (!copied) throw new Error('copy failed');
        copyButton.textContent = '✓ Lien copié';
        if (copyStatus) copyStatus.textContent = 'Le lien est dans votre presse-papiers.';
        setTimeout(() => {
          copyButton.textContent = '📋 Copier le lien pour Outlook';
          if (copyStatus) copyStatus.textContent = '';
        }, 3500);
      } catch {
        if (copyStatus) copyStatus.textContent = 'Impossible de copier automatiquement. Sélectionnez le lien et copiez-le manuellement.';
      }
    });
  };

  // Cette ressource appartient à « Calendriers et organisation scolaire »,
  // catégorie créée après le rendu principal du portail.
  const placeCard = () => {
    const procedure = document.getElementById('dates-importantes-2026-2027');
    const list = document.querySelector('#section-organisation-scolaire .procedure-list');
    if (!procedure || !list) return false;
    if (procedure.parentElement !== list) list.appendChild(procedure);
    bindCopyButton(procedure);
    return true;
  };

  if (!placeCard()) {
    const observer = new MutationObserver(() => {
      if (placeCard()) observer.disconnect();
    });
    observer.observe(document.getElementById('app') || document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 12000);
  }
})();

/*
 * Vocabulaire de recherche pensé pour la façon dont le personnel formule
 * réellement ses besoins au quotidien. Les mots restent invisibles : ils ne
 * servent qu'au moteur de recherche du portail.
 */
(() => {
  const source = document.getElementById('legacy-source');
  if (!source) return;

  const addSourceKeywords = (id, keywords) => {
    const node = source.querySelector(`#${CSS.escape(id)}`);
    if (!node) return;
    const current = node.dataset.keywords || '';
    node.dataset.keywords = `${current} ${keywords}`.replace(/\s+/g, ' ').trim();
  };

  const teacherVocabulary = {
    c2atom: [
      'bug bugs bogue bogues problème probleme problèmes problemes problème informatique probleme informatique souci informatique pépin informatique pepin informatique',
      'informatique TI soutien informatique support informatique aide informatique assistance informatique billet informatique billet TI ticket informatique ticket soutien dépannage depannage',
      'ça marche pas ca marche pas marche pas ne marche pas fonctionne pas ne fonctionne pas fonctionne plus planté plante plantage erreur erreurs message erreur',
      'ordi ordinateur pc portable laptop poste poste de travail chromebook appareil écran ecran écran noir ecran noir souris clavier caméra camera webcam',
      'wifi wi-fi internet réseau reseau sans fil imprimante imprimantes impression projecteur tbi tableau interactif son audio micro microphone haut-parleur haut parleur',
      'teams microsoft teams office microsoft office word excel powerpoint application applications logiciel logiciels installation mise à jour mise a jour',
      'mon ordi mon ordinateur mon pc mon portable mon chromebook besoin aide besoin informatique je veux billet faire billet ouvrir billet'
    ].join(' '),
    presences: 'prendre présence prendre presence prendre présences prendre presences faire présence faire presence faire les présences faire les presences absence élève absence eleve élève absent eleve absent retard retards retardataire arrivée tardive arrivee tardive Mozaïk Mozaik présence matin presence matin',
    avis: 'comportement comportement élève comportement eleve manquement manquements discipline indiscipline note comportement note au dossier avertissement avertir parent incident incidents soi suivi comportement signaler comportement',
    courriels: 'écrire parent ecrire parent écrire aux parents ecrire aux parents envoyer courriel parent envoyer courriel parents envoyer email parent message parent message aux parents communiquer parent communiquer parents communication parents',
    planclasse: 'placer élèves placer eleves place élèves place eleves places élèves places eleves places assises disposition classe disposition élèves disposition eleves plan sièges plan sieges seating plan changer place élève changer place eleve',
    reservation: 'réserver reserver réservation reservation réserver local reserver local réserver salle reserver salle local libre local disponible gym gymnase laboratoire labo auditorium bibliothèque bibliotheque matériel materiel chariot réserver chariot reserver chariot récupérer local recuperer local convoquer élève convoquer eleve reprise examen récupération recuperation récup recup',
    monhoraire: 'horaire prof horaire professeur horaire enseignant horaire enseignante mon horaire grille horaire grille horaire prof période periode périodes periodes jour cycle journée cycle journee cycle locaux cours',
    drive: 'drive commun dossier commun fichier partagé fichier partage dossier partagé dossier partage document partagé document partage trouver fichier trouver document où est ou est dossier ressources communes documents école documents ecole',
    plandetravail: 'élève absent longtemps eleve absent longtemps longue absence absence longue travaux élève absent travaux eleve absent quoi envoyer élève absent quoi envoyer eleve absent travail maison devoirs absence prolongée absence prolongee',
    rfeef: 'facture factures achat achats remboursement rembourser dépense depense dépenses depenses fournisseur paiement payer commande bon de commande frais compte dépense compte depense',
    'perf-central': 'formation perfectionnement perfectionnements congrès congres colloque atelier inscription formation demande formation remboursement formation activité perfectionnement activite perfectionnement',
    'perf-local': 'formation perfectionnement perfectionnements congrès congres colloque atelier inscription formation demande formation remboursement formation activité perfectionnement activite perfectionnement',
    'mise-a-jour-recuperation': 'élève a manqué matière eleve a manque matiere élève a manqué cours eleve a manque cours rattraper matière rattraper matiere reprendre notion quoi choisir mise jour recup',
    'etude-surveillee': 'faire reprendre examen élève faire reprendre examen eleve reprise examen élève absent examen eleve absent examen local reprise où envoyer élève ou envoyer eleve étude examen etude examen',
    'sos-groupe': 'classe rough groupe rough groupe tough groupe difficile classe difficile mes élèves sont difficiles mes eleves sont difficiles groupe ingérable groupe ingerable classe ingérable classe ingerable quoi faire avec groupe aide gestion classe',
    'commotion-cerebrale': 'coup tête coup tete élève frappé tête eleve frappe tete élève s est cogné tête eleve s est cogne tete mal tête après choc mal tete apres choc commotion quoi faire',
    'sortie-educative': 'organiser sortie faire sortie sortie scolaire activité spéciale activite speciale permission sortie autorisation sortie formulaire sortie activité hors école activite hors ecole voyage scolaire'
  };

  Object.entries(teacherVocabulary).forEach(([id, keywords]) => addSourceKeywords(id, keywords));

  const passwordKeywords = [
    'application mot de passe mot de passe mots de passe mdp password oublié oublie perdu réinitialiser reinitialiser reset changer changement modifier expiration expire expiré bloque bloqué compte verrouillé compte verrouille',
    'double authentification double-authentification double auth authentification double authentification à deux facteurs authentification a deux facteurs deux facteurs 2 facteurs 2fa mfa multifacteur multifactoriel',
    'microsoft authenticator authenticator application authenticator code authenticator notification authenticator approuver connexion approbation connexion',
    'cell cellulaire cellulaire téléphone telephone téléphone intelligent telephone intelligent smartphone iphone android samsung pixel appareil mobile mobile',
    'nouveau téléphone nouveau telephone nouveau cell nouveau cellulaire nouveau smartphone nouveau appareil nouveau mobile changer téléphone changer telephone changé téléphone change telephone changé de téléphone change de telephone',
    'changer cell changé cell change cell changer cellulaire changé cellulaire change cellulaire changé de cell change de cell nouveau numéro nouveau numero numéro téléphone numero telephone',
    'téléphone perdu telephone perdu cell perdu cellulaire perdu téléphone brisé telephone brise cell brisé cell brise ancien téléphone ancien telephone ancien cell',
    'transfert authenticator transférer authenticator transferer authenticator réinstaller authenticator reinstaller authenticator installer authenticator configurer authenticator',
    'code qr qr code code vérification code verification code sécurité code securite pas de code aucun code pas notification aucune notification notification marche pas authenticator marche pas',
    'connexion impossible accès impossible acces impossible plus accès plus acces compte bloqué compte bloque mot de passe expiré mot de passe expire mot passe oublié mot passe oublie'
  ].join(' ');

  const updatePasswordResource = () => {
    const box = document.querySelector('#app-mot-de-passe.subresource-search-target, #app-mot-de-passe');
    if (!box) return false;
    const title = 'Mot de passe / double authentification';
    const heading = box.querySelector('h4');
    if (heading) heading.textContent = title;
    box.dataset.searchLabel = title;
    box.dataset.searchKeywords = `${box.dataset.searchKeywords || ''} ${passwordKeywords}`.replace(/\s+/g, ' ').trim();
    return true;
  };

  if (!updatePasswordResource()) {
    const observer = new MutationObserver(() => {
      if (updatePasswordResource()) observer.disconnect();
    });
    observer.observe(document.getElementById('app') || document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 12000);
  }
})();
