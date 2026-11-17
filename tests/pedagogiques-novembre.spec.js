const { test, expect } = require('@playwright/test');

const FILE_URL = 'https://drive.google.com/file/d/1j3SULKwLt8EiBvHtsSo9XuAyB6m9puQ2/view';
const RESOURCE_ID = 'journees-pedagogiques-2026-11-19-20';
const DIRECT_KEY = 'pedagogiques-2026-11-19-20';

async function setDate(page, date) {
  await page.addInitScript(({ value }) => {
    Date.now = () => new Date(value).getTime();
  }, { value: date });
}

async function openPortal(page) {
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.directFiles || '')).toBe('1.0');
}

test('la nouvelle fiche apparaît dans Organisation scolaire et mène au document', async ({ page }) => {
  await setDate(page, '2026-11-17T12:00:00-05:00');
  await openPortal(page);
  const card = page.locator('#section-organisation-scolaire #' + RESOURCE_ID);
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('19 et 20 novembre');
  await expect(card.locator('a[href="' + FILE_URL + '"]')).toHaveCount(1);
});

test('pédago et ses variantes proposent le fichier direct en premier', async ({ page }) => {
  await setDate(page, '2026-11-17T12:00:00-05:00');
  await openPortal(page);
  for (const query of ['pédago', 'pedago', 'pédagogique', 'journées pédagogiques', 'horaire pédago', 'péda']) {
    await page.locator('#guide-search').fill(query);
    const first = page.locator('#search-suggestions .suggestion').first();
    await expect(first).toHaveAttribute('data-direct-file-suggestion', DIRECT_KEY);
    await expect(first).toHaveAttribute('href', FILE_URL);
    await expect(first).toContainText('Accéder au fichier');
  }
});

test('une recherche générale horaire conserve ses autres résultats', async ({ page }) => {
  await setDate(page, '2026-11-17T12:00:00-05:00');
  await openPortal(page);
  await page.locator('#guide-search').fill('horaire');
  const first = page.locator('#search-suggestions .suggestion').first();
  await expect(first).toBeVisible();
  await expect(first).not.toHaveAttribute('data-direct-file-suggestion', DIRECT_KEY);
});

test('la fiche et la recherche disparaissent le vendredi à 23 h 59 (Québec)', async ({ page }) => {
  await setDate(page, '2026-11-20T23:59:01-05:00');
  await openPortal(page);
  await expect(page.locator('#' + RESOURCE_ID)).toHaveCount(0);
  await page.locator('#guide-search').fill('pédago');
  await expect(page.locator('#search-suggestions a[href="' + FILE_URL + '"]')).toHaveCount(0);
});

test('le fichier de novembre ne détourne pas une recherche effectuée avant sa publication', async ({ page }) => {
  await setDate(page, '2026-10-02T10:00:00-04:00');
  await openPortal(page);
  await page.locator('#guide-search').fill('pédago');
  const first = page.locator('#search-suggestions .suggestion').first();
  await expect(first).toHaveAttribute('data-direct-file-suggestion', 'pedagogique-2026-10-05');
});

for (const [day, title] of [
  ['2026-11-19', 'Pédagogique'],
  ['2026-11-20', 'Pédagogique (télétravail)']
]) {
  test('le calendrier du ' + day + ' ouvre directement le nouvel horaire', async ({ page }) => {
    await setDate(page, '2026-11-17T12:00:00-05:00');
    await page.route('**/news-feed.json*', async route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [{ title, start: day + 'T00:00:00-05:00', end: (day === '2026-11-19' ? '2026-11-20' : '2026-11-21') + 'T00:00:00-05:00', all_day: true, kind: 'pedagogique', icon: '📚' }]
      })
    }));
    await openPortal(page);
    const track = page.locator('#school-news-ticker .school-news-track');
    await expect(track).toContainText(title);
    await expect(track).toHaveAttribute('href', FILE_URL);
    await expect(track).toHaveAttribute('target', '_blank');
    await expect(track).toHaveAttribute('data-school-news-action', 'ped-day-' + day);
  });
}
