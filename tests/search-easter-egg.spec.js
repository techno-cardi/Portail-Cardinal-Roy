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
  await expect(egg).toContainText('0 jour d’école avant le prochain congé (lundi 7 septembre - Fête du Travail)');
  await expect(egg).toContainText('Après celui-ci, le prochain congé sera le lundi 12 octobre 2026 (Action de grâce).');
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

test('la prochaine interruption devient une pédagogique quand elle arrive avant le prochain congé', async ({ page }) => {
  await freezeTime(page, '2026-09-17T16:00:00Z');
  const errors = await openPortal(page);
  await page.locator('#guide-search').fill('il reste');
  const egg = page.locator('#search-suggestions .search-countdown-egg');

  await expect(egg).toContainText('0 jour d’école avant la prochaine journée pédagogique (vendredi 18 septembre)');
  await expect(egg).toContainText('Après celle-ci, la prochaine journée pédagogique sera le lundi 5 octobre 2026.');
  expect(errors).toEqual([]);
});

test('la prochaine semaine courte et les 10 prochaines semaines utilisent seulement les jours de cours', async ({ page }) => {
  await freezeTime(page, '2026-09-06T16:00:00Z');
  const errors = await openPortal(page);
  await page.locator('#guide-search').fill('il reste');
  const egg = page.locator('#search-suggestions .search-countdown-egg');

  const shortWeek = egg.locator('.search-short-week-summary');
  await expect(shortWeek).toContainText('Prochaine semaine courte');
  await expect(shortWeek).toContainText('4 jours de cours (congé de la Fête du Travail le lundi 7 septembre)');
  await expect(shortWeek).toContainText('semaine du 7 septembre 2026');
  await expect(shortWeek).toContainText('la semaine prochaine');

  const details = egg.locator('.search-weeks-details');
  await expect(details).not.toHaveAttribute('open', '');
  await expect(details.locator('.search-week-row')).toHaveCount(10);
  await details.locator('summary').click();
  await expect(details).toHaveAttribute('open', '');

  const rows = details.locator('.search-week-row');
  await expect(rows.nth(0)).toContainText('Semaine du 7 septembre 2026');
  await expect(rows.nth(0)).toContainText('4 jours de cours (congé de la Fête du Travail le lundi 7 septembre)');
  // La semaine du 14 septembre est également courte à cause de la pédagogique du 18.
  await expect(rows.nth(1)).toContainText('Semaine du 14 septembre 2026');
  await expect(rows.nth(1)).toContainText('4 jours de cours (journée pédagogique le vendredi 18 septembre)');
  await expect(rows.nth(2)).toContainText('Semaine du 21 septembre 2026');
  await expect(rows.nth(2)).toContainText('5 jours de cours');
  await expect(rows.nth(2)).not.toContainText('pédagogique');
  await expect(rows.nth(2)).not.toContainText('congé');
  expect(errors).toEqual([]);
});

test('une semaine avec deux pédagogiques nomme les deux journées', async ({ page }) => {
  await freezeTime(page, '2026-11-15T17:00:00Z');
  const errors = await openPortal(page);
  await page.locator('#guide-search').fill('il reste');
  const egg = page.locator('#search-suggestions .search-countdown-egg');

  const shortWeek = egg.locator('.search-short-week-summary');
  await expect(shortWeek).toContainText('3 jours de cours');
  await expect(shortWeek).toContainText('journée pédagogique le jeudi 19 novembre');
  await expect(shortWeek).toContainText('journée pédagogique le vendredi 20 novembre');
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
  await expect(egg.locator('.search-short-weeks')).toHaveCount(0);
  expect(errors).toEqual([]);
});