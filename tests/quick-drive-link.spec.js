const { test, expect } = require('@playwright/test');

test('Accès rapide ouvre directement le Drive commun avec le logo Google Drive', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();

  const link = page.locator('.quick-area a[data-quick-resource="drive-commun"]');
  await expect(link).toHaveCount(1);
  await expect(link).toContainText('Drive commun');
  await expect(link).toHaveAttribute('href', 'https://drive.google.com/drive/folders/0ACOxqc1_36isUk9PVA');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link.locator('img')).toHaveAttribute('src', /assets\/vendor\/google-drive\.svg/);
  await expect(link.locator('img')).toHaveAttribute('alt', 'Logo Google Drive');
  await expect(page.locator('.quick-area a[href="#presences"]')).toHaveCount(0);

  expect(errors).toEqual([]);
});
