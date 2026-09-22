const { test, expect } = require('@playwright/test');

async function openPortal(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.PORTAL_SEARCH_ENGINE || '')).toBe('2.0');
  await expect.poll(() => page.evaluate(() => window.PORTAL_TELEWORK_SEARCH || '')).toBe('1.0');
  return errors;
}

test('télétravail affiche les cinq pédagogiques en télétravail 2026-2027', async ({ page }) => {
  const errors = await openPortal(page);
  await page.locator('#guide-search').fill('télétravail');

  const result = page.locator('#search-suggestions .telework-search-card');
  await expect(result).toBeVisible();
  await expect(result).toContainText('Pédagogiques en télétravail 2026-2027');
  await expect(result).toContainText('Vendredi 20 novembre 2026');
  await expect(result).toContainText('Lundi 25 janvier 2027');
  await expect(result).toContainText('Vendredi 19 février 2027');
  await expect(result).toContainText('Lundi 8 mars 2027');
  await expect(result).toContainText('Mardi 29 juin 2027');
  await expect(result.locator('.telework-search-list li')).toHaveCount(5);
  expect(errors).toEqual([]);
});

test('les variantes sans accents mènent au même résultat sans détourner une recherche partielle', async ({ page }) => {
  const errors = await openPortal(page);
  const search = page.locator('#guide-search');

  await search.fill('teletrav');
  await expect(page.locator('#search-suggestions .telework-search-card')).toHaveCount(0);

  await search.fill('pedago en teletravail');
  await expect(page.locator('#search-suggestions .telework-search-card')).toBeVisible();
  await expect(page.locator('#search-status')).toHaveText('1 résultat');
  expect(errors).toEqual([]);
});
