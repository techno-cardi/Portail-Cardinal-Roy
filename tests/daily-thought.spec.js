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
  await expect(page.locator('.daily-thought-trigger')).toBeVisible();
  return errors;
}

test('la pensée du 8 septembre reste masquée jusqu’au clic sur le petit bouton', async ({ page }) => {
  await freezeTime(page, '2026-09-08T14:00:00Z');
  const errors = await openPortal(page);

  await expect(page.locator('#daily-thought')).toHaveCount(0);
  await expect(page.locator('#daily-thought-fallback')).toHaveCount(0);

  const trigger = page.locator('.daily-thought-trigger');
  const popover = page.locator('#daily-thought-popover');
  await expect(popover).toBeHidden();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');

  await trigger.click();
  await expect(popover).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(popover.locator('.daily-thought-popover-quote')).toHaveText("« Il est des portes sur la mer que l'on ouvre avec des mots. »");
  await expect(popover.locator('.daily-thought-popover-author')).toHaveText('- Rafael Alberti');
  await expect(popover.locator('.daily-thought-popover-quote')).toHaveCSS('font-style', 'italic');

  expect(errors).toEqual([]);
});

test('un jour sans pensée ne réintroduit aucun gros bloc permanent', async ({ page }) => {
  await freezeTime(page, '2026-09-06T14:00:00Z');
  const errors = await openPortal(page);

  await expect(page.locator('#daily-thought')).toHaveCount(0);
  await expect(page.locator('#daily-thought-fallback')).toHaveCount(0);

  const trigger = page.locator('.daily-thought-trigger');
  const popover = page.locator('#daily-thought-popover');
  await expect(popover).toBeHidden();
  await trigger.click();
  await expect(popover).toBeVisible();
  await expect(popover.locator('.daily-thought-popover-quote')).toHaveText('Aucune pensée planifiée aujourd’hui.');
  await expect(popover.locator('.daily-thought-popover-author')).toBeHidden();

  expect(errors).toEqual([]);
});

test('la date de la pensée est calculée en heure du Québec', async ({ page }) => {
  await freezeTime(page, '2026-09-09T03:30:00Z');
  const errors = await openPortal(page);

  const trigger = page.locator('.daily-thought-trigger');
  const popover = page.locator('#daily-thought-popover');
  await trigger.click();
  await expect(popover.locator('.daily-thought-popover-author')).toHaveText('- Rafael Alberti');
  await expect(popover.locator('.daily-thought-popover-quote')).toContainText('Il est des portes sur la mer');
  await expect(page.locator('#daily-thought')).toHaveCount(0);

  expect(errors).toEqual([]);
});
