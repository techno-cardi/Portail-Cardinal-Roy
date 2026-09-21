# Portail Cardinal-Roy - consignes obligatoires

Avant toute modification importante de ce dépôt, lire dans `techno-cardi/database` :

1. `Portail Cardinal-Roy/README.md`
2. `Portail Cardinal-Roy/SKILL.md`
3. `Portail Cardinal-Roy/CURRENT_STATE.md`
4. le document spécialisé correspondant au travail demandé.

Le présent dépôt est la source du code exécutable. `techno-cardi/database/Portail Cardinal-Roy/` est la source durable du savoir, des décisions et des procédures de reprise. Ne pas dupliquer le code complet dans `database`.

## Contraintes non négociables

- rester gratuit;
- rester rapide sur les postes scolaires et sur mobile;
- ne pas ajouter de SaaS payant ou de service requis au rendu du portail;
- Supabase et les analytics doivent rester optionnels;
- préserver recherche, clavier, focus visible, mobile et `prefers-reduced-motion`;
- ne jamais stocker de secret, cookie, jeton, donnée élève ou clé privée dans GitHub;
- ne jamais supprimer une couche qui semble redondante avant d'avoir vérifié son chargement indirect, ses MutationObserver, ses globals et ses tests.

## Ajouter une ressource

Le chemin normal doit rester court : contenu + ID stable + catégorie + lien + quelques alias métier au besoin + décision de nouveauté + test de trouvabilité si la ressource est importante.

La recherche couvre déjà le contenu, les accents, des synonymes et les fautes légères avec Levenshtein. Ne pas créer des listes massives de fautes.

## Nouveautés

Pour un changement visible, prendre une décision explicite dans le commit :

- `Nouveauté: ...`
- `Mise à jour: ...`
- ou `[sans nouveauté]` pour un changement volontairement non annoncé.

`portal-updates.json` est généré. Pour une entrée manuelle, modifier `portal-updates-curated.json`.

## Validation rapide

Exécuter `python scripts/maintenance_guard.py` pour les contrats de maintenance. Les changements UI ou recherche doivent aussi conserver la suite Playwright pertinente.

## Calendrier annuel

`portal-maintenance.json` est le manifeste de référence de maintenance pour l'année scolaire. Tant que les Easter eggs n'utilisent pas une configuration runtime unique, le garde de maintenance vérifie que leurs constantes restent synchronisées.
