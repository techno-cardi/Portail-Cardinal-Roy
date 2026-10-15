# Synchronisation authentifiée du calendrier Dates importantes

Ce raccordement synchronise tous les événements du calendrier dédié **Cardinal-Roy - Dates importantes 2026-2027**. Il n'est pas nécessaire de rendre ses détails publics dans Google Agenda ni de déployer une application Web ouverte.

## Mise en service (une seule fois)

1. Dans le compte Google scolaire qui voit les détails du calendrier, ouvrir https://script.google.com et créer un projet « Portail Cardinal-Roy - Dates importantes ».
2. Copier le fichier Code.gs du présent dossier dans l'éditeur Google Apps Script. Régler le fuseau horaire du projet sur America/Toronto.
3. Dans GitHub, ouvrir Settings > Developer settings > Personal access tokens > Fine-grained tokens. Créer un jeton restreint au dépôt techno-cardi/Portail-Cardinal-Roy avec la permission Contents: Read and write (Metadata: Read est implicite). Donner au jeton une expiration raisonnable et prévoir son renouvellement.
4. Dans Google Apps Script > Paramètres du projet > Propriétés du script, créer une propriété nommée GITHUB_PAT et y coller la valeur du jeton. Ne jamais publier ou transmettre ce jeton dans une conversation, une capture d'écran, un fichier GitHub ou le code source.
5. Sélectionner la fonction installCardinalSync dans Apps Script, puis cliquer Exécuter. Accorder les autorisations nécessaires : lecture de l'agenda, requêtes HTTPS externes et déclencheurs programmés. Cela expédie une première synchronisation et programme les suivantes toutes les 15 minutes.
6. Vérifier l'historique « Exécutions » dans Apps Script et le workflow GitHub « Mise à jour des dates importantes » : https://github.com/techno-cardi/Portail-Cardinal-Roy/actions/workflows/update-news-feed.yml

Si le CSS bloque Apps Script ou UrlFetchApp, il faudra son autorisation. Ne pas contourner les restrictions en rendant publics les détails du calendrier Google.

## Fonctionnement

Apps Script lit uniquement le calendrier « Cardinal-Roy - Dates importantes 2026-2027 » et transmet TOUS ses événements, sans filtrer les titres. Il n'envoie à GitHub que les titres, dates, heures et indicateurs de journées complètes. Jamais de lieux, descriptions, invités, courriels ni autres métadonnées privées. Chaque événement ajouté à ce calendrier est présumé destiné au bandeau public.

GitHub valide l'identifiant de la source et le format des événements, mais n'exclut aucun titre provenant de ce calendrier dédié. Le moteur du bandeau fusionne cet instantané avec les sources scolaires historiques, où le filtre des événements institutionnels et les exclusions personnelles continuent de s'appliquer. Les doublons sont éliminés sans fusionner des séances distinctes.

Les changements de date et suppressions sont pris en compte lors des prochaines livraisons, qui remplacent toute la liste du calendrier partagé. Pour limiter les commits, l'instantané est mis à jour uniquement quand les événements changent ou après huit heures. Après 36 heures sans livraison, le moteur revient au flux iCal public partiel et préserve la continuité des deux autres calendriers.

Une réponse HTTP 204 confirme l'acceptation de la livraison par GitHub; vérifier ensuite que son workflow est terminé avec succès. Un jeton expiré doit être remplacé dans les propriétés du script.

## Sécurité

Ce dépôt est public. TOUS les titres et dates du calendrier dédié ainsi transférés peuvent être visibles dans le bandeau et l'instantané. Ne placer dans ce calendrier aucun événement personnel ou confidentiel. Les exclusions des événements privés sont maintenues sur les calendriers scolaires historiques, pas sur celui-ci. Conserver le projet Apps Script et ses propriétés limités aux personnes habilitées.

**Mise à jour du code après l'activation initiale :** une modification du fichier Code.gs sur GitHub ne change pas automatiquement le code dans le projet Apps Script scolaire. Remplacer le Code.gs du projet par sa version à jour, enregistrer et exécuter `syncCardinalDates` une fois. Le déclencheur `installCardinalSync` déjà installé reste actif et utilise ensuite automatiquement la version enregistrée.
