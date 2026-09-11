const { test, expect } = require('@playwright/test');

test('Drive commun affiche les trois dossiers d’évaluation et de planification', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();

  const card = page.locator('#app #drive');
  await expect(card, 'La fiche Drive commun doit exister').toHaveCount(1);
  await card.locator(':scope > summary').click();

  const content = card.locator('.procedure-content');
  await expect(content).toContainText('Dossiers — évaluation et planification');
  await expect(content.getByRole('link', { name: /Nature et moments d’évaluation/i })).toHaveAttribute('href', /1LTgKPbES9IixST2V-jolWxA7s6SMV6jT/);
  await expect(content.getByRole('link', { name: /Attentes et exigences/i })).toHaveAttribute('href', /18URlr-7b2TmnzZqL4TdOOGlNI2V7TfJW/);
  await expect(content.getByRole('link', { name: /Planification annuelle/i })).toHaveAttribute('href', /15dleRqnqz8ZldCzWrogMAJONlVBta3IY/);

  await page.locator('#guide-search').fill('planif annuelle');
  await expect(page.locator('#search-suggestions')).toContainText(/Drive commun|planification/i);
  expect(errors).toEqual([]);
});
