const { test, expect } = require('@playwright/test');

test('les ressources Drive importantes s’ouvrent directement depuis la recherche', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const input = page.locator('#guide-search');
  const suggestions = page.locator('#search-suggestions');
  await expect(input).toBeVisible();

  const cases = [
    ['nature', 'Nature et moments des évaluations', '1LTgKPbES9IixST2V-jolWxA7s6SMV6jT'],
    ['attentes', 'Attentes et exigences', '18URlr-7b2TmnzZqL4TdOOGlNI2V7TfJW'],
    ['planification', 'Planification annuelle', '15dleRqnqz8ZldCzWrogMAJONlVBta3IY'],
    ['locaux', 'Horaires des locaux', '1lh_fe1ywFHNkK0g4xhVlYm5k7Q2wY67L'],
    ['enseignants', 'Horaires des enseignants', '1f7UVm1etsisBX_WNgF9MAwa7bX0gqBGl'],
    ['surveillance', 'Horaires de surveillance', '1z1TVIWOHQn1ODLUL-Wo1Mcum0XCHHL0z']
  ];

  for (const [query, title, folderId] of cases) {
    await input.fill(query);
    const direct = suggestions.locator('[data-drive-search-resource]');
    await expect(direct).toHaveCount(1);
    await expect(direct.locator('strong')).toHaveText(title);
    await expect(direct).toHaveAttribute('href', new RegExp(folderId));
    await expect(direct).toHaveAttribute('target', '_blank');
    await expect(direct).toHaveAttribute('rel', /noopener/);
  }

  await input.fill('horaire');
  const horaires = suggestions.locator('[data-drive-search-resource]');
  await expect(horaires).toHaveCount(3);
  await expect(suggestions).toContainText('Horaires des locaux');
  await expect(suggestions).toContainText('Horaires des enseignants');
  await expect(suggestions).toContainText('Horaires de surveillance');

  expect(errors).toEqual([]);
});
