#!/usr/bin/env python3
import json
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "portal-maintenance.json"
TZ = ZoneInfo("America/Toronto")
errors = []
warnings = []


def error(message):
    errors.append(message)
    print(f"ERROR: {message}")


def warn(message):
    warnings.append(message)
    print(f"WARNING: {message}")


def read_json(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        error(f"Fichier manquant: {path.relative_to(ROOT)}")
    except json.JSONDecodeError as exc:
        error(f"JSON invalide dans {path.relative_to(ROOT)}: {exc}")
    return {}


def valid_date(value):
    try:
        datetime.strptime(str(value), "%Y-%m-%d")
        return True
    except ValueError:
        return False


required_paths = [
    "AGENTS.md", ".github/copilot-instructions.md", "README.md", "portal-maintenance.json",
    "portal-updates-curated.json", "portal-updates.json", ".github/workflows/update-portal-updates.yml",
    ".github/workflows/update-news-feed.yml", ".github/workflows/check-links.yml", "search-easter-egg.js",
    "search-easter-eggs-extra.js", "direct-file-navigation.js", "admin-status.html", "admin-status.js",
]
for rel in required_paths:
    if not (ROOT / rel).exists():
        error(f"Composant de continuité manquant: {rel}")

config = read_json(CONFIG_PATH)
direct_files = {}
direct_by_resource = {}
if config:
    if config.get("version") != 1:
        error("portal-maintenance.json doit utiliser version 1.")
    constraints = config.get("constraints") or {}
    if constraints.get("free_only") is not True:
        error("La contrainte free_only doit rester vraie.")
    if constraints.get("paid_runtime_dependencies") is not False:
        error("paid_runtime_dependencies doit rester faux.")
    knowledge = config.get("knowledge") or {}
    if knowledge.get("repository") != "techno-cardi/database" or knowledge.get("path") != "Portail Cardinal-Roy":
        error("Le pointeur vers la documentation durable est incorrect.")

    school = config.get("school_year") or {}
    for field in ("label", "start", "end", "christmas_break", "spring_break", "rollover_review"):
        if not school.get(field):
            error(f"Champ school_year.{field} manquant.")
    for field in ("start", "end", "christmas_break", "spring_break", "rollover_review"):
        if school.get(field) and not valid_date(school[field]):
            error(f"Date invalide: school_year.{field}={school[field]}")

    calendar_feed = config.get("calendar_feed") or {}
    if calendar_feed.get("refresh_minutes") != 15:
        error("Le fil des dates importantes doit rester configuré à 15 minutes sauf décision documentée.")
    if calendar_feed.get("timezone") != "America/Toronto":
        error("Le fil calendrier doit utiliser America/Toronto.")

    generated = config.get("generated_files") or {}
    for output, source in generated.items():
        if not (ROOT / output).exists():
            error(f"Fichier généré déclaré mais absent: {output}")
        if not (ROOT / source).exists():
            error(f"Source/générateur déclaré mais absent: {source}")

    raw_direct_files = config.get("direct_files") or {}
    if not isinstance(raw_direct_files, dict) or not raw_direct_files:
        error("portal-maintenance.json doit déclarer les fichiers directs dans direct_files.")
    else:
        procedure_links_text = (ROOT / "procedure-links.js").read_text(encoding="utf-8", errors="replace")
        for key, entry in raw_direct_files.items():
            if not isinstance(entry, dict):
                error(f"Fichier direct {key}: objet attendu.")
                continue
            resource_id = str(entry.get("resource_id") or "").strip()
            url = str(entry.get("url") or "").strip()
            title = str(entry.get("title") or "").strip()
            action_label = str(entry.get("action_label") or "").strip()
            groups = entry.get("search_required_groups")
            if not resource_id:
                error(f"Fichier direct {key}: resource_id manquant.")
            elif resource_id in direct_by_resource:
                error(f"Deux fichiers directs utilisent resource_id={resource_id}.")
            if not url.startswith("https://"):
                error(f"Fichier direct {key}: URL HTTPS requise.")
            if not title:
                error(f"Fichier direct {key}: titre manquant.")
            if action_label != "Accéder au fichier":
                error(f"Fichier direct {key}: action_label doit être exactement « Accéder au fichier ».")
            if not isinstance(groups, list) or not groups or any(not isinstance(group, list) or not group for group in groups):
                error(f"Fichier direct {key}: search_required_groups doit contenir au moins un groupe non vide.")
            if url and url not in procedure_links_text:
                error(f"Fichier direct {key}: l'URL officielle n'est plus présente dans procedure-links.js.")
            direct_files[key] = entry
            if resource_id:
                direct_by_resource[resource_id] = entry
        if "direct-file-navigation.js" not in procedure_links_text:
            error("procedure-links.js ne charge plus direct-file-navigation.js.")

curated = read_json(ROOT / "portal-updates-curated.json")
if curated:
    ids = set()
    targets = set()
    for index, item in enumerate(curated.get("items", []), start=1):
        if not isinstance(item, dict):
            error(f"Nouvelle #{index}: objet JSON attendu.")
            continue
        item_id = str(item.get("id", "")).strip()
        title = str(item.get("title", "")).strip()
        published = str(item.get("published_at", "")).strip()
        expires = str(item.get("expires_at", "")).strip()
        target = str(item.get("target", "")).strip()
        target_type = str(item.get("target_type", "")).strip().lower()
        if not item_id or item_id in ids:
            error(f"Nouvelle #{index}: id absent ou dupliqué ({item_id or 'vide'}).")
        ids.add(item_id)
        if not title:
            error(f"Nouvelle {item_id or index}: titre absent.")
        if not valid_date(published):
            error(f"Nouvelle {item_id or index}: published_at invalide.")
        if expires and not valid_date(expires):
            error(f"Nouvelle {item_id or index}: expires_at invalide.")
        if target and not (target.startswith("#") or target.startswith("https://")):
            error(f"Nouvelle {item_id or index}: cible non sécuritaire ({target}).")
        if target_type and target_type != "file":
            error(f"Nouvelle {item_id or index}: target_type inconnu ({target_type}).")
        if target_type == "file":
            if target.startswith("#"):
                resource_id = target[1:]
                if resource_id not in direct_by_resource:
                    error(f"Nouvelle {item_id or index}: cible fichier #{resource_id} absente de direct_files.")
            elif not any(str(entry.get("url") or "") == target for entry in direct_files.values()):
                error(f"Nouvelle {item_id or index}: URL fichier non déclarée dans direct_files.")
        if target:
            if target in targets:
                warn(f"Deux nouveautés de réserve utilisent la même cible: {target}")
            targets.add(target)

updates_feed = read_json(ROOT / "portal-updates.json")
if updates_feed:
    for item in updates_feed.get("items", []):
        if not isinstance(item, dict) or str(item.get("target_type") or "").strip().lower() != "file":
            continue
        target = str(item.get("target") or "").strip()
        if not target.startswith("https://"):
            error(f"Nouveauté générée {item.get('id', '?')}: un fichier doit pointer directement vers HTTPS.")
        if not any(str(entry.get("url") or "") == target for entry in direct_files.values()):
            error(f"Nouveauté générée {item.get('id', '?')}: URL directe absente de direct_files.")

updates_builder = (ROOT / "scripts/build_portal_updates.py").read_text(encoding="utf-8", errors="replace")
for token in ("target_type", "direct_files", "resolve_target"):
    if token not in updates_builder:
        error(f"Le générateur des nouveautés ne gère plus le contrat fichier direct ({token} absent).")

updates_workflow = (ROOT / ".github/workflows/update-portal-updates.yml").read_text(encoding="utf-8", errors="replace")
for token in ("push:", "schedule:", "workflow_dispatch:", "concurrency:"):
    if token not in updates_workflow:
        error(f"Le workflow des nouveautés n'expose plus {token}")

news_workflow = (ROOT / ".github/workflows/update-news-feed.yml").read_text(encoding="utf-8", errors="replace")
for token in ("schedule:", "workflow_dispatch:", "concurrency:"):
    if token not in news_workflow:
        error(f"Le workflow des dates importantes n'expose plus {token}")
if "2-59/15 * * * *" not in news_workflow:
    error("La cadence du calendrier ne correspond plus au manifeste de maintenance (15 minutes).")
if "cancel-in-progress: true" not in news_workflow:
    error("Le workflow calendrier doit annuler une exécution devenue obsolète.")

index_text = (ROOT / "index.html").read_text(encoding="utf-8", errors="replace")
if not re.search(r"PORTAL_BUILD\s*=\s*['\"][0-9A-Za-z._-]+['\"]", index_text):
    error("PORTAL_BUILD est absent ou invalide dans index.html.")

if config:
    school = config.get("school_year") or {}
    expected = {
        "search-easter-egg.js": [school.get("start"), school.get("end"), school.get("christmas_break"), school.get("spring_break")],
        "search-easter-eggs-extra.js": [school.get("end"), school.get("christmas_break"), school.get("spring_break")],
    }
    for rel, values in expected.items():
        text = (ROOT / rel).read_text(encoding="utf-8", errors="replace")
        for value in filter(None, values):
            if value not in text:
                error(f"{rel} n'est plus synchronisé avec portal-maintenance.json ({value} absent).")

    review = school.get("rollover_review")
    if review and valid_date(review):
        today = datetime.now(TZ).date()
        review_date = datetime.strptime(review, "%Y-%m-%d").date()
        if today >= review_date:
            warn(f"Révision annuelle à faire: {school.get('label', 'année scolaire')} (seuil {review}).")

# Toute modification de code ou contenu exécuté par le portail doit prendre une
# décision explicite sur les Nouveautés. [sans nouveauté] est toujours permis.
event_name = os.environ.get("GITHUB_EVENT_NAME", "")
before = os.environ.get("PORTAL_BEFORE", "").strip()
if event_name == "push":
    try:
        if before and before != "0" * 40:
            changed = subprocess.check_output(["git", "diff", "--name-only", before, "HEAD"], cwd=ROOT, text=True, stderr=subprocess.DEVNULL).splitlines()
        else:
            changed = subprocess.check_output(["git", "diff", "--name-only", "HEAD^", "HEAD"], cwd=ROOT, text=True, stderr=subprocess.DEVNULL).splitlines()
        runtime_change = any(re.match(r"^body-part-.*\.txt$", path) or ("/" not in path and path.endswith((".js", ".css", ".html"))) for path in changed)
        author = subprocess.check_output(["git", "log", "-1", "--pretty=%an"], cwd=ROOT, text=True).strip()
        message = subprocess.check_output(["git", "log", "-1", "--pretty=%B"], cwd=ROOT, text=True).strip()
        decision = re.match(r"^(Nouveauté|Nouveaute|Mise à jour|Mise a jour)\s*:", message, re.I) or "[sans nouveauté]" in message.lower() or "[sans nouveaute]" in message.lower()
        if runtime_change and author != "github-actions[bot]" and not decision:
            error("Du code ou du contenu visible a changé sans décision de nouveauté. Utiliser `Nouveauté:`, `Mise à jour:` ou `[sans nouveauté]` dans le commit.")
    except (subprocess.CalledProcessError, FileNotFoundError):
        warn("Impossible d'évaluer la décision de nouveauté pour ce commit.")

print()
print(f"Garde de maintenance: {len(errors)} erreur(s), {len(warnings)} avertissement(s).")
if errors:
    sys.exit(1)
