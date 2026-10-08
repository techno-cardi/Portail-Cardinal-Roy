# Contrat stable de l'éditeur Agenda

La planification pédagogique est une **donnée**. L'éditeur est du **code applicatif**.
Une mise à jour de cours, d'échéance, de devoir ou de rappel ne doit **jamais**
modifier `app.js`, `editor-enter.js`, `editor-text-tools.js`, les styles
de l'éditeur ou son système de sauvegarde.

## Format stable d'une case

- Activités de cours: une ligne par activité, préfixée par `1. `, `2. `, etc.
- Rappels, dates importantes, échéances, devoirs et consignes: lignes
  **sans** préfixe numérique, placées après les activités.
- Une ligne vide sépare les activités numérotées des informations annexes.
- Ne jamais ajouter de `5.`, `6.`, etc. vides pour créer de l'espace.
- Les liens ` | https://...` et les marqueurs de mise en forme existants sont
  des données à préserver à l'identique.
- Conserver les textes, dates, pages, liens et devoirs non concernés par la demande.

`planner_notes.body` contient des lignes séparées par `\n`.
L'éditeur déduit les points numérotés **uniquement** des lignes commençant
par un entier suivi d'un point et d'une espace. Un rappel doit être stocké
comme `Rappel : ...`, pas comme `8. Rappel : ...`.
Les modifications de contenu se font uniquement dans les lignes concernées
et avec une sauvegarde préalable dans `planner_history`.

## Comportements garantis

1. `Entrée` dans un point rempli: scinder le texte à la position du curseur,
   préserver la mise en forme et créer un point numéroté suivant.
2. `Entrée` dans un point vide: sortir de la numérotation sans générer
   de point vide supplémentaire.
3. `Retour arrière` au début d'un point, même rempli: enlever sa numérotation
   sans supprimer le texte ni l'italique.
4. `Retour arrière` dans un point vide: le convertir en ligne ordinaire.
5. `Maj + Entrée`: créer une ligne ordinaire.
6. Une ligne ordinaire reste ordinaire quand on la modifie.
7. `Ctrl + A`, `Ctrl + I`, les guillemets `« ... »`, les liens, la
   sélection et l'enregistrement automatique restent fonctionnels.
8. Les claviers mobiles doivent aussi gérer la suppression via
   `beforeinput/deleteContentBackward`.
9. La sélection à la souris ou au clavier peut traverser plusieurs activités.
   Saisir du texte remplace **toute** cette sélection, et `Retour arrière`,
   `Supprimer`, `Couper` ou `Coller` portent sur tous les points concernés.
10. Une sélection partielle laisse intactes les parties de la première et
    de la dernière ligne qui sont hors sélection. Les cellules voisines et
    les liens hors sélection ne doivent jamais être modifiés.
11. `Ctrl + A` conserve la sélection de toute la case, pas seulement du
    point actif. La sélection multiligne doit rester visible pendant
    le glissement et après le relâchement de la souris.

## Garde-fous

- Exécuter les tests `tests/agenda-reliability.spec.js` sur Chrome,
  Firefox, WebKit et les projets mobiles avant toute modification volontaire
  de l'éditeur.
- Mettre à jour les deux références de version de script dans `index.html`
  et `sw.js` ainsi que le nom du cache PWA pour toute correction de l'éditeur.
- Ne jamais « réparer » une planification par une modification du moteur
  d'édition. Corriger les données seules lorsque le moteur respecte déjà ce contrat.
- Ajouter un test de non-régression si un comportement listé ici est en défaut.
