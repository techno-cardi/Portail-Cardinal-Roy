const { test, expect } = require('@playwright/test');

async function fixDate(page, iso) {
  const fixed = new Date(iso).valueOf();
  await page.addInitScript(({ fixed }) => {
    const NativeDate = Date;
    class MockDate extends NativeDate {
      constructor(...args) {
        super(...(args.length ? args : [fixed]));
      }
      static now() {
        return fixed;
      }
    }
    window.Date = MockDate;
  }, { fixed });
}

test('l’horaire du 18 septembre est visible et trouvable avant son expiration', async ({ page }) => {
  await fixDate(page, '2026-09-18T09:00:00-04:00');
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();

  const card = page.locator('#section-organisation-scolaire #journee-pedagogique-2026-09-18');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('Horaire de la journée pédagogique du 18 septembre');
  await expect(card).toContainText('8 h 30 à 14 h 54');
  await expect(card.locator('a[href*="1S7mZootQb4dddOYHKOU19_yyEqeWu3fG"]')).toHaveCount(1);

  await page.locator('#guide-search').fill('journée pédagogique 18 septembre');
  const suggestion = page.locator('#search-suggestions .suggestion').filter({ hasText: 'Horaire de la journée pédagogique du 18 septembre' }).first();
  await expect(suggestion).toBeVisible();
});

test('l’horaire disparaît automatiquement à partir du samedi 19 septembre', async ({ page }) => {
  await fixDate(page, '2026-09-19T00:01:00-04:00');
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();

  await expect(page.locator('#journee-pedagogique-2026-09-18')).toHaveCount(0);
  await page.locator('#guide-search').fill('journée pédagogique 18 septembre');
  await expect(page.locator('#search-suggestions')).not.toContainText('Horaire de la journée pédagogique du 18 septembre');
});
