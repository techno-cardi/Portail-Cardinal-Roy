(() => {
  const root = document.getElementById('legacy-source');
  if (!root) return;

  const CHEMINEMENT_URL = 'https://drive.google.com/file/d/12xkFLjmuC7xkwsQRiftnwmHrG0Dmqpkg/view?usp=drive_link';
  const DESCRIPTEURS_URL = 'https://drive.google.com/file/d/1k7fGrtJ6ae_8xIcKvvfyCayo2wvUJW-D/view?usp=drive_link';
  const SAE_ICON_URL = 'assets/vendor/encadrement-sae.png';

  const normalize = value => (value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/[’']/g,' ').replace(/[^a-z0-9 -]/g,' ').replace(/\s+/g,' ').trim();

  const avis = root.querySelector('#avis');
  if (avis) {
    const body = avis.querySelector('.card-body') || avis;

    body.querySelectorAll('a').forEach(link => {
      const text = normalize(link.textContent);
      const href = link.getAttribute('href') || '';
      if (
        text.includes('systeme d encadrement') ||
        text.includes('seuils et actions') ||
        text.includes('progression des interventions') ||
        href.includes('1x3FtPGjXHO98NtOc2zvgWUVCVqPhZFcP')
      ) link.remove();
    });

    body.querySelector('.sae-thresholds')?.remove();
    const thresholds = document.createElement('div');
    thresholds.className = 'sae-thresholds';
    thresholds.innerHTML = `
      <p><strong>Seuils et actions à poser</strong></p>
      <div class="two-col">
        <div class="callout good">
          <strong>Suivi organisationnel SAÉ (cheminement)</strong>
          <p>Cheminement graduel d’un dossier de suivi organisationnel SAÉ, des premières observations jusqu’au suivi et à l’évaluation.</p>
          <a class="btn" href="${CHEMINEMENT_URL}" target="_blank" rel="noopener noreferrer">Ouvrir le cheminement SAÉ</a>
        </div>
        <div class="callout good">
          <strong>Liste des descripteurs avis (Mozaïk SOI)</strong>
          <p>Liste de référence pour choisir le bon descripteur comportemental, organisationnel ou de renforcement positif dans Mozaïk.</p>
          <a class="btn" href="${DESCRIPTEURS_URL}" target="_blank" rel="noopener noreferrer">Ouvrir la liste des descripteurs</a>
        </div>
      </div>`;

    const links = body.querySelector('.links');
    if (links) body.insertBefore(thresholds, links);
    else body.appendChild(thresholds);
  }

  if (!root.querySelector('#encadrement-sae')) {
    const card = document.createElement('section');
    card.className = 'card searchable';
    card.id = 'encadrement-sae';
    card.dataset.icon = '🧭';
    card.dataset.title = 'Système d’encadrement SAÉ';
    card.dataset.keywords = [
      'système encadrement systeme encadrement SAÉ SAE suivi scolaire suivi organisationnel cheminement dossier',
      'préoccupation preoccupation observation observations tuteur intervention interventions tuteur',
      'tuteur ressource SAÉ soutien ciblé soutien cible coordonnatrice pédagogique pedagogique soutien intensif',
      'services complémentaires complementaires intervention spécialisée specialisee suivi évaluation evaluation',
      'prévention prevention collaboration autonomie besoins organisationnels organisation gestion du temps méthodes de travail methodes',
      'avis Mozaïk Mozaik SOI descripteur descripteurs liste descripteurs',
      'renforcement positif comportement comportemental organisation organisationnel',
      'participe classe attention consignes amélioration amelioration climat classe engagement effort autonomie devoir devoirs récupération recuperation',
      'comportement dérangeant derangeant tenue vestimentaire cellulaire manque respect travail demandé demande langage inapproprié inapproprie règles regles conduite',
      'matériel materiel non autorisé autorise devoir non fait devoir incomplet n’a pas son matériel materiel',
      'interventions effectuées effectuees rencontrer élève eleve tutorat parents tuteurs courriel parents appel maison',
      'description factuelle visible parents élèves eleves sortie de classe seuil seuils action actions paliers palier'
    ].join(' ');

    card.innerHTML = `
      <div class="card-head">
        <img class="app-logo" src="${SAE_ICON_URL}" alt="Système d’encadrement SAÉ">
        <div>
          <h3>Système d’encadrement SAÉ</h3>
          <div class="card-sub">Cheminement du suivi organisationnel et descripteurs d’avis Mozaïk SOI</div>
        </div>
      </div>
      <div class="card-body">
        <p>Deux documents de référence pour appliquer le système d’encadrement de façon uniforme : le cheminement d’un dossier de suivi organisationnel SAÉ et la liste officielle des descripteurs d’avis à utiliser dans Mozaïk.</p>
        <div class="two-col">
          <div class="callout good">
            <strong>Suivi organisationnel SAÉ (cheminement)</strong>
            <p>Repère visuel du suivi graduel : préoccupation, observations par le tuteur, interventions, références au besoin, puis suivi et évaluation.</p>
            <a class="btn primary" href="${CHEMINEMENT_URL}" target="_blank" rel="noopener noreferrer">Ouvrir le cheminement SAÉ</a>
          </div>
          <div class="callout good">
            <strong>Liste des descripteurs avis (Mozaïk SOI)</strong>
            <p>Descripteurs de renforcement positif, comportementaux et organisationnels, interventions effectuées et rappels pour la saisie des avis.</p>
            <a class="btn primary" href="${DESCRIPTEURS_URL}" target="_blank" rel="noopener noreferrer">Ouvrir la liste des descripteurs</a>
          </div>
        </div>
      </div>`;

    if (avis) avis.insertAdjacentElement('afterend', card);
    else root.appendChild(card);
  }

  const placeRenderedCategory = () => {
    const procedure = document.getElementById('encadrement-sae');
    const host = document.getElementById('category-sections');
    if (!procedure || !host) return false;

    let section = document.getElementById('section-encadrement-sae');
    if (!section) {
      section = document.createElement('section');
      section.className = 'category-section';
      section.id = 'section-encadrement-sae';
      section.dataset.category = 'encadrement-sae';
      section.innerHTML = `
        <header class="category-heading">
          <h2><img src="${SAE_ICON_URL}" alt="" aria-hidden="true" style="width:30px;height:30px;object-fit:contain;border-radius:7px;vertical-align:middle;margin-right:8px">Système d’encadrement SAÉ</h2>
          <p>Cheminement du suivi organisationnel et références pour les avis Mozaïk SOI.</p>
        </header>
        <div class="procedure-list"></div>`;
      const classe = host.querySelector('#section-classe');
      if (classe) classe.insertAdjacentElement('afterend', section);
      else host.prepend(section);
    }
    section.querySelector('.procedure-list')?.appendChild(procedure);

    const nav = document.querySelector('.section-nav-inner');
    if (nav && !nav.querySelector('a[href="#section-encadrement-sae"]')) {
      const link = document.createElement('a');
      link.href = '#section-encadrement-sae';
      link.innerHTML = `<img src="${SAE_ICON_URL}" alt="" aria-hidden="true" style="width:20px;height:20px;object-fit:contain;border-radius:5px;vertical-align:middle"><span>Système d’encadrement SAÉ</span>`;
      const classeLink = nav.querySelector('a[href="#section-classe"]');
      if (classeLink) classeLink.insertAdjacentElement('afterend', link);
      else nav.appendChild(link);
    }
    return true;
  };

  const patchQuickAccess = () => {
    const quick = document.querySelector('.quick-links');
    if (!quick) return false;

    quick.querySelector('a[href="#chromebook"]')?.remove();

    const reservation = quick.querySelector('a[href="#reservation"]');
    const reservationLabel = reservation?.querySelector('.quick-label');
    if (reservationLabel) {
      reservationLabel.textContent = 'Réservation - Locaux, récupérations, convocations et reprises';
    }

    if (!quick.querySelector('a[href="#encadrement-sae"]')) {
      const link = document.createElement('a');
      link.href = '#encadrement-sae';
      link.innerHTML = `<span class="quick-visual real-logo"><img src="${SAE_ICON_URL}" alt="Système d’encadrement SAÉ"></span><span class="quick-label">Système d’encadrement SAÉ</span><span aria-hidden="true">→</span>`;
      if (reservation) reservation.insertAdjacentElement('afterend', link);
      else quick.appendChild(link);
    }
    return true;
  };

  const finishRenderedPatches = () => placeRenderedCategory() && patchQuickAccess();

  if (!finishRenderedPatches()) {
    const observer = new MutationObserver(() => {
      const categoryReady = placeRenderedCategory();
      const quickReady = patchQuickAccess();
      if (categoryReady && quickReady) observer.disconnect();
    });
    observer.observe(document.getElementById('app') || document.body, {childList:true, subtree:true});
    setTimeout(() => observer.disconnect(), 10000);
  }
})();

(() => {
  const root = document.getElementById('legacy-source');
  if (!root) return;

  const DOC_MFA = 'https://drive.google.com/file/d/1TETFuJJSslnIPYla52LmS_KQAxtkqg9T/view?usp=drivesdk';
  const DOC_CAL = 'https://drive.google.com/file/d/1Kt2QTRbW8qRc9zgJ6rej32Dq9iAygid0/view?usp=drivesdk';
  const TELUS_HEALTH_LOGO = 'assets/vendor/telus-health.png';

  if (!document.getElementById('applications-formulaires-style')) {
    const style = document.createElement('style');
    style.id = 'applications-formulaires-style';
    style.textContent = `
      #applications-cssc .resource-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:14px}
      #applications-cssc .resource-box{display:flex;gap:14px;align-items:flex-start;padding:16px;border:1px solid #e1d8da;border-radius:14px;background:#fff;box-shadow:0 5px 15px rgba(53,31,36,.06)}
      #applications-cssc .resource-box:hover{border-color:#c7a9b0;box-shadow:0 8px 20px rgba(53,31,36,.09)}
      #applications-cssc .resource-logo{width:54px;height:54px;flex:0 0 54px;border-radius:12px;background:#f7f3f4;border:1px solid #eadfe2;display:grid;place-items:center;overflow:hidden;font-size:29px}
      #applications-cssc .resource-logo img{width:100%;height:100%;object-fit:contain;padding:6px;box-sizing:border-box;background:#fff}
      #applications-cssc .resource-logo.wide img{padding:4px;object-fit:contain}
      #applications-cssc .resource-copy{min-width:0;flex:1}
      #applications-cssc .resource-copy h4{margin:0 0 5px;font-size:1rem;line-height:1.25;color:#3e171f}
      #applications-cssc .resource-copy p{margin:0 0 10px;color:#5f5558;font-size:.9rem;line-height:1.45}
      #applications-cssc .resource-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
      #applications-cssc .resource-actions a{font-size:.84rem}
      #applications-cssc .resource-note{margin-top:9px;padding:9px 11px;border-left:3px solid #8da53b;background:#f5f8eb;border-radius:7px;font-size:.82rem;line-height:1.4;color:#4c513d}
      #applications-cssc .resource-note strong{color:#344217}
      @media(max-width:820px){#applications-cssc .resource-grid{grid-template-columns:1fr}}
      @media(max-width:520px){#applications-cssc .resource-box{padding:13px}#applications-cssc .resource-logo{width:46px;height:46px;flex-basis:46px}}
    `;
    document.head.appendChild(style);
  }

  if (!root.querySelector('#applications-cssc')) {
    const card = document.createElement('section');
    card.className = 'card searchable';
    card.id = 'applications-cssc';
    card.dataset.icon = '🗂️';
    card.dataset.title = 'Applications CSSC';
    card.dataset.keywords = [
      'applications cssc application formulaire formulaires ressources employé personnel',
      'mot de passe mot passe oublié oublie réinitialiser reinitialiser multifacteur mfa authentification double authentification microsoft authenticator code qr',
      'calendrier scolaire 2026 2027 congé conge journée pédagogique journee pedagogique relâche relache évaluation evaluation fin étape etape bulletin rencontre parents',
      'événement accidentel evenement accidentel situation risque accident travail blessure santé sécurité sante securite csst cnesst harcèlement harcelement discrimination intimidation violence déclaration declaration jotform',
      'offre service services éducatifs educatifs accompagnement formation',
      'programme aide employés employes famille pae telus health lifeworks soutien',
      'relevé paie releve paie paye salaire bulletin paie performa',
      'repro reprographie photocopie photocopies impression demande reprographie repro+',
      'scolago absence absences suppléance suppleance remplacement remplaçant remplacant disponibilité disponibilite déclarer absence demander suppléance attribuer suppléance'
    ].join(' ');

    card.innerHTML = `
      <div class="card-head">
        <div class="card-icon" aria-hidden="true">🗂️</div>
        <div>
          <h3>Applications CSSC</h3>
          <div class="card-sub">Applications, formulaires et ressources administratives du Centre de services scolaire</div>
        </div>
      </div>
      <div class="card-body">
        <p>Les ressources ci-dessous sont classées <strong>par ordre alphabétique</strong> pour les retrouver rapidement.</p>
        <div class="resource-grid">
          <article class="resource-box">
            <div class="resource-logo"><img src="assets/vendor/mot-de-passe.png" alt="Logo Application Mot de passe"></div>
            <div class="resource-copy">
              <h4>Application Mot de passe</h4>
              <p>Mot de passe oublié, changement de mot de passe ou réinitialisation de l’authentification multifacteur.</p>
              <div class="resource-actions"><a class="btn primary" href="https://mdp.cssc.gouv.qc.ca/" target="_blank" rel="noopener noreferrer">Ouvrir l’application</a><a class="btn" href="${DOC_MFA}" target="_blank" rel="noopener noreferrer">Procédurier double authentification</a></div>
              <div class="resource-note"><strong>Double authentification :</strong> le procédurier explique l’installation de Microsoft Authenticator, la configuration sur <code>aka.ms/mfasetup</code>, le balayage du code QR et l’approbation de la demande de connexion.</div>
            </div>
          </article>
          <article class="resource-box">
            <div class="resource-logo" aria-hidden="true">📅</div>
            <div class="resource-copy"><h4>Calendrier scolaire 2026-2027</h4><p>Calendrier de Cardinal-Roy avec les congés, journées pédagogiques, semaine de relâche, périodes d’évaluation et fins d’étapes.</p><div class="resource-actions"><a class="btn primary" href="${DOC_CAL}" target="_blank" rel="noopener noreferrer">Ouvrir le calendrier</a></div></div>
          </article>
          <article class="resource-box">
            <div class="resource-logo" aria-hidden="true">⚠️</div>
            <div class="resource-copy"><h4>Formulaire de déclaration des événements accidentels ou des situations jugées à risque</h4><p>Pour déclarer notamment un accident du travail, une blessure ou une situation de harcèlement, discrimination, intimidation, violence ou autre enjeu de santé et sécurité.</p><div class="resource-actions"><a class="btn primary" href="https://jotform.cssc.gouv.qc.ca/240294011577857" target="_blank" rel="noopener noreferrer">Ouvrir le formulaire</a></div></div>
          </article>
          <article class="resource-box">
            <div class="resource-logo"><img src="assets/vendor/services-educatifs.svg" alt="Pomme rouge"></div>
            <div class="resource-copy"><h4>Offre de service des Services éducatifs</h4><p>Consulter l’offre de service des Services éducatifs.</p><div class="resource-actions"><a class="btn primary" href="https://seoffres.glide.page/" target="_blank" rel="noopener noreferrer">Ouvrir l’offre de service</a></div></div>
          </article>
          <article class="resource-box">
            <div class="resource-logo"><img src="${TELUS_HEALTH_LOGO}" alt="Logo TELUS Health"></div>
            <div class="resource-copy"><h4>Programme d’aide aux employés et à la famille (PAE)</h4><p>Accéder au programme d’aide aux employés et à la famille offert par TELUS Health.</p><div class="resource-actions"><a class="btn primary" href="https://centredeservicescolairedelacapitale.lifeworks.com/" target="_blank" rel="noopener noreferrer">Ouvrir le PAE</a></div></div>
          </article>
          <article class="resource-box">
            <div class="resource-logo" aria-hidden="true">💵</div>
            <div class="resource-copy"><h4>Relevé de paie</h4><p>Accéder au service de relevé de paie du CSSC.</p><div class="resource-actions"><a class="btn primary" href="http://performa.cssc.gouv.qc.ca/" target="_blank" rel="noopener noreferrer">Ouvrir le relevé de paie</a></div></div>
          </article>
          <article class="resource-box">
            <div class="resource-logo wide"><img src="assets/vendor/repro-plus.jpg" alt="Logo Repro+"></div>
            <div class="resource-copy"><h4>Repro+</h4><p>Faire une demande de reprographie, notamment pour des photocopies.</p><div class="resource-actions"><a class="btn primary" href="https://repro.cssc.gouv.qc.ca/" target="_blank" rel="noopener noreferrer">Ouvrir Repro+</a></div></div>
          </article>
          <article class="resource-box">
            <div class="resource-logo"><img src="assets/vendor/scolago.gif" alt="Logo Scolago"></div>
            <div class="resource-copy"><h4>Scolago</h4><p>Déclarer une absence, demander une suppléance, recevoir des suppléances ou indiquer vos disponibilités pour en effectuer.</p><div class="resource-actions"><a class="btn primary" href="https://scolago.com/fr-CA" target="_blank" rel="noopener noreferrer">Ouvrir Scolago</a></div></div>
          </article>
        </div>
      </div>`;

    const existing = root.querySelector('#raccourcis-poste') || root.querySelector('#c2atom') || root.lastElementChild;
    if (existing) existing.insertAdjacentElement('afterend', card);
    else root.appendChild(card);
  }

  const placeCategory = () => {
    const host = document.getElementById('category-sections');
    const procedure = document.getElementById('applications-cssc');
    if (!host || !procedure) return false;

    let section = document.getElementById('section-applications-formulaires');
    if (!section) {
      section = document.createElement('section');
      section.className = 'category-section';
      section.id = 'section-applications-formulaires';
      section.dataset.category = 'applications-formulaires';
      section.innerHTML = `<header class="category-heading"><h2><span aria-hidden="true">🗂️</span>Applications et formulaires</h2><p>Applications du CSSC, formulaires administratifs et documents de référence utiles au personnel.</p></header><div class="procedure-list"></div>`;
    }

    host.appendChild(section);
    const list = section.querySelector('.procedure-list');
    if (procedure.parentElement !== list) list.appendChild(procedure);

    const nav = document.querySelector('.section-nav-inner');
    if (nav) {
      let link = nav.querySelector('a[href="#section-applications-formulaires"]');
      if (!link) {
        link = document.createElement('a');
        link.href = '#section-applications-formulaires';
        link.innerHTML = '<span aria-hidden="true">🗂️</span>Applications et formulaires';
      }
      nav.appendChild(link);
    }
    return true;
  };

  if (!placeCategory()) {
    const observer = new MutationObserver(() => {
      if (placeCategory()) observer.disconnect();
    });
    observer.observe(document.getElementById('app') || document.body, {childList:true, subtree:true});
    setTimeout(() => observer.disconnect(), 12000);
  }
})();