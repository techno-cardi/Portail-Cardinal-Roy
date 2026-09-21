(() => {
  'use strict';

  const MFA_GUIDE = 'https://drive.google.com/file/d/1G4QFoa_jyItVPd1OTZkCGGabk9h2gIa6/view?usp=drivesdk';
  const RESERVATION_GUIDE = 'https://drive.google.com/file/d/1Ea0rcbyqvFjmXzc_yuNREdgk8Pq4LEQW/view?usp=drivesdk';

  const normalize = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9+ -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const appendSearchTerms = (node, property, terms) => {
    if (!node) return;
    const current = String(node.dataset[property] || '').trim();
    const currentWords = new Set(normalize(current).split(' ').filter(Boolean));
    const additions = terms
      .split(/\s+/)
      .filter(Boolean)
      .filter(word => !currentWords.has(normalize(word)));
    node.dataset[property] = `${current} ${additions.join(' ')}`.replace(/\s+/g, ' ').trim();
  };

  const ensureActions = box => {
    let actions = box.querySelector('.resource-actions');
    if (actions) return actions;
    const copy = box.querySelector('.resource-copy') || box;
    actions = document.createElement('div');
    actions.className = 'resource-actions';
    copy.appendChild(actions);
    return actions;
  };

  const updateMfaProcedure = () => {
    const box = document.getElementById('app-mot-de-passe');
    if (!box) return;

    const links = [...box.querySelectorAll('a[href]')];
    const mfaLinks = links.filter(link => {
      const text = normalize(link.textContent);
      const href = link.getAttribute('href') || '';
      return /double authentification|authentification.*(?:multi|mfa)|multifacteur|authenticator/.test(text)
        || href.includes('1G4QFoa_jyItVPd1OTZkCGGabk9h2gIa6');
    });

    let guide = mfaLinks.shift();
    if (!guide) {
      guide = document.createElement('a');
      guide.className = 'btn';
      ensureActions(box).appendChild(guide);
    }

    guide.href = MFA_GUIDE;
    guide.target = '_blank';
    guide.rel = 'noopener noreferrer';
    guide.textContent = 'Double authentification - marche à suivre';
    mfaLinks.forEach(link => link.remove());

    appendSearchTerms(box, 'searchKeywords', [
      'double authentification authentification multifacteur MFA 2FA Microsoft Authenticator',
      'nouveau téléphone changer téléphone téléphone changé réinitialiser accès MFA réinitialisation MFA',
      'installer Authenticator Google Play App Store compte professionnel scanner code QR approuver demande nombre affiché'
    ].join(' '));
  };

  const updateReservationProcedure = () => {
    const procedure = document.getElementById('reservation');
    if (!procedure) return;
    const content = procedure.querySelector('.procedure-content') || procedure;
    const links = [...content.querySelectorAll('a[href]')];
    const guideLinks = links.filter(link => {
      const text = normalize(link.textContent);
      const href = link.getAttribute('href') || '';
      return ((/guide|tutoriel|procedure/.test(text) && /reservation/.test(text))
        || href.includes('1xTT24JTumbFbWY8vWt3aRSkJS8RLZtEIMuvU9nwRpsc')
        || href.includes('1Ea0rcbyqvFjmXzc_yuNREdgk8Pq4LEQW'));
    });

    let guide = guideLinks.shift();
    if (!guide) {
      let actions = content.querySelector('.links');
      if (!actions) {
        actions = document.createElement('div');
        actions.className = 'links';
        content.appendChild(actions);
      }
      guide = document.createElement('a');
      guide.className = 'btn';
      actions.appendChild(guide);
    }

    guide.href = RESERVATION_GUIDE;
    guide.target = '_blank';
    guide.rel = 'noopener noreferrer';
    guide.textContent = 'Procédure - réservation de locaux et convocations';
    guideLinks.forEach(link => link.remove());

    appendSearchTerms(procedure, 'search', [
      'réserver local réservation locaux local récupération',
      'convoquer élève convoquer élèves convocation convocations récupération mise à jour',
      'inscrire élèves type réservation récupération plage horaire local libre',
      'récupérations fixes technopédagogues Récupérations Découvertes Récupérations SAÉ',
      'étude surveillée Raymond-Gervais P5 heure local AppSP Réservation'
    ].join(' '));
  };

  updateMfaProcedure();
  updateReservationProcedure();
})();