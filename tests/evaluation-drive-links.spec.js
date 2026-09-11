const { test, expect } = require('@playwright/test');

test('les ressources importantes s’ouvrent depuis la recherche avec les bons liens', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const input = page.locator('#guide-search');
  const suggestions = page.locator('#search-suggestions');
  await expect(input).toBeVisible();

  const existingScheduleLinks = await page.evaluate(() => {
    const normalize = value => String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const hrefFor = words => {
      const wanted = words.map(normalize);
      const procedure = [...document.querySelectorAll('.procedure')].find(node => {
        const title = normalize(node.querySelector('.procedure-title')?.textContent || '');
        return wanted.every(word => title.includes(word));
      });
      if (!procedure) return '';
      const link = procedure.querySelector(
        '.procedure-content a.btn.primary[href^="http"], .procedure-content a.btn[href^="http"], .procedure-content a[href^="http"]'
      );
      return link?.href || '';
    };

    return {
      locaux: hrefFor(['horaire', 'locaux']),
      enseignants: hrefFor(['horaire', 'enseignant']),
      surveillance: hrefFor(['horaire', 'surveillance'])
    };
  });

  expect(existingScheduleLinks.locaux).toBeTruthy();
  expect(existingScheduleLinks.enseignants).toBeTruthy();
  expect(existingScheduleLinks.surveillance).toBeTruthy();

  const cases = [
    ['nature', 'Nature et moments des évaluations', /1LTgKPbES9IixST2V-jolWxA7s6SMV6jT/],
    ['attentes', 'Attentes et exigences', /18URlr-7b2TmnzZqL4TdOOGlNI2V7TfJW/],
    ['planification', 'Planification annuelle', /15dleRqnqz8ZldCzWrogMAJONlVBta3IY/]
  ];

  for (const [query, title, hrefPattern] of cases) {
    await input.fill(query);
    const direct = suggestions.locator('[data-direct-search-resource]');
    await expect(direct).toHaveCount(1);
    await expect(direct.locator('strong')).toHaveText(title);
    await expect(direct).toHaveAttribute('href', hrefPattern);
    await expect(direct).toHaveAttribute('target', '_blank');
    await expect(direct).not.toContainText(/ouverture directe/i);
  }

  const schedules = [
    ['locaux', 'Horaires des locaux', existingScheduleLinks.locaux],
    ['enseignants', 'Horaires des enseignants', existingScheduleLinks.enseignants],
    ['surveillance', 'Horaires de surveillance', existingScheduleLinks.surveillance]
  ];

  for (const [query, title, expectedHref] of schedules) {
    await input.fill(query);
    const direct = suggestions.locator('[data-direct-search-resource]');
    await expect(direct).toHaveCount(1);
    await expect(direct.locator('strong')).toHaveText(title);
    await expect(direct).toHaveAttribute('href', expectedHref);
    await expect(direct).toHaveAttribute('target', '_blank');
    await expect(direct).not.toContainText(/ouverture directe/i);
  }

  await input.fill('horaire');
  const horaires = suggestions.locator('[data-direct-search-resource]');
  await expect(horaires).toHaveCount(3);
  await expect(suggestions).toContainText('Horaires des locaux');
  await expect(suggestions).toContainText('Horaires des enseignants');
  await expect(suggestions).toContainText('Horaires de surveillance');

  expect(errors).toEqual([]);
});
