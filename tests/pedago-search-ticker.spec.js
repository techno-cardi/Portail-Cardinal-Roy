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

test('pédago garde l’horaire du 18 septembre comme premier résultat sans clignotement et pointe directement vers le PDF', async ({ page }) => {
  await fixDate(page, '2026-09-18T09:00:00-04:00');
  await page.goto('/');
  const input = page.locator('#guide-search');
  await expect(input).toBeVisible();

  await input.fill('pédago');
  const first = page.locator('#search-suggestions .suggestion').first();
  await expect(first).toContainText('Horaire de la journée pédagogique du 18 septembre');
  await expect(first).toHaveAttribute('href', PEDAGO_FILE);
  await expect(first).toHaveAttribute('target', '_blank');

  await page.waitForTimeout(300);
  await expect(first).toContainText('Horaire de la journée pédagogique du 18 septembre');
  await expect(page.locator('#search-suggestions')).not.toContainText('Attentes et exigences');
});

test('la pédago du 18 septembre dans Dates importantes ouvre directement le PDF', async ({ page }) => {
  await fixDate(page, '2026-09-18T09:00:00-04:00');
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();

  await page.evaluate(() => {
    window.__pedagoOpenedUrl = '';
    window.open = url => {
      window.__pedagoOpenedUrl = String(url || '');
      return null;
    };
  });

  const ticker = page.locator('#school-news-ticker');
  await expect(ticker).toBeVisible();
  await expect(ticker.locator('.school-news-text')).toHaveText('Pédagogique');

  const link = ticker.locator('.school-news-track[data-ped-day-link="2026-09-18"]');
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('data-ped-day-url', PEDAGO_FILE);
  await link.click();

  await expect.poll(() => page.evaluate(() => window.__pedagoOpenedUrl)).toBe(PEDAGO_FILE);
  await expect(page).not.toHaveURL(/#journee-pedagogique-2026-09-18$/);
});

test('l’entrée du 18 septembre n’est plus affichée dans le bandeau après minuit', async ({ page }) => {
  await fixDate(page, '2026-09-19T00:01:00-04:00');
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();

  const ticker = page.locator('#school-news-ticker');
  await expect(ticker).toBeVisible();
  await expect.poll(async () => ({
    date: (await ticker.locator('.school-news-date').textContent()) || '',
    text: (await ticker.locator('.school-news-text').textContent()) || ''
  })).not.toEqual(expect.objectContaining({ date: expect.stringMatching(/18 sept/i), text: 'Pédagogique' }));
  await expect(ticker.locator('[data-ped-day-link="2026-09-18"]')).toHaveCount(0);
});
