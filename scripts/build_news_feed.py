#!/usr/bin/env python3
import json
import os
import re
import sys
import time as time_module
import urllib.parse
import urllib.request
from datetime import date, datetime, time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from icalendar import Calendar
import recurring_ical_events

TZ = ZoneInfo('America/Toronto')
ROOT = Path(__file__).resolve().parents[1]
FEED_CONFIG = json.loads((ROOT / 'portal-maintenance.json').read_text(encoding='utf-8'))['calendar_feed']
OUTPUT = ROOT / 'news-feed.json'
# Source de vérité commune au portail, à son lien d'abonnement et au générateur.
CALENDAR_ID = FEED_CONFIG['calendar_id']
PUBLIC_ICAL = (
    'https://calendar.google.com/calendar/ical/'
    + urllib.parse.quote(CALENDAR_ID, safe='')
    + '/public/basic.ics'
)

NOISE_PATTERNS = [
    re.compile(r'^Jour\s+\d+$', re.I),
    re.compile(r'^[A-ZÀ-ÖØ-Ý]{2,8}\d[A-Z0-9]{0,5}-\d{1,4}$'),
]


def urls_from_env():
    """Le calendrier affiché dans le portail est toujours prioritaire.

    L'URL privée historique ne sert que si la source officielle est inaccessible;
    elle ne peut plus masquer les modifications du calendrier partagé.
    """
    return (
        PUBLIC_ICAL,
        os.environ.get('CARDINAL_CALENDAR_ICAL_URL', '').strip(),
        os.environ.get('CARDINAL_SCHOOL_CALENDAR_ICAL_URL', '').strip(),
    )


def is_same_calendar(url):
    """Valide l'identité sans journaliser le lien privé ou ses paramètres."""
    return CALENDAR_ID in urllib.parse.unquote(urllib.parse.urlsplit(url).path)


def cache_busted_url(url):
    """Ajoute un paramètre unique pour éviter une ancienne réponse iCal mise en cache."""
    parts = urllib.parse.urlsplit(url)
    query = urllib.parse.parse_qsl(parts.query, keep_blank_values=True)
    query.append(('_portal_refresh', str(time_module.time_ns())))
    return urllib.parse.urlunsplit((
        parts.scheme,
        parts.netloc,
        parts.path,
        urllib.parse.urlencode(query),
        parts.fragment,
    ))


def fetch_ics(url):
    fresh_url = cache_busted_url(url)
    request = urllib.request.Request(
        fresh_url,
        headers={
            'User-Agent': 'CardinalRoyPortal/1.0',
            'Cache-Control': 'no-cache, no-store, max-age=0',
            'Pragma': 'no-cache',
        },
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        data = response.read()
        if not data.startswith(b'BEGIN:VCALENDAR'):
            raise ValueError('La réponse reçue n’est pas un calendrier iCal.')
        return data


def as_datetime(value):
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=TZ)
        return value.astimezone(TZ)
    if isinstance(value, date):
        return datetime.combine(value, time.min, TZ)
    raise TypeError(f'Date iCal non prise en charge: {type(value)!r}')


def event_icon(title):
    normalized = title.lower()
    if 'congé' in normalized or 'conge' in normalized:
        return '🏖️', 'conge'
    if 'pédagog' in normalized or 'pedagog' in normalized:
        return '📚', 'pedagogique'
    if 'vaccin' in normalized:
        return '💉', 'evenement'
    if 'portes ouvertes' in normalized:
        return '🚪', 'evenement'
    if 'date limite' in normalized or 'échéance' in normalized or 'echeance' in normalized:
        return '⏰', 'echeance'
    if 'assemblée' in normalized or 'assemblee' in normalized:
        return '👥', 'evenement'
    if 'photo' in normalized:
        return '📸', 'evenement'
    if 'fête' in normalized or 'fete' in normalized:
        return '🎉', 'evenement'
    return '📅', 'evenement'


def is_noise(title, location=''):
    clean = title.strip()
    if any(pattern.match(clean) for pattern in NOISE_PATTERNS):
        return True
    # Les cours de l'horaire ont généralement un code court et un local.
    if re.match(r'^[A-ZÀ-ÖØ-Ý0-9-]{5,18}$', clean) and re.search(r'\blocal\b', location or '', re.I):
        return True
    return False


