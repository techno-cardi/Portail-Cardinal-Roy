const { test, expect } = require('@playwright/test');

async function openPortal(page) {
  await page.addInitScript(() => {
    const RealDate = Date;
    const fixed = new RealDate('2026-09-08T16:00:00Z').getTime();
    class FixedDate extends RealDate {
      constructor(...args) { super(...(args.length ? args : [fixed])); }
      static now() { return fixed; }
    }
    FixedDate.parse = RealDate.parse;
    FixedDate.UTC = RealDate.UTC;
    window.Date = FixedDate;
  });

  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.PORTAL_SEARCH_ENGINE || '')).toBe('2.0');
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.homeCompact || '')).toBe('1.2');
  await expect(page.locator('#school-news-ticker')).toBeVisible();
  return errors;
}

test('le haut de page desktop met Dates importantes à gauche et Pensée du jour à droite', async ({ page }) => {
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

  await expect(page.locator('#daily-thought')).toHaveCount(0);
  await expect(page.locator('#daily-thought-fallback')).toHaveCount(0);
  await expect(page.locator('.daily-thought-standalone')).toHaveCount(0);
  await expect(page.locator('.school-news-badges')).toHaveCount(0);

  const ticker = page.locator('#school-news-ticker');
  const dateBadge = ticker.locator(':scope > .school-news-badge');
  const trigger = ticker.locator(':scope > .daily-thought-control .daily-thought-trigger');

  await expect(dateBadge).toBeVisible();
  await expect(dateBadge).toContainText('Dates importantes');
  await expect(trigger).toBeVisible();

  const alignment = await page.evaluate(() => {
    const ticker = document.getElementById('school-news-ticker');
    const badge = ticker?.querySelector(':scope > .school-news-badge');
    const trigger = ticker?.querySelector(':scope > .daily-thought-control .daily-thought-trigger');
    const tickerRect = ticker?.getBoundingClientRect();
    const badgeRect = badge?.getBoundingClientRect();
    const triggerRect = trigger?.getBoundingClientRect();
    return {
      triggerInsideTicker: Boolean(ticker && trigger && ticker.contains(trigger)),
      badgeNearTickerTop: Boolean(tickerRect && badgeRect && Math.abs(badgeRect.top - tickerRect.top) <= 12),
      badgeNearTickerLeft: Boolean(tickerRect && badgeRect && Math.abs(badgeRect.left - tickerRect.left) <= 12),
      triggerNearTickerRight: Boolean(tickerRect && triggerRect && Math.abs(tickerRect.right - triggerRect.right) <= 12),
      sameLine: Boolean(badgeRect && triggerRect && Math.abs(badgeRect.top - triggerRect.top) <= 4)
    };
  });
  expect(alignment.triggerInsideTicker).toBe(true);
  expect(alignment.badgeNearTickerTop).toBe(true);
  expect(alignment.badgeNearTickerLeft).toBe(true);
  expect(alignment.triggerNearTickerRight).toBe(true);
  expect(alignment.sameLine).toBe(true);

  const buttonLayout = await trigger.evaluate(node => {
    const rect = node.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });
  expect(buttonLayout.width).toBeLessThan(180);
  expect(buttonLayout.height).toBeLessThan(40);

  await trigger.click();
  const popover = page.locator('#daily-thought-popover');
  await expect(popover).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(popover).toContainText('Il est des portes sur la mer');
  await expect(popover).toContainText('Rafael Alberti');

  await page.locator('.search-intro h2').click();
  await expect(popover).toBeHidden();

  const search = page.locator('#guide-search');
  await search.fill('horaire');
  await expect(search).toHaveValue('horaire');
  await expect(page.locator('.daily-thought-trigger')).toHaveCount(1);

  const quickTop = await page.locator('.quick-area').evaluate(node => node.getBoundingClientRect().top);
  expect(quickTop).toBeLessThan(832);
  expect(errors).toEqual([]);
});

test('sur mobile la pensée du jour disparaît complètement', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openPortal(page);

  await expect(page.locator('.section-nav a[href="#section-commencer"]')).toHaveCount(0);
  await expect(page.locator('#favorites-jump').locator('xpath=..')).toHaveClass(/search-guidance-row/);
  await expect(page.locator('#daily-thought')).toHaveCount(0);
  await expect(page.locator('.school-news-badges')).toHaveCount(0);
  await expect(page.locator('.daily-thought-trigger')).toHaveCount(0);
  await expect(page.locator('#daily-thought-popover')).toHaveCount(0);

  const ticker = page.locator('#school-news-ticker');
  await expect(ticker.locator(':scope > .school-news-badge')).toBeVisible();

  const layout = await page.evaluate(() => {
    const fav = document.getElementById('favorites-jump').getBoundingClientRect();
    const shell = document.querySelector('.search-shell').getBoundingClientRect();
    return {
      bodyOverflow: document.documentElement.scrollWidth - window.innerWidth,
      favoriteRightDelta: Math.abs(fav.right - shell.right)
    };
  });

  expect(layout.bodyOverflow).toBeLessThanOrEqual(1);
  expect(layout.favoriteRightDelta).toBeLessThanOrEqual(2);

  const search = page.locator('#guide-search');
  await search.fill('reservation');
  await expect(search).toHaveValue('reservation');
  expect(errors).toEqual([]);
});
