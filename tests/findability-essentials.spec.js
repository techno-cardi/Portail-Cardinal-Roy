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

test('suppléance trouve le rapport de temps ou Scolago', async ({ page }) => {
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

test('harcèlement trouve directement le formulaire de déclaration', async ({ page }) => {
  const errors = await openPortal(page);
  await expect.poll(() => page.evaluate(() => window.PORTAL_RESOURCE_SUGGESTION || '')).toBe('1.1');
  await expectFirstSuggestion(page, 'harcèlement', /Déclaration d’un événement accidentel|situation à risque/i);
  await expect(page.locator('#search-suggestions .suggestion').first()).toHaveAttribute('data-open-id', 'declaration-evenements-risque');
  expect(errors).toEqual([]);
});

test('le formulaire de déclaration reste visible dans Formulaires avec son lien', async ({ page }) => {
  const errors = await openPortal(page);
  const declaration = page.locator('#section-formulaires #declaration-evenements-risque');
  await expect(declaration).toHaveCount(1);
  await expect(declaration.locator('a[href="https://jotform.cssc.gouv.qc.ca/240294011577857"]')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('relâche trouve directement le calendrier scolaire déplacé', async ({ page }) => {
  const errors = await openPortal(page);
  await expect.poll(() => page.evaluate(() => window.PORTAL_RESOURCE_SUGGESTION || '')).toBe('1.1');
  await expectFirstSuggestion(page, 'relâche', /Calendrier scolaire 2026-2027/i);
  await expect(page.locator('#search-suggestions .suggestion').first()).toHaveAttribute('data-open-id', 'calendrier-scolaire-2026-2027');
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

test('Scolago garde seulement la connexion et le guide utiles', async ({ page }) => {
  const errors = await openPortal(page);
  await expect(page.locator('#scolago')).toHaveCount(1);
  await expect(page.locator('#scolago-absence-personnel')).toHaveCount(0);

  const scolago = page.locator('#scolago');
  await expect(scolago.locator('a[href="https://scolago.com/fr-CA/Account/Login"]')).toHaveCount(1);
  await expect(scolago.locator('a[href*="connexion-s%C3%A9curis%C3%A9e-sso"]')).toHaveCount(1);
  await expect(scolago.locator('a[href*="1YrR-0R-9Y6L22aKgriBD7U95E4MdC7r1"]')).toHaveCount(1);
  await expect(scolago.locator('a')).toHaveCount(3);

  await expect(scolago).not.toContainText(/Centre d’aide/i);
  await expect(scolago).not.toContainText(/confidentialité/i);
  await expect(scolago).not.toContainText(/conditions d’utilisation/i);
  await expect(scolago).not.toContainText('Procédurier — absences du personnel enseignant');
  await expect(scolago).not.toContainText('Note de service — Scolago');
  expect(errors).toEqual([]);
});


test('la procédure complète des reprises est dans Organiser et respecte l’aide-mémoire', async ({ page }) => {
  const errors = await openPortal(page);
  const reprise = page.locator('#section-organisation #reprise-examen');
  await expect(reprise).toHaveCount(1);
  await expect(reprise).toContainText('Aucune reprise d’examen le vendredi à l’étude surveillée.');
  await expect(reprise).toContainText('du lundi au jeudi seulement');
  await expect(reprise).toContainText('au moins 48 h à l’avance');
  await expect(reprise).toContainText('Raymond-Gervais');
  for (const local of ['2-314','2020','2090','2-110']) {
    await expect(reprise).toContainText(local);
  }
  await expect(reprise.locator('a[href="https://drive.google.com/file/d/1gswC2iTHiajkrTE_QNANAFRCiQMxUtdW/view"]')).toHaveCount(1);
  await expect(reprise.locator('a[href="https://appsp.ca/reservation/"]')).toHaveCount(1);
  await expect(reprise).not.toContainText('lunch');
  await expect(page.locator('#etude-surveillee')).toContainText('aucune reprise d’examen le vendredi');
  await expect(page.locator('#reservation a[href="#reprise-examen"]')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('reprise et examen, même seuls, trouvent la nouvelle procédure', async ({ page }) => {
  const errors = await openPortal(page);
  for (const query of ['reprise', 'examen', 'reprise examen', 'reprendre evaluation']) {
    await expectFirstSuggestion(page, query, /Reprise d.examen - Procédure et aide-mémoire/i);
  }
  expect(errors).toEqual([]);
});

test('les catégories restent cohérentes', async ({ page }) => {
  const errors = await openPortal(page);
  await expect(page.locator('#section-organisation .category-heading h2')).toContainText('Réservations et logistique');
  await expect(page.locator('#section-formulaires #rapport-temps-travail')).toHaveCount(1);
  await expect(page.locator('#scolago-absence-personnel')).toHaveCount(0);
  await expect(page.locator('#section-organisation-scolaire #evaluation-bulletin-planification')).toHaveCount(1);
  await expect(page.locator('#section-classe #code-vie-regles')).toHaveCount(1);
  await expect(page.locator('#section-suivi #aide-eleve-services-appui')).toHaveCount(1);
  expect(errors).toEqual([]);
});
