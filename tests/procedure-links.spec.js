const { test, expect } = require('@playwright/test');

test('les procédures MFA et Réservation utilisent les nouveaux PDF sans doublons', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.PORTAL_SEARCH_ENGINE || '')).toBe('2.0');

  const mfa = page.locator('#app-mot-de-passe');
  await expect(mfa).toHaveCount(1);
  await expect(mfa.locator('a[href*="1G4QFoa_jyItVPd1OTZkCGGabk9h2gIa6"]')).toHaveCount(1);
  await expect(mfa.locator('a[href*="1G4QFoa_jyItVPd1OTZkCGGabk9h2gIa6"]')).toContainText('Double authentification');
  await expect(mfa).toHaveAttribute('data-search-keywords', /nouveau téléphone/i);
  await expect(mfa).toHaveAttribute('data-search-keywords', /Authenticator/i);

  const reservation = page.locator('#reservation');
  await expect(reservation).toHaveCount(1);
  await expect(reservation.locator('a[href*="1Ea0rcbyqvFjmXzc_yuNREdgk8Pq4LEQW"]')).toHaveCount(1);
  await expect(reservation.locator('a[href*="1xTT24JTumbFbWY8vWt3aRSkJS8RLZtEIMuvU9nwRpsc"]')).toHaveCount(0);
  await expect(reservation.locator('a[href*="1Ea0rcbyqvFjmXzc_yuNREdgk8Pq4LEQW"]')).toContainText(/réservation de locaux et convocations/i);
  await expect(reservation).toHaveAttribute('data-search', /convoquer/i);
  await expect(reservation).toHaveAttribute('data-search', /Découvertes/i);

  const input = page.locator('#guide-search');
  const suggestions = page.locator('#search-suggestions');

  await input.fill('nouveau téléphone authenticator');
  await expect(suggestions).toContainText(/Application Mot de passe/i);

  await input.fill('convoquer élèves récupération');
  await expect(suggestions).toContainText(/Réservation/i);

  const duplicateIds = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map(node => node.id).filter(Boolean);
    return ids.filter((id, index) => ids.indexOf(id) !== index);
  });
  expect(duplicateIds).not.toContain('reservation');
  expect(duplicateIds).not.toContain('app-mot-de-passe');
  expect(errors).toEqual([]);
});