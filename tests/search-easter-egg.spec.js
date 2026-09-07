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
  await expect.poll(() => page.locator('script[data-search-easter-egg]').count()).toBe(1);
  return errors;
}

const sacres = ['tabarnak', 'calice', 'esti', 'osti', 'marde', 'criss', 'crisse'];

for (const sacre of sacres) {
  test(`${sacre} au complet déclenche l'easter egg`, async ({ page }) => {
    const errors = await openPortal(page);
    await page.locator('#guide-search').fill(sacre);
    const egg = page.locator('#search-suggestions .search-easter-egg');
    await expect(egg).toBeVisible();
    await expect(egg).toContainText('Ouf! Ça va bien aller!');
    await expect(egg).toContainText('pas besoin de sacrer après le portail');
    expect(errors).toEqual([]);
  });
}

test('l’easter egg fait un petit flash et anime le visage', async ({ page }) => {
  const errors = await openPortal(page);
  await page.locator('#guide-search').fill('tabarnak');
  const egg = page.locator('#search-suggestions .search-easter-egg');
  await expect(egg).toBeVisible();
  await expect(egg.locator('.search-easter-egg-face')).toContainText('🥸');
  const animationName = await egg.evaluate(node => getComputedStyle(node).animationName);
  expect(animationName).toContain('sacreSurprise');
  expect(errors).toEqual([]);
});

test('un sacre incomplet ne déclenche pas l’easter egg', async ({ page }) => {
  const errors = await openPortal(page);
  await page.locator('#guide-search').fill('tabarna');
  await expect(page.locator('#search-suggestions .search-easter-egg')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('un sacre dans une phrase ne déclenche pas l’easter egg', async ({ page }) => {
  const errors = await openPortal(page);
  await page.locator('#guide-search').fill('tabarnak bug');
  await expect(page.locator('#search-suggestions .search-easter-egg')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('« il reste » au complet affiche le compte à rebours scolaire', async ({ page }) => {
  await freezeTime(page, '2026-09-06T16:00:00Z');
  const errors = await openPortal(page);
  await page.locator('#guide-search').fill('il reste');

  const egg = page.locator('#search-suggestions .search-countdown-egg');
  await expect(egg).toBeVisible();
  await expect(egg.locator('.search-countdown-title')).toHaveText('Il reste...');
  await expect(egg).toContainText('0 jour d’école avant le prochain CONGÉ');
  await expect(egg).toContainText('(0 semaine de cours)');
  await expect(egg).toContainText('36 jours d’école avant l’Halloween');
  await expect(egg).toContainText('(7,2 semaines de cours)');
  await expect(egg).toContainText('69 jours d’école avant les vacances de Noël');
  await expect(egg).toContainText('(13,8 semaines de cours)');
  await expect(egg).toContainText('105 jours d’école avant la relâche');
  await expect(egg).toContainText('(21 semaines de cours)');
  await expect(egg).toContainText('174 jours d’école avant la fin de l’année scolaire');
  await expect(egg).toContainText('(34,8 semaines de cours)');
  expect(errors).toEqual([]);
});

test('« il reste » ne se déclenche pas pendant une saisie partielle ou dans une phrase', async ({ page }) => {
  const errors = await openPortal(page);
  const search = page.locator('#guide-search');

  await search.fill('il res');
  await expect(page.locator('#search-suggestions .search-countdown-egg')).toHaveCount(0);

  await search.fill('il reste combien');
  await expect(page.locator('#search-suggestions .search-countdown-egg')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('les journées pédagogiques ne sont jamais comptées comme jours d’école', async ({ page }) => {
  await freezeTime(page, '2026-09-17T16:00:00Z');
  const errors = await openPortal(page);
  await page.locator('#guide-search').fill('il reste');
  const egg = page.locator('#search-suggestions .search-countdown-egg');

  // Le 18 septembre et le 5 octobre sont des journées pédagogiques : elles
  // sont exclues du calcul avant le congé de l'Action de grâce.
  await expect(egg).toContainText('14 jours d’école avant le prochain CONGÉ');
  expect(errors).toEqual([]);
});

test('Halloween disparaît le 1er novembre', async ({ page }) => {
  await freezeTime(page, '2026-11-01T17:00:00Z');
  const errors = await openPortal(page);
  await page.locator('#guide-search').fill('il reste');
  const egg = page.locator('#search-suggestions .search-countdown-egg');

  await expect(egg).not.toContainText('Halloween');
  await expect(egg).toContainText('vacances de Noël');
  expect(errors).toEqual([]);
});

test('après le dernier jour de classe, le portail demande d’actualiser le calendrier', async ({ page }) => {
  await freezeTime(page, '2027-06-24T16:00:00Z');
  const errors = await openPortal(page);
  await page.locator('#guide-search').fill('il reste');
  const egg = page.locator('#search-suggestions .search-countdown-egg');

  await expect(egg).toContainText('Année scolaire terminée!');
  await expect(egg).toContainText('Il faut actualiser le calendrier.');
  await expect(egg.locator('.search-countdown-line')).toHaveCount(0);
  expect(errors).toEqual([]);
});
