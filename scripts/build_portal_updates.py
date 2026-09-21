#!/usr/bin/env python3
import json
import re
import subprocess
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

CURATED = Path('portal-updates-curated.json')
OUTPUT = Path('portal-updates.json')
DEFAULT_LIFETIME_DAYS = 28
MAX_OUTPUT_ITEMS = 12
HISTORY_DAYS = 180
TZ = ZoneInfo('America/Toronto')

PREFIX_RE = re.compile(r'^(Nouveauté|Nouveaute|Mise à jour|Mise a jour)\s*:\s*(.+)$', re.I)
META_RE = re.compile(r'^(Résumé|Resume|Cible|Lien|Expire|Expiration)\s*:\s*(.+)$', re.I)
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


def normalize_item(raw, fallback_id):
    if not isinstance(raw, dict):
        return None
    title = str(raw.get('title') or '').strip()
    published_at = normalize_date(raw.get('published_at') or raw.get('date'))
    if not title or not published_at:
        return None
    expires_at = normalize_date(raw.get('expires_at')) or default_expiration(published_at)
    return {
        'id': str(raw.get('id') or fallback_id),
        'title': title,
        'description': str(raw.get('description') or '').strip(),
        'published_at': published_at,
        'expires_at': expires_at,
        'target': safe_target(raw.get('target')),
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


def git_log_records():
    command = [
        'git', 'log',
        f'--since={HISTORY_DAYS} days ago',
        '--pretty=format:%H%x1f%cI%x1f%an%x1f%s%x1f%b%x1e',
    ]
    result = subprocess.run(command, check=True, capture_output=True, text=True)
    records = []
    for chunk in result.stdout.split('\x1e'):
        chunk = chunk.strip('\n\r ')
        if not chunk:
            continue
        parts = chunk.split('\x1f', 4)
        if len(parts) != 5:
            continue
        sha, committed_at, author, subject, body = parts
        records.append((sha.strip(), committed_at.strip(), author.strip(), subject.strip(), body.strip()))
    return records


def commit_items():
    items = []
    for sha, committed_at, author, subject, body in git_log_records():
        if author == 'github-actions[bot]':
            continue
        match = PREFIX_RE.match(subject)
        if not match:
            continue

        prefix, title = match.groups()
        title = title.strip()
        if not title:
            continue

        try:
            committed_dt = datetime.fromisoformat(committed_at.replace('Z', '+00:00'))
            committed_date = committed_dt.astimezone(TZ).date().isoformat()
        except ValueError:
            committed_date = datetime.now(TZ).date().isoformat()

        metadata = {}
        free_lines = []
        for raw_line in body.splitlines():
            line = raw_line.strip()
            if not line:
                continue
            meta = META_RE.match(line)
            if meta:
                key, value = meta.groups()
                metadata[key.lower()] = value.strip()
            else:
                free_lines.append(line)

        description = metadata.get('résumé') or metadata.get('resume') or (free_lines[0] if free_lines else '')
        target = metadata.get('cible') or metadata.get('lien') or ''
        expires_at = normalize_date(metadata.get('expire') or metadata.get('expiration')) or default_expiration(committed_date)
        kind = 'maj' if prefix.lower().startswith('mise') else 'nouveau'

        items.append({
            'id': f'commit-{sha[:10]}',
            'title': title,
            'description': description,
            'published_at': committed_date,
            'expires_at': expires_at,
            'target': safe_target(target),
            'kind': kind,
        })
    return items


def dedupe_and_filter(items):
    today = datetime.now(TZ).date().isoformat()
    items = [item for item in items if item['published_at'] <= today and item['expires_at'] >= today]
    # Tri stable : les commits sont fournis avant les entrées de réserve, donc une mise à
    # jour publiée le même jour remplace bien la carte de réserve correspondante.
    items.sort(key=lambda item: item['published_at'], reverse=True)

    seen = set()
    output = []
    for item in items:
        target = item.get('target', '').casefold()
        # Une même destination représente la même procédure même si son titre change.
        # Sans cible, on retombe sur le titre pour éviter les doublons textuels.
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
    # Les commits passent en premier pour qu'une vraie mise à jour prenne la place de la
    # carte de réserve si les deux partagent la même date et la même destination.
    items = dedupe_and_filter(commit_items() + curated_items())
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
