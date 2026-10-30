const { test, expect } = require('@playwright/test');
const URL = 'https://drive.google.com/drive/folders/12gSHd025A4f7cFedyJpqqN2syhzFY96o';

test('la ressource SAÉ est dans Suivre un élève et ouvre directement le dossier', async ({ page }) => {
  await page.goto('/');
  const card = page.locator('#section-suivi #horaire-absences-prevues-sae');
  await expect(card).toHaveCount(1);
  const link = card.locator('a.procedure-direct-link');
  await expect(link).toHaveAttribute('href', URL);
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toContainText('Horaire des absences prévues');
});

test('la recherche distingue absences planifiées et absences générales', async ({ page }) => {
  await page.goto('/');
  const search = page.locator('#guide-search');
  for (const query of ['absences prévues', 'horaire des absences SAÉ', 'absences par discipline']) {
    await search.fill(query);
    const first = page.locator('#search-suggestions .suggestion').first();
    await expect(first).toBeVisible();
    await expect(first).toHaveAttribute('href', URL);
  }
  for (const query of ['absence prolongée', 'horaire', 'absence']) {
    await search.fill(query);
    await expect(page.locator('#search-suggestions .suggestion[href="'+URL+'"]')).toHaveCount(0);
  }
});
