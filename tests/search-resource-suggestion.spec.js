const { test, expect } = require('@playwright/test');

test.describe('Suggestion d’ajout après recherches infructueuses', () => {
  test('apparaît après trois recherches distinctes et réutilise les destinataires des technopédagogues', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.PORTAL_RESOURCE_SUGGESTION === '1.0');

    const input = page.locator('#guide-search');
    const suggestionLink = page.locator('.portal-resource-suggestion');

    const failedSearch = async query => {
      await input.fill(query);
      await expect(page.locator('#search-suggestions .no-suggestion')).toBeVisible();
      await input.press('Enter');
    };

    await failedSearch('zzalpha');
    await expect(suggestionLink).toHaveCount(0);

    // Répéter exactement la même recherche ne doit pas compter comme un nouvel essai.
    await failedSearch('zzalpha');
    await expect(suggestionLink).toHaveCount(0);

    await failedSearch('zzbeta');
    await expect(suggestionLink).toHaveCount(0);

    await failedSearch('zzgamma');
    await expect(suggestionLink).toBeVisible();
    await expect(suggestionLink).toHaveText('Suggérer un ajout au portail');

    const contactHref = await page.locator('.techno-contact').getAttribute('href');
    const suggestionHref = await suggestionLink.getAttribute('href');
    expect(contactHref).toBeTruthy();
    expect(suggestionHref).toBeTruthy();

    const [contactRecipients] = contactHref.split('?');
    const [suggestionRecipients, suggestionQuery = ''] = suggestionHref.split('?');
    expect(suggestionRecipients).toBe(contactRecipients);

    const params = new URLSearchParams(suggestionQuery);
    expect(params.get('subject')).toBe('Suggestion d’ajout d’une ressource sur le Portail Cardinal-Roy');
  });

  test('les easter eggs ne sont jamais comptés comme des recherches ratées', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.PORTAL_RESOURCE_SUGGESTION === '1.0' && window.PORTAL_EXTRA_EGGS === '1.0');

    const input = page.locator('#guide-search');
    const suggestionLink = page.locator('.portal-resource-suggestion');

    await input.fill('café');
    await expect(page.locator('#search-suggestions .search-extra-egg')).toBeVisible();
    await input.press('Enter');

    for (const query of ['zzdelta', 'zzepsilon']) {
      await input.fill(query);
      await expect(page.locator('#search-suggestions .no-suggestion')).toBeVisible();
      await input.press('Enter');
    }

    await expect(suggestionLink).toHaveCount(0);
  });
});
