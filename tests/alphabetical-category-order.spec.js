const { test, expect } = require('@playwright/test');

async function openPortal(page) {
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.PORTAL_SEARCH_ENGINE || '')).toBe('2.0');
}

const unsortedCategories = () => {
  const collator = new Intl.Collator('fr-CA', {usage:'sort', sensitivity:'base', ignorePunctuation:true, numeric:true});
  return [...document.querySelectorAll('#category-sections .category-section')].flatMap(section => {
    const titles = [...section.querySelectorAll(':scope > .procedure-list > .procedure .procedure-title')]
      .map(node => node.textContent.trim());
    const expected = [...titles].sort((a,b) => collator.compare(a,b));
    return titles.every((title,i) => title === expected[i])
      ? [] : [{section:section.id, actual:titles, expected}];
  });
};

test('toutes les catégories du portail sont classées par titre en français', async ({ page }) => {
  await openPortal(page);
  await expect(page.locator('#section-classe #intervention-retards')).toHaveCount(1);
  await expect(page.locator('#section-suivi #pi')).toHaveCount(1);
  await expect.poll(() => page.evaluate(unsortedCategories)).toEqual([]);
});

test('les titres métier commencent par Retards et Plan d’intervention', async ({ page }) => {
  await openPortal(page);
  const retard = page.locator('#section-classe #intervention-retards');
  const pi = page.locator('#section-suivi #pi');
  await expect(retard.locator('.procedure-title')).toHaveText('Retards - Comment intervenir auprès d’un élève');
  await expect(pi.locator('.procedure-title')).toHaveText('Plan d’intervention - Consulter un plan dans AppSP');
  await expect(retard.locator('a[href*="1cNdNt3yZWGB93I0JGyrGlXXKkfLvl6Bx"]')).toHaveCount(1);
  await expect(pi.locator('a[href*="19qpgMBN6SS3uVWDZFRFoQGx0o2PwZJNt"]')).toHaveCount(1);
});

test('une fiche ajoutée après coup est replacée alphabétiquement', async ({ page }) => {
  await openPortal(page);
  await page.evaluate(() => {
    const list = document.querySelector('#section-classe .procedure-list');
    const card = document.createElement('div');
    card.className = 'procedure';
    card.id = 'test-ordre-alphabetique';
    card.innerHTML = '<span class="procedure-title">Aardvark - Fiche temporaire</span>';
    list.appendChild(card);
  });
  await expect.poll(() => page.locator('#section-classe .procedure-list > .procedure').first().getAttribute('id'))
    .toBe('test-ordre-alphabetique');
  await expect.poll(() => page.evaluate(unsortedCategories)).toEqual([]);
});

test('les identifiants historiques, les ancres et les favoris restent fonctionnels', async ({ page }) => {
  await openPortal(page);
  await page.locator('#section-classe #intervention-retards .favorite-button').click();
  await expect(page.locator('#favorites-area')).toBeVisible();
  await expect(page.locator('#favorite-links')).toContainText('Retards - Comment intervenir auprès d’un élève');
  await expect(page.locator('#section-classe #intervention-retards')).toHaveCount(1);
  await expect(page.locator('#section-suivi #pi')).toHaveCount(1);
});
