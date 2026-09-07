const { test, expect } = require('@playwright/test');

async function openPortal(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.PORTAL_SEARCH_ENGINE || '')).toBe('2.0');
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.homeCompact || '')).toBe('1.1');
  await expect(page.locator('.daily-thought')).toBeVisible();
  return errors;
}

test('le haut de page desktop garde la pensée et le guidage sur une seule ligne', async ({ page }) => {
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
  await expect(favorite.locator('xpath=..')).toHaveClass(/search-guidance-row/);

  const guidanceLayout = await page.evaluate(() => {
    const row = document.querySelector('.search-guidance-row').getBoundingClientRect();
    const copy = document.querySelector('.search-guidance-row p').getBoundingClientRect();
    const fav = document.getElementById('favorites-jump').getBoundingClientRect();
    const shell = document.querySelector('.search-shell').getBoundingClientRect();
    return {
      copyAndFavoriteSameRow: Math.abs((copy.top + copy.bottom) / 2 - (fav.top + fav.bottom) / 2),
      rightDelta: Math.abs(fav.right - shell.right),
      verticalGap: shell.top - row.bottom
    };
  });
  expect(guidanceLayout.copyAndFavoriteSameRow).toBeLessThanOrEqual(3);
  expect(guidanceLayout.rightDelta).toBeLessThanOrEqual(2);
  expect(guidanceLayout.verticalGap).toBeGreaterThanOrEqual(0);
  expect(guidanceLayout.verticalGap).toBeLessThanOrEqual(8);

  const thoughtLayout = await page.evaluate(() => {
    const label = document.querySelector('.daily-thought-label').getBoundingClientRect();
    const textNode = document.querySelector('.daily-thought-text');
    const text = textNode.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(textNode);
    return {
      sameRow: Math.abs((label.top + label.bottom) / 2 - (text.top + text.bottom) / 2),
      textLineRects: range.getClientRects().length
    };
  });
  expect(thoughtLayout.sameRow).toBeLessThanOrEqual(3);
  expect(thoughtLayout.textLineRects).toBe(1);

  const quickTop = await page.locator('.quick-area').evaluate(node => node.getBoundingClientRect().top);
  expect(quickTop).toBeLessThan(832);
  expect(errors).toEqual([]);
});

test('la version mobile reste propre sans débordement horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openPortal(page);

  await expect(page.locator('.section-nav a[href="#section-commencer"]')).toHaveCount(0);
  await expect(page.locator('#favorites-jump').locator('xpath=..')).toHaveClass(/search-guidance-row/);

  const layout = await page.evaluate(() => {
    const fav = document.getElementById('favorites-jump').getBoundingClientRect();
    const shell = document.querySelector('.search-shell').getBoundingClientRect();
    const thought = document.querySelector('.daily-thought').getBoundingClientRect();
    return {
      bodyOverflow: document.documentElement.scrollWidth - window.innerWidth,
      favoriteRightDelta: Math.abs(fav.right - shell.right),
      thoughtLeft: thought.left,
      thoughtRight: thought.right,
      viewportWidth: window.innerWidth
    };
  });

  expect(layout.bodyOverflow).toBeLessThanOrEqual(1);
  expect(layout.favoriteRightDelta).toBeLessThanOrEqual(2);
  expect(layout.thoughtLeft).toBeGreaterThanOrEqual(0);
  expect(layout.thoughtRight).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(errors).toEqual([]);
});
