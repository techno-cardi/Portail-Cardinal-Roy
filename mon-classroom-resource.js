(function monClassroomResource() {
  'use strict';

  const root = document.getElementById('legacy-source');
  if (!root || root.querySelector('#mon-classroom-appsp')) return;

  const card = document.createElement('section');
  card.className = 'card searchable';
  card.id = 'mon-classroom-appsp';
  card.dataset.title = 'Mon Classroom - AppSP';
  card.dataset.keywords = [
    'Mon Classroom AppSP App SP Google Classroom cours groupes élèves listes de classe',
    'synchroniser synchronisation synchro mise à jour automatique quotidienne chaque nuit tous les jours',
    'ajouter nouveaux élèves inviter élèves retirer élèves changer de groupe changement de groupe transfert départ',
    'associer groupes à l horaire cours Classroom inscription automatique affectation enseignant tuteur',
    'procédure procédurier guide tutoriel marche à suivre invitation Classroom synchronisation des listes',
    'inviter parents tuteurs élèves du groupe élèves hors groupe synchroniser maintenant'
  ].join(' ');

  card.innerHTML = `
    <div class="card-head">
      <img class="app-logo" src="https://appsp.ca/images/monclassroom.png" alt="Logo Mon Classroom - AppSP">
      <div>
        <h3>Mon Classroom - AppSP</h3>
        <div class="card-sub">Synchroniser les listes d’élèves avec vos cours Google Classroom</div>
      </div>
    </div>
    <div class="card-body">
      <p><strong>Mon Classroom</strong> permet d’associer vos cours Google Classroom aux groupes de votre horaire dans AppSP, sans devoir inviter chaque élève manuellement.</p>
      <p>Une fois la synchronisation quotidienne activée, la liste peut se mettre à jour chaque nuit : les nouveaux élèves sont invités et ceux qui ont quitté un groupe peuvent être retirés, selon les options sélectionnées.</p>
      <ol class="steps">
        <li>Créez d’abord un cours dans <strong>Google Classroom</strong> pour chacun de vos groupes.</li>
        <li>Dans <strong>AppSP</strong>, ouvrez <strong>Mon Classroom</strong>. Cliquez sur <strong>Groupes</strong> pour associer chaque cours à un groupe de votre horaire.</li>
        <li>Dans <strong>Élèves</strong>, vérifiez la liste et les options <strong>Ajouter les élèves du groupe</strong> et <strong>Retirer les élèves hors groupe</strong>. L’invitation des parents est également facultative.</li>
        <li>Cliquez sur <strong>Synchroniser maintenant</strong> pour lancer l’invitation sans attendre. Pour les mises à jour automatiques chaque nuit, cochez <strong>Synchroniser à tous les jours</strong>.</li>
      </ol>
      <div class="links">
        <a class="btn primary" href="https://docs.google.com/document/d/1ku9DqAvjSPxT8YkO24dQvw6GihcYWrnkD3a52Xixfog/edit?usp=drivesdk" target="_blank" rel="noopener noreferrer">Accéder au fichier</a>
        <a class="btn" href="https://appsp.ca/lancement/cardinal-roy/" target="_blank" rel="noopener noreferrer">Ouvrir AppSP</a>
      </div>
    </div>`;
  root.appendChild(card);
})();
