const { test, expect } = require('@playwright/test');

const RESERVATION_GUIDE = 'https://drive.google.com/file/d/1Ea0rcbyqvFjmXzc_yuNREdgk8Pq4LEQW/view?usp=drivesdk';

async function openPortal(page) {
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.PORTAL_SEARCH_ENGINE || '')).toBe('2.0');
}

test('une seule fiche regroupe réservations, récupérations et reprises', async ({ page }) => {
  await openPortal(page);
  const card = page.locator('#section-organisation #reservation');
  await expect(card).toHaveCount(1);
  await expect(card.locator('.procedure-title')).toHaveText('Réservation - Locaux, récupérations, convocations et reprises');
  await expect(page.locator('#recuperation')).toHaveCount(0);
  await expect(card).toContainText('jour-cycle');
  await expect(card).toContainText('Chromebooks');
  await expect(card).toContainText('Récupérations et mises à jour SAÉ (AM)');
  await expect(card).toContainText('Récupérations et mises à jour SAÉ (PM)');
  await expect(card).toContainText('durée');
  await expect(card).toContainText('matériel autorisé');
  await expect(card).toContainText('15 h 30');
  await expect(card).toContainText('48 heures');
  await expect(card.locator('a[href="https://appsp.ca/reservation/"]')).toHaveCount(1);
  await expect(card.locator('a[href="' + RESERVATION_GUIDE + '"]')).toHaveCount(1);
});

for (const q of ['récupération', 'réserver un local', 'reprise examen', 'convocation']) {
  test('la recherche « ' + q + ' » retrouve la fiche Réservation', async ({ page }) => {
    await openPortal(page);
    await page.locator('#guide-search').fill(q);
    const suggestions = page.locator('#search-suggestions');
    await expect(suggestions).toContainText('Réservation');
    await expect(suggestions.locator('[data-search-open="recuperation"]')).toHaveCount(0);
    await expect(suggestions.locator('[data-open-id="recuperation"]')).toHaveCount(0);
  });
}

test('ancien lien #recuperation : redirection visuelle sur la fiche fusionnée', async ({ page }) => {
  await page.goto('/#recuperation');
  await expect(page.locator('#reservation')).toHaveCount(1);
  await expect(page.locator('#reservation')).toHaveAttribute('open', '');
  await expect(page).toHaveURL(/#reservation$/);
});

test('le changement de fragment #recuperation ouvre également la fiche fusionnée', async ({ page }) => {
  await openPortal(page);
  await page.evaluate(() => { location.hash = 'recuperation'; });
  await expect(page.locator('#reservation')).toHaveAttribute('open', '');
  await expect(page.locator('#reservation')).toHaveClass(/portal-search-pulse/);
});

test('un ancien favori Récupération devient le favori de la fiche unique', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('cardi-guide-favorites-v1', JSON.stringify(['recuperation', 'sortie']));
  });
  await openPortal(page);
  await expect(page.locator('#favorite-links')).toContainText('Réservation - Locaux, récupérations, convocations et reprises');
  await expect(page.locator('#favorite-links a[href="#reservation"]')).toHaveCount(1);
  await expect(page.locator('#favorite-links a[href="#recuperation"]')).toHaveCount(0);
  const ids = await page.evaluate(() => JSON.parse(localStorage.getItem('cardi-guide-favorites-v1') || '[]'));
  expect(ids).toContain('reservation');
  expect(ids).not.toContain('recuperation');
  expect(ids).toContain('sortie');
});

test('ancien favori et favori Réservation ne créent pas de doublon', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('cardi-guide-favorites-v1', JSON.stringify(['recuperation', 'reservation']));
  });
  await openPortal(page);
  await expect(page.locator('#favorite-links a[href="#reservation"]')).toHaveCount(1);
  await expect(page.locator('#favorites-count')).toHaveText('1');
});
