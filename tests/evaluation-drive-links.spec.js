const { test, expect } = require('@playwright/test');
const fs = require('fs');

test('diagnostic des ressources directes', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const input = page.locator('#guide-search');
  const suggestions = page.locator('#search-suggestions');
  await expect(input).toBeVisible();
  await page.waitForTimeout(300);

  const directResources = await page.evaluate(() => window.PORTAL_DIRECT_SEARCH_RESOURCES || []);
  const sourceLinks = await page.evaluate(() => {
    const get = id => [...(document.getElementById(id)?.querySelectorAll('.procedure-content a[href]') || [])]
      .map(a => ({text:a.textContent.trim(), href:a.href}));
    return {
      locaux:get('horaire-locaux-2026-2027'),
      enseignants:get('horaire-enseignants-2026-2027'),
      surveillance:get('horaires-surveillance-2026-2027')
    };
  });

  const queryResults = {};
  for (const query of ['nature','attentes','planification','locaux','enseignants','dîneurs','bibliothèque','surveillance','horaire']) {
    await input.fill(query);
    await page.waitForTimeout(100);
    queryResults[query] = await suggestions.locator('[data-direct-search-resource]').evaluateAll(nodes => nodes.map(a => ({
      id:a.dataset.directSearchResource,
      text:a.textContent.replace(/\s+/g,' ').trim(),
      href:a.getAttribute('href'),
      target:a.getAttribute('target')
    })));
  }

  fs.writeFileSync('direct-search-debug.json', JSON.stringify({directResources, sourceLinks, queryResults, errors}, null, 2));
  expect(directResources.length).toBeGreaterThan(0);
});
