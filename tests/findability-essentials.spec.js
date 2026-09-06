const { test, expect } = require('@playwright/test');

async function openPortal(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.PORTAL_SEARCH_ENGINE || '')).toBe('2.0');
  return errors;
}

async function expectFirstSuggestion(page, query, expected) {
  const input = page.locator('#guide-search');
  await input.fill(query);
  const first = page.locator('#search-suggestions .suggestion').first();
  await expect(first).toBeVisible();
  await expect(first).toContainText(expected);
}

test('le portail charge sans erreur JavaScript', async ({ page }) => {
  const errors = await openPortal(page);
  expect(errors).toEqual([]);
});

test('suppléance trouve le rapport de temps', async ({ page }) => {
  const errors = await openPortal(page);
  await expectFirstSuggestion(page, 'suppléance', /Rapport de temps|Scolago/i);
  expect(errors).toEqual([]);
});

test('remplacement trouve le rapport de temps ou Scolago', async ({ page }) => {
  const errors = await openPortal(page);
  await expectFirstSuggestion(page, 'remplacement', /Rapport de temps|Scolago/i);
  expect(errors).toEqual([]);
});

test('rapport temps trouve le rapport de temps de travail', async ({ page }) => {
  const errors = await openPortal(page);
  await expectFirstSuggestion(page, 'rapport temps', /Rapport de temps de travail/i);
  expect(errors).toEqual([]);
});

test('sos trouve S.O.S. Groupe', async ({ page }) => {
  const errors = await openPortal(page);
  await expectFirstSuggestion(page, 'sos', /S\.O\.S\.|SOS Groupe/i);
  expect(errors).toEqual([]);
});

test('groupe difficil trouve S.O.S. Groupe malgré la faute', async ({ page }) => {
  const errors = await openPortal(page);
  await expectFirstSuggestion(page, 'groupe difficil', /S\.O\.S\.|SOS Groupe/i);
  expect(errors).toEqual([]);
});

test('normes modalités trouve Évaluation, bulletin et planification', async ({ page }) => {
  const errors = await openPortal(page);
  await expectFirstSuggestion(page, 'normes modalites', /Évaluation, bulletin et planification/i);
  expect(errors).toEqual([]);
});

test('code de vie trouve les règles 2026-2027', async ({ page }) => {
  const errors = await openPortal(page);
  await expectFirstSuggestion(page, 'code de vie', /Règles et code de vie/i);
  expect(errors).toEqual([]);
});

test('eleve difficulte trouve les services d’appui', async ({ page }) => {
  const errors = await openPortal(page);
  await expectFirstSuggestion(page, 'eleve difficulte', /Aide pour un élève|services d’appui/i);
  expect(errors).toEqual([]);
});

test('les catégories restent cohérentes', async ({ page }) => {
  const errors = await openPortal(page);
  await expect(page.locator('#section-organisation .category-heading h2')).toContainText('Réservations et logistique');
  await expect(page.locator('#section-formulaires #rapport-temps-travail')).toHaveCount(1);
  await expect(page.locator('#section-formulaires #scolago-absence-personnel')).toHaveCount(1);
  await expect(page.locator('#section-organisation-scolaire #evaluation-bulletin-planification')).toHaveCount(1);
  await expect(page.locator('#section-classe #code-vie-regles')).toHaveCount(1);
  await expect(page.locator('#section-suivi #aide-eleve-services-appui')).toHaveCount(1);
  expect(errors).toEqual([]);
});
