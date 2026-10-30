(function monClassroomTests() {
  const { test, expect } = require('@playwright/test');
  const FILE = 'https://docs.google.com/document/d/1ku9DqAvjSPxT8YkO24dQvw6GihcYWrnkD3a52Xixfog/edit?usp=drivesdk';

  async function openPortal(page) {
    await page.goto('/');
    await expect(page.locator('#guide-search')).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.directFiles || '')).toBe('1.0');
  }

  test('Mon Classroom est classé dans Gérer la classe avec le véritable logo AppSP', async ({ page }) => {
    await openPortal(page);
    const card = page.locator('#section-classe #mon-classroom-appsp');
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('Synchroniser les listes d’élèves');
    await expect(card.locator('img')).toHaveAttribute('src', 'https://appsp.ca/images/monclassroom.png');
    await expect(card).toContainText('Ajouter les élèves du groupe');
    await expect(card).toContainText('Retirer les élèves hors groupe');
    await expect(card).toContainText('Synchroniser à tous les jours');
    await expect(card).toContainText('Synchroniser maintenant');
    await expect(card.locator('a[href="' + FILE + '"]')).toHaveCount(1);
  });

  for (const query of ['procédurier mon classroom', 'guide mon classroom', 'procédure AppSP Classroom']) {
    test('La recherche « ' + query + ' » ouvre directement le procédurier', async ({ page }) => {
      await openPortal(page);
      await page.locator('#guide-search').fill(query);
      const first = page.locator('#search-suggestions .suggestion').first();
      await expect(first).toBeVisible();
      await expect(first).toHaveAttribute('data-direct-file-suggestion', 'mon-classroom-procedure');
      await expect(first).toHaveAttribute('href', FILE);
      await expect(first).toContainText('Accéder au fichier');
    });
  }

  for (const query of ['mon classroom', 'synchro classroom', 'changer de groupe classroom']) {
    test('La recherche « ' + query + ' » trouve la rubrique sans forcer le fichier', async ({ page }) => {
      await openPortal(page);
      await page.locator('#guide-search').fill(query);
      const card = page.locator('#search-suggestions .suggestion[data-search-open="mon-classroom-appsp"]');
      await expect(card).toBeVisible();
      const first = page.locator('#search-suggestions .suggestion').first();
      await expect(first).not.toHaveAttribute('data-direct-file-suggestion', 'mon-classroom-procedure');
    });
  }

  test('Une recherche générale sur Classroom ne force pas un fichier', async ({ page }) => {
    await openPortal(page);
    await page.locator('#guide-search').fill('classroom');
    await expect(page.locator('#search-suggestions [data-direct-file-suggestion="mon-classroom-procedure"]')).toHaveCount(0);
  });
})();
