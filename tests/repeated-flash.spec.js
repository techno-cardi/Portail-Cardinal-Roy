const { test, expect } = require('@playwright/test');

async function openPortal(page) {
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();
  await expect.poll(() => page.evaluate(() => typeof window.PORTAL_FLASH_TARGET)).toBe('function');
}

async function searchAndClick(page, query, expectedText) {
  const input = page.locator('#guide-search');
  await input.fill(query);
  const suggestion = page.locator('#search-suggestions .suggestion[data-search-index]').first();
  await expect(suggestion).toBeVisible();
  await expect(suggestion).toContainText(expectedText);
  await suggestion.click();
}

test('le halo se relance sur plusieurs ressources sans recharger la page', async ({ page }) => {
  await openPortal(page);

  await searchAndClick(page, 'plan de classe', 'Plan de classe');
  const first = page.locator('#planclasse');
  await expect(first).toHaveClass(/portal-search-pulse/);
  await expect.poll(async () => Number(await first.getAttribute('data-portal-flash-sequence') || 0)).toBeGreaterThan(0);
  const firstSequence = Number(await first.getAttribute('data-portal-flash-sequence'));

  // Le même clic ne doit pas provoquer un deuxième départ environ 900 ms plus tard.
  await page.waitForTimeout(1200);
  expect(Number(await first.getAttribute('data-portal-flash-sequence'))).toBe(firstSequence);

  await searchAndClick(page, 'facture', 'RFEEF');
  const second = page.locator('#rfeef');
  await expect(second).toHaveClass(/portal-search-pulse/);
  await expect.poll(async () => Number(await second.getAttribute('data-portal-flash-sequence') || 0)).toBeGreaterThan(firstSequence);
  await expect(first).not.toHaveClass(/portal-search-pulse/);
});

test('le halo se relance aussi quand on change de catégorie', async ({ page }) => {
  await openPortal(page);

  const organisation = page.locator('.section-nav-inner a[href="#section-organisation-scolaire"]');
  await organisation.click();
  const firstHeading = page.locator('#section-organisation-scolaire .category-heading');
  await expect(firstHeading).toHaveClass(/portal-search-pulse/);
  const firstSequence = Number(await firstHeading.getAttribute('data-portal-flash-sequence'));
  expect(firstSequence).toBeGreaterThan(0);

  const formulaires = page.locator('.section-nav-inner a[href="#section-formulaires"]');
  await formulaires.click();
  const secondHeading = page.locator('#section-formulaires .category-heading');
  await expect(secondHeading).toHaveClass(/portal-search-pulse/);
  await expect.poll(async () => Number(await secondHeading.getAttribute('data-portal-flash-sequence') || 0)).toBeGreaterThan(firstSequence);
  await expect(firstHeading).not.toHaveClass(/portal-search-pulse/);
});
