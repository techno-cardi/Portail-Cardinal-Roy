const { test, expect } = require('@playwright/test');

test('le décor Halloween apparaît uniquement le 30 octobre à Québec, sans cacher la recherche', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-30T10:00:00-04:00'));
  await page.goto('/');

  await expect(page.locator('html')).toHaveClass(/cardi-halloween/);
  await expect(page.locator('.halloween-greeting')).toContainText('Joyeuse Halloween!');
  await expect(page.locator('.halloween-masthead-art')).toHaveCount(1);
  await expect(page.locator('.halloween-web')).toHaveCount(2);
  await expect(page.locator('.halloween-spider')).toHaveCount(1);
  await expect(page.locator('#guide-search')).toBeVisible();
  await page.locator('#guide-search').fill('sortie de classe');
  await expect(page.locator('#search-suggestions')).toBeVisible();
});

test('le décor reste actif le 31 octobre, sans interaction avec la page', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-31T13:00:00-04:00'));
  await page.goto('/');
  await expect(page.locator('.halloween-greeting')).toBeVisible();
  await expect(page.locator('.halloween-web')).toHaveCount(2);
  await expect(page.locator('.halloween-masthead-art')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#guide-search')).toBeEnabled();
});

test('le portail reprend sa présentation habituelle le 1er novembre', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-01T09:00:00-05:00'));
  await page.goto('/');
  await expect(page.locator('html')).not.toHaveClass(/cardi-halloween/);
  await expect(page.locator('[data-halloween-2026]')).toHaveCount(0);
  await expect(page.locator('#guide-search')).toBeVisible();
});

test('la décoration disparaît à minuit si le portail reste ouvert', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-31T23:59:58-04:00') });
  await page.goto('/');
  await expect(page.locator('.halloween-greeting')).toBeVisible();
  await page.clock.fastForward(3000);
  await expect(page.locator('html')).not.toHaveClass(/cardi-halloween/);
  await expect(page.locator('[data-halloween-2026]')).toHaveCount(0);
  await expect(page.locator('#guide-search')).toBeVisible();
});
