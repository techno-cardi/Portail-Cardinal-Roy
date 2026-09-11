const { test, expect } = require('@playwright/test');

test('la fiche Évaluation affiche les trois dossiers du Drive commun', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();

  const card = page.locator('#app .procedure').filter({
    has: page.locator(':scope > summary', { hasText: /Évaluation.*bulletin.*planification/i })
  });
  await expect(card, 'La fiche Évaluation, bulletin et planification doit exister').toHaveCount(1);
  await card.locator(':scope > summary').click();

  const content = card.locator('.procedure-content');
  const links = content.locator('[data-evaluation-drive-folders] a.btn');
  await expect(links).toHaveCount(3);
  await expect(content.getByRole('link', { name: /Nature et moments des évaluations/i })).toHaveAttribute('href', /1LTgKPbES9IixST2V-jolWxA7s6SMV6jT/);
  await expect(content.getByRole('link', { name: /Attentes et exigences/i })).toHaveAttribute('href', /18URlr-7b2TmnzZqL4TdOOGlNI2V7TfJW/);
  await expect(content.getByRole('link', { name: /Planification annuelle/i })).toHaveAttribute('href', /15dleRqnqz8ZldCzWrogMAJONlVBta3IY/);

  for (const query of ['nature moments', 'attentes exigences', 'planif annuelle']) {
    await page.locator('#guide-search').fill(query);
    await expect(page.locator('#search-suggestions')).toContainText(/Évaluation|planification|bulletin/i);
  }

  expect(errors).toEqual([]);
});
