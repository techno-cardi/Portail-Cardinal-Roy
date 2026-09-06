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
