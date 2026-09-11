const { test, expect } = require('@playwright/test');

test('les ressources importantes ouvrent leurs liens exacts depuis la recherche', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');

  const input = page.locator('#guide-search');
  const suggestions = page.locator('#search-suggestions');
  await expect(input).toBeVisible();

  const exactLinks = await page.evaluate(() => {
    const hrefByText = (id, text) => {
      const node = document.getElementById(id);
      const wanted = text.toLowerCase();
      const link = [...(node?.querySelectorAll('.procedure-content a[href^="http"]') || [])]
        .find(a => a.textContent.toLowerCase().includes(wanted));
      return link?.href || '';
    };
    return {
      locaux: hrefByText('horaire-locaux-2026-2027', 'horaire des locaux'),
      enseignants: hrefByText('horaire-enseignants-2026-2027', 'horaire des enseignants'),
      dineurs: hrefByText('horaires-surveillance-2026-2027', 'surveillance des dîneurs'),
      bibliotheque: hrefByText('horaires-surveillance-2026-2027', 'surveillance bibliothèque')
    };
  });

  expect(exactLinks.locaux).toBe('https://drive.google.com/file/d/13dpfWN2_Jws3V4bwptfamOe-VSahZvCd/view?usp=drivesdk');
  expect(exactLinks.enseignants).toBe('https://drive.google.com/file/d/1ptDonxP2Dx4FVUmY36PlppBYDc0HVRG5/view?usp=drivesdk');
  expect(exactLinks.dineurs).toBe('https://drive.google.com/file/d/1CWkHvJRbFQMjYAkBs26e5vMPf83FbGVJ/view?usp=drivesdk');
  expect(exactLinks.bibliotheque).toBe('https://drive.google.com/file/d/1Ab0FRhEVKkGBBICstsxE0IT_0sLwLsB8/view?usp=drivesdk');

  const singleCases = [
    ['nature', 'Nature et moments des évaluations', /1LTgKPbES9IixST2V-jolWxA7s6SMV6jT/],
    ['attentes', 'Attentes et exigences', /18URlr-7b2TmnzZqL4TdOOGlNI2V7TfJW/],
    ['planification', 'Planification annuelle', /15dleRqnqz8ZldCzWrogMAJONlVBta3IY/],
    ['locaux', 'Horaire des locaux', exactLinks.locaux],
    ['enseignants', 'Horaire des enseignants', exactLinks.enseignants],
    ['dîneurs', 'Surveillance des dîneurs', exactLinks.dineurs],
    ['bibliothèque', 'Surveillance bibliothèque', exactLinks.bibliotheque]
  ];

  for (const [query, title, href] of singleCases) {
    await input.fill(query);
    const direct = suggestions.locator('[data-direct-search-resource]');
    await expect(direct).toHaveCount(1);
    await expect(direct.locator('strong')).toHaveText(title);
    await expect(direct).toHaveAttribute('href', href);
    await expect(direct).toHaveAttribute('target', '_blank');
    await expect(direct).not.toContainText(/ouverture directe/i);
  }

  await input.fill('surveillance');
  let direct = suggestions.locator('[data-direct-search-resource]');
  await expect(direct).toHaveCount(2);
  await expect(suggestions).toContainText('Surveillance des dîneurs');
  await expect(suggestions).toContainText('Surveillance bibliothèque');

  await input.fill('horaire');
  direct = suggestions.locator('[data-direct-search-resource]');
  await expect(direct).toHaveCount(4);
  await expect(suggestions).toContainText('Horaire des locaux');
  await expect(suggestions).toContainText('Horaire des enseignants');
  await expect(suggestions).toContainText('Surveillance des dîneurs');
  await expect(suggestions).toContainText('Surveillance bibliothèque');

  expect(errors).toEqual([]);
});
