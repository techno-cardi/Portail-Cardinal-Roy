const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

async function openPortal(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.PORTAL_SEARCH_ENGINE || '')).toBe('2.0');
  return errors;
}

test('le chargement reste nettoyé sans réintroduire les anciennes couches', async () => {
  const index = read('index.html');
  const patch7 = read('source-patches-7.js');
  const patch8 = read('source-patches-8.js');

  expect(index).not.toContain('source-patches-9.js');
  expect(index).not.toContain('ped-day-2026-09-18.js');
  expect(index).not.toContain('icons.js');
  expect(index).not.toContain('icons.css');
  expect((index.match(/source-patches-8\.js/g) || [])).toHaveLength(1);

  // La configuration générale Scolago appartient à une seule couche.
  expect(patch7).toContain("const scolago = root.querySelector('#scolago')");
  expect(patch7).toContain('Politique de confidentialité');
  expect(patch7).toContain("document.getElementById('scolago-absence-personnel')");
  expect(patch8).not.toContain("root.querySelector('#scolago')");
  expect(patch8).not.toContain('Politique de confidentialité');

  // Le bloc Évaluation / bulletin / planification est désormais autonome dans patch 8.
  expect(patch8).toContain("card.id = 'evaluation-bulletin-planification'");
  expect((patch8.match(/data-evaluation-drive-folders/g) || []).length).toBeGreaterThanOrEqual(1);
});

test('les ressources consolidées sont uniques dans le portail rendu', async ({ page }) => {
  const errors = await openPortal(page);

  const scolago = page.locator('#app #scolago');
  await expect(scolago).toHaveCount(1);
  await expect(scolago.locator('a[href="https://support.scolago.com/fr/support/home"]')).toHaveCount(1);
  await expect(scolago.locator('a[href="https://scolago.com/Content/Documents/PolitiqueDeConfidentialite.html"]')).toHaveCount(1);
  await expect(scolago.locator('a[href="https://scolago.com/Content/Documents/ConditionsDUtilisation.html"]')).toHaveCount(1);
  await expect(page.locator('#app #scolago-absence-personnel')).toHaveCount(0);

  const evaluation = page.locator('#app #evaluation-bulletin-planification');
  await expect(evaluation).toHaveCount(1);
  await expect(evaluation.locator('[data-evaluation-drive-folders]')).toHaveCount(1);
  await expect(evaluation.locator('[data-evaluation-drive-folders] a')).toHaveCount(3);

  expect(errors).toEqual([]);
});
