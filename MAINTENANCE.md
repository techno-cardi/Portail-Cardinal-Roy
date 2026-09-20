# Maintenance du Portail Cardinal-Roy

Ce document décrit la façon officielle d’ajouter, modifier ou retirer une ressource sans recréer l’empilement historique de correctifs.

## Règles de base

1. Ne pas créer de nouveau fichier `source-patches-N.js` pour une nouvelle ressource.
2. Toute nouvelle ressource doit avoir un identifiant stable en minuscules avec tirets, une catégorie explicite et des mots-clés assez riches pour la recherche.
3. Les nouvelles ressources doivent passer par `PORTAL_SOURCE_API` et être déclarées dans `managed-resources.js`.
4. Une suppression doit retirer la ressource à sa source plutôt que la masquer seulement avec CSS ou un correctif tardif.
5. Une ressource existante ne doit jamais être recréée sous un deuxième identifiant pour contourner un problème de mise à jour.
6. La navigation et les catégories sont validées avant l’indexation finale par `portal-maintenance.js`.
7. Toute modification importante doit laisser les tests Playwright verts ou, au minimum, ne pas ajouter de nouvel échec à une anomalie déjà connue et documentée.

## Catégories reconnues

- `commencer`
- `classe`
- `encadrement-sae`
- `suivi`
- `organisation`
- `organisation-scolaire`
- `outils`

`portal-source-api.js` refuse les catégories inconnues pour les ressources gérées.

## Ajouter une ressource

Utiliser `PORTAL_SOURCE_API.upsert()` avec au minimum :

- `id`
- `title`
- `category`
- `keywords`
- `body`

`subtitle`, `icon`, `owner` et `updatedAt` sont recommandés lorsque pertinents.

La ressource doit ensuite être ajoutée à `managed-resources.js` afin que son existence, sa catégorie, ses mots-clés et son rendu soient audités automatiquement.

## Modifier une ressource

Conserver le même `id`. Modifier le contenu ou les métadonnées à la source. Éviter d’ajouter un correctif qui réécrit ensuite le même bloc dans un autre fichier.

Si la catégorie change, mettre à jour la catégorie déclarée dans `managed-resources.js`. `portal-maintenance.js` replacera la ressource dans la bonne section avant l’indexation de recherche.

## Retirer une ressource

Retirer sa définition ou utiliser `PORTAL_SOURCE_API.remove(id)` au bon endroit dans la chaîne de chargement. Retirer également sa déclaration de `managed-resources.js` et toute référence spécifique dans la recherche, les alias, les accès rapides ou les tests.

Ne pas laisser un fichier, une entrée de navigation ou un alias orphelin.

## Mots-clés

Les mots-clés doivent représenter la façon dont le personnel cherche réellement la ressource :

- nom officiel;
- variantes avec ou sans accents;
- expressions courantes;
- fautes plausibles lorsque pertinentes;
- intention de l’utilisateur;
- nom de l’application ou du service associé.

Éviter les listes artificiellement longues qui répètent le même mot sans ajouter d’intention de recherche.

## Garde-fous automatiques

`portal-maintenance.js` vérifie notamment :

- les identifiants dupliqués dans la source et dans le portail rendu;
- les ressources gérées déclarées mais absentes;
- les titres manquants;
- les mots-clés trop faibles;
- les catégories invalides ou absentes;
- les ressources rendues dans la mauvaise catégorie;
- les liens JavaScript dangereux;
- les liens de navigation vers des sections inexistantes.

`tests/maintenance-contract.spec.js` verrouille ce contrat dans la CI sur Chrome, Firefox, WebKit, Android et iOS.

## Architecture à préserver

Le vieux contenu `body-part-*.txt` demeure pour l’instant une source historique utilisée par le portail. Il ne faut pas le supprimer simplement parce qu’il n’est pas visible directement.

Les anciennes couches `source-patches.js` à `source-patches-8.js` sont conservées seulement lorsqu’elles ont encore une responsabilité active. Les nouvelles fonctionnalités doivent être ajoutées via la couche de gestion actuelle afin que cette série ne recommence pas à croître.

Le but à long terme est de pouvoir modifier le portail par petites opérations prévisibles : ajouter une ressource, changer ses mots-clés, changer sa catégorie ou la retirer, sans devoir comprendre toute l’histoire du site à chaque intervention.
