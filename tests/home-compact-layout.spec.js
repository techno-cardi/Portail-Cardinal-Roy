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
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.homeCompact || '')).toBe('1.3');
  await expect(page.locator('#school-news-ticker')).toBeVisible();
  return errors;
}

test('le haut de page desktop garde Dates importantes centré et l’événement centré dans sa boîte', async ({ page }) => {
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
  const eventBox = ticker.locator(':scope > .school-news-track');
  const trigger = ticker.locator(':scope > .daily-thought-control .daily-thought-trigger');

  await expect(dateBadge).toBeVisible();
  await expect(dateBadge).toContainText('Dates importantes');
  await expect(eventBox).toBeVisible();
  await expect(trigger).toBeVisible();
  await expect(ticker).toHaveClass(/has-daily-thought/);

  const alignment = await page.evaluate(() => {
    const stage = document.querySelector('.search-stage-inner');
    const ticker = document.getElementById('school-news-ticker');
    const badge = ticker?.querySelector(':scope > .school-news-badge');
    const eventBox = ticker?.querySelector(':scope > .school-news-track');
    const eventDate = eventBox?.querySelector('.school-news-date');
    const eventText = eventBox?.querySelector('.school-news-text');
    const trigger = ticker?.querySelector(':scope > .daily-thought-control .daily-thought-trigger');
    const stageRect = stage?.getBoundingClientRect();
    const tickerRect = ticker?.getBoundingClientRect();
    const badgeRect = badge?.getBoundingClientRect();
    const eventRect = eventBox?.getBoundingClientRect();
    const dateRect = eventDate?.getBoundingClientRect();
    const textRect = eventText?.getBoundingClientRect();
    const triggerRect = trigger?.getBoundingClientRect();
    const eventStyle = eventBox ? getComputedStyle(eventBox) : null;
    const contentCenterY = dateRect && textRect
      ? (Math.min(dateRect.top, textRect.top) + Math.max(dateRect.bottom, textRect.bottom)) / 2
      : 0;
    return {
      centerDelta: Math.abs(((tickerRect?.left || 0) + (tickerRect?.right || 0)) / 2 - ((stageRect?.left || 0) + (stageRect?.right || 0)) / 2),
      width: tickerRect?.width || 0,
      badgeNearTickerLeft: Boolean(tickerRect && badgeRect && Math.abs(badgeRect.left - tickerRect.left) <= 12),
      triggerNearTickerRight: Boolean(tickerRect && triggerRect && Math.abs(tickerRect.right - triggerRect.right) <= 12),
      badgeAndTriggerCentered: Boolean(badgeRect && triggerRect && Math.abs((badgeRect.top + badgeRect.bottom) / 2 - (triggerRect.top + triggerRect.bottom) / 2) <= 4),
      eventHorizontalCentering: eventStyle?.justifyContent,
      eventVerticalCentering: eventStyle?.alignItems,
      eventContentCenterDeltaY: eventRect ? Math.abs(contentCenterY - (eventRect.top + eventRect.bottom) / 2) : 999,
      eventHasOwnBorder: eventStyle?.borderTopStyle !== 'none',
      eventHasRadius: parseFloat(eventStyle?.borderTopLeftRadius || '0') > 0
    };
  });
  expect(alignment.centerDelta).toBeLessThanOrEqual(2);
  expect(alignment.width).toBeLessThanOrEqual(822);
  expect(alignment.badgeNearTickerLeft).toBe(true);
  expect(alignment.triggerNearTickerRight).toBe(true);
  expect(alignment.badgeAndTriggerCentered).toBe(true);
  expect(alignment.eventHorizontalCentering).toBe('center');
  expect(alignment.eventVerticalCentering).toBe('center');
  expect(alignment.eventContentCenterDeltaY).toBeLessThanOrEqual(4);
  expect(alignment.eventHasOwnBorder).toBe(true);
  expect(alignment.eventHasRadius).toBe(true);

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

test('sur mobile la pensée disparaît et l’événement reste centré sans débordement', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openPortal(page);

  await expect(page.locator('.section-nav a[href="#section-commencer"]')).toHaveCount(0);
  await expect(page.locator('#favorites-jump').locator('xpath=..')).toHaveClass(/search-guidance-row/);
  await expect(page.locator('#daily-thought')).toHaveCount(0);
  await expect(page.locator('.school-news-badges')).toHaveCount(0);
  await expect(page.locator('.daily-thought-trigger')).toHaveCount(0);
  await expect(page.locator('#daily-thought-popover')).toHaveCount(0);

  const ticker = page.locator('#school-news-ticker');
  const eventBox = ticker.locator(':scope > .school-news-track');
  await expect(ticker.locator(':scope > .school-news-badge')).toBeVisible();
  await expect(eventBox).toBeVisible();
  await expect(ticker).not.toHaveClass(/has-daily-thought/);

  const layout = await page.evaluate(() => {
    const fav = document.getElementById('favorites-jump').getBoundingClientRect();
    const shell = document.querySelector('.search-shell').getBoundingClientRect();
    const ticker = document.getElementById('school-news-ticker').getBoundingClientRect();
    const eventBox = document.querySelector('#school-news-ticker > .school-news-track');
    const eventStyle = getComputedStyle(eventBox);
    return {
      bodyOverflow: document.documentElement.scrollWidth - window.innerWidth,
      favoriteRightDelta: Math.abs(fav.right - shell.right),
      tickerRightOverflow: ticker.right - window.innerWidth,
      tickerLeft: ticker.left,
      eventHorizontalCentering: eventStyle.justifyContent,
      eventVerticalCentering: eventStyle.alignItems
    };
  });

  expect(layout.bodyOverflow).toBeLessThanOrEqual(1);
  expect(layout.favoriteRightDelta).toBeLessThanOrEqual(2);
  expect(layout.tickerRightOverflow).toBeLessThanOrEqual(1);
  expect(layout.tickerLeft).toBeGreaterThanOrEqual(0);
  expect(layout.eventHorizontalCentering).toBe('center');
  expect(layout.eventVerticalCentering).toBe('center');

  const search = page.locator('#guide-search');
  await search.fill('reservation');
  await expect(search).toHaveValue('reservation');
  expect(errors).toEqual([]);
});
