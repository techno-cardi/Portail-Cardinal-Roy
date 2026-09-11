(() => {
  'use strict';

  const VERSION = '1.1';
  const KEYWORDS = [
    'nature et moments des évaluations nature et moments evaluation nature évaluations nature evaluations moments évaluations moments evaluations',
    'quand évaluer quand evaluer dates évaluations dates evaluations calendrier évaluations calendrier evaluations période évaluation periode evaluation périodes évaluations periodes evaluations',
    'attentes et exigences attentes exigences attentes pédagogiques attentes pedagogiques exigences pédagogiques exigences pedagogiques attentes élèves attentes eleves exigences élèves exigences eleves',
    'consignes critères criteres critères de réussite criteres de reussite travaux remise travaux exigences de cours attentes de cours règles de cours regles de cours',
    'planification annuelle planification globale planification globale annuelle planification des enseignants planification enseignant planif annuelle planif globale',
    'progression annuelle progression des apprentissages répartition annuelle repartition annuelle séquence annuelle sequence annuelle contenu année contenu annee plan de cours',
    'évaluation evaluation évaluations evaluations bulletin bulletins planification enseignement enseignant enseignants drive commun dossier dossiers'
  ].join(' ');

  const normalize = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  const findRenderedCard = () => Array.from(document.querySelectorAll('#app .procedure')).find(card => {
    const title = normalize(card.querySelector(':scope > summary')?.textContent);
    return title.includes('evaluation') && title.includes('bulletin') && title.includes('planification');
  });

  const findSourceCard = () => Array.from(document.querySelectorAll('#legacy-source .procedure')).find(card => {
    const title = normalize(card.querySelector(':scope > summary')?.textContent);
    return title.includes('evaluation') && title.includes('bulletin') && title.includes('planification');
  });

  const mount = () => {
    const card = findRenderedCard();
    const content = card?.querySelector('.procedure-content');
    if (!card || !content) return false;

    content.querySelectorAll('[data-evaluation-drive-folders]').forEach(node => node.remove());

    const block = document.createElement('div');
    block.className = 'callout';
    block.dataset.evaluationDriveFolders = 'true';
    block.innerHTML = `
      <strong>Dossiers du Drive commun :</strong>
      <div class="links">
        <a class="btn primary" href="https://drive.google.com/drive/folders/1LTgKPbES9IixST2V-jolWxA7s6SMV6jT" target="_blank" rel="noopener noreferrer">Nature et moments d’évaluation</a>
        <a class="btn" href="https://drive.google.com/drive/folders/18URlr-7b2TmnzZqL4TdOOGlNI2V7TfJW" target="_blank" rel="noopener noreferrer">Attentes et exigences</a>
        <a class="btn" href="https://drive.google.com/drive/folders/15dleRqnqz8ZldCzWrogMAJONlVBta3IY" target="_blank" rel="noopener noreferrer">Planification annuelle</a>
      </div>`;

    content.appendChild(block);
    card.dataset.search = `${card.dataset.search || ''} ${KEYWORDS}`.replace(/\s+/g, ' ').trim();

    const sourceCard = findSourceCard();
    if (sourceCard) {
      sourceCard.dataset.keywords = `${sourceCard.dataset.keywords || ''} ${KEYWORDS}`.replace(/\s+/g, ' ').trim();
    }

    window.PORTAL_REGISTRY?.refresh?.();
    window.PORTAL_EVALUATION_DRIVE_LINKS = VERSION;
    return true;
  };

  if (mount()) return;

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (mount() || attempts >= 100) window.clearInterval(timer);
  }, 50);
})();
