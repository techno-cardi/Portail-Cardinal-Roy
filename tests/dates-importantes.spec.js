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

  const badge = page.locator('#school-news-ticker a.school-news-badge');
  await expect(badge).toBeVisible();
  await expect(badge).toContainText('Dates importantes');
  await expect(badge).toHaveAttribute('href', /1bfyqip0TJWvj58fUznfQzTx4Oc21i3PN/);
  await expect(badge).toHaveAttribute('target', '_blank');
  await expect(badge).toHaveAttribute('rel', /noopener noreferrer/);

  const visual = await badge.evaluate(node => {
    const style = getComputedStyle(node);
    return {
      decoration: style.textDecorationLine,
      background: style.backgroundColor,
      color: style.color,
      radius: style.borderRadius,
      display: style.display
    };
  });
  expect(visual.decoration).toBe('none');
  expect(visual.display).toBe('inline-flex');
  expect(visual.radius).toBe('6px');
  expect(visual.background).not.toBe('rgba(0, 0, 0, 0)');
  expect(visual.color).toBe('rgb(127, 20, 39)');
});
