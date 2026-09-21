# Portail Cardinal-Roy

Portail statique de référence pour le personnel de l’École secondaire Cardinal-Roy.

## Architecture actuelle

- `index.html` : point d’entrée et chargement de l’interface
- `body-part-*.txt` : contenu source historique utilisé pour reconstruire les fiches
- `source-patches.js` à `source-patches-4.js` : enrichissements du contenu avant rendu
- `ui-polish.js` : reconstruction de l’interface, catégories et favoris
- `after-ui.js` : ajustements ciblés du contenu rendu et indexation des sous-ressources CSSC
- `global-search-flash.js` : moteur de recherche actif unique, recherche tolérante aux fautes, navigation au clavier, surlignage sécuritaire, ouverture des fiches, flash visuel et retour en haut
- `portal-updates.js` : section compacte des nouveautés, limitée aux 3 ajouts récents
- `portal-updates.json` : fil généré automatiquement pour les nouveautés actives
- `portal-updates-curated.json` : ajouts manuels lorsque la nouveauté ne correspond pas à un commit GitHub
- `scripts/build_portal_updates.py` : génération et expiration automatique des nouveautés
- `styles.css`, `guide-updates.css`, `logo.css` : mise en page et identité visuelle

## Nouveautés du portail

La section « Nouveautés » est volontairement légère : au maximum 3 éléments sont affichés et une nouveauté expire par défaut après 28 jours. S’il n’y a aucun élément actif, toute la section disparaît automatiquement.

Pour publier automatiquement une nouveauté lors d’un changement GitHub, utiliser un message de commit commençant par :

```text
Nouveauté: Nouvelle procédure de réservation
```

ou :

```text
Mise à jour: Procédure de réservation simplifiée
```

Le corps du commit peut préciser facultativement :

```text
Résumé: Courte phrase affichée sous le titre.
Cible: #reservation
Expiration: 2026-10-31
```

`Cible:` accepte un identifiant interne du portail (`#reservation`) ou une adresse `https://`. Sans expiration explicite, l’élément reste actif 28 jours.

Pour une nouveauté qui ne produit pas de commit dans le dépôt, par exemple un ajout externe au portail, ajouter simplement l’élément dans `portal-updates-curated.json`. Le workflow `.github/workflows/update-portal-updates.yml` reconstruit le fil à chaque changement du dépôt et une fois par jour afin de retirer les éléments expirés.

## Robustesse

Le moteur de recherche remplace au chargement les anciens écouteurs de recherche afin qu’un seul moteur soit actif. Les résultats normaux et les sous-ressources d’Applications CSSC sont indexés ensemble.

Le logo Mozaïk-Portail utilisé pour les présences et les avis SOI est intégré directement au portail. Les autres images distantes disposent d’un remplacement visuel automatique si leur source devient indisponible, afin d’éviter les icônes d’image brisée.

Le portail est publié automatiquement avec GitHub Pages à partir de la branche `main`.
