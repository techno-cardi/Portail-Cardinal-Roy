const { test, expect } = require('@playwright/test');

test('la fiche evaluation affiche les trois dossiers du Drive commun', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();

  const card = page.locator('#evaluation-bulletin-planification');
  await expect(card, 'La fiche evaluation-bulletin-planification doit exister').toHaveCount(1);
  await card.locator(':scope > summary').click();

  const content = card.locator('.procedure-content');
  await expect(content).toContainText('Dossiers du Drive commun');
  await expect(content.getByRole('link', { name: /Nature et moments d’évaluation/i })).toHaveAttribute('href', /1LTgKPbES9IixST2V-jolWxA7s6SMV6jT/);
  await expect(content.getByRole('link', { name: /Attentes et exigences/i })).toHaveAttribute('href', /18URlr-7b2TmnzZqL4TdOOGlNI2V7TfJW/);
  await expect(content.getByRole('link', { name: /Planification annuelle/i })).toHaveAttribute('href', /15dleRqnqz8ZldCzWrogMAJONlVBta3IY/);

  await page.locator('#guide-search').fill('planif annuelle');
  await expect(page.locator('#search-suggestions')).toContainText(/Évaluation|planification/i);
  expect(errors).toEqual([]);
});
