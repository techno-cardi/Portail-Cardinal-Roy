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
    def setUp(self):
        # Les anciens tests isolent strictement les deux sources historiques.
        # Les tests de fusion à trois sources couvrent le nouveau fonctionnement.
        disable = patch.object(feed, 'subscription_ical_url', return_value='')
        disable.start()
        self.addCleanup(disable.stop)
        auth = patch.object(feed, 'authenticated_shared_items', return_value=None)
        auth.start()
        self.addCleanup(auth.stop)

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

    def test_photo_variations_are_institutional_not_personal(self):
        accepted = [
            'Photo de finissants', 'Photo des finissants',
            'Photos de finissants', 'Photos des finissants',
            'Reprise de photo finissant',
            'Reprise des photos des finissants',
            'Séance photo des finissants', 'Prise de photo des finissants',
            'Photographie des finissants',
        ]
        rejected = [
            'Photo de famille', 'Photos de mon cours',
            'Photo des finissants groupe 51',
            'RDV pour photos des finissants',
            'Jour 4 - photo de finissants',
        ]
        for title in accepted:
            with self.subTest(accepted=title):
                self.assertTrue(feed.is_administrative_title(title))
        for title in rejected:
            with self.subTest(rejected=title):
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




class SharedCalendarBannerTests(unittest.TestCase):
    def test_subscription_ical_uses_configured_shared_calendar(self):
        self.assertIn(
            'c_8527e24b6f9dc9f028439fcf5c2a3657475698c9e4151ac93cd2d9205b322baa%40',
            feed.SUBSCRIPTION_ICAL,
        )
        with patch.dict(os.environ, {'CARDINAL_SUBSCRIPTION_ICAL_URL': ''}):
            self.assertEqual(feed.subscription_ical_url(), feed.SUBSCRIPTION_ICAL)

    def test_optional_private_subscription_url_is_not_required_publicly(self):
        private = 'https://example.test/private/hidden-token.ics'
        with patch.dict(os.environ, {'CARDINAL_SUBSCRIPTION_ICAL_URL': private}):
            self.assertEqual(feed.subscription_ical_url(), private)

    def test_three_sources_merged_and_shared_dates_appear(self):
        main, school, shared = ('https://example.test/main.ics',
                                'https://example.test/school.ics',
                                'https://example.test/dates.ics')
        sources = {
            main: b'primary', school: b'school', shared: b'shared',
        }
        parsed = {
            b'primary': [event('Fête d Halloween', '2026-10-29T12:00:00-04:00')],
            b'school': [event('Pédagogique', '2026-11-19T00:00:00-05:00')],
            b'shared': [event('Photos des finissants', '2026-11-19T14:00:00-05:00')],
        }
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'dates.json'
            with patch.dict(os.environ, {
                'CARDINAL_CALENDAR_ICAL_URL': main,
                'CARDINAL_SCHOOL_CALENDAR_ICAL_URL': school,
            }), patch.object(feed, 'OUTPUT', output), \
                 patch.object(feed, 'subscription_ical_url', return_value=shared), \
                 patch.object(feed, 'fetch_ics', side_effect=lambda url: sources[url]) as fetch, \
                 patch.object(feed, 'parse_feed', side_effect=lambda data, *_, **__: parsed[data]):
                self.assertEqual(feed.main(), 0)
            result = json.loads(output.read_text(encoding='utf-8'))['items']
            self.assertEqual(len(result), 3)
            self.assertIn('Photos des finissants', [item['title'] for item in result])
            self.assertEqual(fetch.call_count, 3)

    def test_same_day_title_variants_are_deduplicated(self):
        old = event('Photo des finissants', '2026-11-19T00:00:00-05:00')
        old['all_day'] = True
        shared = event('Photos de finissants', '2026-11-19T00:00:00-05:00')
        shared['all_day'] = True
        pedagogical = event('Pédagogique', '2026-11-20T00:00:00-05:00')
        pedagogical['all_day'] = True
        shared_pedagogical = event('Journée pédagogique', '2026-11-20T00:00:00-05:00')
        shared_pedagogical['all_day'] = True
        result = feed.deduplicate_events([old, pedagogical, shared, shared_pedagogical])
        self.assertEqual(len(result), 2)
        self.assertEqual([item['title'] for item in result],
                         ['Photos de finissants', 'Journée pédagogique'])

    def test_all_day_and_precise_time_choose_timed_event(self):
        all_day = event('Photo des finissants', '2026-11-19T00:00:00-05:00')
        all_day['all_day'] = True
        precise = event('Photos des finissants', '2026-11-19T14:00:00-05:00')
        merged = feed.deduplicate_events([all_day, precise])
        self.assertEqual(merged, [precise])
        self.assertEqual(feed.deduplicate_events([precise, all_day]), [precise])

    def test_separate_times_and_dates_are_preserved(self):
        morning = event('Rencontre de parents', '2026-11-19T09:00:00-05:00')
        evening = event('Rencontre de parents', '2026-11-19T19:00:00-05:00')
        another_day = event('Rencontre de parents', '2026-11-20T19:00:00-05:00')
        self.assertEqual(len(feed.deduplicate_events([morning, evening, another_day])), 3)

    def test_shared_calendar_is_not_fetched_twice_when_urls_match(self):
        shared = 'https://example.test/shared.ics'
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'dates.json'
            with patch.dict(os.environ, {
                'CARDINAL_CALENDAR_ICAL_URL': shared,
                'CARDINAL_SCHOOL_CALENDAR_ICAL_URL': '',
            }), patch.object(feed, 'OUTPUT', output), \
                 patch.object(feed, 'subscription_ical_url', return_value=shared), \
                 patch.object(feed, 'fetch_ics', return_value=b'shared') as fetch, \
                 patch.object(feed, 'parse_feed', return_value=[event('Pédagogique')]):
                self.assertEqual(feed.main(), 0)
            fetch.assert_called_once_with(shared)

    def test_shared_source_failure_preserves_old_feed(self):
        main, shared = 'https://example.test/main.ics', 'https://example.test/dates.ics'
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'dates.json'
            original = '{"items":[{"title":"Dernier bandeau valide"}]}'
            output.write_text(original, encoding='utf-8')
            with patch.dict(os.environ, {
                'CARDINAL_CALENDAR_ICAL_URL': main,
                'CARDINAL_SCHOOL_CALENDAR_ICAL_URL': '',
                'CARDINAL_SUBSCRIPTION_ICAL_URL': shared,
            }), patch.object(feed, 'OUTPUT', output), \
                 patch.object(feed, 'subscription_ical_url', return_value=shared), \
                 patch.object(feed, 'fetch_ics', side_effect=[b'primary', OSError('calendar unavailable')]), \
                 patch.object(feed, 'parse_feed', return_value=[event('Pédagogique')]):
                self.assertEqual(feed.main(), 1)
            self.assertEqual(output.read_text(encoding='utf-8'), original)

    def test_public_shared_calendar_unavailable_does_not_block_main_source(self):
        main, shared = 'https://example.test/main.ics', 'https://example.test/public.ics'
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'dates.json'
            with patch.dict(os.environ, {
                'CARDINAL_CALENDAR_ICAL_URL': main,
                'CARDINAL_SCHOOL_CALENDAR_ICAL_URL': '',
                'CARDINAL_SUBSCRIPTION_ICAL_URL': '',
            }), patch.object(feed, 'OUTPUT', output), \
                 patch.object(feed, 'subscription_ical_url', return_value=shared), \
                 patch.object(feed, 'fetch_ics', side_effect=[b'primary', OSError('public blocked')]), \
                 patch.object(feed, 'parse_feed', return_value=[event('Pédagogique')]):
                self.assertEqual(feed.main(), 0)
            result = json.loads(output.read_text(encoding='utf-8'))['items']
            self.assertEqual(result[0]['title'], 'Pédagogique')

    def test_public_shared_busy_is_ignored_but_admin_title_is_used(self):
        from datetime import datetime
        from zoneinfo import ZoneInfo
        raw = (
            'BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'
            'BEGIN:VEVENT\r\nUID:masked@example.org\r\n'
            'DTSTAMP:20261008T100000Z\r\nDTSTART;VALUE=DATE:20261020\r\n'
            'DTEND;VALUE=DATE:20261021\r\nSUMMARY:Busy\r\nEND:VEVENT\r\n'
            'BEGIN:VEVENT\r\nUID:school@example.org\r\n'
            'DTSTAMP:20261008T100000Z\r\nDTSTART;VALUE=DATE:20261020\r\n'
            'DTEND;VALUE=DATE:20261021\r\nSUMMARY:Photos des finissants\r\nEND:VEVENT\r\n'
            'BEGIN:VEVENT\r\nUID:personal@example.org\r\n'
            'DTSTAMP:20261008T100000Z\r\nDTSTART;VALUE=DATE:20261020\r\n'
            'DTEND;VALUE=DATE:20261021\r\nSUMMARY:Jour 9\r\nEND:VEVENT\r\n'
            'END:VCALENDAR\r\n'
        ).encode('utf-8')
        now = datetime(2026, 10, 15, tzinfo=ZoneInfo('America/Toronto'))
        horizon = datetime(2026, 11, 1, tzinfo=ZoneInfo('America/Toronto'))
        with self.assertRaisesRegex(ValueError, 'masqués'):
            feed.parse_feed(raw, now, horizon)
        items = feed.parse_feed(raw, now, horizon, skip_masked=True)
        self.assertEqual([item['title'] for item in items], ['Photos des finissants'])
        all_items = feed.parse_feed(raw, now, horizon, skip_masked=True,
                                    allow_all_titles=True)
        self.assertEqual([item['title'] for item in all_items],
                         ['Photos des finissants', 'Jour 9'])

    def test_historical_sources_still_reject_private_and_cycle_events(self):
        self.assertFalse(feed.is_administrative_title('Jour 4'))
        self.assertFalse(feed.is_administrative_title('[PORTAIL] Groupe 31 évaluation'))
        self.assertTrue(feed.is_administrative_title('Photos des finissants'))
        self.assertTrue(feed.is_administrative_title('[PORTAIL] Assemblée de tout le personnel'))


