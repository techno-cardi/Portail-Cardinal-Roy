const { test, expect } = require('@playwright/test');

test('les ressources importantes s’ouvrent depuis la recherche avec les bons liens', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const input = page.locator('#guide-search');
  const suggestions = page.locator('#search-suggestions');
  await expect(input).toBeVisible();
  await page.waitForFunction(() => Boolean(window.PORTAL_REGISTRY?.search));

  const existingScheduleLinks = await page.evaluate(() => {
    const normalize = value => String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[’']/g, ' ')
      .replace(/[^a-z0-9+ -]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const isFolderUrl = href => /drive\.google\.com\/drive\/folders\//i.test(href || '');

    const resolve = (query, words) => {
      const wanted = words.map(normalize);
      const results = window.PORTAL_REGISTRY.search(query, 20) || [];
      const candidates = results
        .map(resource => {
          const label = normalize(`${resource.id || ''} ${resource.title || ''} ${resource.subtitle || ''} ${resource.searchText || ''}`);
          if (!wanted.every(word => label.includes(word))) return null;
          const scheduleBoost = /horaire/.test(label) ? 1000 : 0;
          const titleBoost = wanted.reduce((sum, word) => sum + (normalize(resource.title || '').includes(word) ? 100 : 0), 0);
          return { resource, score: scheduleBoost + titleBoost + (resource.score || 0) };
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score);

      for (const { resource } of candidates) {
        const link = (resource.links || []).find(link => /^https?:\/\//i.test(link.href || '') && !isFolderUrl(link.href));
        if (link) return { href: link.href, id: resource.id, title: resource.title };
      }
      return { href: '', id: '', title: '' };
    };

    return {
      locaux: resolve('locaux', ['locaux']),
      enseignants: resolve('enseignants', ['enseignant']),
      surveillance: resolve('surveillance', ['surveill'])
    };
  });

  for (const item of Object.values(existingScheduleLinks)) {
    expect(item.href).toBeTruthy();
    expect(item.href).not.toMatch(/drive\.google\.com\/drive\/folders\//i);
    expect(`${item.id} ${item.title}`.toLowerCase()).toMatch(/horaire/);
  }

  const evaluationCases = [
    ['nature', 'Nature et moments des évaluations', /1LTgKPbES9IixST2V-jolWxA7s6SMV6jT/],
    ['attentes', 'Attentes et exigences', /18URlr-7b2TmnzZqL4TdOOGlNI2V7TfJW/],
    ['planification', 'Planification annuelle', /15dleRqnqz8ZldCzWrogMAJONlVBta3IY/]
  ];

  for (const [query, title, hrefPattern] of evaluationCases) {
    await input.fill(query);
    const direct = suggestions.locator('[data-direct-search-resource]');
    await expect(direct).toHaveCount(1);
    await expect(direct.locator('strong')).toHaveText(title);
    await expect(direct).toHaveAttribute('href', hrefPattern);
    await expect(direct).toHaveAttribute('target', '_blank');
    await expect(direct).not.toContainText(/ouverture directe/i);
  }

  const schedules = [
    ['locaux', 'Horaires des locaux', existingScheduleLinks.locaux.href],
    ['enseignants', 'Horaires des enseignants', existingScheduleLinks.enseignants.href],
    ['surveillance', 'Horaires de surveillance', existingScheduleLinks.surveillance.href]
  ];

  for (const [query, title, expectedHref] of schedules) {
    await input.fill(query);
    const direct = suggestions.locator('[data-direct-search-resource]');
    await expect(direct).toHaveCount(1);
    await expect(direct.locator('strong')).toHaveText(title);
    await expect(direct).toHaveAttribute('href', expectedHref);
    await expect(direct).toHaveAttribute('target', '_blank');
    await expect(direct).not.toContainText(/ouverture directe/i);
    await expect(direct).not.toHaveAttribute('href', /drive\.google\.com\/drive\/folders\//i);
  }

  await input.fill('horaire');
  const horaires = suggestions.locator('[data-direct-search-resource]');
  await expect(horaires).toHaveCount(3);
  await expect(suggestions).toContainText('Horaires des locaux');
  await expect(suggestions).toContainText('Horaires des enseignants');
  await expect(suggestions).toContainText('Horaires de surveillance');

  expect(errors).toEqual([]);
});
