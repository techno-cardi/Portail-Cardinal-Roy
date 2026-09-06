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
  return first;
}

test('bug mène au billet informatique C2Atom', async ({ page }) => {
  const errors = await openPortal(page);
  await expectFirstSuggestion(page, 'bug', /C2Atom|billet informatique/i);
  expect(errors).toEqual([]);
});

test('bogue mène au billet informatique C2Atom', async ({ page }) => {
  const errors = await openPortal(page);
  await expectFirstSuggestion(page, 'bogue', /C2Atom|billet informatique/i);
  expect(errors).toEqual([]);
});

test('mon ordi marche pas mène au billet informatique', async ({ page }) => {
  const errors = await openPortal(page);
  await expectFirstSuggestion(page, 'mon ordi marche pas', /C2Atom|billet informatique/i);
  expect(errors).toEqual([]);
});

test('cellulaire mène à Mot de passe / double authentification', async ({ page }) => {
  const errors = await openPortal(page);
  await expectFirstSuggestion(page, 'cellulaire', 'Mot de passe / double authentification');
  expect(errors).toEqual([]);
});

test('nouveau téléphone mène à Mot de passe / double authentification', async ({ page }) => {
  const errors = await openPortal(page);
  await expectFirstSuggestion(page, 'nouveau téléphone', 'Mot de passe / double authentification');
  expect(errors).toEqual([]);
});

test('double authentification mène à la bonne ressource', async ({ page }) => {
  const errors = await openPortal(page);
  await expectFirstSuggestion(page, 'double authentification', 'Mot de passe / double authentification');
  expect(errors).toEqual([]);
});

test('réserver local mène au système de réservation', async ({ page }) => {
  const errors = await openPortal(page);
  await expectFirstSuggestion(page, 'réserver local', /réservation/i);
  expect(errors).toEqual([]);
});

test('élève absent longtemps mène au plan de travail', async ({ page }) => {
  const errors = await openPortal(page);
  await expectFirstSuggestion(page, 'élève absent longtemps', /Plan de travail/i);
  expect(errors).toEqual([]);
});

test('groupe ingérable mène à SOS Groupe', async ({ page }) => {
  const errors = await openPortal(page);
  await expectFirstSuggestion(page, 'groupe ingérable', /S\.O\.S\.|SOS Groupe/i);
  expect(errors).toEqual([]);
});
