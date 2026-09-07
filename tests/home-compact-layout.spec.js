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
  await expect(page.locator('.daily-thought-trigger')).toBeVisible();
  return errors;
}

test('le haut de page desktop garde les dates et la pensée strictement séparées', async ({ page }) => {
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
  await expect(page.locator('.daily-thought-button-row')).toHaveCount(0);
  await expect(page.locator('.school-news-badges')).toHaveCount(0);

  const ticker = page.locator('#school-news-ticker');
  const dateBadge = ticker.locator(':scope > .school-news-badge');
  const standalone = page.locator('.daily-thought-standalone');
  const trigger = standalone.locator('.daily-thought-trigger');

  await expect(dateBadge).toBeVisible();
  await expect(dateBadge).toContainText('Dates importantes');
  await expect(standalone).toBeVisible();
  await expect(trigger).toBeVisible();

  const separation = await page.evaluate(() => {
    const ticker = document.getElementById('school-news-ticker');
    const standalone = document.querySelector('.daily-thought-standalone');
    const trigger = document.querySelector('.daily-thought-trigger');
    const badge = ticker?.querySelector(':scope > .school-news-badge');
    const tickerRect = ticker?.getBoundingClientRect();
    const badgeRect = badge?.getBoundingClientRect();
    return {
      triggerInsideTicker: Boolean(ticker && trigger && ticker.contains(trigger)),
      standaloneAfterTicker: Boolean(ticker && standalone && ticker.nextElementSibling === standalone),
      badgeNearTickerTop: Boolean(tickerRect && badgeRect && Math.abs(badgeRect.top - tickerRect.top) <= 10),
      badgeNearTickerLeft: Boolean(tickerRect && badgeRect && Math.abs(badgeRect.left - tickerRect.left) <= 12)
    };
  });
  expect(separation.triggerInsideTicker).toBe(false);
  expect(separation.standaloneAfterTicker).toBe(true);
  expect(separation.badgeNearTickerTop).toBe(true);
  expect(separation.badgeNearTickerLeft).toBe(true);

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
  expect(quickTop).toBeLessThan(880);
  expect(errors).toEqual([]);
});

test('le bouton de pensée reste autonome et propre sur mobile et iOS', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openPortal(page);

  await expect(page.locator('.section-nav a[href="#section-commencer"]')).toHaveCount(0);
  await expect(page.locator('#favorites-jump').locator('xpath=..')).toHaveClass(/search-guidance-row/);
  await expect(page.locator('#daily-thought')).toHaveCount(0);
  await expect(page.locator('.school-news-badges')).toHaveCount(0);

  const ticker = page.locator('#school-news-ticker');
  const standalone = page.locator('.daily-thought-standalone');
  const trigger = standalone.locator('.daily-thought-trigger');
  await expect(ticker.locator(':scope > .school-news-badge')).toBeVisible();
  await expect(trigger).toBeVisible();

  const triggerSize = await trigger.evaluate(node => {
    const rect = node.getBoundingClientRect();
    return { width: rect.width, right: rect.right, viewportWidth: window.innerWidth };
  });
  expect(triggerSize.width).toBeLessThan(180);
  expect(triggerSize.right).toBeLessThanOrEqual(triggerSize.viewportWidth + 1);

  await trigger.click();
  const popover = page.locator('#daily-thought-popover');
  await expect(popover).toBeVisible();

  const layout = await page.evaluate(() => {
    const fav = document.getElementById('favorites-jump').getBoundingClientRect();
    const shell = document.querySelector('.search-shell').getBoundingClientRect();
    const popover = document.getElementById('daily-thought-popover').getBoundingClientRect();
    const ticker = document.getElementById('school-news-ticker');
    const trigger = document.querySelector('.daily-thought-trigger');
    return {
      bodyOverflow: document.documentElement.scrollWidth - window.innerWidth,
      favoriteRightDelta: Math.abs(fav.right - shell.right),
      popoverLeft: popover.left,
      popoverRight: popover.right,
      viewportWidth: window.innerWidth,
      triggerInsideTicker: Boolean(ticker && trigger && ticker.contains(trigger))
    };
  });

  expect(layout.bodyOverflow).toBeLessThanOrEqual(1);
  expect(layout.favoriteRightDelta).toBeLessThanOrEqual(2);
  expect(layout.popoverLeft).toBeGreaterThanOrEqual(0);
  expect(layout.popoverRight).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.triggerInsideTicker).toBe(false);

  await page.keyboard.press('Escape');
  await expect(popover).toBeHidden();
  await expect(trigger).toBeFocused();

  const search = page.locator('#guide-search');
  await search.fill('reservation');
  await expect(search).toHaveValue('reservation');
  expect(errors).toEqual([]);
});
