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

/* Référence officielle à la direction dans Mes suivis (AppSP). */
(() => {
  'use strict';

  const root = document.getElementById('legacy-source');
  if (!root || root.querySelector('#reference-direction')) return;

  const PROCEDURE_URL = 'https://docs.google.com/document/d/1-T7WkQseiRqyScmFJiSiv8tcfQ83Ln054-xJBzoME30/edit?usp=sharing';
  const card = document.createElement('section');
  card.className = 'card searchable';
  card.id = 'reference-direction';
  card.dataset.title = 'Référence à la direction';
  card.dataset.icon = '📝';
  card.dataset.keywords = [
    'référence à la direction reference a la direction référence direction reference direction référer un élève referer un eleve signalement à la direction demande officielle',
    'AppSP App SP Mes suivis mes interventions dossier élève fiche élève suivi élève transmettre une référence envoyer une référence',
    'procédure procédurier guide tutoriel marche à suivre comment faire une référence demande de référence nouvelle procédure référence',
    'difficultés apprentissage problème apprentissage problèmes scolaires difficultés scolaires manque de motivation démotivation difficulté comportement lecture écriture mathématique langage attention concentration',
    'services d appui services complémentaires soutien élève élève à risque orthopédagogie orthopédagogue ortho psychoéducation psychoéducateur psychoéducatrice psychologue psychologie orthophonie orthophoniste',
    'TES technicien éducation spécialisée conseiller orientation conseillère orientation orientation scolaire plan intervention PI matériel adapté francisation enseignant ressource'
  ].join(' ');

  card.innerHTML = `
    <div class="card-head">
      <div>
        <h3>Référence à la direction</h3>
        <div class="card-sub">Demander officiellement un suivi ou des services d’appui pour un élève dans AppSP</div>
      </div>
    </div>
    <div class="card-body">
      <p>La <strong>référence à la direction</strong> est une démarche officielle pour signaler des difficultés observées chez un élève et demander l’évaluation de ses besoins ou le soutien d’un intervenant, notamment en cas de difficultés d’apprentissage, de motivation, de langage ou de comportement. La référence ne constitue pas un diagnostic et ne garantit pas l’attribution d’un service.</p>
      <p>Il est important de décrire précisément les faits, les interventions déjà effectuées et leurs résultats afin d’aider la direction et les professionnels concernés à déterminer la suite appropriée.</p>
      <ol class="steps">
        <li>Dans <strong>AppSP</strong>, ouvrez <strong>Mes suivis</strong>.</li>
        <li>Recherchez le <strong>nom de l’élève</strong> dans <strong>Mes interventions</strong>, puis sélectionnez sa fiche. Vous pouvez aussi chercher un élève qui ne fait pas partie de vos groupes.</li>
        <li>Cliquez sur <strong>Référence à la direction</strong>.</li>
        <li>Remplissez les informations demandées : motif de la demande, services d’appui souhaités, description de la problématique, interventions déjà tentées et suivis pertinents.</li>
        <li>Vérifiez votre déclaration, puis cliquez sur <strong>Envoyer</strong>.</li>
      </ol>
      <div class="links">
        <a class="btn primary" href="${PROCEDURE_URL}" target="_blank" rel="noopener noreferrer">Accéder au fichier</a>
        <a class="btn" href="https://appsp.ca/lancement/cardinal-roy/" target="_blank" rel="noopener noreferrer">Ouvrir AppSP</a>
      </div>
    </div>`;
  root.appendChild(card);
})();

/* Expulsion : le rapport au Transit et l'avis SOI sont deux saisies distinctes. */
(() => {
  'use strict';

  const card = document.querySelector('#legacy-source #sortie');
  if (!card) return;

  card.dataset.title = 'Sortie de classe / expulsion - Mes suivis et Mozaïk-Portail';
  card.dataset.keywords = `${card.dataset.keywords || ''} avis SOI Mozaïk Portail ne respecte pas les règles de conduite école classe comportement avis de sortie comptabilisation des avis suivi des intervenants`.trim();

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
        <p><strong>Après avoir rempli et envoyé le rapport d’expulsion dans Mes suivis</strong>, ouvrez <strong>Mozaïk-Portail</strong> et saisissez un <strong>avis SOI</strong> pour l’élève avec le descripteur exact <strong>« Ne respecte pas les règles de conduite (école ou classe) »</strong>.</p>
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

/* Calendrier prévisionnel des absences des élèves du sport-études (SAÉ). */
(() => {
  'use strict';
  const root = document.getElementById('legacy-source');
  if (!root || root.querySelector('#horaire-absences-prevues-sae')) return;
  const FOLDER_URL = 'https://drive.google.com/drive/folders/12gSHd025A4f7cFedyJpqqN2syhzFY96o';
  const card = document.createElement('section');
  card.className = 'card searchable';
  card.id = 'horaire-absences-prevues-sae';
  card.dataset.title = 'Horaire des absences prévues (SAÉ)';
  card.dataset.icon = '📅';
  card.dataset.directHref = FOLDER_URL;
  card.dataset.keywords = [
    'horaire absences prévues SAÉ SAE sport-études sport etudes sports études',
    'absences planifiées absences à venir absences futures prévisions absence',
    'calendrier absences par discipline planification absences des élèves sport-études',
    'discipline sportive compétition entraînement entrainement anticiper cours travaux évaluations'
  ].join(' ');
  card.innerHTML = `
    <div class="card-head">
      <div class="card-icon" aria-hidden="true">📅</div>
      <div>
        <h3>Horaire des absences prévues (SAÉ)</h3>
        <div class="card-sub">Sport-études : consulter à l’avance les absences par discipline</div>
      </div>
    </div>
    <div class="card-body">
      <p>Consultez le dossier des absences planifiées des élèves du sport-études, par discipline, pour anticiper les cours, les travaux et les évaluations.</p>
      <div class="links">
        <a class="btn primary" href="${FOLDER_URL}" target="_blank" rel="noopener noreferrer">Accéder au dossier des absences prévues</a>
      </div>
    </div>`;
  root.appendChild(card);
})();
