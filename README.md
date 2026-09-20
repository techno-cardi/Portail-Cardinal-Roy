# Portail Cardinal-Roy

Portail statique de référence pour le personnel de l’École secondaire Cardinal-Roy.

## Architecture actuelle

- `index.html` : point d’entrée et chargement séquentiel de l’interface
- `body-part-*.txt` : contenu source historique encore utilisé pour reconstruire les fiches
- `source-patches.js` à `source-patches-8.js` : enrichissements et correctifs appliqués au contenu avant le rendu; chaque couche conservée a une responsabilité encore utilisée
- `assets-map.js` : association de ressources et d’éléments visuels au contenu source
- `ui-polish.js` : reconstruction de l’interface, catégories et favoris
- `after-ui.js` : ajustements ciblés du contenu rendu et indexation des sous-ressources CSSC
- `portal-integrity.js` : garde-fous de structure et correctifs d’intégrité au rendu
- `global-search-flash.js` : moteur de recherche actif unique, recherche tolérante aux fautes, navigation au clavier, surlignage sécuritaire, ouverture des fiches, flash visuel et retour en haut
- `source-patches-8.js` charge au besoin les compléments `home-compact.js`, `search-easter-egg.js`, `search-easter-eggs-extra.js`, `search-resource-suggestion.js`, `portal-registry.js`, `portal-upgrades.js`, `portal-analytics-remote.js` et `daily-thought.js`
- `styles.css`, `guide-updates.css`, `logo.css`, `home-compact.css`, `portal-upgrades.css` : mise en page et identité visuelle

## Robustesse

Le moteur de recherche remplace au chargement les anciens écouteurs de recherche afin qu’un seul moteur soit actif. Les résultats normaux et les sous-ressources d’Applications CSSC sont indexés ensemble.

Les correctifs qui touchent une même ressource sont consolidés afin d’éviter qu’une couche tardive réécrive inutilement le résultat d’une couche précédente. Les tests Playwright couvrent notamment le chargement du portail, la recherche, l’affichage compact et les ressources critiques.

Le logo Mozaïk-Portail utilisé pour les présences et les avis SOI est intégré directement au portail. Les autres images distantes disposent d’un remplacement visuel automatique si leur source devient indisponible, afin d’éviter les icônes d’image brisée.

Le portail est publié automatiquement avec GitHub Pages à partir de la branche `main`.
