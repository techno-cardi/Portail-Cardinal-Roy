const { test, expect } = require('@playwright/test');

async function openPortal(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.PORTAL_SEARCH_ENGINE || '')).toBe('2.0');
  await expect.poll(() => page.evaluate(() => window.PORTAL_REGISTRY?.version || '')).toBe('2.0');
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.portalUpgrades || '')).toBe('1.0');
  await expect.poll(() => page.evaluate(() => Boolean(window.PORTAL_ANALYTICS?.remoteAvailable))).toBe(true);
  return errors;
}

test('le registre central contient les ressources sans identifiant en double', async ({ page }) => {
  const errors = await openPortal(page);
  const audit = await page.evaluate(() => window.PORTAL_REGISTRY.audit());
  expect(audit.totalResources).toBeGreaterThan(20);
  expect(audit.duplicateIds).toEqual([]);
  expect(audit.orphaned).toEqual([]);
  expect(errors).toEqual([]);
});

test('une faute dans harcèlement trouve directement le formulaire de déclaration', async ({ page }) => {
  const errors = await openPortal(page);
  await page.locator('#guide-search').fill('harcellement');
  const first = page.locator('#search-suggestions .suggestion').first();
  await expect(first).toBeVisible();
  await expect(first).toContainText(/Déclaration.*événement|situation à risque/i);
  await expect(first).not.toContainText(/Applications CSSC/i);
  expect(errors).toEqual([]);
});

test('une requête naturelle sur un groupe difficile trouve S.O.S. Groupe', async ({ page }) => {
  const errors = await openPortal(page);
  await page.locator('#guide-search').fill('mon groupe va mal');
  const first = page.locator('#search-suggestions .suggestion').first();
  await expect(first).toBeVisible();
  await expect(first).toContainText(/S\.O\.S\.|SOS Groupe/i);
  expect(errors).toEqual([]);
});

test('aucun bloc récemment consulté ne s’affiche mais les ouvertures restent comptées', async ({ page }) => {
  const errors = await openPortal(page);
  await page.evaluate(() => window.PORTAL_ANALYTICS.clear());
  await expect(page.locator('.portal-recent')).toHaveCount(0);
  await page.locator('#c2atom > summary').click();
  await page.waitForTimeout(50);
  await expect(page.locator('.portal-recent')).toHaveCount(0);
  const snapshot = await page.evaluate(() => window.PORTAL_ANALYTICS.snapshot());
  expect(snapshot.opens.c2atom?.count || 0).toBeGreaterThanOrEqual(1);
  expect(errors).toEqual([]);
});

test('la fraîcheur reste cachée tant que la carte est fermée', async ({ page }) => {
  const errors = await openPortal(page);
  const card = page.locator('#horaire-enseignants-2026-2027');
  const badge = card.locator('.portal-freshness');
  await expect(badge).toBeHidden();
  await card.locator(':scope > summary').click();
  await expect(badge).toBeVisible();
  await expect(badge).toContainText(/Mis à jour|À vérifier/i);
  expect(errors).toEqual([]);
});

test('les analytics locales comptent recherches et ouvertures', async ({ page }) => {
  const errors = await openPortal(page);
  await page.evaluate(() => window.PORTAL_ANALYTICS.clear());
  await page.locator('#guide-search').fill('harcellement');
  await page.waitForTimeout(850);
  await page.locator('#search-suggestions .suggestion').first().click();
  await page.waitForTimeout(50);
  const snapshot = await page.evaluate(() => window.PORTAL_ANALYTICS.snapshot());
  expect(snapshot.totals.searches).toBeGreaterThanOrEqual(1);
  expect(snapshot.totals.opens).toBeGreaterThanOrEqual(1);
  expect(snapshot.searches.harcellement?.count || 0).toBeGreaterThanOrEqual(1);
  expect(errors).toEqual([]);
});

test('le backend Supabase est configuré mais les tests locaux ne lui écrivent pas', async ({ page }) => {
  const errors = await openPortal(page);
  const remote = await page.evaluate(() => ({
    available: window.PORTAL_ANALYTICS.remoteAvailable,
    enabled: window.PORTAL_ANALYTICS.remoteEnabled,
    endpoint: window.PORTAL_ANALYTICS.remoteEndpoint,
    mode: document.documentElement.dataset.portalAnalyticsRemote
  }));
  expect(remote.available).toBe(true);
  expect(remote.enabled).toBe(false);
  expect(remote.endpoint).toBe('https://ojyswaxuqwnqilrvtjll.supabase.co/functions/v1/portal-analytics');
  expect(remote.mode).toBe('local-only');
  expect(errors).toEqual([]);
});

test('le tableau de santé caché se charge et affiche les métriques', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/admin-status.html');
  await expect(page.getByRole('heading', {name:'Santé du portail Cardinal-Roy'})).toBeVisible();
  await expect(page.locator('#admin-status .metric').first()).toBeVisible({timeout:20000});
  await expect(page.locator('#admin-status')).toContainText(/ressources enregistrées/i);
  expect(errors).toEqual([]);
});
