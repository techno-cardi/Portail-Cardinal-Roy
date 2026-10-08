#!/usr/bin/env python3
import json
import os
import re
import sys
import time as time_module
import urllib.parse
import urllib.request
import unicodedata
from datetime import date, datetime, time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from icalendar import Calendar
import recurring_ical_events

TZ = ZoneInfo('America/Toronto')
ROOT = Path(__file__).resolve().parents[1]
FEED_CONFIG = json.loads((ROOT / 'portal-maintenance.json').read_text(encoding='utf-8'))['calendar_feed']
OUTPUT = ROOT / 'news-feed.json'
# Le calendrier du bandeau est distinct de celui proposé en abonnement aux enseignants.
# Cette URL publique historique sert seulement en absence de source privée configurée.
BANNER_FALLBACK_CALENDAR_ID = FEED_CONFIG['banner_public_fallback_calendar_id']
PUBLIC_ICAL = (
    'https://calendar.google.com/calendar/ical/'
    + urllib.parse.quote(BANNER_FALLBACK_CALENDAR_ID, safe='')
    + '/public/basic.ics'
)

NOISE_PATTERNS = [
    re.compile(r'^Jour\s+\d+$', re.I),
    re.compile(r'^[A-ZÀ-ÖØ-Ý]{2,8}\d[A-Z0-9]{0,5}-\d{1,4}$'),
]

# Politique de publication : une source iCal privée peut contenir des rendez-vous
# propres à un enseignant. Un titre non reconnu reste privé par défaut.
ADMINISTRATIVE_TITLES = tuple(map(re.compile, (
    r'^(?:(?:journee|jour)\s+)?pedagogique(?:\s*(?:\((?:teletravail|presentiel)\)|[-:]\s*(?:teletravail|presentiel)))?$',
    r'^conges?(?:\s*[-:]\s*|\s+)(?:action de grace|noel|paques|fete du travail|fete nationale|fete des patriotes|jour de l.an|temps des fetes)\b',
    r'^(?:semaine de relache|relache scolaire|vacances (?:de noel|des fetes|scolaires))\b',
    r'^(?:fermeture de l.ecole|suspension des cours|rentree scolaire|rentree des eleves|debut des cours|fin des cours|fin de l.annee scolaire)\b',
    r'^(?:debut|fin)\s+de\s+la\s+\d+(?:re|ere|e|eme)?\s+etape\b',
    r'^(?:date limite|echeance)\b.*\b(?:resultats?|bulletins?|sso|autre competence|consignation|mozaik|premiere communication|releves? de notes|inscriptions? scolaires?|epreuves?|examens?)\b',
    r'^(?:publication|consignation|remise)\s+(?:des?\s+)?(?:resultats?|bulletins?|premiere communication)\b',
    r'^(?:(?:premiere|deuxieme|troisieme|1re|2e|3e)\s+communication|(?:premier|deuxieme|troisieme|1er|2e|3e)\s+bulletin)\b',
    r'^(?:session|periode)\s+d.examens?\b',
    r'^(?:epreuves?\s+(?:uniques?|ministerielles?)|examens?\s+ministeriels?)\b',
    r'^(?:rencontre (?:de|des) parents(?:[- ]enseignants)?|assemblee generale (?:des parents|du personnel)|conseil d.etablissement)(?:\s*[-:]\s*(?:secondaire|secteur|enseignants).*)?$',
    r'^(?:portes ouvertes|soiree d.information|seance d.information)\b',
    r'^(?:photo (?:de )?(?:finissants?|classe)|reprise (?:de )?photo (?:de )?finissants?)\b',
    r'^(?:vaccination|campagne de vaccination)\b',
    r'^(?:gala (?:meritas|sportif)|collation des grades|bal des finissants)\b',
    r'^(?:fete d.halloween|fete de la rentree|semaine multiculturelle)\b',
)))
PERSONAL_TITLES = tuple(map(re.compile, (
    r'^(?:(?:jour|cycle)(?:\s+de\s+cycle)?\s*[-:]?\s*[a-d0-9]+\b|j\s?\d{1,2}\b)',
    r'\b(?:rendez[- ]vous|rdv|dentiste|medecin|coaching|entrainement|anniversaire personnel|mon cours)\b',
    r'^(?:mon|ma|mes|perso|prive|personnel|recuperation|suppleance|planification|correction|atelier|cours)\b',
    r'\[(?:prive|personnel|perso)\]',
    r'\b(?:groupe|classe)\s+\d{2}\b',
)))


