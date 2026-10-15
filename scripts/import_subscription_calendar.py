#!/usr/bin/env python3
"""Importe exclusivement les dates administratives issues de Google Apps Script.

Le payload GitHub est non fiable : aucune description, aucun participant, aucun
lieu et aucune donnée personnelle ne doivent entrer dans le dépôt.
"""
import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

from scripts import build_news_feed as feed

ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT = ROOT / "calendar-subscription-feed.json"
MAX_EVENTS = 180
REFRESH_AFTER = timedelta(hours=8)


def parse_time(value):
    if not isinstance(value, str) or len(value) > 40:
        raise ValueError("Horodatage absent ou invalide")
    value = value.replace("Z", "+00:00")
    when = datetime.fromisoformat(value)
    if when.tzinfo is None:
        raise ValueError("Fuseau horaire manquant")
    return when.astimezone(feed.TZ)


def normalize_payload(payload, now=None):
    now = now or datetime.now(feed.TZ)
    if not isinstance(payload, dict) or payload.get("schema") != 1:
        raise ValueError("Version de synchronisation non reconnue")
    if payload.get("calendar_id") != feed.SUBSCRIPTION_CALENDAR_ID:
        raise ValueError("Calendrier source non reconnu")
    generated_at = parse_time(payload.get("generated_at"))
    if not -timedelta(minutes=20) <= now - generated_at <= timedelta(hours=2):
        raise ValueError("Envoi périmé ou horodatage futur")
    raw = payload.get("events")
    if not isinstance(raw, list) or len(raw) > MAX_EVENTS:
        raise ValueError("Liste d'événements invalide ou trop volumineuse")

    result = []
    rejected = 0
    start_limit = now - timedelta(days=2)
    end_limit = now + timedelta(days=feed.FEED_CONFIG["horizon_days"] + 2)
    for item in raw:
        if not isinstance(item, dict):
            rejected += 1
            continue
        title = item.get("title")
        if not isinstance(title, str) or not 3 <= len(title.strip()) <= 180:
            rejected += 1
            continue
        title = title.strip()
        if feed.is_noise(title) or not feed.is_administrative_title(title):
            rejected += 1
            continue
        try:
            start = parse_time(item.get("start"))
            end = parse_time(item.get("end"))
        except (TypeError, ValueError):
            rejected += 1
            continue
        if (type(item.get("all_day")) is not bool or
                end <= start or end - start > timedelta(days=16)):
            rejected += 1
            continue
        if end < start_limit or start > end_limit:
            continue
        title = feed.public_event_title(title)
        icon, kind = feed.event_icon(title)
        result.append({
            "title": title,
            "start": start.isoformat(),
            "end": end.isoformat(),
            "all_day": item["all_day"],
            "kind": kind,
            "icon": icon,
        })
    print(f"Événements administratifs reçus: {len(result)}, rejetés: {rejected}.")
    return sorted(feed.deduplicate_events(result), key=lambda item: item["start"])


def save_snapshot(events, *, now=None, output=SNAPSHOT):
    now = now or datetime.now(feed.TZ)
    previous = None
    if output.exists():
        try:
            previous = json.loads(output.read_text(encoding="utf-8"))
        except (ValueError, OSError):
            pass
    if previous and previous.get("items") == events:
        try:
            last = parse_time(previous.get("synced_at"))
            if timedelta(0) <= now - last < REFRESH_AFTER:
                print("Calendrier inchangé, actualisation de fraîcheur non nécessaire.")
                return False
        except (TypeError, ValueError):
            pass
    output.write_text(json.dumps({
        "schema": 1,
        "synced_at": now.isoformat(),
        "items": events,
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Instantané du calendrier partagé enregistré: {len(events)} événements.")
    return True


def main():
    if os.environ.get("GITHUB_EVENT_NAME") != "repository_dispatch":
        print("Pas de livraison Apps Script pour cette exécution.")
        return 0
    event_path = Path(os.environ["GITHUB_EVENT_PATH"])
    payload = json.loads(event_path.read_text(encoding="utf-8"))
    if payload.get("action") != "cardinal_dates_subscription_update":
        print("Type de livraison non pris en charge.")
        return 1
    data = payload.get("client_payload")
    if not isinstance(data, dict):
        print("Livraison vide ou malformée.", file=sys.stderr)
        return 1
    try:
        events = normalize_payload(data)
        save_snapshot(events)
    except (ValueError, TypeError, KeyError, OSError) as exc:
        print(f"ERREUR: livraison du calendrier refusée ({exc}).", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
