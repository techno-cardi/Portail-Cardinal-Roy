"""Tests de synchronisation du bandeau, indépendant des abonnements du personnel."""
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts import build_news_feed as feed


def event(title, start='2026-10-15T19:00:00-04:00'):
    return {
        'title': title, 'start': start, 'end': '2026-10-15T20:00:00-04:00',
        'all_day': False, 'kind': 'evenement', 'icon': '📅',
    }


class BannerCalendarSyncTests(unittest.TestCase):
    def test_subscription_and_banner_calendars_are_independent(self):
        self.assertNotEqual(
            feed.FEED_CONFIG['subscription_calendar_id'],
            feed.FEED_CONFIG['banner_public_fallback_calendar_id'],
        )
        self.assertIn('chspj1p3h2gccmlujur3e2keqk%40group.calendar.google.com', feed.PUBLIC_ICAL)

    def test_configured_private_source_is_preferred_without_matching_teacher_subscription(self):
        private_url = 'https://calendar.google.com/calendar/ical/another-calendar/private-token/basic.ics'
        with patch.dict(os.environ, {
            'CARDINAL_CALENDAR_ICAL_URL': private_url,
            'CARDINAL_SCHOOL_CALENDAR_ICAL_URL': '',
        }), patch.object(feed, 'fetch_ics', return_value=b'private') as fetch, \
             patch.object(feed, 'parse_feed', return_value=[event('Pédagogique')]), \
             patch.object(feed, 'current_items', return_value=[event('Pédagogique')]):
            self.assertEqual(feed.main(), 0)
            fetch.assert_called_once_with(private_url)

    def test_no_secret_uses_original_public_banner_calendar(self):
        with patch.dict(os.environ, {
            'CARDINAL_CALENDAR_ICAL_URL': '',
            'CARDINAL_SCHOOL_CALENDAR_ICAL_URL': '',
        }), patch.object(feed, 'fetch_ics', return_value=b'public') as fetch, \
             patch.object(feed, 'parse_feed', return_value=[event('Échéance')]), \
             patch.object(feed, 'current_items', return_value=[event('Échéance')]):
            self.assertEqual(feed.main(), 0)
            fetch.assert_called_once_with(feed.PUBLIC_ICAL)

    def test_moved_event_replaces_old_date(self):
        old = event('Réunion', '2026-10-14T19:00:00-04:00')
        new = event('Réunion', '2026-10-15T19:00:00-04:00')
        with tempfile.TemporaryDirectory() as d:
            output = Path(d) / 'feed.json'
            output.write_text(json.dumps({'items': [old]}), encoding='utf-8')
            with patch.dict(os.environ, {'CARDINAL_CALENDAR_ICAL_URL': 'https://example.test/real.ics',
                                         'CARDINAL_SCHOOL_CALENDAR_ICAL_URL': ''}), \
                 patch.object(feed, 'OUTPUT', output), \
                 patch.object(feed, 'fetch_ics', return_value=b'new'), \
                 patch.object(feed, 'parse_feed', return_value=[new]):
                self.assertEqual(feed.main(), 0)
            self.assertEqual(json.loads(output.read_text(encoding='utf-8'))['items'], [new])

    def test_separate_supplementary_school_calendar_includes_pedagogicals(self):
        private = 'https://example.test/main.ics'
        school = 'https://example.test/school.ics'
        items1 = [event('Date limite')]
        items2 = [event('Pédagogique', '2026-10-16T00:00:00-04:00')]
        with tempfile.TemporaryDirectory() as d:
            output = Path(d) / 'feed.json'
            with patch.dict(os.environ, {'CARDINAL_CALENDAR_ICAL_URL': private,
                                         'CARDINAL_SCHOOL_CALENDAR_ICAL_URL': school}), \
                 patch.object(feed, 'OUTPUT', output), \
                 patch.object(feed, 'fetch_ics', side_effect=[b'primary', b'school']) as fetch, \
                 patch.object(feed, 'parse_feed', side_effect=[items1, items2]):
                self.assertEqual(feed.main(), 0)
            titles = [i['title'] for i in json.loads(output.read_text(encoding='utf-8'))['items']]
            self.assertEqual(titles, ['Date limite', 'Pédagogique'])
            self.assertEqual(fetch.call_count, 2)

    def test_duplicate_occurrence_is_removed_without_removing_distinct_pedagogicals(self):
        one = event('Pédagogique', '2026-10-15T19:00:00-04:00')
        other = event('Pédagogique', '2026-10-16T19:00:00-04:00')
        with tempfile.TemporaryDirectory() as d:
            output = Path(d) / 'feed.json'
            with patch.dict(os.environ, {'CARDINAL_CALENDAR_ICAL_URL': 'https://example.test/main',
                                         'CARDINAL_SCHOOL_CALENDAR_ICAL_URL': 'https://example.test/extra'}), \
                 patch.object(feed, 'OUTPUT', output), \
                 patch.object(feed, 'fetch_ics', return_value=b'x'), \
                 patch.object(feed, 'parse_feed', side_effect=[[one], [one, other]]):
                self.assertEqual(feed.main(), 0)
            self.assertEqual(len(json.loads(output.read_text(encoding='utf-8'))['items']), 2)

    def test_secret_failure_keeps_last_good_feed_instead_of_switching_calendars(self):
        with tempfile.TemporaryDirectory() as d:
            output = Path(d) / 'feed.json'
            output.write_text('{"items":[{"title":"Bonne date"}]}', encoding='utf-8')
            with patch.dict(os.environ, {'CARDINAL_CALENDAR_ICAL_URL': 'https://example.test/missing.ics',
                                         'CARDINAL_SCHOOL_CALENDAR_ICAL_URL': ''}), \
                 patch.object(feed, 'OUTPUT', output), \
                 patch.object(feed, 'fetch_ics', side_effect=OSError('temporary outage')) as fetch:
                self.assertEqual(feed.main(), 1)
                self.assertEqual(fetch.call_count, 1)
            self.assertEqual(json.loads(output.read_text(encoding='utf-8'))['items'][0]['title'], 'Bonne date')

    def test_google_busy_does_not_replace_real_titles(self):
        with tempfile.TemporaryDirectory() as d:
            output = Path(d) / 'feed.json'
            output.write_text('{"items":[{"title":"Vraie date"}]}', encoding='utf-8')
            with patch.dict(os.environ, {'CARDINAL_CALENDAR_ICAL_URL': '',
                                         'CARDINAL_SCHOOL_CALENDAR_ICAL_URL': ''}), \
                 patch.object(feed, 'OUTPUT', output), \
                 patch.object(feed, 'fetch_ics', return_value=b'public'), \
                 patch.object(feed, 'parse_feed', return_value=[event('Busy')]):
                self.assertEqual(feed.main(), 1)
            self.assertEqual(json.loads(output.read_text(encoding='utf-8'))['items'][0]['title'], 'Vraie date')

    def test_school_calendar_failure_keeps_previous_feed(self):
        with tempfile.TemporaryDirectory() as d:
            output = Path(d) / 'feed.json'
            output.write_text('{"items":[{"title":"Vraie date"}]}', encoding='utf-8')
            with patch.dict(os.environ, {'CARDINAL_CALENDAR_ICAL_URL': 'https://example.test/main',
                                         'CARDINAL_SCHOOL_CALENDAR_ICAL_URL': 'https://example.test/extra'}), \
                 patch.object(feed, 'OUTPUT', output), \
                 patch.object(feed, 'fetch_ics', side_effect=[b'ok', OSError('no school')]), \
                 patch.object(feed, 'parse_feed', return_value=[event('Date')]):
                self.assertEqual(feed.main(), 1)
            self.assertEqual(json.loads(output.read_text(encoding='utf-8'))['items'][0]['title'], 'Vraie date')

    def test_no_change_does_not_write_a_file(self):
        original = [event('Assemblée')]
        with tempfile.TemporaryDirectory() as d:
            output = Path(d) / 'feed.json'
            output.write_text('{"items":[]}', encoding='utf-8')
            with patch.dict(os.environ, {'CARDINAL_CALENDAR_ICAL_URL': '',
                                         'CARDINAL_SCHOOL_CALENDAR_ICAL_URL': ''}), \
                 patch.object(feed, 'OUTPUT', output), \
                 patch.object(feed, 'fetch_ics', return_value=b'ok'), \
                 patch.object(feed, 'parse_feed', return_value=original), \
                 patch.object(feed, 'current_items', return_value=original):
                self.assertEqual(feed.main(), 0)
            self.assertEqual(output.read_text(encoding='utf-8'), '{"items":[]}')


    def test_selection_of_schoolwide_administrative_dates(self):
        approved = [
            'CONGÉ - Action de grâce',
            'Portes ouvertes - secteur Découvertes',
            "Fête d'Halloween",
            'Fin de la 1re étape',
            'Date limite - résultats SSO et Autre compétence',
            'Date limite - résultats du 1er bulletin',
            'Pédagogique',
            'Photo de finissants',
            'Rencontre des parents-enseignants',
            'Reprise de photo finissant',
            'Pédagogique (télétravail)',
            "Session d'examens - sans activités SAÉ",
            'Journée pédagogique',
            'Assemblée générale des parents',
            'Conseil d’établissement',
            'Vaccination',
            'Épreuves ministérielles',
            'Collation des grades',
            'Semaine de relâche',
        ]
        for title in approved:
            with self.subTest(title=title):
                self.assertTrue(feed.is_administrative_title(title))

    def test_cycle_personal_group_and_ordinary_class_events_are_rejected(self):
        rejected = [
            'Jour 1', 'Jour 10', 'Jour de cycle 8', 'Cycle 5',
            'J7', 'Français 31', 'Groupe 31 : travail',
            'Rendez-vous dentiste', 'RDV médecin', 'Réunion avec Alex',
            'Mon entraînement', 'Anniversaire personnel', 'Souper de famille',
            'Atelier d’écriture', 'Récupération du groupe 32',
            'Planification du cours', 'Date limite - mon devoir',
            'Photo de famille', 'Réunion personnelle',
            'Pédagogique - mon cours', 'Conseil de classe 31',
        ]
        for title in rejected:
            with self.subTest(title=title):
                self.assertFalse(feed.is_administrative_title(title))

    def test_explicit_portal_marker_and_personal_blockers(self):
        self.assertTrue(feed.is_administrative_title('[PORTAIL] Journée spéciale pour tout le personnel'))
        self.assertEqual(
            feed.public_event_title('[PORTAIL] Journée spéciale pour tout le personnel'),
            'Journée spéciale pour tout le personnel'
        )
        self.assertFalse(feed.is_administrative_title('[PORTAIL] Jour 4'))
        self.assertFalse(feed.is_administrative_title('[PORTAIL] Rendez-vous dentiste'))
        self.assertFalse(feed.is_administrative_title('[PORTAIL]'))

    def test_real_ical_content_is_filtered_before_publication(self):
        from datetime import datetime
        from zoneinfo import ZoneInfo
        lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Cardinal tests//']
        titles = [
            'Jour 6', 'Rendez-vous dentiste', 'Pédagogique',
            'Date limite - résultats du 1er bulletin', 'Réunion personnelle',
            'Portes ouvertes', 'Cours de français',
        ]
        for i, title in enumerate(titles):
            lines.extend([
                'BEGIN:VEVENT', f'UID:testing-{i}@example.org',
                'DTSTAMP:20261008T100000Z', 'DTSTART;VALUE=DATE:20261015',
                'DTEND;VALUE=DATE:20261016', f'SUMMARY:{title}', 'END:VEVENT',
            ])
        lines.append('END:VCALENDAR')
        parsed = feed.parse_feed(
            ('\r\n'.join(lines) + '\r\n').encode('utf-8'),
            datetime(2026, 10, 8, tzinfo=ZoneInfo('America/Toronto')),
            datetime(2026, 12, 31, tzinfo=ZoneInfo('America/Toronto')),
        )
        self.assertEqual(
            sorted(e['title'] for e in parsed),
            sorted(['Pédagogique', 'Date limite - résultats du 1er bulletin', 'Portes ouvertes']),
        )

    def test_hidden_calendar_event_causes_failure_before_filtering(self):
        from datetime import datetime
        from zoneinfo import ZoneInfo
        raw = (
            'BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'
            'BEGIN:VEVENT\r\nUID:hidden@example.org\r\n'
            'DTSTAMP:20261008T100000Z\r\n'
            'DTSTART;VALUE=DATE:20261015\r\n'
            'DTEND;VALUE=DATE:20261016\r\n'
            'SUMMARY:Busy\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n'
        ).encode('utf-8')
        with self.assertRaisesRegex(ValueError, 'masqués'):
            feed.parse_feed(
                raw, datetime(2026, 10, 8, tzinfo=ZoneInfo('America/Toronto')),
                datetime(2026, 12, 31, tzinfo=ZoneInfo('America/Toronto')),
            )



if __name__ == '__main__':
    unittest.main()