def normalized_title(value):
    value = unicodedata.normalize('NFKD', str(value)).casefold()
    value = ''.join(c for c in value if not unicodedata.combining(c))
    return re.sub(r'\s+', ' ', value.replace('’', "'")).strip()


def is_administrative_title(title):
    clean = normalized_title(title)
    # Retirer le marqueur avant de contrôler les exclusions, sinon
    # « [PORTAIL] Jour 4 » échappe au filtre des jours de cycle.
    marked = clean.startswith('[portail] ')
    if marked:
        clean = clean.removeprefix('[portail] ').strip()
    if not clean or any(pattern.search(clean) for pattern in PERSONAL_TITLES):
        return False
    if marked:
        return True
    return any(pattern.search(clean) for pattern in ADMINISTRATIVE_TITLES)


def public_event_title(title):
    return re.sub(r'^\s*\[PORTAIL\]\s*', '', title, flags=re.I).strip()


def urls_from_env():
    """Distingue source du bandeau et calendrier d'abonnement du personnel.

    Une source privée déjà configurée fait autorité. La source publique historique
    n'est utilisée que si aucune source privée n'a été configurée, pas comme un
    substitut silencieux qui modifierait le contenu du bandeau lors d'une panne.
    """
    return (
        os.environ.get('CARDINAL_CALENDAR_ICAL_URL', '').strip(),
        os.environ.get('CARDINAL_SCHOOL_CALENDAR_ICAL_URL', '').strip(),
        PUBLIC_ICAL,
    )


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
        if normalized_title(title) in {'busy', 'occupe', 'private', 'prive', 'confidential'}:
            raise ValueError('calendrier Google avec des événements masqués')
        location = str(event.get('location', '') or '')
        if is_noise(title, location) or not is_administrative_title(title):
            continue
        title = public_event_title(title)

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
    primary_private_url, school_url, public_fallback_url = urls_from_env()
    primary_url = primary_private_url or public_fallback_url
    primary_label = 'bandeau iCal privé' if primary_private_url else 'bandeau iCal public historique'

    # Ne jamais imposer que la source du bandeau corresponde au calendrier
    # sélectif auquel les enseignants peuvent s'abonner dans la fiche du portail.
    try:
        primary_items = parse_feed(fetch_ics(primary_url), now, horizon)
        if is_masked_calendar(primary_items):
            raise ValueError('source contenant des événements masqués Busy/Privé')
        print(f'Source des dates du bandeau chargée : {primary_label}.')
    except Exception as exc:
        print(f'ERREUR: source du bandeau indisponible ({primary_label}): {exc}; '
              'ancien fil conservé.', file=sys.stderr)
        return 1

    all_items = list(primary_items)
    # L'agenda scolaire additionnel est volontaire et peut contenir des événements
    # différents. Conserver sa configuration historique indépendante.
    if school_url and school_url != primary_url:
        try:
            school_items = parse_feed(fetch_ics(school_url), now, horizon)
            if is_masked_calendar(school_items):
                raise ValueError('calendrier complémentaire contenant des événements masqués')
            all_items.extend(school_items)
            print('Calendrier scolaire complémentaire chargé.')
        except Exception as exc:
            print(f'ERREUR: calendrier scolaire complémentaire indisponible: {exc}; '
                  'ancien fil conservé.', file=sys.stderr)
            return 1

    # Déduplication uniquement des occurrences strictement identiques :
    # deux journées pédagogiques distinctes peuvent porter le même titre.
    deduped = {}
    for item in all_items:
        key = (item['title'].casefold(), item['start'])
        deduped[key] = item
    items = sorted(deduped.values(), key=lambda item: item['start'])[:int(FEED_CONFIG['max_items'])]

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
