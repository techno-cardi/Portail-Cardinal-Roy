const { test, expect } = require('@playwright/test');

async function waitForPortal(page) {
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.PORTAL_SEARCH_ENGINE || '')).toBe('2.0');
}

test('les couches nettoyées restent uniques et conservent leur contenu', async ({ page }) => {
  await waitForPortal(page);

  await expect(page.locator('#legacy-source #scolago')).toHaveCount(1);
  await expect(page.locator('#legacy-source #scolago-absence-personnel')).toHaveCount(0);

  const scolago = page.locator('#legacy-source #scolago');
  await expect(scolago.locator('a[href="https://support.scolago.com/fr/support/home"]')).toHaveCount(1);
  await expect(scolago.locator('a[href="https://scolago.com/Content/Documents/PolitiqueDeConfidentialite.html"]')).toHaveCount(1);
  await expect(scolago.locator('a[href="https://scolago.com/Content/Documents/ConditionsDUtilisation.html"]')).toHaveCount(1);

  const evaluation = page.locator('#legacy-source #evaluation-bulletin-planification');
  await expect(evaluation).toHaveCount(1);
  await expect(evaluation.locator('[data-evaluation-drive-folders]')).toHaveCount(1);
  await expect(evaluation.locator('[data-evaluation-drive-folders] a')).toHaveCount(3);

  await expect(page.locator('script[src*="source-patches-9.js"]')).toHaveCount(0);
});
