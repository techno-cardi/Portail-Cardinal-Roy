const { test, expect } = require('@playwright/test');

test('la page admin expose la maintenance sans rendre GitHub obligatoire', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.route('https://api.github.com/**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ workflow_runs: [{ status: 'completed', conclusion: 'success', updated_at: '2026-09-21T19:00:00Z', html_url: 'https://github.com/techno-cardi/Portail-Cardinal-Roy/actions' }] })
  }));

  await page.goto('/admin-status.html');
  const maintenance = page.locator('#admin-maintenance-health');
  await expect(maintenance).toBeVisible();
  await expect(maintenance).toContainText('Automatisation et maintenance');
  await expect(maintenance).toContainText('2026-2027');
  await expect(maintenance).toContainText('nouveautés affichables');
  await expect(maintenance).toContainText('Dernières exécutions GitHub Actions');
  expect(errors).toEqual([]);
});
