# Synchronisation authentifiée du calendrier Dates importantes

Ce raccordement synchronise les événements institutionnels du calendrier scolaire **Cardinal-Roy - Dates importantes 2026-2027**. Il n'est pas nécessaire de rendre ses détails publics dans Google Agenda ni de déployer une application Web ouverte.

## Mise en service (une seule fois)

1. Dans le compte Google scolaire qui voit les détails du calendrier, ouvrir https://script.google.com et créer un projet « Portail Cardinal-Roy - Dates importantes ».
2. Copier le fichier Code.gs du présent dossier dans l'éditeur Google Apps Script. Régler le fuseau horaire du projet sur America/Toronto.
3. Dans GitHub, ouvrir Settings > Developer settings > Personal access tokens > Fine-grained tokens. Créer un jeton restreint au dépôt techno-cardi/Portail-Cardinal-Roy avec la permission Contents: Read and write (Metadata: Read est implicite). Donner au jeton une expiration raisonnable et prévoir son renouvellement.
4. Dans Google Apps Script > Paramètres du projet > Propriétés du script, créer une propriété nommée GITHUB_PAT et y coller la valeur du jeton. Ne jamais publier ou transmettre ce jeton dans une conversation, une capture d'écran, un fichier GitHub ou le code source.
5. Sélectionner la fonction installCardinalSync dans Apps Script, puis cliquer Exécuter. Accorder les autorisations nécessaires : lecture de l'agenda, requêtes HTTPS externes et déclencheurs programmés. Cela expédie une première synchronisation et programme les suivantes toutes les 15 minutes.
6. Vérifier l'historique « Exécutions » dans Apps Script et le workflow GitHub « Mise à jour des dates importantes » : https://github.com/techno-cardi/Portail-Cardinal-Roy/actions/workflows/update-news-feed.yml

Si le CSS bloque Apps Script ou UrlFetchApp, il faudra son autorisation. Ne pas contourner les restrictions en rendant publics les détails du calendrier Google.

## Fonctionnement

Apps Script lit uniquement ce calendrier et sélectionne les événements institutionnels. Il n'envoie à GitHub que les titres, dates, heures et indicateurs de journées complètes. Jamais de lieux, descriptions, invités, courriels ni autres métadonnées privées. Les événements atypiques véritablement institutionnels peuvent être nommés avec le préfixe [PORTAIL].

GitHub revalide les événements selon les exclusions personnelles et le filtre institutionnel avant d'écrire un instantané public « calendar-subscription-feed.json ». Le moteur du bandeau fusionne cet instantané avec les sources scolaires historiques et élimine les doublons sans fusionner des heures distinctes.

Les changements de date et suppressions sont pris en compte lors des prochaines livraisons, qui remplacent toute la liste du calendrier partagé. Pour limiter les commits, l'instantané est mis à jour uniquement quand les événements changent ou après huit heures. Après 36 heures sans livraison, le moteur revient au flux iCal public partiel et préserve la continuité des deux autres calendriers.

Une réponse HTTP 204 confirme l'acceptation de la livraison par GitHub; vérifier ensuite que son workflow est terminé avec succès. Un jeton expiré doit être remplacé dans les propriétés du script.

## Sécurité

Ce dépôt est public. Les titres et dates ainsi transférés sont visibles dans le bandeau et dans l'instantané. Ne marquez [PORTAIL] que les événements destinés à être visibles publiquement. Conserver les projets Apps Script et leurs propriétés limités aux personnes habilitées.
