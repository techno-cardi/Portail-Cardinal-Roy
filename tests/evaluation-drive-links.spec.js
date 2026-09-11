const { test, expect } = require('@playwright/test');

test('les trois dossiers du Drive commun sont des ressources distinctes', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const input = page.locator('#guide-search');
  const suggestions = page.locator('#search-suggestions');
  await expect(input).toBeVisible();

  const card = page.locator('#app .procedure').filter({
    has: page.locator(':scope > summary', { hasText: /Évaluation.*bulletin.*planification/i })
  });
  await expect(card).toHaveCount(1);
  await card.locator(':scope > summary').click();
  const content = card.locator('.procedure-content');
  await expect(content.locator('[data-evaluation-drive-folders] a.btn')).toHaveCount(3);

  const cases = [
    ['nature', 'Nature et moments des évaluations', '1LTgKPbES9IixST2V-jolWxA7s6SMV6jT'],
    ['attentes', 'Attentes et exigences', '18URlr-7b2TmnzZqL4TdOOGlNI2V7TfJW'],
    ['planification', 'Planification annuelle', '15dleRqnqz8ZldCzWrogMAJONlVBta3IY']
  ];

  for (const [query, title, folderId] of cases) {
    await input.fill(query);
    const direct = suggestions.locator('[data-drive-search-resource]');
    await expect(direct).toHaveCount(1);
    await expect(direct.locator('strong')).toHaveText(title);
    await expect(direct).toHaveAttribute('href', new RegExp(folderId));
    await expect(suggestions).not.toContainText('Évaluation, bulletin et planification');
  }

  expect(errors).toEqual([]);
});
