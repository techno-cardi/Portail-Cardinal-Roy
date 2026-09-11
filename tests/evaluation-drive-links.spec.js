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
      .replace(/[’']/g, ' ')
      .replace(/[^a-z0-9 -]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const isFolderUrl = href => /drive\.google\.com\/drive\/folders\//i.test(href || '');

    const hrefFor = words => {
      const wanted = words.map(normalize);
      const candidates = [...document.querySelectorAll('.procedure')]
        .map(node => {
          const title = normalize(node.querySelector('.procedure-title')?.textContent || '');
          const subtitle = normalize(node.querySelector('.procedure-subtitle')?.textContent || '');
          const search = normalize(node.dataset.search || '');
          const content = normalize(node.querySelector('.procedure-content')?.textContent || '');
          const haystack = `${title} ${subtitle} ${search} ${content}`;
          if (!wanted.every(word => haystack.includes(word))) return null;
          let score = 0;
          wanted.forEach(word => {
            if (title.includes(word)) score += 100;
            else if (subtitle.includes(word)) score += 60;
            else if (search.includes(word)) score += 35;
            else score += 10;
          });
          return { node, score };
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score);

      for (const { node } of candidates) {
        const anchors = [...node.querySelectorAll('.procedure-content a[href^="http"]')]
          .filter(link => !isFolderUrl(link.href));
        if (!anchors.length) continue;
        const primary = anchors.find(link => link.matches('.btn.primary'));
        const button = anchors.find(link => link.matches('.btn'));
        return (primary || button || anchors[0]).href;
      }
      return '';
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
  expect(existingScheduleLinks.locaux).not.toMatch(/drive\.google\.com\/drive\/folders\//i);
  expect(existingScheduleLinks.enseignants).not.toMatch(/drive\.google\.com\/drive\/folders\//i);
  expect(existingScheduleLinks.surveillance).not.toMatch(/drive\.google\.com\/drive\/folders\//i);

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
