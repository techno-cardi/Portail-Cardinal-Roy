const { test, expect } = require('@playwright/test');

// Le contrôle des dates se fait toujours dans le fuseau de l'école.
test('novembre : décor indépendant, sans titre et sans blocage de la recherche', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-08T15:00:00Z') });
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();
  await expect(page.locator('html')).toHaveClass(/cardi-november/);
  await expect(page.locator('html')).toHaveAttribute('data-november-phase','autumn');
  await expect(page.locator('[data-november-decor="branch"]')).toHaveCount(1);
  await expect(page.locator('[data-november-decor="branch-left"]')).toHaveCount(1);
  await expect(page.locator('[data-november-decor="garland"]')).toHaveCount(1);
  await expect(page.locator('[data-november-decor="pile-left"]')).toHaveCount(1);
  await expect(page.locator('[data-november-decor="pile-right"]')).toHaveCount(1);
  await expect(page.locator('[data-november-decor="ground-left"]')).toHaveCount(1);
  await expect(page.locator('[data-november-decor="ground-right"]')).toHaveCount(1);
  await expect(page.locator('.november-particle--leaf svg path').first()).toHaveAttribute('d', /^M32 3 C34/);
  expect(await page.locator('.november-card-leaf svg').count()).toBeGreaterThan(0);
  await expect(page.locator('[data-november-decor="layer"]')).toHaveCount(1);
  await expect(page.locator('[data-november-decor="poppy"]')).toHaveCount(0);
  await page.locator('#guide-search').fill('plan de classe');
  await expect(page.locator('#search-suggestions .suggestion').first()).toBeVisible();
  const first = page.locator('#search-suggestions .suggestion').first();
  await first.click();
  await expect(page).toHaveURL(/#.+$/);
});

test('jour du Souvenir : coquelicot statique visible seulement le 11 novembre', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-11T15:00:00Z') });
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();
  await expect(page.locator('[data-november-decor="poppy"]')).toHaveCount(1);
  await expect(page.locator('[data-november-decor="poppy"]')).toHaveAttribute('aria-hidden','true');
});

test('fin novembre : givre et flocons, sans multiplication des éléments', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-25T15:00:00Z') });
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-november-phase','winter');
  const count = await page.locator('.november-particle').count();
  expect(count).toBeLessThanOrEqual(10);
  expect(count).toBeGreaterThanOrEqual(1);
  await page.setViewportSize({width:390,height:844});
  await expect.poll(async () => page.locator('.november-particle').count()).toBe(5);
});

test('le décor disparaît le 1er décembre, même sans rechargement', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-12-01T04:59:50Z') });
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();
  await expect(page.locator('html')).toHaveClass(/cardi-november/);
  await page.clock.fastForward(11000);
  await expect(page.locator('html')).not.toHaveClass(/cardi-november/);
  await expect(page.locator('[data-november-decor]')).toHaveCount(0);
});

test('mode mouvements réduits : illustrations fixes seulement', async ({ page }) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.clock.install({ time: new Date('2026-11-08T15:00:00Z') });
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();
  await expect(page.locator('[data-november-decor="branch"]')).toHaveCount(1);
  await expect(page.locator('.november-particle')).toHaveCount(0);
});

test('ouverture le 31 octobre : le thème apparaît au passage à novembre sans rechargement', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-01T03:59:50Z') });
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();
  await expect(page.locator('html')).not.toHaveClass(/cardi-november/);
  await page.clock.fastForward(11000);
  await expect(page.locator('html')).toHaveClass(/cardi-november/);
  await expect(page.locator('[data-november-decor="layer"]')).toHaveCount(1);
});
