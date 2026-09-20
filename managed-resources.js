(() => {
  'use strict';

  const api = window.PORTAL_SOURCE_API;
  if (!api) throw new Error('PORTAL_SOURCE_API indisponible');

  const MANAGED = [
    { id:'mise-a-jour-recuperation', category:'organisation', owner:'vie-scolaire' },
    { id:'etude-surveillee', category:'organisation', owner:'vie-scolaire' },
    { id:'sos-groupe', category:'classe', owner:'encadrement' },
    { id:'commotion-cerebrale', category:'suivi', owner:'encadrement' },
    { id:'sortie-educative', category:'classe', owner:'organisation' },
    { id:'intervention-retards', category:'classe', owner:'encadrement' },
    { id:'evaluation-bulletin-planification', category:'outils', owner:'pedagogie' },
    { id:'dates-importantes-2026-2027', category:'organisation-scolaire', owner:'organisation' },
    { id:'scolago', category:'outils', owner:'ressources-humaines' }
  ];

  const missing = [];
  MANAGED.forEach(metadata => {
    const node = api.annotate(metadata.id, metadata);
    if (!node) missing.push(metadata.id);
  });

  window.PORTAL_MANAGED_RESOURCE_IDS = Object.freeze(MANAGED.map(item => item.id));
  window.PORTAL_MANAGED_RESOURCE_MISSING = Object.freeze(missing);
})();
