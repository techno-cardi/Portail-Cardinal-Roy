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
  await expect(page.locator('#school-news-ticker')).toBeVisible();
  return errors;
}

test('la pensée du 8 septembre est à droite de la même ligne que Dates importantes', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await freezeTime(page, '2026-09-08T14:00:00Z');
  const errors = await openPortal(page);

  await expect(page.locator('#daily-thought')).toHaveCount(0);
  await expect(page.locator('#daily-thought-fallback')).toHaveCount(0);
  await expect(page.locator('.daily-thought-standalone')).toHaveCount(0);

  const ticker = page.locator('#school-news-ticker');
  const badge = ticker.locator(':scope > .school-news-badge');
  const trigger = ticker.locator(':scope > .daily-thought-control .daily-thought-trigger');
  const popover = page.locator('#daily-thought-popover');

  await expect(badge).toBeVisible();
  await expect(trigger).toBeVisible();
  await expect(popover).toBeHidden();

  const layout = await page.evaluate(() => {
    const ticker = document.getElementById('school-news-ticker').getBoundingClientRect();
    const badge = document.querySelector('#school-news-ticker > .school-news-badge').getBoundingClientRect();
    const trigger = document.querySelector('#school-news-ticker > .daily-thought-control .daily-thought-trigger').getBoundingClientRect();
    return {
      badgeLeft: Math.abs(badge.left - ticker.left),
      badgeTop: Math.abs(badge.top - ticker.top),
      triggerRight: Math.abs(ticker.right - trigger.right),
      sameLine: Math.abs(badge.top - trigger.top)
    };
  });
  expect(layout.badgeLeft).toBeLessThanOrEqual(12);
  expect(layout.badgeTop).toBeLessThanOrEqual(12);
  expect(layout.triggerRight).toBeLessThanOrEqual(12);
  expect(layout.sameLine).toBeLessThanOrEqual(4);

  await trigger.click();
  await expect(popover).toBeVisible();
  await expect(popover.locator('.daily-thought-popover-quote')).toHaveText("« Il est des portes sur la mer que l'on ouvre avec des mots. »");
  await expect(popover.locator('.daily-thought-popover-author')).toHaveText('- Rafael Alberti');
  expect(errors).toEqual([]);
});

test('un jour sans pensée, aucun bouton ne paraît', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await freezeTime(page, '2026-09-06T14:00:00Z');
  const errors = await openPortal(page);

  await expect(page.locator('#daily-thought')).toHaveCount(0);
  await expect(page.locator('#daily-thought-fallback')).toHaveCount(0);
  await expect(page.locator('.daily-thought-trigger')).toHaveCount(0);
  await expect(page.locator('#daily-thought-popover')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('la pensée est complètement absente sur mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await freezeTime(page, '2026-09-08T14:00:00Z');
  const errors = await openPortal(page);

  await expect(page.locator('.daily-thought-trigger')).toHaveCount(0);
  await expect(page.locator('#daily-thought-popover')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('la date de la pensée est calculée en heure du Québec', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await freezeTime(page, '2026-09-09T03:30:00Z');
  const errors = await openPortal(page);

  const trigger = page.locator('.daily-thought-trigger');
  await expect(trigger).toBeVisible();
  await trigger.click();
  const popover = page.locator('#daily-thought-popover');
  await expect(popover.locator('.daily-thought-popover-author')).toHaveText('- Rafael Alberti');
  await expect(popover.locator('.daily-thought-popover-quote')).toContainText('Il est des portes sur la mer');
  expect(errors).toEqual([]);
});
