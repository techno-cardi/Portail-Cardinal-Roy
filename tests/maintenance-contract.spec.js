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
  await expect.poll(() => page.evaluate(() => window.PORTAL_MAINTENANCE?.version || '')).toBe('1.0');
  return errors;
}

test('la chaîne de chargement garde une seule porte d’entrée pour les futures ressources', async () => {
  const index = read('index.html');
  const order = [
    'portal-source-api.js',
    'source-patches-8.js',
    'managed-resources.js',
    'ui-polish.js',
    'after-ui.js',
    'portal-integrity.js',
    'portal-maintenance.js',
    'global-search-flash.js'
  ].map(name => index.indexOf(name));

  order.forEach(position => expect(position).toBeGreaterThan(-1));
  for (let i = 1; i < order.length; i += 1) expect(order[i]).toBeGreaterThan(order[i - 1]);

  expect(index).not.toMatch(/source-patches-(?:9|1\d|[2-9]\d)\.js/);
  expect(read('managed-resources.js')).toContain('PORTAL_SOURCE_API');
  expect(read('portal-source-api.js')).toContain('mots-clés absents ou trop courts');
});

test('les ressources gérées respectent le contrat catégorie + mots-clés + unicité', async ({ page }) => {
  const errors = await openPortal(page);
  const report = await page.evaluate(() => window.PORTAL_MAINTENANCE.audit());

  expect(report.fatal).toEqual([]);
  expect(report.managedResources.length).toBeGreaterThanOrEqual(9);

  const managed = await page.evaluate(() => [...document.querySelectorAll('#legacy-source [data-portal-managed="true"][id]')].map(node => ({
    id: node.id,
    category: node.dataset.portalCategory || '',
    keywords: node.dataset.keywords || '',
    renderedCount: document.querySelectorAll(`#app #${CSS.escape(node.id)}`).length,
    sectionId: document.querySelector(`#app #${CSS.escape(node.id)}`)?.closest('.category-section')?.id || ''
  })));

  const categories = await page.evaluate(() => window.PORTAL_SOURCE_API.categories);
  for (const resource of managed) {
    expect(resource.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(categories).toContain(resource.category);
    expect(resource.keywords.trim().length).toBeGreaterThanOrEqual(20);
    expect(resource.renderedCount).toBe(1);
  }

  expect(errors).toEqual([]);
});

test('la navigation ne contient aucun lien vers une section inexistante', async ({ page }) => {
  const errors = await openPortal(page);
  const broken = await page.evaluate(() => [...document.querySelectorAll('.section-nav-inner a[href^="#section-"]')]
    .map(link => link.getAttribute('href'))
    .filter(href => !document.getElementById(decodeURIComponent(href.slice(1)))));
  expect(broken).toEqual([]);
  expect(errors).toEqual([]);
});
