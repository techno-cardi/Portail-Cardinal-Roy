const { test, expect } = require('@playwright/test');

async function openPortal(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.PORTAL_SEARCH_ENGINE || '')).toBe('2.0');
  await expect.poll(() => page.locator('script[data-search-easter-egg]').count()).toBe(1);
  return errors;
}

const sacres = ['tabarnak', 'calice', 'esti', 'osti', 'marde', 'criss', 'crisse'];

for (const sacre of sacres) {
  test(`${sacre} au complet déclenche l'easter egg`, async ({ page }) => {
    const errors = await openPortal(page);
    await page.locator('#guide-search').fill(sacre);
    const egg = page.locator('#search-suggestions .search-easter-egg');
    await expect(egg).toBeVisible();
    await expect(egg).toContainText('Ouf! Ça va bien aller!');
    await expect(egg).toContainText('pas besoin de sacrer après le portail');
    expect(errors).toEqual([]);
  });
}

test('l’easter egg fait un petit flash et anime le visage', async ({ page }) => {
  const errors = await openPortal(page);
  await page.locator('#guide-search').fill('tabarnak');
  const egg = page.locator('#search-suggestions .search-easter-egg');
  await expect(egg).toBeVisible();
  await expect(egg.locator('.search-easter-egg-face')).toContainText('🥸');
  const animationName = await egg.evaluate(node => getComputedStyle(node).animationName);
  expect(animationName).toContain('sacreSurprise');
  expect(errors).toEqual([]);
});

test('un sacre incomplet ne déclenche pas l’easter egg', async ({ page }) => {
  const errors = await openPortal(page);
  await page.locator('#guide-search').fill('tabarna');
  await expect(page.locator('#search-suggestions .search-easter-egg')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('un sacre dans une phrase ne déclenche pas l’easter egg', async ({ page }) => {
  const errors = await openPortal(page);
  await page.locator('#guide-search').fill('tabarnak bug');
  await expect(page.locator('#search-suggestions .search-easter-egg')).toHaveCount(0);
  expect(errors).toEqual([]);
});
