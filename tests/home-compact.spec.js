const { test, expect } = require('@playwright/test');

async function waitForPortal(page) {
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.PORTAL_SEARCH_ENGINE || '')).toBe('2.0');
  await expect(page.locator('link[data-home-compact]')).toHaveCount(1);
}

test('les accès rapides commencent dans le premier écran sur un écran de portable', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.startsWith('mobile'), 'Vérification desktop seulement');
  await page.setViewportSize({ width: 1797, height: 832 });
  await waitForPortal(page);

  // Laisse les blocs dynamiques Pensée du jour / Dates importantes prendre leur place.
  await page.waitForTimeout(450);

  const quickTitle = page.locator('#quick-title');
  const firstQuick = page.locator('.quick-links a').first();
  await expect(quickTitle).toBeVisible();
  await expect(firstQuick).toBeVisible();

  const viewportHeight = await page.evaluate(() => window.innerHeight);
  const titleBox = await quickTitle.boundingBox();
  const quickBox = await firstQuick.boundingBox();

  expect(titleBox).not.toBeNull();
  expect(quickBox).not.toBeNull();
  expect(titleBox.y).toBeLessThan(viewportHeight);
  expect(quickBox.y).toBeLessThan(viewportHeight);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('la variante compacte conserve une zone de recherche confortable sur mobile', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'), 'Vérification mobile seulement');
  await waitForPortal(page);

  const search = page.locator('#guide-search');
  const shell = page.locator('.search-shell');
  await expect(search).toBeVisible();
  await expect(shell).toBeVisible();

  const shellBox = await shell.boundingBox();
  expect(shellBox).not.toBeNull();
  expect(shellBox.height).toBeGreaterThanOrEqual(48);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
