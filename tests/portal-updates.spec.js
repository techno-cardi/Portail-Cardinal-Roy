const { test, expect } = require('@playwright/test');

function dateKey(offsetDays = 0) {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

async function mockUpdates(page, items) {
  await page.route('**/portal-updates.json*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({ items }),
    });
  });
}

async function waitForPortal(page) {
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();
  await expect(page.locator('#portal-updates')).toHaveAttribute('data-item-count', /\d+/);
}

test('affiche seulement les 3 nouveautés actives les plus récentes', async ({ page }) => {
  await mockUpdates(page, [
    {
      id: 'recent-1',
      title: 'Ajout le plus récent',
      description: 'Doit apparaître en premier.',
      published_at: dateKey(-1),
      expires_at: dateKey(20),
      target: '#reservation',
      kind: 'nouveau',
    },
    {
      id: 'recent-2',
      title: 'Deuxième ajout',
      published_at: dateKey(-2),
      expires_at: dateKey(20),
      kind: 'maj',
    },
    {
      id: 'recent-3',
      title: 'Troisième ajout',
      published_at: dateKey(-3),
      expires_at: dateKey(20),
      kind: 'nouveau',
    },
    {
      id: 'recent-4',
      title: 'Quatrième ajout masqué',
      published_at: dateKey(-4),
      expires_at: dateKey(20),
      kind: 'nouveau',
    },
    {
      id: 'expired',
      title: 'Ancienne nouveauté expirée',
      published_at: dateKey(-40),
      expires_at: dateKey(-10),
      kind: 'nouveau',
    },
    {
      id: 'future',
      title: 'Nouveauté future',
      published_at: dateKey(2),
      expires_at: dateKey(30),
      kind: 'nouveau',
    },
  ]);

  await waitForPortal(page);

  const section = page.locator('#portal-updates');
  const cards = section.locator('.portal-update-item');
  await expect(section).toBeVisible();
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0)).toContainText('Ajout le plus récent');
  await expect(cards.nth(1)).toContainText('Deuxième ajout');
  await expect(cards.nth(2)).toContainText('Troisième ajout');
  await expect(section).not.toContainText('Quatrième ajout masqué');
  await expect(section).not.toContainText('Ancienne nouveauté expirée');
  await expect(section).not.toContainText('Nouveauté future');

  const order = await page.evaluate(() => {
    const updates = document.querySelector('#portal-updates');
    const quick = document.querySelector('.quick-area');
    return updates && quick ? Boolean(quick.compareDocumentPosition(updates) & Node.DOCUMENT_POSITION_FOLLOWING) : false;
  });
  expect(order).toBe(true);
});

test('un lien interne ouvre directement la procédure correspondante', async ({ page }) => {
  await mockUpdates(page, [
    {
      id: 'reservation-link',
      title: 'Procédure de réservation',
      published_at: dateKey(0),
      expires_at: dateKey(20),
      target: '#reservation',
      kind: 'nouveau',
    },
  ]);

  await waitForPortal(page);
  const card = page.locator('#portal-updates a.portal-update-item');
  await expect(card).toHaveAttribute('href', '#reservation');
  await card.click();
  await expect(page.locator('#reservation')).toHaveAttribute('open', '');
  await expect(page).toHaveURL(/#reservation$/);
});

test('masque toute la section quand aucune nouveauté active ne reste', async ({ page }) => {
  await mockUpdates(page, [
    {
      id: 'expired-only',
      title: 'Élément expiré',
      published_at: dateKey(-50),
      expires_at: dateKey(-5),
      kind: 'nouveau',
    },
  ]);

  await waitForPortal(page);
  await expect(page.locator('#portal-updates')).toBeHidden();
  await expect(page.locator('#portal-updates')).toHaveAttribute('data-item-count', '0');
});

test('neutralise une cible non sécuritaire sans masquer la nouveauté', async ({ page }) => {
  await mockUpdates(page, [
    {
      id: 'unsafe-link',
      title: 'Nouveauté valide avec cible invalide',
      published_at: dateKey(0),
      expires_at: dateKey(20),
      target: 'javascript:alert(1)',
      kind: 'nouveau',
    },
  ]);

  await waitForPortal(page);
  const card = page.locator('#portal-updates .portal-update-item');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Nouveauté valide avec cible invalide');
  await expect(page.locator('#portal-updates a.portal-update-item')).toHaveCount(0);
});
