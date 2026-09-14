(() => {
  'use strict';

  const VERSION = '1.0';
  const RESOURCE_ID = 'tableau-depannage-2026-2027';
  const RESOURCE_URL = 'https://docs.google.com/document/d/1-hr2ucGHlCGPEhTjHcMBVcoGwCViHWnD/edit?usp=drivesdk&ouid=109187652422234365096&rtpof=true&sd=true';
  const KEYWORDS = [
    'tableau disponibilités disponibilite dépannage depannage',
    'suppléance suppleance suppléant suppleant remplacement remplaçant remplacant urgence',
    'dépannage obligatoire depannage obligatoire présence obligatoire presence obligatoire rouge',
    'dépannage volontaire depannage volontaire disponibilité volontaire disponibilite volontaire vert',
    'enseignant enseignants prof profs professeur professeurs personnel',
    'période periodes périodes periode jour cycle jours cycle horaire 2026 2027'
  ].join(' ');

  const mount = () => {
    const list = document.querySelector('#section-organisation-scolaire .procedure-list');
    if (!list) return false;

    let details = document.getElementById(RESOURCE_ID);
    if (!details) {
      details = document.createElement('details');
      details.className = 'procedure';
      details.id = RESOURCE_ID;

      const anchor = list.querySelector('#horaire-enseignants-2026-2027') || list.querySelector('#horaire-locaux-2026-2027');
      if (anchor) anchor.insertAdjacentElement('afterend', details);
      else list.appendChild(details);
    }

    details.dataset.search = KEYWORDS;
    details.innerHTML = `
      <summary>
        <span class="procedure-visual emoji-visual" aria-hidden="true">👥</span>
        <span class="procedure-labels">
          <span class="procedure-title">Tableau de disponibilités de dépannage 2026-2027</span>
          <span class="procedure-subtitle">Suppléance d’urgence et dépannage</span>
        </span>
      </summary>
      <div class="procedure-content">
        <p>Consultez les disponibilités inscrites par le personnel pour la suppléance de dépannage. Les noms en <strong>rouge</strong> correspondent aux périodes de dépannage obligatoire où la personne s’engage à être présente à l’école; les noms en <strong>vert</strong> indiquent des disponibilités volontaires.</p>
        <div class="links">
          <a class="btn primary" href="${RESOURCE_URL}" target="_blank" rel="noopener noreferrer">Ouvrir le tableau de dépannage</a>
        </div>
      </div>`;

    window.PORTAL_REGISTRY?.refresh?.();
    window.PORTAL_DEPANNAGE_RESOURCE = VERSION;
    return true;
  };

  if (mount()) return;

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (mount() || attempts >= 100) window.clearInterval(timer);
  }, 50);
})();
