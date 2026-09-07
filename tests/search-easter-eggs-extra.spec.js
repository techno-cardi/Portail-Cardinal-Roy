const { test, expect } = require('@playwright/test');

async function freezeTime(page, iso) {
  await page.addInitScript(({ iso }) => {
    const RealDate = Date;
    const fixed = new RealDate(iso).getTime();
    class FixedDate extends RealDate {
      constructor(...args) {
        super(...(args.length ? args : [fixed]));
      }
      static now() { return fixed; }
    }
    FixedDate.parse = RealDate.parse;
    FixedDate.UTC = RealDate.UTC;
    window.Date = FixedDate;
  }, { iso });
}

async function openPortal(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.PORTAL_SEARCH_ENGINE || '')).toBe('2.0');
  await expect.poll(() => page.evaluate(() => window.PORTAL_EXTRA_EGGS || '')).toBe('1.0');
  return errors;
}

test('un déclencheur doit être écrit au complet', async ({ page }) => {
  const errors = await openPortal(page);
  const search = page.locator('#guide-search');

  await search.fill('caf');
  await expect(page.locator('#search-suggestions .search-extra-egg')).toHaveCount(0);

  await search.fill('café filtre');
  await expect(page.locator('#search-suggestions .search-extra-egg')).toHaveCount(0);

  await search.fill('café');
  await expect(page.locator('#search-suggestions .search-extra-egg')).toBeVisible();
  await expect(page.locator('#search-suggestions .search-extra-egg')).toContainText('Ressource essentielle non répertoriée');
  expect(errors).toEqual([]);
});

test('les phrases exactes avec accents et apostrophes déclenchent seulement au complet', async ({ page }) => {
  const errors = await openPortal(page);
  const search = page.locator('#guide-search');

  await search.fill("j'ai besoin d'");
  await expect(page.locator('#search-suggestions .search-extra-egg')).toHaveCount(0);

  await search.fill("j'ai besoin d'aide");
  const egg = page.locator('#search-suggestions .search-extra-egg');
  await expect(egg).toBeVisible();
  await expect(egg).toContainText('T’es probablement à deux clics');
  await expect(egg.locator('[data-extra-target]')).toHaveCount(3);
  expect(errors).toEqual([]);
});

test('les variantes vendredi 4h et vendredi 16h restent des requêtes exactes', async ({ page }) => {
  const errors = await openPortal(page);
  const search = page.locator('#guide-search');

  await search.fill('vendredi 16');
  await expect(page.locator('#search-suggestions .search-extra-egg')).toHaveCount(0);

  await search.fill('vendredi 16h');
  await expect(page.locator('#search-suggestions .search-extra-egg')).toContainText('ne plus entreprendre de gros projet');

  await search.fill('vendredi 4h');
  await expect(page.locator('#search-suggestions .search-extra-egg')).toContainText('Vendredi 16 h');
  expect(errors).toEqual([]);
});

test('combien de jours affiche la prochaine pause avec les vrais jours de classe', async ({ page }) => {
  await freezeTime(page, '2026-09-06T16:00:00Z');
  const errors = await openPortal(page);
  await page.locator('#guide-search').fill('combien de jours');
  const egg = page.locator('#search-suggestions .search-extra-egg');

  await expect(egg).toContainText('0 jour d’école');
  await expect(egg).toContainText('Fête du Travail');
  await expect(egg).toContainText('lundi 7 septembre 2026');
  expect(errors).toEqual([]);
});

test('Noël, relâche et été utilisent le calendrier scolaire', async ({ page }) => {
  await freezeTime(page, '2026-09-06T16:00:00Z');
  const errors = await openPortal(page);
  const search = page.locator('#guide-search');
  const egg = page.locator('#search-suggestions .search-extra-egg');

  await search.fill('noël');
  await expect(egg).toContainText('69 jours d’école');
  await expect(egg).toContainText('vacances de Noël');

  await search.fill('relâche');
  await expect(egg).toContainText('105 jours d’école');
  await expect(egg).toContainText('relâche');

  await search.fill('été');
  await expect(egg).toContainText('174 jours d’école');
  await expect(egg).toContainText('vacances d’été');
  expect(errors).toEqual([]);
});

test('un terme réel du portail n’est pas détourné par les easter eggs supplémentaires', async ({ page }) => {
  const errors = await openPortal(page);
  await page.locator('#guide-search').fill('mot de passe');
  await expect(page.locator('#search-suggestions .search-extra-egg')).toHaveCount(0);
  await expect(page.locator('#search-suggestions')).toBeVisible();
  expect(errors).toEqual([]);
});