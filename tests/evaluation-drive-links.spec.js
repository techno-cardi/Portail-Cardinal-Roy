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
  await expect(content).toContainText('Dossiers - évaluation et planification');
  await expect(content.getByRole('link', { name: /Normes et modalités d’évaluation/i })).toHaveAttribute('href', /1ILYhek0U8IJwa7LTlx6JgaT2cwZ9gKfM/);
  await expect(content.getByRole('link', { name: /Attentes et exigences/i })).toHaveAttribute('href', /18URlr-7b2TmnzZqL4TdOOGlNI2V7TfJW/);
  await expect(content.getByRole('link', { name: /Planification annuelle/i })).toHaveAttribute('href', /15dleRqnqz8ZldCzWrogMAJONlVBta3IY/);

  for (const query of ['normes modalités', 'attentes exigences', 'planif annuelle']) {
    await page.locator('#guide-search').fill(query);
    await expect(page.locator('#search-suggestions')).toContainText(/Drive commun|évaluation|planification/i);
  }

  expect(errors).toEqual([]);
});
