const { test, expect } = require('@playwright/test');

async function openPortal(page) {
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.PORTAL_SEARCH_ENGINE || '')).toBe('2.0');
  await page.waitForTimeout(350);
  return { pageErrors, consoleErrors };
}

test('la structure rendue reste cohérente et sans collisions', async ({ page }) => {
  const { pageErrors } = await openPortal(page);

  const audit = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map(node => node.id).filter(Boolean);
    const counts = ids.reduce((acc, id) => {
      acc[id] = (acc[id] || 0) + 1;
      return acc;
    }, {});

    const duplicateIds = Object.entries(counts).filter(([, count]) => count > 1).map(([id]) => id);
    const emptyProcedures = [...document.querySelectorAll('.procedure')]
      .filter(node => !node.querySelector('summary') || !node.querySelector('.procedure-content'))
      .map(node => node.id || '(sans id)');
    const untitledProcedures = [...document.querySelectorAll('.procedure')]
      .filter(node => !(node.querySelector('.procedure-title')?.textContent || '').trim())
      .map(node => node.id || '(sans id)');
    const emptySections = [...document.querySelectorAll('.category-section')]
      .filter(section => !section.querySelector('.procedure-list > .procedure'))
      .map(section => section.id || '(sans id)');
    const deadSectionLinks = [...document.querySelectorAll('.section-nav a[href^="#"]')]
      .map(link => link.getAttribute('href'))
      .filter(href => href && href.length > 1)
      .filter(href => !document.getElementById(decodeURIComponent(href.slice(1))));
    const unsafeBlankLinks = [...document.querySelectorAll('a[target="_blank"]')]
      .filter(link => !/\bnoopener\b/i.test(link.getAttribute('rel') || ''))
      .map(link => link.getAttribute('href') || '(sans href)');
    const emptyLinks = [...document.querySelectorAll('a')]
      .filter(link => !((link.getAttribute('href') || '').trim()))
      .map(link => link.textContent.trim() || '(sans texte)');

    return {
      duplicateIds,
      emptyProcedures,
      untitledProcedures,
      emptySections,
      deadSectionLinks,
      unsafeBlankLinks,
      emptyLinks,
      procedureCount: document.querySelectorAll('.procedure').length,
      sectionCount: document.querySelectorAll('.category-section').length
    };
  });

  expect(audit.procedureCount).toBeGreaterThan(10);
  expect(audit.sectionCount).toBeGreaterThan(4);
  expect(audit.duplicateIds).toEqual([]);
  expect(audit.emptyProcedures).toEqual([]);
  expect(audit.untitledProcedures).toEqual([]);
  expect(audit.emptySections).toEqual([]);
  expect(audit.deadSectionLinks).toEqual([]);
  expect(audit.unsafeBlankLinks).toEqual([]);
  expect(audit.emptyLinks).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('aucun élément principal ne force un défilement horizontal', async ({ page }) => {
  await openPortal(page);

  const applications = page.locator('#applications-cssc');
  if (await applications.count()) {
    await applications.locator('summary').click();
    await expect(applications).toHaveAttribute('open', '');
  }

  const metrics = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    html: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    offenders: [...document.querySelectorAll('body *')]
      .filter(node => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        if (style.position === 'fixed' || style.display === 'none' || style.visibility === 'hidden') return false;
        return rect.width > 0 && (rect.right > document.documentElement.clientWidth + 3 || rect.left < -3);
      })
      .slice(0, 12)
      .map(node => `${node.tagName.toLowerCase()}#${node.id || ''}.${String(node.className || '').replace(/\s+/g, '.')}`)
  }));

  expect(metrics.html, `Éléments hors écran: ${metrics.offenders.join(', ')}`).toBeLessThanOrEqual(metrics.viewport + 2);
  expect(metrics.body, `Éléments hors écran: ${metrics.offenders.join(', ')}`).toBeLessThanOrEqual(metrics.viewport + 2);
});

test('Scolago ne contient que les trois accès retenus', async ({ page }) => {
  await openPortal(page);

  const scolago = page.locator('#scolago');
  await expect(scolago).toHaveCount(1);
  const links = scolago.locator('a');
  await expect(links).toHaveCount(3);
  await expect(scolago).toContainText(/Se connecter/i);
  await expect(scolago).toContainText(/Comment se connecter/i);
  await expect(scolago).toContainText(/Guide d’utilisateur/i);
  await expect(scolago).not.toContainText(/Centre d’aide|confidentialité|conditions d’utilisation|note de service|procédurier/i);
  await expect(page.locator('#scolago-absence-personnel')).toHaveCount(0);
});

test('la recherche ouvre une ressource et les favoris restent fonctionnels', async ({ page }) => {
  await openPortal(page);

  const input = page.locator('#guide-search');
  await input.fill('Scolago');
  const suggestion = page.locator('#search-suggestions .suggestion').filter({ hasText: 'Scolago' }).first();
  await expect(suggestion).toBeVisible();
  await suggestion.click();
  await expect(page.locator('#applications-cssc')).toHaveAttribute('open', '');

  const firstFavorite = page.locator('.favorite-button').first();
  await firstFavorite.click();
  await expect(firstFavorite).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#favorites-area')).toBeVisible();
  await firstFavorite.click();
  await expect(firstFavorite).toHaveAttribute('aria-pressed', 'false');
});