def parse_feed(data, now, horizon):
    calendar = Calendar.from_ical(data)
    occurrences = recurring_ical_events.of(calendar).between(now, horizon)
    items = []
    for event in occurrences:
        title = str(event.get('summary', '')).strip()
        if not title:
            continue
        location = str(event.get('location', '') or '')
        if is_noise(title, location):
            continue

        raw_start = event.decoded('dtstart')
        raw_end = event.decoded('dtend') if event.get('dtend') else None
        all_day = isinstance(raw_start, date) and not isinstance(raw_start, datetime)
        start = as_datetime(raw_start)
        if raw_end is not None:
            end = as_datetime(raw_end)
        elif all_day:
            end = start + timedelta(days=1)
        else:
            end = start + timedelta(hours=1)

        if end < now:
            continue
        icon, kind = event_icon(title)
        items.append({
            'title': title,
            'start': start.isoformat(),
            'end': end.isoformat(),
            'all_day': all_day,
            'kind': kind,
            'icon': icon,
        })
    return items


def is_masked_calendar(items):
    """Les événements « Busy » signalent un calendrier Google public sans détails.

    Ne jamais publier ces placeholders à la place des dates importantes.
    Une seule occurrence masquée suffit à rendre cette source incomplète.
    """
    masked = {'busy', 'occupé', 'occupe', 'private', 'privé', 'prive', 'confidential'}
    return any(str(item.get('title', '')).strip().casefold() in masked for item in items)


def current_items():
    if not OUTPUT.exists():
        return None
    try:
        payload = json.loads(OUTPUT.read_text(encoding='utf-8'))
        return payload.get('items') if isinstance(payload, dict) else None
    except (OSError, json.JSONDecodeError):
        return None


def main():
    now = datetime.now(TZ)
    horizon = now + timedelta(days=int(FEED_CONFIG['horizon_days']))
    public_url, private_fallback, school_url = urls_from_env()
    if private_fallback and not is_same_calendar(private_fallback):
        print('ERREUR: la source iCal privée configurée dans GitHub ne correspond pas '
              'au calendrier partagé dans le portail; ancien fil conservé.', file=sys.stderr)
        return 1

    # Ne pas mélanger un ancien calendrier privé avec le calendrier public
    # officiellement proposé au personnel : une date déplacée apparaîtrait
    # autrement en double, à l'ancienne date et à la nouvelle.
    primary_items = None
    for label, url in (('partagé officiel', public_url), ('privé de secours', private_fallback)):
        if not url or (label == 'privé de secours' and url == public_url):
            continue
        try:
            candidate_items = parse_feed(fetch_ics(url), now, horizon)
            if is_masked_calendar(candidate_items):
                raise ValueError('Google ne publie que des plages Busy/Privé; utiliser la source iCal privée autorisée du bon calendrier')
            primary_items = candidate_items
            print(f'Calendrier des dates importantes chargé : {label}.')
            if label == 'privé de secours':
                print('AVERTISSEMENT: source publique inaccessible, secours privé utilisé; vérifier son identité.', file=sys.stderr)
            break
        except Exception as exc:
            print(f'AVERTISSEMENT: échec du calendrier {label}: {exc}', file=sys.stderr)

    if primary_items is None:
        print('ERREUR: aucune source des dates importantes accessible; publication interrompue, ancien fil conservé.', file=sys.stderr)
        return 1

    all_items = list(primary_items)
    # Source scolaire secondaire facultative, uniquement si configurée.
    if school_url and school_url not in {public_url, private_fallback}:
        try:
            school_items = parse_feed(fetch_ics(school_url), now, horizon)
            if is_masked_calendar(school_items):
                raise ValueError('le calendrier complémentaire ne révèle pas les titres')
            all_items.extend(school_items)
            print('Calendrier scolaire complémentaire chargé.')
        except Exception as exc:
            print(f'ERREUR: calendrier scolaire complémentaire indisponible: {exc}; ancien fil conservé.', file=sys.stderr)
            return 1

    deduped = {}
    for item in all_items:
        key = (item['title'].casefold(), item['start'])
        deduped[key] = item
    items = sorted(deduped.values(), key=lambda item: item['start'])[:int(FEED_CONFIG['max_items'])]

    # Le workflow vérifie fréquemment pendant les tests. On ne touche au fichier que si
    # les événements visibles ont réellement changé, afin d'éviter des commits inutiles.
    if current_items() == items:
        print('Aucun changement dans les dates importantes.')
        return 0

    payload = {
        'generated_at': now.isoformat(),
        'source': 'Google Calendar - Cardinal-Roy',
        'items': items,
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'{len(items)} dates importantes écrites dans {OUTPUT}.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
