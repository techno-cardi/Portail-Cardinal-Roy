/* Variante compacte du haut de page. La mise en page précédente est conservée
   dans la branche backup-layout-before-compact-home-2026-09-07. */
(() => {
  if (document.querySelector('link[data-home-compact]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'home-compact.css?v=20260907-0900';
  link.dataset.homeCompact = 'true';
  link.dataset.homeCompactVersion = '20260907-0900';
  document.head.appendChild(link);
})();

(() => {
  const root = document.getElementById('legacy-source');
  if (!root) return;

  const URLS = {
    login: 'https://scolago.com/fr-CA/Account/Login',
    sso: 'https://support.scolago.com/fr/support/solutions/articles/151000200140-tous-comment-fonctionne-la-connexion-s%C3%A9curis%C3%A9e-sso-',
    guide: 'https://drive.google.com/file/d/1YrR-0R-9Y6L22aKgriBD7U95E4MdC7r1/view?usp=drivesdk'
  };

  const keywords = [
    'Scolago scola go connexion se connecter login compte accès acces authentification SSO connexion sécurisée connexion securisee Google Microsoft',
    'guide utilisateur guide d utilisateur guide employé guide employe guide employés guide employes',
    'absence absences suppléance suppleance suppléant suppleant remplacement remplaçant remplacant disponibilité disponibilite'
  ].join(' ');

  const bodyHtml = `
    <p><strong>Scolago</strong> : connexion et guide d’utilisation pour les employés.</p>
    <div class="links">
      <a class="btn primary" href="${URLS.login}" target="_blank" rel="noopener noreferrer">Se connecter à Scolago</a>
      <a class="btn" href="${URLS.sso}" target="_blank" rel="noopener noreferrer">Comment se connecter — SSO</a>
      <a class="btn" href="${URLS.guide}" target="_blank" rel="noopener noreferrer">Guide d’utilisateur — employés</a>
    </div>`;

  const scolago = root.querySelector('#scolago');
  if (scolago) {
    scolago.dataset.title = 'Scolago';
    scolago.dataset.keywords = keywords;
    const heading = scolago.querySelector('h2,h3');
    const subtitle = scolago.querySelector('.card-sub');
    const body = scolago.querySelector('.card-body');
    if (heading) heading.textContent = 'Scolago';
    if (subtitle) subtitle.textContent = 'Connexion et guide d’utilisateur';
    if (body) body.innerHTML = bodyHtml;
  }

  const applications = root.querySelector('#applications-cssc');
  if (applications) {
    const box = [...applications.querySelectorAll('.resource-box')].find(node =>
      (node.querySelector('h4')?.textContent || '').trim().toLowerCase() === 'scolago'
    );
    if (box) {
      const copy = box.querySelector('.resource-copy');
      const paragraph = copy?.querySelector('p');
      let actions = copy?.querySelector('.resource-actions');
      if (paragraph) paragraph.textContent = 'Accéder à Scolago et consulter les renseignements de connexion et le guide d’utilisateur.';
      if (!actions && copy) {
        actions = document.createElement('div');
        actions.className = 'resource-actions';
        copy.appendChild(actions);
      }
      if (actions) {
        actions.innerHTML = `
          <a class="btn primary" href="${URLS.login}" target="_blank" rel="noopener noreferrer">Se connecter</a>
          <a class="btn" href="${URLS.sso}" target="_blank" rel="noopener noreferrer">Comment se connecter</a>
          <a class="btn" href="${URLS.guide}" target="_blank" rel="noopener noreferrer">Guide d’utilisateur</a>`;
      }
    }
    applications.dataset.keywords = `${applications.dataset.keywords || ''} ${keywords}`.replace(/\s+/g, ' ').trim();
  }

  // Ne jamais réintroduire dans le portail les procédures Scolago propres à l'école.
  root.querySelector('#scolago-absence-personnel')?.remove();
})();

/* Le formulaire officiel AppSP est la source à utiliser pour une sortie éducative ou une activité spéciale. */
(() => {
  const root = document.getElementById('legacy-source');
  const card = root?.querySelector('#sortie-educative');
  if (!card) return;
  const primary = card.querySelector('.links a.btn.primary');
  if (primary) {
    primary.href = 'https://appsp.ca/formulaire/envoi.php?id=5';
    primary.textContent = 'Formulaire — sortie éducative ou activité spéciale';
  }
})();

/*
 * Icônes originales générées et approuvées pour le portail.
 * On les branche sur les fiches AVANT ui-polish afin que le moteur de rendu
 * les traite exactement comme les autres logos/images du portail.
 */
(() => {
  const root = document.getElementById('legacy-source');
  if (!root) return;

  const icons = {
    'dates-importantes-2026-2027': ['assets/portal/dates.png', 'Calendrier des dates importantes'],
    'etude-surveillee': ['assets/portal/etude-surveillee.png', 'Étude surveillée et reprise d’évaluation'],
    'sos-groupe': ['assets/portal/aide-eleve.png', 'Soutien à un élève ou à un groupe'],
    'aide-eleve-services-appui': ['assets/portal/aide-eleve.png', 'Aide et services d’appui pour un élève'],
    'commotion-cerebrale': ['assets/portal/commotion.png', 'Commotion cérébrale'],
    'sortie-educative': ['assets/portal/sortie.png', 'Sortie ou activité éducative'],
    'evaluation-bulletin-planification': ['assets/portal/evaluation.png', 'Évaluation, bulletin et planification'],
    'code-vie-regles': ['assets/portal/regles.png', 'Règles et code de vie']
  };

  const setIcon = (id, src, alt) => {
    const card = root.querySelector(`#${CSS.escape(id)}`);
    const head = card?.querySelector('.card-head');
    if (!card || !head) return;

    head.querySelectorAll(':scope > .card-icon, :scope > img.portal-generated-icon').forEach(node => node.remove());
    const image = document.createElement('img');
    image.className = 'app-logo portal-generated-icon';
    image.src = src;
    image.alt = alt;
    image.width = 192;
    image.height = 192;
    image.decoding = 'async';
    head.prepend(image);
    card.dataset.icon = '';
  };

  Object.entries(icons).forEach(([id, [src, alt]]) => setIcon(id, src, alt));

  const addKeywords = (id, extra) => {
    const card = root.querySelector(`#${CSS.escape(id)}`);
    if (!card) return;
    card.dataset.keywords = `${card.dataset.keywords || ''} ${extra}`.replace(/\s+/g, ' ').trim();
  };

  addKeywords('sos-groupe', [
    'sos s.o.s s o s sos groupe sosgroup',
    'difficulté difficulte difficultés difficultes difficulté groupe difficulte groupe difficultés groupe difficultes groupe',
    'difficile difficil diffile dificile dificulte groupe difficil groupe diffile classe difficil classe diffile',
    'groupe difficile classe difficile groupe dur classe dure groupe rough classe rough groupe tough classe tough',
    'groupe ingérable groupe ingerable classe ingérable classe ingerable gestion classe gestion groupe problème probleme problèmes problemes groupe',
    'ça va mal dans mon groupe ca va mal dans mon groupe mon groupe marche pas mon groupe ne marche pas besoin aide groupe aide avec classe'
  ].join(' '));

  addKeywords('rapport-temps-travail', [
    'suppléance suppleance suppléant suppleant suppléante suppleante remplacer remplacement remplacements remplaçant remplacant remplaçante remplacante',
    'remplacement prof remplacement professeur remplacement enseignant période remplacée periode remplacee périodes remplacées periodes remplacees cours remplacé cours remplace',
    'rapport temps rapport de temps feuille temps feuille de temps heures travaillées heures travaillees heures remplacement heures suppléance heures suppleance',
    'déclarer heures declarer heures inscrire heures paie payé paye paiement rémunération remuneration salaire temps supplémentaire temps supplementaire'
  ].join(' '));
})();

/*
 * Charge les compléments de recherche et le positionnement final du haut de page
 * seulement lorsque le moteur de recherche final est prêt.
 */
(() => {
  let attempts = 0;
  const attach = () => {
    const ready = window.PORTAL_SEARCH_ENGINE === '2.0' && document.getElementById('guide-search');
    if (ready) {
      if (!document.querySelector('script[data-home-compact-layout]')) {
        const layoutScript = document.createElement('script');
        layoutScript.src = 'home-compact.js?v=20260907-0900';
        layoutScript.dataset.homeCompactLayout = 'true';
        document.body.appendChild(layoutScript);
      }
      if (!document.querySelector('script[data-search-easter-egg]')) {
        const script = document.createElement('script');
        script.src = 'search-easter-egg.js';
        script.dataset.searchEasterEgg = 'true';
        document.body.appendChild(script);
      }
      if (!document.querySelector('script[data-search-easter-eggs-extra]')) {
        const extraScript = document.createElement('script');
        extraScript.src = 'search-easter-eggs-extra.js';
        extraScript.dataset.searchEasterEggsExtra = 'true';
        document.body.appendChild(extraScript);
      }
      if (!document.querySelector('script[data-search-resource-suggestion]')) {
        const suggestionScript = document.createElement('script');
        suggestionScript.src = 'search-resource-suggestion.js';
        suggestionScript.dataset.searchResourceSuggestion = 'true';
        document.body.appendChild(suggestionScript);
      }
      return;
    }
    attempts += 1;
    if (attempts < 120) window.setTimeout(attach, 100);
  };
  attach();
})();

/* Pensée du jour : un seul composant, un vrai bouton compact, aucune ancienne barre. */
(() => {
  if (document.querySelector('script[data-daily-thought]')) return;
  const script = document.createElement('script');
  script.src = 'daily-thought.js?v=20260907-0900';
  script.dataset.dailyThought = 'true';
  document.body.appendChild(script);
})();
