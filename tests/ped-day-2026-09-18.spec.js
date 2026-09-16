const { test, expect } = require('@playwright/test');

const PEDAGO_FILE = 'https://drive.google.com/file/d/1S7mZootQb4dddOYHKOU19_yyEqeWu3fG/view?usp=drivesdk';

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

test('l’horaire du 18 septembre est visible et ses deux accès ouvrent directement le PDF', async ({ page }) => {
  await fixDate(page, '2026-09-18T09:00:00-04:00');
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();

  const card = page.locator('#section-organisation-scolaire #journee-pedagogique-2026-09-18');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('Horaire de la journée pédagogique du 18 septembre');
  await expect(card).toContainText('8 h 30 à 14 h 54');
  await expect(card.locator('a[href="' + PEDAGO_FILE + '"]')).toHaveCount(1);

  await page.locator('#guide-search').fill('pédago');
  const suggestion = page.locator('#search-suggestions [data-direct-search-resource="pedago-2026-09-18-direct"]');
  await expect(suggestion).toBeVisible();
  await expect(suggestion).toHaveAttribute('href', PEDAGO_FILE);
  await expect(suggestion).toHaveAttribute('target', '_blank');

  const dateLink = page.locator('#school-news-ticker [data-ped-day-link="2026-09-18"]');
  await expect(dateLink).toBeVisible();
  await expect(dateLink).toHaveAttribute('href', PEDAGO_FILE);
  await expect(dateLink).toHaveAttribute('target', '_blank');
});

test('l’horaire et son lien du bandeau disparaissent à partir du samedi 19 septembre', async ({ page }) => {
  await fixDate(page, '2026-09-19T00:01:00-04:00');
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();

  await expect(page.locator('#journee-pedagogique-2026-09-18')).toHaveCount(0);
  await expect(page.locator('#school-news-ticker [data-ped-day-link="2026-09-18"]')).toHaveCount(0);

  await page.locator('#guide-search').fill('pédago');
  await expect(page.locator('#search-suggestions')).not.toContainText('Horaire de la journée pédagogique du 18 septembre');
});