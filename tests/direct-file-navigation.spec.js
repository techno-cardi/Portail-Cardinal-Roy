const { test, expect } = require('@playwright/test');

const RESERVATION_FILE = 'https://drive.google.com/file/d/1Ea0rcbyqvFjmXzc_yuNREdgk8Pq4LEQW/view?usp=drivesdk';
const MFA_FILE = 'https://drive.google.com/file/d/1G4QFoa_jyItVPd1OTZkCGGabk9h2gIa6/view?usp=drivesdk';

async function openPortal(page) {
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.directFiles || '')).toBe('1.0');
  await expect.poll(() => page.evaluate(() => window.PORTAL_SEARCH_ENGINE || '')).toBe('2.0');
}

async function search(page, query) {
  const input = page.locator('#guide-search');
  await input.fill(query);
  return page.locator('#search-suggestions .suggestion').first();
}

test('la procédure de réservation ouvre directement le fichier', async ({ page }) => {
  await openPortal(page);
  const first = await search(page, 'procédure réservation');
  await expect(first).toBeVisible();
  await expect(first).toHaveAttribute('data-direct-file-suggestion', 'reservation-procedure');
  await expect(first).toHaveAttribute('href', RESERVATION_FILE);
  await expect(first).toContainText('Accéder au fichier');
});

test('la double authentification ouvre directement le fichier', async ({ page }) => {
  await openPortal(page);
  const first = await search(page, 'double authentification');
  await expect(first).toBeVisible();
  await expect(first).toHaveAttribute('data-direct-file-suggestion', 'double-authentification');
  await expect(first).toHaveAttribute('href', MFA_FILE);
  await expect(first).toContainText('Accéder au fichier');
});

test('une recherche générique réservation ne force pas la procédure', async ({ page }) => {
  await openPortal(page);
  const first = await search(page, 'réservation');
  await expect(first).toBeVisible();
  await expect(first).not.toHaveAttribute('data-direct-file-suggestion', 'reservation-procedure');
});

test('une recherche générique mot de passe ne force pas la double authentification', async ({ page }) => {
  await openPortal(page);
  const first = await search(page, 'mot de passe');
  await expect(first).toBeVisible();
  await expect(first).not.toHaveAttribute('data-direct-file-suggestion', 'double-authentification');
});

test('les nouveautés fichier pointent directement vers le fichier avec le bon libellé', async ({ page }) => {
  await openPortal(page);
  const reservation = page.locator('#portal-updates [data-update-id="reservation-recuperation-2026-09-21"]');
  const mfa = page.locator('#portal-updates [data-update-id="double-authentification-2026-09-21"]');

  await expect(reservation).toHaveAttribute('href', RESERVATION_FILE);
  await expect(reservation.locator('.portal-update-action')).toHaveText('Accéder au fichier');
  await expect(reservation).toHaveAttribute('target', '_blank');

  await expect(mfa).toHaveAttribute('href', MFA_FILE);
  await expect(mfa.locator('.portal-update-action')).toHaveText('Accéder au fichier');
  await expect(mfa).toHaveAttribute('target', '_blank');
});
