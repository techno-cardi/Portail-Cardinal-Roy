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
    "search-easter-eggs-extra.js", "admin-status.html", "admin-status.js",
]
for rel in required_paths:
    if not (ROOT / rel).exists():
        error(f"Composant de continuité manquant: {rel}")

config = read_json(CONFIG_PATH)
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
        if target:
            if target in targets:
                warn(f"Deux nouveautés de réserve utilisent la même cible: {target}")
            targets.add(target)

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
