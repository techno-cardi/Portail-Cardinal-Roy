const { test, expect } = require('@playwright/test');

const RESERVATION_FILE = 'https://drive.google.com/file/d/1Ea0rcbyqvFjmXzc_yuNREdgk8Pq4LEQW/view?usp=drivesdk';
const MFA_FILE = 'https://drive.google.com/file/d/1G4QFoa_jyItVPd1OTZkCGGabk9h2gIa6/view?usp=drivesdk';
const SERVICES_APPUI_FILE = 'https://drive.google.com/file/d/17R4NSbb1JJInv61vJobHIZvBvNOPOH0H/view?usp=drive_link';
const PARENTS_MEETING_FOLDER = 'https://drive.google.com/drive/folders/12H3rEFMgOWAfFQaaiJcAXK2egsyHvQZD';

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

test('une demande de services d’appui ouvre directement le formulaire', async ({ page }) => {
  await openPortal(page);
  const first = await search(page, 'demande psychoéducation');
  await expect(first).toBeVisible();
  await expect(first).toHaveAttribute('data-direct-file-suggestion', 'services-appui-identification');
  await expect(first).toHaveAttribute('href', SERVICES_APPUI_FILE);
  await expect(first).toContainText('Accéder au fichier');
});

test('la fiche de services d’appui contient le lien direct vers le formulaire', async ({ page }) => {
  await openPortal(page);
  const link = page.locator('#aide-eleve-services-appui a').filter({ hasText: 'Accéder au fichier' });
  await expect(link).toHaveCount(1);
  await expect(link).toHaveAttribute('href', SERVICES_APPUI_FILE);
  await expect(link).toHaveAttribute('target', '_blank');
});

test('la fiche de services d’appui est classée dans Suivre un élève', async ({ page }) => {
  await openPortal(page);
  const section = page.locator('#section-suivi');
  await expect(section.locator('#aide-eleve-services-appui')).toHaveCount(1);
  await expect(section.locator('#aide-eleve-services-appui')).toContainText('Aide et services d’appui pour un élève');
});

for (const query of ['ortho', 'orthopédagogue', 'orthopédagogie', 'psychoéducation', 'orientation']) {
  test(`la recherche générale « ${query} » trouve la fiche de services d’appui`, async ({ page }) => {
    await openPortal(page);
    await search(page, query);
    const result = page.locator('#search-suggestions .suggestion[data-search-open="aide-eleve-services-appui"]');
    await expect(result).toBeVisible();
  });
}

for (const query of ['demande ortho', 'demande orthopédagogue', 'demande psychoéducation', 'demande orientation']) {
  test(`la recherche précise « ${query} » ouvre directement le formulaire`, async ({ page }) => {
    await openPortal(page);
    const first = await search(page, query);
    await expect(first).toBeVisible();
    await expect(first).toHaveAttribute('data-direct-file-suggestion', 'services-appui-identification');
    await expect(first).toHaveAttribute('href', SERVICES_APPUI_FILE);
  });
}

test('la recherche rencontre de parents ouvre directement le dossier avant son expiration', async ({ page }) => {
  await page.addInitScript(() => {
    Date.now = () => new Date('2026-09-25T10:00:00-04:00').getTime();
  });
  await openPortal(page);
  const first = await search(page, 'rencontre de parents');
  await expect(first).toBeVisible();
  await expect(first).toHaveAttribute('data-direct-file-suggestion', 'rencontre-parents-2026-09-29');
  await expect(first).toHaveAttribute('href', PARENTS_MEETING_FOLDER);
  await expect(first).toContainText('Accéder au fichier');
});

test('la recherche rencontre de parents n’injecte plus le dossier après le 29 septembre', async ({ page }) => {
  await page.addInitScript(() => {
    Date.now = () => new Date('2026-09-30T00:00:01-04:00').getTime();
  });
  await openPortal(page);
  await search(page, 'rencontre de parents');
  await expect(page.locator('#search-suggestions [data-direct-file-suggestion="rencontre-parents-2026-09-29"]')).toHaveCount(0);
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
