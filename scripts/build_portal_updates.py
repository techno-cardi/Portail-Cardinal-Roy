#!/usr/bin/env python3
import json
import re
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

CURATED = Path('portal-updates-curated.json')
OUTPUT = Path('portal-updates.json')
MAINTENANCE = Path('portal-maintenance.json')
DEFAULT_LIFETIME_DAYS = 28
MAX_OUTPUT_ITEMS = 12
TZ = ZoneInfo('America/Toronto')
DATE_RE = re.compile(r'^\d{4}-\d{2}-\d{2}$')


def read_json(path):
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError(f'Impossible de lire {path}: {exc}') from exc


def normalize_date(value):
    text = str(value or '').strip()[:10]
    if not DATE_RE.match(text):
        return ''
    try:
        return date.fromisoformat(text).isoformat()
    except ValueError:
        return ''


def default_expiration(published_at):
    return (date.fromisoformat(published_at) + timedelta(days=DEFAULT_LIFETIME_DAYS)).isoformat()


def safe_target(value):
    target = str(value or '').strip()
    if re.match(r'^#[A-Za-z0-9][A-Za-z0-9_-]*$', target):
        return target
    if target.startswith('https://'):
        return target
    return ''


def normalize_kind(value):
    return 'maj' if str(value or '').strip().lower() in {'maj', 'mise à jour', 'mise a jour'} else 'nouveau'


def normalize_target_type(value):
    text = str(value or '').strip().lower()
    if text in {'file', 'fichier'}:
        return 'file'
    if text in {'section', 'page', 'ancre'}:
        return 'section'
    return ''


def direct_files():
    config = read_json(MAINTENANCE)
    raw = config.get('direct_files', {}) if isinstance(config, dict) else {}
    entries = []
    for key, value in raw.items():
        if not isinstance(value, dict):
            continue
        resource_id = str(value.get('resource_id') or '').strip()
        url = safe_target(value.get('url'))
        if resource_id and url.startswith('https://'):
            entries.append({'key': key, 'resource_id': resource_id, 'url': url})
    return entries


def resolve_target(value, target_type=''):
    target = safe_target(value)
    if target_type == 'section':
        return target if target.startswith('#') else ''

    if target_type != 'file':
        return ''

    entries = direct_files()
    if target.startswith('#'):
        resource_id = target[1:]
        match = next((entry for entry in entries if entry['resource_id'] == resource_id), None)
        return match['url'] if match else ''

    if target.startswith('https://'):
        return target if any(entry['url'] == target for entry in entries) else ''
    return ''


def normalize_item(raw, fallback_id):
    if not isinstance(raw, dict):
        return None
    title = str(raw.get('title') or '').strip()
    published_at = normalize_date(raw.get('published_at') or raw.get('date'))
    if not title or not published_at:
        return None

    target_type = normalize_target_type(raw.get('target_type'))
    if not target_type:
        raise RuntimeError(f'Nouveauté « {title} »: target_type explicite requis (file ou section).')

    target = resolve_target(raw.get('target'), target_type)
    if not target:
        raise RuntimeError(f'Nouveauté « {title} »: cible invalide ou non déclarée pour target_type={target_type}.')

    expires_at = normalize_date(raw.get('expires_at')) or default_expiration(published_at)
    return {
        'id': str(raw.get('id') or fallback_id),
        'title': title,
        'description': str(raw.get('description') or '').strip(),
        'published_at': published_at,
        'expires_at': expires_at,
        'target': target,
        'target_type': target_type,
        'kind': normalize_kind(raw.get('kind')),
    }


def curated_items():
    payload = read_json(CURATED)
    items = payload.get('items', []) if isinstance(payload, dict) else []
    normalized = []
    for index, raw in enumerate(items):
        item = normalize_item(raw, f'curated-{index + 1}')
        if item:
            normalized.append(item)
    return normalized


def dedupe_and_filter(items):
    today = datetime.now(TZ).date().isoformat()
    items = [item for item in items if item['published_at'] <= today and item['expires_at'] >= today]
    items.sort(key=lambda item: item['published_at'], reverse=True)

    seen = set()
    output = []
    for item in items:
        target = item.get('target', '').casefold()
        key = ('target', target) if target else ('title', item['title'].casefold())
        if key in seen:
            continue
        seen.add(key)
        output.append(item)
        if len(output) >= MAX_OUTPUT_ITEMS:
            break
    return output


def current_items():
    payload = read_json(OUTPUT)
    return payload.get('items') if isinstance(payload, dict) else None


def main():
    # Les Nouveautés visibles sont une liste éditoriale explicite.
    # Ne jamais dériver cette section de l'historique Git ou de commits techniques.
    # Chaque entrée doit déclarer sa nature: fichier final ou section du portail.
    items = dedupe_and_filter(curated_items())
    if current_items() == items:
        print('Aucun changement dans les nouveautés du portail.')
        return 0

    payload = {
        'generated_at': datetime.now(TZ).isoformat(),
        'default_lifetime_days': DEFAULT_LIFETIME_DAYS,
        'max_visible': 3,
        'items': items,
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'{len(items)} nouveauté(s) active(s) écrite(s) dans {OUTPUT}.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
