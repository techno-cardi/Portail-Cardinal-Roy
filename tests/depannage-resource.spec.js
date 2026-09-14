const { test, expect } = require('@playwright/test');

const DRIVE_ID = '1-hr2ucGHlCGPEhTjHcMBVcoGwCViHWnD';

test('le tableau de dépannage est visible et s’ouvre directement depuis la recherche', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();

  const card = page.locator('#section-organisation-scolaire #tableau-depannage-2026-2027');
  await expect(card).toHaveCount(1);
  await expect(card.locator('.procedure-visual')).toHaveText('👥');
  await expect(card.locator('.procedure-title')).toHaveText(/Tableau de disponibilités de dépannage 2026-2027/i);
  await card.locator(':scope > summary').click();
  await expect(card.locator('.procedure-content')).toContainText(/rouge/i);
  await expect(card.locator('.procedure-content')).toContainText(/vert/i);
  await expect(card.getByRole('link', { name: /Ouvrir le tableau de dépannage/i })).toHaveAttribute('href', new RegExp(DRIVE_ID));

  await page.locator('#guide-search').fill('dépannage');
  const direct = page.locator('[data-direct-search-resource="tableau-depannage-direct"]');
  await expect(direct).toBeVisible();
  await expect(direct).toContainText(/Tableau de disponibilités de dépannage 2026-2027/i);
  await expect(direct).toHaveAttribute('href', new RegExp(DRIVE_ID));
  await expect(direct).toHaveAttribute('target', '_blank');

  expect(errors).toEqual([]);
});
