"""Régressions de la synchronisation du calendrier partagé Cardinal-Roy."""
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts import build_news_feed as feed


def event(title, start):
    return {
        'title': title, 'start': start, 'end': '2026-10-15T20:00:00-04:00',
        'all_day': False, 'kind': 'evenement', 'icon': '📅',
    }


class CalendarSyncTests(unittest.TestCase):
    def test_canonical_calendar_always_first_even_with_private_secret(self):
        with patch.dict(os.environ, {
            'CARDINAL_CALENDAR_ICAL_URL': 'https://example.test/legacy.ics',
            'CARDINAL_SCHOOL_CALENDAR_ICAL_URL': '',
        }):
            public, fallback, school = feed.urls_from_env()
        self.assertIn(feed.CALENDAR_ID.replace('@', '%40'), public)
        self.assertEqual(fallback, 'https://example.test/legacy.ics')
        self.assertEqual(school, '')

    def test_official_calendar_wins_over_private_old_data(self):
        current = event('Rencontre de parents', '2026-10-15T19:00:00-04:00')
        with patch.dict(os.environ, {
            'CARDINAL_CALENDAR_ICAL_URL': 'https://example.test/ancien.ics',
            'CARDINAL_SCHOOL_CALENDAR_ICAL_URL': '',
        }), patch.object(feed, 'fetch_ics', return_value=b'official') as fetch, \
             patch.object(feed, 'parse_feed', return_value=[current]), \
             patch.object(feed, 'current_items', return_value=[current]):
            self.assertEqual(feed.main(), 0)
            fetch.assert_called_once_with(feed.PUBLIC_ICAL)

    def test_calendar_update_replaces_old_date_not_duplicate(self):
        updated = event('Rencontre de parents', '2026-10-15T19:00:00-04:00')
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'news-feed.json'
            target.write_text(json.dumps({'items': [
                event('Rencontre de parents', '2026-10-14T19:00:00-04:00'),
            ]}), encoding='utf-8')
            with patch.dict(os.environ, {'CARDINAL_CALENDAR_ICAL_URL': '',
                                         'CARDINAL_SCHOOL_CALENDAR_ICAL_URL': ''}), \
                 patch.object(feed, 'OUTPUT', target), \
                 patch.object(feed, 'fetch_ics', return_value=b'official'), \
                 patch.object(feed, 'parse_feed', return_value=[updated]):
                self.assertEqual(feed.main(), 0)
            self.assertEqual(json.loads(target.read_text(encoding='utf-8'))['items'], [updated])

    def test_source_outage_preserves_existing_feed_and_returns_error(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'news-feed.json'
            target.write_text('{"items":[]}', encoding='utf-8')
            with patch.dict(os.environ, {'CARDINAL_CALENDAR_ICAL_URL': '',
                                         'CARDINAL_SCHOOL_CALENDAR_ICAL_URL': ''}), \
                 patch.object(feed, 'OUTPUT', target), \
                 patch.object(feed, 'fetch_ics', side_effect=OSError('temporary outage')):
                self.assertEqual(feed.main(), 1)
            self.assertEqual(target.read_text(encoding='utf-8'), '{"items":[]}')

    def test_private_fallback_only_when_official_unavailable(self):
        item = event('Assemblée', '2026-10-15T19:00:00-04:00')
        with patch.dict(os.environ, {'CARDINAL_CALENDAR_ICAL_URL': 'https://example.test/backup.ics',
                                     'CARDINAL_SCHOOL_CALENDAR_ICAL_URL': ''}), \
             patch.object(feed, 'fetch_ics', side_effect=[OSError('public outage'), b'backup']) as fetch, \
             patch.object(feed, 'parse_feed', return_value=[item]), \
             patch.object(feed, 'current_items', return_value=[item]):
            self.assertEqual(feed.main(), 0)
            self.assertEqual(fetch.call_count, 2)


if __name__ == '__main__':
    unittest.main()
