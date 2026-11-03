const { test, expect } = require('@playwright/test');

const ABSENCES = 'https://docs.google.com/spreadsheets/d/1kVPNXBV3fH3qpEXyR3rKR-DR4LyaMYXSL_hlKjiKrao/edit?gid=2122588584#gid=2122588584';
const HOCKEY = 'https://docs.google.com/spreadsheets/d/14s5Ge8TOAKL6dfLihqG_sDBxjb0-zkR6vkGjwAWeY1I/edit?gid=0#gid=0';
const OLD_FOLDER = 'https://drive.google.com/drive/folders/12gSHd025A4f7cFedyJpqqN2syhzFY96o';

async function openPortal(page) {
  await page.goto('/');
  await expect(page.locator('#guide-search')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.directFiles || '')).toBe('1.0');
  await expect.poll(() => page.evaluate(() => window.PORTAL_SEARCH_ENGINE || '')).toBe('2.0');
}
async function directSearch(page, query, id, url) {
  await page.locator('#guide-search').fill(query);
  const first = page.locator('#search-suggestions .suggestion').first();
  await expect(first).toBeVisible();
  await expect(first).toHaveAttribute('data-direct-file-suggestion', id);
  await expect(first).toHaveAttribute('href', url);
  await expect(first).toContainText('Accéder au fichier');
}

test('SAÉ : mise à jour sans doublon, ancienne ancre et catégorie Gérer la classe', async ({ page }) => {
  await openPortal(page);
  const section = page.locator('#section-classe');
  const absences = section.locator('#horaire-absences-prevues-sae');
  const hockey = section.locator('#calendrier-matchs-hockey-royal');
  await expect(absences).toHaveCount(1);
  await expect(hockey).toHaveCount(1);
  await expect(absences.locator('.procedure-direct-link')).toHaveAttribute('href', ABSENCES);
  await expect(hockey.locator('.procedure-direct-link')).toHaveAttribute('href', HOCKEY);
  await expect(page.locator('#section-suivi #horaire-absences-prevues-sae')).toHaveCount(0);
  await expect(page.locator('a[href="' + OLD_FOLDER + '"]')).toHaveCount(0);
});

for (const q of ['absences prévues', 'départs prévus', 'match soccer', 'horaire soccer', 'absences prolongées']) {
  test('Absences SAÉ, accès direct via « ' + q + ' »', async ({ page }) => {
    await openPortal(page);
    await directSearch(page, q, 'horaire-absences-prevues-sae', ABSENCES);
  });
}

for (const q of ['hockey', 'royal', 'horaire hockey', 'calendrier hockey', 'matchs hockey']) {
  test('Hockey, accès direct via « ' + q + ' »', async ({ page }) => {
    await openPortal(page);
    await directSearch(page, q, 'calendrier-matchs-hockey-royal', HOCKEY);
  });
}

test('une recherche générale SAÉ ne force pas un fichier précis', async ({ page }) => {
  await openPortal(page);
  await page.locator('#guide-search').fill('SAÉ');
  const first = page.locator('#search-suggestions .suggestion').first();
  await expect(first).toBeVisible();
  await expect(first).not.toHaveAttribute('data-direct-file-suggestion', 'horaire-absences-prevues-sae');
  await expect(first).not.toHaveAttribute('data-direct-file-suggestion', 'calendrier-matchs-hockey-royal');
});

test('Nouveautés : les deux cartes ouvrent directement les tableurs', async ({ page }) => {
  await openPortal(page);
  for (const [id,url] of [
    ['absences-prevues-sae-2026-10-30', ABSENCES],
    ['calendrier-matchs-hockey-royal-2026-11-02', HOCKEY]
  ]) {
    const card = page.locator('#portal-updates [data-update-id="' + id + '"]');
    await expect(card).toHaveCount(1);
    await expect(card).toHaveAttribute('href', url);
    await expect(card).toHaveAttribute('target', '_blank');
    await expect(card.locator('.portal-update-action')).toHaveText('Accéder au fichier');
  }
});
