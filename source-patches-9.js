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

  const DRIVE_BLOCK = `
    <div class="callout" data-evaluation-drive-folders="true">
      <strong>Dossiers du Drive commun :</strong>
      <div class="links">
        <a class="btn primary" href="https://drive.google.com/drive/folders/1LTgKPbES9IixST2V-jolWxA7s6SMV6jT" target="_blank" rel="noopener noreferrer">Nature et moments des évaluations</a>
        <a class="btn" href="https://drive.google.com/drive/folders/18URlr-7b2TmnzZqL4TdOOGlNI2V7TfJW" target="_blank" rel="noopener noreferrer">Attentes et exigences</a>
        <a class="btn" href="https://drive.google.com/drive/folders/15dleRqnqz8ZldCzWrogMAJONlVBta3IY" target="_blank" rel="noopener noreferrer">Planification annuelle</a>
      </div>
    </div>`;

  let card = root.querySelector('#evaluation-bulletin-planification');
  if (!card) {
    card = document.createElement('section');
    card.className = 'card searchable';
    card.id = 'evaluation-bulletin-planification';
    card.dataset.title = 'Évaluation, bulletin et planification';
    card.dataset.icon = '📊';
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
      </div>`;
    root.appendChild(card);
  }

  card.dataset.keywords = `${card.dataset.keywords || ''} ${KEYWORDS}`.replace(/\s+/g, ' ').trim();
  const body = card.querySelector('.card-body') || card;
  if (!body.querySelector('[data-evaluation-drive-folders]')) body.insertAdjacentHTML('beforeend', DRIVE_BLOCK);
})();

/* Formulaire officiel pour demander des services d'appui ou une identification pour un élève. */
(() => {
  'use strict';

  const root = document.getElementById('legacy-source');
  if (!root) return;

  const FORM_URL = 'https://drive.google.com/file/d/17R4NSbb1JJInv61vJobHIZvBvNOPOH0H/view?usp=drive_link';
  const extraKeywords = [
    'formulaire demande services demande de services demande appui demande aide accès services acces services services appui services d appui services complémentaires services complementaires',
    'demande ortho ortho aide ortho service ortho référence reference référer referer demande à la direction demande a la direction formulaire direction',
    'soutien élève soutien eleve aide élève aide eleve élève à risque eleve a risque difficulté adaptation difficulte adaptation difficulté apprentissage difficulte apprentissage EHDAA HDAA identification',
    'orthopédagogie orthopedagogie orthopédagogue orthopedagogue orthopédagogique orthopedagogique ortho',
    'psychoéducation psychoeducation psychoéducateur psychoeducateur psychoéducatrice psychoeducatrice psycho éducateur psycho educateur psycho educatrice',
    'orientation orientation scolaire conseiller orientation conseillère orientation conseillere orientation conseiller en orientation conseillère en orientation co c.o.',
    'psychologie psychologue orthophonie orthophoniste orthophoniste ortho TES technicien éducation spécialisée technicien education specialisee éducateur spécialisé educateur specialise',
    'plan intervention plan d intervention PI services externes CLSC équipe régionale soutien equipe regionale soutien classe spécialisée classe specialisee',
    'lecture écriture ecriture mathématique mathematique langage comportement attention concentration difficultés difficultes besoins élève besoins eleve'
  ].join(' ');

  let card = root.querySelector('#aide-eleve-services-appui');
  if (!card) {
    card = document.createElement('section');
    card.className = 'card searchable';
    card.id = 'aide-eleve-services-appui';
    card.dataset.title = 'Aide et services d’appui pour un élève';
    card.dataset.icon = '🧩';
    card.innerHTML = `
      <div class="card-head">
        <img class="app-logo" src="assets/portal/aide-eleve.png" alt="Aide et services d’appui pour un élève">
        <div>
          <h3>Aide et services d’appui pour un élève</h3>
          <div class="card-sub">Demande à la direction pour des services complémentaires ou une identification</div>
        </div>
      </div>
      <div class="card-body">
        <p>Utilisez le formulaire officiel pour demander à la direction des services d’appui ou une identification lorsqu’un élève présente des besoins ou des difficultés.</p>
        <div class="callout" data-services-appui-formulaire="true">
          <strong>Services et besoins visés</strong>
          <p>Orthopédagogie, psychoéducation, psychologie, orthophonie, TES, orientation ou autre service complémentaire selon les besoins de l’élève.</p>
          <div class="links">
            <a class="btn primary" href="${FORM_URL}" target="_blank" rel="noopener noreferrer">Accéder au fichier</a>
          </div>
        </div>
      </div>`;
    root.appendChild(card);
  }

  card.dataset.keywords = `${card.dataset.keywords || ''} ${extraKeywords}`.replace(/\s+/g, ' ').trim();

  const body = card.querySelector('.card-body') || card;
  let block = body.querySelector('[data-services-appui-formulaire]');
  if (!block) {
    block = document.createElement('div');
    block.className = 'callout';
    block.dataset.servicesAppuiFormulaire = 'true';
    body.appendChild(block);
  }

  const existingLink = [...block.querySelectorAll('a[href]')].find(link =>
    (link.getAttribute('href') || '').includes('17R4NSbb1JJInv61vJobHIZvBvNOPOH0H')
  );
  if (!existingLink) {
    block.insertAdjacentHTML('beforeend', `
      <div class="links">
        <a class="btn primary" href="${FORM_URL}" target="_blank" rel="noopener noreferrer">Accéder au fichier</a>
      </div>`);
  }
})();

/* Expulsion : le rapport au Transit et l'avis SOI sont deux saisies distinctes. */
(() => {
  'use strict';

  const card = document.querySelector('#legacy-source #sortie');
  if (!card) return;

  card.dataset.title = 'Sortie de classe / expulsion - Mes suivis et Mozaïk-Portail';
  card.dataset.keywords = `${card.dataset.keywords || ''} avis SOI Mozaïk Portail comportement dérangeant avis de sortie comptabilisation des avis suivi des intervenants`.trim();

  const title = card.querySelector('.card-head h3');
  if (title) title.textContent = 'Sortie de classe / expulsion - Mes suivis et Mozaïk-Portail';
  const subtitle = card.querySelector('.card-sub');
  if (subtitle) subtitle.textContent = 'Rapport au Transit, puis avis SOI essentiel dans Mozaïk-Portail';

  const steps = card.querySelector('.card-body ol.steps');
  if (steps && !steps.querySelector('[data-expulsion-soi-step]')) {
    const step = document.createElement('li');
    step.dataset.expulsionSoiStep = 'true';
    step.innerHTML = `
      <div class="callout soi-important" role="note">
        <span class="soi-important-title">IMPORTANT - Inscrire l’avis SOI dans Mozaïk-Portail</span>
        <p><strong>Après avoir rempli et envoyé le rapport d’expulsion dans Mes suivis</strong>, ouvrez <strong>Mozaïk-Portail</strong> et saisissez un <strong>avis SOI</strong> pour l’élève avec le descripteur exact <strong>« A un comportement dérangeant »</strong>.</p>
        <p><strong>Cette étape est essentielle :</strong> c’est l’avis SOI de Mozaïk-Portail qui permet de comptabiliser la sortie parmi les avis et de la prendre en compte dans les suivis ultérieurs des intervenants.</p>
        <a class="btn soi-portail-link" href="https://mozaikportail.ca/" target="_blank" rel="noopener noreferrer">Ouvrir Mozaïk-Portail</a>
      </div>`;
    steps.appendChild(step);
  }

  const transitNote = card.querySelector('.card-body .callout.good');
  if (transitNote) {
    transitNote.innerHTML = '<strong>Deux plateformes, deux rôles :</strong> <strong>Mes suivis</strong> transmet le rapport d’expulsion au personnel du Transit et conserve l’heure de sortie. <strong>Mozaïk-Portail</strong> est la base des avis SOI, utilisée pour leur comptabilisation et les suivis des intervenants. Le rapport dans Mes suivis ne remplace pas l’avis SOI.';
  }
})();
