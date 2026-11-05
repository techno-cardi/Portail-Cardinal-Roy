const { test, expect } = require('@playwright/test');

const MEETING_ID = '#rencontres-parents-2026-11-19';
const ROOMS_URL = 'https://drive.google.com/file/d/1108CAYXLxzLUERDqJ4IX41xTGMu4e67s/view?usp=drive_link';
const PARENTS_LETTER_URL = 'https://drive.google.com/file/d/1MJnmygE53_9TgL9k4SNggmHr_lifnVod/view?usp=drive_link';

test('la rubrique temporaire des rencontres contient les horaires et les trois bons liens', async ({ page }) => {
  await page.addInitScript(() => { Date.now = () => new Date('2026-11-10T12:00:00-05:00').getTime(); });
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();
  const card = page.locator('#section-organisation-scolaire ' + MEETING_ID);
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('13 h 30 à 16 h 30');
  await expect(card).toContainText('18 h 30 à 20 h 30');
  await expect(card).toContainText('8 minutes par plage');
  await expect(card.locator('a')).toHaveCount(3);
  await expect(card.locator('a[href="https://appsp.ca/rencontreparent"]')).toHaveCount(1);
  await expect(card.locator('a[href="' + ROOMS_URL + '"]')).toHaveCount(1);
  await expect(card.locator('a[href="' + PARENTS_LETTER_URL + '"]')).toHaveCount(1);
  await expect(card.locator('a[href*="13dpfWN2_Jws3V4bwptfamOe-VSahZvCd"]')).toHaveCount(0);
});

test('la rubrique de rencontre a disparu à partir du 20 novembre 2026', async ({ page }) => {
  await page.addInitScript(() => { Date.now = () => new Date('2026-11-20T00:00:01-05:00').getTime(); });
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();
  await expect(page.locator(MEETING_ID)).toHaveCount(0);
});

test('le bandeau du 19 novembre ouvre directement l’horaire des locaux des rencontres', async ({ page }) => {
  await page.addInitScript(() => { Date.now = () => new Date('2026-11-10T12:00:00-05:00').getTime(); });
  await page.route('**/news-feed.json*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [{
        title: 'Rencontre des parents-enseignants',
        start: '2026-11-19T00:00:00-05:00',
        end: '2026-11-20T00:00:00-05:00',
        all_day: true, kind: 'evenement', icon: '📅'
      }] })
    });
  });
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();
  const track = page.locator('#school-news-ticker .school-news-track');
  await expect(track).toContainText('Rencontre des parents-enseignants');
  await expect(track).toHaveAttribute('href', ROOMS_URL);
  await expect(track).toHaveAttribute('data-parents-meeting-link', '2026-11-19');
  await expect(track).toHaveAttribute('target', '_blank');
});

test('la nouveauté pointe vers la rubrique et non vers un document isolé', async ({ page }) => {
  await page.route('**/portal-updates.json*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [{
        id: 'rencontres-parents-2026-11-05',
        title: 'Rencontres de parents - Informations et rendez-vous',
        published_at: '2026-11-05',
        expires_at: '2026-11-19',
        target: MEETING_ID,
        target_type: 'section',
        kind: 'nouveau'
      }] })
    });
  });
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();
  const entry = page.locator('#portal-updates a.portal-update-item');
  await expect(entry).toHaveAttribute('href', MEETING_ID);
  await expect(entry).toHaveAttribute('data-target-type', 'resource');
});
