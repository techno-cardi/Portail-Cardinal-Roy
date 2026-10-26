const { test, expect } = require('@playwright/test');
const curated = require('../portal-updates-curated.json');

test('la sortie de classe comporte une septième étape SOI bleue et essentielle', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();

  const procedure = page.locator('#sortie');
  await expect(procedure).toHaveCount(1);
  await procedure.locator('summary').click();
  const steps = procedure.locator('ol.steps > li');
  await expect(steps).toHaveCount(7);
  await expect(steps.nth(5)).toContainText('Envoyer au retrait');

  const soi = steps.nth(6).locator('.callout.soi-important');
  await expect(soi).toBeVisible();
  await expect(soi.locator('.soi-important-title')).toContainText('IMPORTANT');
  await expect(soi).toContainText('Ne respecte pas les règles de conduite (école ou classe)');
  await expect(soi).not.toContainText('A un comportement dérangeant');
  await expect(soi).toContainText('Cette étape est essentielle');
  await expect(soi).not.toContainText('obligatoire');
  await expect(soi).toContainText('comptabiliser la sortie');
  await expect(soi).toContainText('suivis ultérieurs des intervenants');
  await expect(soi.locator('a.soi-portail-link')).toHaveAttribute('href', 'https://mozaikportail.ca/');

  const visual = await soi.evaluate(node => ({
    bg: getComputedStyle(node).backgroundColor,
    border: getComputedStyle(node).borderLeftColor,
  }));
  expect(visual.bg).toBe('rgb(234, 244, 255)');
  expect(visual.border).toBe('rgb(40, 115, 185)');
  await expect(procedure).toContainText('Mes suivis ne remplace pas l’avis SOI');
  expect(pageErrors).toEqual([]);
});

test('la mise à jour SOI annonce une vraie section dans Nouveautés', async ({ page }) => {
  const item = curated.items.find(entry => entry.id === 'expulsion-avis-soi-2026-10-26');
  expect(item).toMatchObject({ target: '#sortie', target_type: 'section', kind: 'maj' });

  await page.route('**/portal-updates.json*', async route => route.fulfill({
    status: 200,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify({ items: [item] }),
  }));
  await page.goto('/');
  const link = page.locator('#portal-updates a.portal-update-item[href="#sortie"]');
  await expect(link).toBeVisible();
  await expect(link).toContainText('l’étape SOI essentielle');
  await expect(link).toContainText('Ne respecte pas les règles de conduite (école ou classe)');
  await link.click();
  await expect(page.locator('#sortie')).toHaveAttribute('open', '');
  await expect(page.locator('#sortie .callout.soi-important')).toContainText('Ne respecte pas les règles de conduite (école ou classe)');
});
