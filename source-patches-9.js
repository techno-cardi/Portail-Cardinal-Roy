(() => {
  'use strict';

  const root = document.getElementById('legacy-source');
  if (!root) return;

  const KEYWORDS = [
    'nature et moments des évaluations nature et moments evaluation nature évaluations nature evaluations moments évaluations moments evaluations quand évaluer quand evaluer dates évaluations dates evaluations',
    'attentes et exigences attentes exigences attentes pédagogiques attentes pedagogiques exigences pédagogiques exigences pedagogiques attentes élèves attentes eleves exigences élèves exigences eleves',
    'consignes critères criteres critères de réussite criteres de reussite travaux remise travaux exigences de cours attentes de cours règles de cours regles de cours',
    'planification annuelle planification globale planification globale annuelle planification des enseignants planification enseignant planif annuelle planif globale progression annuelle progression des apprentissages',
    'évaluation evaluation évaluations evaluations bulletin bulletins examens examen planification enseignement enseignant enseignants drive commun dossier dossiers'
  ].join(' ');

  let card = root.querySelector('#evaluation-bulletin-planification');
  if (!card) {
    card = document.createElement('section');
    card.className = 'card searchable';
    card.id = 'evaluation-bulletin-planification';
    card.dataset.title = 'Évaluation, bulletin et planification';
    card.dataset.icon = '📊';
    card.dataset.keywords = KEYWORDS;
    card.innerHTML = `
      <div class="card-head">
        <div class="card-icon" aria-hidden="true">📊</div>
        <div>
          <h3>Évaluation, bulletin et planification</h3>
          <div class="card-sub">Examens, exigences et planification annuelle</div>
        </div>
      </div>
      <div class="card-body">
        <p>Accès direct aux dossiers de référence du Drive commun pour préparer l’évaluation et la planification de l’année.</p>
        <div class="callout" data-evaluation-drive-folders="true">
          <strong>Dossiers du Drive commun :</strong>
          <div class="links">
            <a class="btn primary" href="https://drive.google.com/drive/folders/1LTgKPbES9IixST2V-jolWxA7s6SMV6jT" target="_blank" rel="noopener noreferrer">Nature et moments des évaluations</a>
            <a class="btn" href="https://drive.google.com/drive/folders/18URlr-7b2TmnzZqL4TdOOGlNI2V7TfJW" target="_blank" rel="noopener noreferrer">Attentes et exigences</a>
            <a class="btn" href="https://drive.google.com/drive/folders/15dleRqnqz8ZldCzWrogMAJONlVBta3IY" target="_blank" rel="noopener noreferrer">Planification annuelle</a>
          </div>
        </div>
      </div>`;
    root.appendChild(card);
  } else {
    card.dataset.keywords = `${card.dataset.keywords || ''} ${KEYWORDS}`.replace(/\s+/g, ' ').trim();
  }
})();
