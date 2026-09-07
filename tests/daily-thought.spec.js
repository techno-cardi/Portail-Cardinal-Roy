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
  await expect.poll(() => page.locator('script[data-daily-thought]').count()).toBe(1);
  return errors;
}

test('la pensée du 8 septembre est affichée au-dessus des dates importantes', async ({ page }) => {
  await freezeTime(page, '2026-09-08T14:00:00Z');
  const errors = await openPortal(page);

  const thought = page.locator('#daily-thought');
  await expect(thought).toBeVisible();
  await expect(thought).toHaveAttribute('data-thought-date', '2026-09-08');
  await expect(thought.locator('.daily-thought-label')).toContainText('Pensée du jour');
  await expect(thought.locator('.daily-thought-quote')).toHaveText("« Il est des portes sur la mer que l'on ouvre avec des mots. »");
  await expect(thought.locator('.daily-thought-author')).toHaveText('- Rafael Alberti');
  await expect(thought.locator('.daily-thought-quote')).toHaveCSS('font-style', 'italic');

  const ticker = page.locator('#school-news-ticker');
  await expect(ticker).toBeAttached();
  await expect.poll(async () => {
    return page.evaluate(() => {
      const thought = document.getElementById('daily-thought');
      const ticker = document.getElementById('school-news-ticker');
      return Boolean(thought && ticker && thought.nextElementSibling === ticker);
    });
  }).toBe(true);

  expect(errors).toEqual([]);
});

test('aucune pensée ne prend de place un jour absent du calendrier', async ({ page }) => {
  await freezeTime(page, '2026-09-06T14:00:00Z');
  const errors = await openPortal(page);
  await expect(page.locator('#daily-thought')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('la date est calculée en heure du Québec', async ({ page }) => {
  await freezeTime(page, '2026-09-09T03:30:00Z');
  const errors = await openPortal(page);
  const thought = page.locator('#daily-thought');
  await expect(thought).toHaveAttribute('data-thought-date', '2026-09-08');
  await expect(thought.locator('.daily-thought-author')).toHaveText('- Rafael Alberti');
  expect(errors).toEqual([]);
});
