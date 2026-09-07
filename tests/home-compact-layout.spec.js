const { test, expect } = require('@playwright/test');

async function openPortal(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.PORTAL_SEARCH_ENGINE || '')).toBe('2.0');
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.homeCompact || '')).toBe('1.0');
  await expect(page.locator('.daily-thought')).toBeVisible();
  return errors;
}

test('le haut de page desktop tient sur une ligne et place les favoris au-dessus de la recherche', async ({ page }) => {
  await page.setViewportSize({ width: 1797, height: 832 });
  const errors = await openPortal(page);

  await expect(page.locator('.section-nav a[href="#section-commencer"]')).toHaveCount(0);

  const navLayout = await page.locator('.section-nav-inner').evaluate(nav => ({
    rows: [...nav.children]
      .filter(link => getComputedStyle(link).display !== 'none')
      .map(link => Math.round(link.getBoundingClientRect().top)),
    overflow: nav.scrollWidth - nav.clientWidth
  }));
  expect(new Set(navLayout.rows).size).toBe(1);
  expect(navLayout.overflow).toBeLessThanOrEqual(2);

  const favorite = page.locator('#favorites-jump');
  await expect(favorite.locator('xpath=..')).toHaveClass(/search-favorites-row/);

  const alignment = await page.evaluate(() => {
    const fav = document.getElementById('favorites-jump').getBoundingClientRect();
    const shell = document.querySelector('.search-shell').getBoundingClientRect();
    return {
      rightDelta: Math.abs(fav.right - shell.right),
      verticalGap: shell.top - fav.bottom
    };
  });
  expect(alignment.rightDelta).toBeLessThanOrEqual(2);
  expect(alignment.verticalGap).toBeGreaterThanOrEqual(0);
  expect(alignment.verticalGap).toBeLessThanOrEqual(8);

  const thoughtCenterDelta = await page.evaluate(() => {
    const box = document.querySelector('.daily-thought').getBoundingClientRect();
    const text = document.querySelector('.daily-thought-text').getBoundingClientRect();
    return Math.abs((box.left + box.right) / 2 - (text.left + text.right) / 2);
  });
  expect(thoughtCenterDelta).toBeLessThanOrEqual(3);

  const quickTop = await page.locator('.quick-area').evaluate(node => node.getBoundingClientRect().top);
  expect(quickTop).toBeLessThan(832);
  expect(errors).toEqual([]);
});

test('la version mobile reste propre sans débordement horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openPortal(page);

  await expect(page.locator('.section-nav a[href="#section-commencer"]')).toHaveCount(0);

  const layout = await page.evaluate(() => {
    const fav = document.getElementById('favorites-jump').getBoundingClientRect();
    const shell = document.querySelector('.search-shell').getBoundingClientRect();
    const thought = document.querySelector('.daily-thought').getBoundingClientRect();
    return {
      bodyOverflow: document.documentElement.scrollWidth - window.innerWidth,
      favoriteRightDelta: Math.abs(fav.right - shell.right),
      favoriteGap: shell.top - fav.bottom,
      thoughtLeft: thought.left,
      thoughtRight: thought.right,
      viewportWidth: window.innerWidth
    };
  });

  expect(layout.bodyOverflow).toBeLessThanOrEqual(1);
  expect(layout.favoriteRightDelta).toBeLessThanOrEqual(2);
  expect(layout.favoriteGap).toBeGreaterThanOrEqual(0);
  expect(layout.favoriteGap).toBeLessThanOrEqual(8);
  expect(layout.thoughtLeft).toBeGreaterThanOrEqual(0);
  expect(layout.thoughtRight).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(errors).toEqual([]);
});
