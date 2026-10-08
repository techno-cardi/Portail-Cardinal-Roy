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


if __name__ == '__main__':
    unittest.main()
