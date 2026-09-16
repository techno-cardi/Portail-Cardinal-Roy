const { test, expect } = require('@playwright/test');

async function openPortal(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.PORTAL_SEARCH_ENGINE || '')).toBe('2.0');
  return errors;
}

test('le favicon historique reste chargé et accessible', async ({ page, request }) => {
  const errors = await openPortal(page);
  const icon = page.locator('link[rel="icon"]');
  await expect(icon).toHaveCount(1);
  const href = await icon.getAttribute('href');
  expect(href).toMatch(/^favicon\.ico\?v=[a-f0-9]{12}$/);
  const response = await request.get(new URL(href, page.url()).toString());
  expect(response.ok()).toBeTruthy();
  expect((await response.body()).length).toBeGreaterThan(1000);
  expect(errors).toEqual([]);
});

test('le halo de recherche reste arrondi, animé et fluide', async ({ page }) => {
  const errors = await openPortal(page);
  await page.locator('#guide-search').fill('plan de classe');
  const first = page.locator('#search-suggestions .suggestion').first();
  await expect(first).toBeVisible();
  await expect(first).toContainText(/Plan de classe/i);
  await first.click();

  const target = page.locator('.portal-search-pulse').first();
  await expect(target).toBeVisible();
  const visual = await target.evaluate(node => {
    const style = getComputedStyle(node);
    return {
      radius: parseFloat(style.borderTopLeftRadius),
      animationName: style.animationName,
      animationDuration: style.animationDuration
    };
  });
  expect(visual.radius).toBeGreaterThanOrEqual(12);
  expect(visual.animationName).toContain('cardiSearchGlowCritical');
  expect(visual.animationDuration).toContain('2.65s');
  expect(errors).toEqual([]);
});

test('Accès rapide garde le logo Google Drive transparent', async ({ page }) => {
  const errors = await openPortal(page);
  const quick = page.locator('.quick-links a[href="https://drive.google.com/drive/folders/0ACOxqc1_36isUk9PVA"]');
  await expect(quick).toHaveCount(1);
  await expect(quick).toContainText('Drive commun');
  await expect(quick.locator('img')).toHaveAttribute('src', /assets\/vendor\/google-drive\.svg$/);
  expect(errors).toEqual([]);
});
