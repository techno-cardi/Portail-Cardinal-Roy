const { test, expect } = require('@playwright/test');

test('le calendrier des dates importantes est dans Organisation scolaire avec les bons accès', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();

  const card = page.locator('#section-organisation-scolaire #dates-importantes-2026-2027');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('Calendrier des dates importantes 2026-2027');
  await expect(card.locator('a[href*="1bfyqip0TJWvj58fUznfQzTx4Oc21i3PN"]')).toHaveCount(1);
  await expect(card.locator('a[href*="calendar.google.com/calendar/u/0?cid="]')).toHaveCount(1);
  await expect(card).toContainText('Ajouter le calendrier partagé à Google Agenda');
  await expect(card).toContainText('S’abonner à partir du web');
  await expect(card).toContainText('lien d’abonnement iCal');

  const input = page.locator('#guide-search');
  await input.fill('dates importantes 2026 2027');
  const first = page.locator('#search-suggestions .suggestion').first();
  await expect(first).toBeVisible();
  await expect(first).toContainText('Calendrier des dates importantes 2026-2027');

  expect(pageErrors).toEqual([]);
});

test('le libellé Dates importantes ouvre directement le PDF annuel sans changer son apparence', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();

  const badge = page.locator('#school-news-ticker .school-news-badge');
  await expect(badge).toBeVisible();
  await expect(badge).toContainText('Dates importantes');
  await expect(badge).toHaveAttribute('role', 'link');
  await expect(badge).toHaveAttribute('tabindex', '0');
  await expect(badge).toHaveAttribute('data-dates-pdf-url', /1bfyqip0TJWvj58fUznfQzTx4Oc21i3PN/);

  const decoration = await badge.evaluate(node => getComputedStyle(node).textDecorationLine);
  expect(decoration).toBe('none');

  await page.evaluate(() => {
    window.__datesPdfOpened = '';
    window.open = url => {
      window.__datesPdfOpened = String(url || '');
      return null;
    };
  });
  await badge.click();
  await expect.poll(() => page.evaluate(() => window.__datesPdfOpened)).toContain('1bfyqip0TJWvj58fUznfQzTx4Oc21i3PN');
});
