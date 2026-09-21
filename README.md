# Portail Cardinal-Roy

Portail statique de référence pour le personnel de l’École secondaire Cardinal-Roy.

## Documentation durable et reprise

Avant toute modification importante, lire `AGENTS.md`.

La documentation de continuité complète se trouve dans le dépôt `techno-cardi/database`, dossier `Portail Cardinal-Roy/`. Elle est conçue pour permettre une reprise depuis un autre compte ChatGPT ou par un autre développeur sans dépendre d'anciennes conversations.

Le code exécutable reste dans ce dépôt. Les décisions, règles, pièges, workflows et procédures de reprise sont documentés dans `database` afin d'éviter deux copies divergentes du code.

## Architecture actuelle

- `index.html` : point d’entrée et chargement de l’interface
- `body-part-*.txt` : contenu source historique utilisé pour reconstruire les fiches
- `source-patches.js` à `source-patches-9.js` : enrichissements du contenu avant rendu
- `ui-polish.js` : reconstruction de l’interface, catégories et favoris
- `after-ui.js` : ajustements ciblés du contenu rendu et indexation des sous-ressources CSSC
- `global-search-flash.js` : moteur de recherche actif unique, recherche tolérante aux fautes, navigation au clavier, surlignage sécuritaire, ouverture des fiches, flash visuel et retour en haut
- `portal-registry.js` : registre final, alias, synonymes, intentions, fuzzy et audit de santé
- `portal-updates.js` : section compacte des nouveautés, limitée aux 3 ajouts récents
- `portal-updates.json` : fil généré automatiquement pour les nouveautés actives
- `portal-updates-curated.json` : ajouts manuels lorsque la nouveauté ne correspond pas à un commit GitHub
- `portal-maintenance.json` : manifeste léger des invariants de maintenance et de l'année scolaire
- `scripts/build_portal_updates.py` : génération et expiration automatique des nouveautés
- `scripts/maintenance_guard.py` : vérification rapide sans dépendance externe
- `styles.css`, `guide-updates.css`, `logo.css` : mise en page et identité visuelle

Important : plusieurs modules ne sont pas chargés directement par `index.html`. `source-patches-8.js` attend que la recherche soit prête puis charge notamment les Easter eggs, les suggestions supplémentaires, le registre, les upgrades et l'analytics distante. Ne jamais conclure qu'un fichier est inutilisé uniquement parce qu'il n'apparaît pas dans `index.html`.

## Ajouter une ressource

Le processus normal doit rester court :

1. ajouter la ressource avec un ID stable, un titre, son contenu et son lien;
2. vérifier sa catégorie;
3. ajouter seulement quelques alias métier si le vocabulaire naturel n'est pas déjà dans le contenu;
4. prendre une décision de nouveauté;
5. ajouter un test de trouvabilité si la ressource est importante.

Le moteur normalise les accents et apostrophes, utilise synonymes, intentions et Levenshtein. Il n'est pas nécessaire d'écrire manuellement toutes les fautes possibles.

## Nouveautés du portail

La section « Nouveautés » est volontairement légère : au maximum 3 éléments sont affichés. Sur ordinateur, ils sont présentés côte à côte; sur mobile, une carte est affichée à la fois avec navigation, balayage et rotation automatique lorsque les animations sont permises.

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

Pour un changement visible qui ne doit volontairement pas être annoncé, ajouter `[sans nouveauté]` au message de commit. Le garde de maintenance émet un avertissement si un fichier de contenu visible change sans décision explicite.

`Cible:` accepte un identifiant interne du portail (`#reservation`) ou une adresse `https://`. Sans expiration explicite, l’élément reste actif 28 jours.

Pour une nouveauté qui ne produit pas de commit dans le dépôt, ajouter l’élément dans `portal-updates-curated.json`. Le workflow `.github/workflows/update-portal-updates.yml` reconstruit le fil à chaque changement du dépôt et une fois par jour afin de retirer les éléments expirés.

## Santé et administration

`admin-status.html` centralise l'état du registre, la couverture de recherche, la fraîcheur, les analytics et la maintenance. La couche de maintenance affiche aussi les nouveautés, le dernier contrôle de liens, l'échéance annuelle et les dernières exécutions GitHub Actions. Ces appels ne sont faits que sur la page admin et n'affectent jamais la page du personnel.

Le contrôle des liens écrit `link-health.json`. Les vrais 404/410 et fichiers locaux absents sont considérés brisés; les pannes réseau temporaires, 5xx et pages protégées restent des avertissements ou des états protégés afin d'éviter les faux positifs.

## Robustesse

Le moteur de recherche remplace au chargement les anciens écouteurs de recherche afin qu’un seul moteur soit actif. Les résultats normaux et les sous-ressources d’Applications CSSC sont indexés ensemble.

Le logo Mozaïk-Portail utilisé pour les présences et les avis SOI est intégré directement au portail. Les autres images distantes disposent d’un remplacement visuel automatique si leur source devient indisponible, afin d’éviter les icônes d’image brisée.

Le portail est publié automatiquement avec GitHub Pages à partir de la branche `main`.