class AppsScriptSnapshotTests(unittest.TestCase):
    def test_valid_snapshot_takes_priority_over_public_busy_calendar(self):
        from datetime import datetime
        from zoneinfo import ZoneInfo
        now = datetime(2026, 10, 15, 10, tzinfo=ZoneInfo('America/Toronto'))
        photo = event('Photos des finissants', '2026-11-19T14:00:00-05:00')
        photo['end'] = '2026-11-19T15:00:00-05:00'
        excluded = event('Jour 4', '2026-11-19T00:00:00-05:00')
        excluded['end'] = '2026-11-20T00:00:00-05:00'
        snapshot = {
            'schema': 1, 'synced_at': now.isoformat(),
            'items': [photo, excluded]
        }
        with tempfile.TemporaryDirectory() as tmp:
            snapshot_path = Path(tmp) / 'subscription.json'
            snapshot_path.write_text(json.dumps(snapshot), encoding='utf-8')
            with patch.object(feed, 'SHARED_SNAPSHOT', snapshot_path):
                items = feed.authenticated_shared_items(
                    now, datetime(2026, 12, 31, tzinfo=ZoneInfo('America/Toronto')))
            self.assertEqual([x['title'] for x in items], ['Photos des finissants', 'Jour 4'])

    def test_stale_snapshot_falls_back_to_ical(self):
        from datetime import datetime, timedelta
        from zoneinfo import ZoneInfo
        now = datetime(2026, 10, 15, 10, tzinfo=ZoneInfo('America/Toronto'))
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'subscription.json'
            path.write_text(json.dumps({
                'schema': 1, 'synced_at': (now - timedelta(hours=40)).isoformat(),
                'items': [event('Photos des finissants')],
            }), encoding='utf-8')
            with patch.object(feed, 'SHARED_SNAPSHOT', path):
                self.assertIsNone(feed.authenticated_shared_items(
                    now, now + timedelta(days=90)))

    def test_repo_dispatch_accepts_all_valid_titles_from_known_calendar(self):
        from datetime import datetime, timedelta
        from zoneinfo import ZoneInfo
        from scripts import import_subscription_calendar as receiver
        now = datetime(2026, 10, 15, 10, tzinfo=ZoneInfo('America/Toronto'))
        payload = {
            'schema': 1,
            'calendar_id': feed.SUBSCRIPTION_CALENDAR_ID,
            'generated_at': now.isoformat(),
            'events': [
                {'title': 'Photos des finissants',
                 'start': (now + timedelta(days=35)).isoformat(),
                 'end': (now + timedelta(days=35, hours=1)).isoformat(),
                 'all_day': False},
                {'title': 'Rendez-vous dentiste',
                 'start': (now + timedelta(days=36)).isoformat(),
                 'end': (now + timedelta(days=36, hours=1)).isoformat(),
                 'all_day': False},
                {'title': 'Jour 4',
                 'start': (now + timedelta(days=36)).isoformat(),
                 'end': (now + timedelta(days=36, hours=1)).isoformat(),
                 'all_day': False},
            ],
        }
        accepted = receiver.normalize_payload(payload, now=now)
        self.assertEqual([x['title'] for x in accepted],
                         ['Photos des finissants', 'Rendez-vous dentiste', 'Jour 4'])
        payload['calendar_id'] = 'another-calendar@example.org'
        with self.assertRaisesRegex(ValueError, 'Calendrier source'):
            receiver.normalize_payload(payload, now=now)

    def test_receiver_keeps_same_events_without_committing_every_15_minutes(self):
        from datetime import datetime, timedelta
        from zoneinfo import ZoneInfo
        from scripts import import_subscription_calendar as receiver
        now = datetime(2026, 10, 15, 10, tzinfo=ZoneInfo('America/Toronto'))
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'snapshot.json'
            events = [event('Pédagogique')]
            self.assertTrue(receiver.save_snapshot(events, now=now, output=path))
            self.assertFalse(receiver.save_snapshot(
                events, now=now + timedelta(minutes=15), output=path))
            self.assertTrue(receiver.save_snapshot(
                events, now=now + timedelta(hours=9), output=path))

    def test_shared_snapshot_keeps_short_unlisted_institutional_titles(self):
        from datetime import datetime, timedelta
        from zoneinfo import ZoneInfo
        from scripts import import_subscription_calendar as receiver
        now = datetime(2026, 10, 15, 11, tzinfo=ZoneInfo('America/Toronto'))
        titles = ['CA', 'Réunion du comité de la vie étudiante',
                  'Journée couleurs', 'Jour 7']
        payload = {
            'schema': 1, 'calendar_id': feed.SUBSCRIPTION_CALENDAR_ID,
            'generated_at': now.isoformat(),
            'events': [{
                'title': title,
                'start': (now + timedelta(days=10+i)).isoformat(),
                'end': (now + timedelta(days=10+i, hours=1)).isoformat(),
                'all_day': False,
            } for i, title in enumerate(titles)]
        }
        actual = receiver.normalize_payload(payload, now=now)
        self.assertEqual([x['title'] for x in actual], titles)

    def test_invalid_event_data_rejected_without_filtering_title(self):
        from datetime import datetime, timedelta
        from zoneinfo import ZoneInfo
        from scripts import import_subscription_calendar as receiver
        now = datetime(2026, 10, 15, 11, tzinfo=ZoneInfo('America/Toronto'))
        start = now + timedelta(days=10)
        payload = {
            'schema': 1, 'calendar_id': feed.SUBSCRIPTION_CALENDAR_ID,
            'generated_at': now.isoformat(),
            'events': [
                {'title': 'Jour 2', 'start': start.isoformat(),
                 'end': (start + timedelta(hours=1)).isoformat(),
                 'all_day': False, 'attendees': ['no-export@example.test']},
                {'title': '', 'start': start.isoformat(),
                 'end': (start + timedelta(hours=1)).isoformat(), 'all_day': False},
                {'title': 'Date cassée', 'start': 'invalid',
                 'end': (start + timedelta(hours=1)).isoformat(), 'all_day': False}
            ]
        }
        items = receiver.normalize_payload(payload, now=now)
        self.assertEqual([x['title'] for x in items], ['Jour 2'])
        self.assertNotIn('attendees', items[0])

    def test_apps_script_sends_all_events_without_title_filter(self):
        script = (
            Path(__file__).resolve().parents[1] /
            'integrations/cardinal-dates-apps-script/Code.gs'
        ).read_text(encoding='utf-8')
        self.assertIn('const eligible = calendar.getEvents(start, end);', script)
        self.assertNotIn('isInstitutionalCardinalTitle_', script)

    def test_empty_authenticated_calendar_removes_previous_only_shared_events(self):
        from datetime import datetime, timedelta
        from zoneinfo import ZoneInfo
        now = datetime(2026, 10, 15, 10, tzinfo=ZoneInfo('America/Toronto'))
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / 'feed.json'
            snapshot = Path(tmp) / 'shared.json'
            snapshot.write_text(json.dumps({
                'schema': 1, 'synced_at': now.isoformat(), 'items': [],
            }), encoding='utf-8')
            with patch.dict(os.environ, {
                'CARDINAL_CALENDAR_ICAL_URL': 'https://example.test/main.ics',
                'CARDINAL_SCHOOL_CALENDAR_ICAL_URL': '',
            }), patch.object(feed, 'SHARED_SNAPSHOT', snapshot), \
                 patch.object(feed, 'OUTPUT', output), \
                 patch.object(feed, 'fetch_ics', return_value=b'ical') as fetch, \
                 patch.object(feed, 'parse_feed', return_value=[event('Pédagogique')]):
                self.assertEqual(feed.main(), 0)
            fetch.assert_called_once_with('https://example.test/main.ics')
            self.assertEqual(
                [x['title'] for x in json.loads(output.read_text(encoding='utf-8'))['items']],
                ['Pédagogique'],
            )


if __name__ == '__main__':
    unittest.main()
