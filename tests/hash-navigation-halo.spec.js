const { test, expect } = require('@playwright/test');
test('hash direct', async ({ page }) => {
  await page.goto('/#horaire-absences-prevues-sae');
  const target = page.locator('#horaire-absences-prevues-sae');
  await expect(target).toBeVisible();
  await expect(target).toHaveClass(/portal-search-pulse/);
  await expect.poll(() => target.evaluate(el => getComputedStyle(el).animationName)).toContain('cardiSearchGlowCritical');
  await expect.poll(() => Number(target.getAttribute('data-portal-flash-sequence'))).toBe(1);
});
test('hashchange actif', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();
  await page.evaluate(() => { location.hash = '#sortie'; });
  await expect(page.locator('#sortie')).toHaveAttribute('open', '');
  await expect(page.locator('#sortie')).toHaveClass(/portal-search-pulse/);
});
test('halo lors du choix dans la recherche', async ({ page }) => {
  await page.goto('/');
  await page.locator('#guide-search').fill('plan de classe');
  const suggestion = page.locator('#search-suggestions .suggestion[data-search-index]').first();
  await expect(suggestion).toContainText('Plan de classe');
  await suggestion.click();
  await expect(page.locator('#planclasse')).toHaveClass(/portal-search-pulse/);
});
test('mouvement réduit : contour statique', async ({ page }) => {
  await page.emulateMedia({ reducedMotion:'reduce' });
  await page.goto('/#horaire-absences-prevues-sae');
  const target = page.locator('#horaire-absences-prevues-sae');
  await expect(target).toHaveClass(/portal-search-pulse/);
  const visual = await target.evaluate(el => ({animation:getComputedStyle(el).animationName,outline:getComputedStyle(el).outlineStyle}));
  expect(visual.animation).toBe('none');
  expect(visual.outline).toBe('solid');
});