# Instructions Portail Cardinal-Roy

Avant de modifier ce dépôt, consulter `techno-cardi/database/Portail Cardinal-Roy/README.md`, puis `SKILL.md` et `CURRENT_STATE.md`.

Priorités : portail gratuit, rapide, simple à maintenir, recherche robuste, mobile et accessibilité préservés. Ne jamais ajouter de secret ou de donnée élève au dépôt.

Une nouvelle ressource doit rester simple à ajouter. Utiliser l'indexation automatique, quelques alias métier, les synonymes et le fuzzy existant plutôt qu'une liste massive de mots-clés ou de fautes.

Pour une modification visible, décider explicitement `Nouveauté:`, `Mise à jour:` ou `[sans nouveauté]`.

`portal-updates.json` est généré. `portal-updates-curated.json` est la source manuelle.

Avant de supprimer un script, vérifier son chargement indirect depuis les `source-patches`, ses globals, MutationObserver et tests. `source-patches-8.js` charge notamment plusieurs modules après l'initialisation de la recherche.

Exécuter `python scripts/maintenance_guard.py` pour un contrôle rapide des contrats essentiels.
