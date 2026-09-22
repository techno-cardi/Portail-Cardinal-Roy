const { test, expect } = require('@playwright/test');

test('Agenda conserve la clé locale lors d’une panne transitoire de l’API', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('cr-planner-access-v1', 'cle-test-locale');
  });
  await page.route('**/functions/v1/planner-api**', route => route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Service temporairement indisponible' })
  }));

  await page.goto('/agendakevin/');

  await expect(page.locator('#appShell')).toBeVisible();
  await expect(page.locator('.error-card')).toContainText('Impossible de charger la planification');
  await expect(page.locator('#accessDialog')).toHaveJSProperty('open', false);
  expect(await page.evaluate(() => localStorage.getItem('cr-planner-access-v1'))).toBe('cle-test-locale');
});

test('le pré-cache PWA contient tous les scripts chargés par Agenda', async ({ request }) => {
  const indexResponse = await request.get('/agendakevin/index.html');
  const swResponse = await request.get('/agendakevin/sw.js');
  expect(indexResponse.ok()).toBeTruthy();
  expect(swResponse.ok()).toBeTruthy();

  const index = await indexResponse.text();
  const sw = await swResponse.text();
  const scripts = [...index.matchAll(/<script src="([^"]+)"/g)].map(match => match[1]);

  expect(scripts.length).toBeGreaterThan(10);
  for (const src of scripts) {
    expect(sw, `Script absent du pré-cache: ${src}`).toContain(`'./${src}'`);
  }
});

test('une ancienne réponse de sauvegarde ne peut pas effacer un brouillon plus récent', async ({ request }) => {
  const response = await request.get('/agendakevin/app.js?v=20260922-1');
  expect(response.ok()).toBeTruthy();
  const source = await response.text();

  const saveStart = source.indexOf('  async function saveNote(');
  const saveEnd = source.indexOf('\n  function updateHistoryButtons', saveStart);
  const retryStart = source.indexOf('  async function retryDrafts()');
  const retryEnd = source.indexOf('\n  function shift', retryStart);
  const saveNote = source.slice(saveStart, saveEnd);
  const retryDrafts = source.slice(retryStart, retryEnd);

  expect(source).toContain('function clearDraftIfCurrent(id, body)');
  expect(saveNote).toContain('clearDraftIfCurrent(id, body)');
  expect(saveNote).not.toContain('localStorage.removeItem(`${DRAFT_PREFIX}${id}`)');
  expect(retryDrafts).toContain('clearDraftIfCurrent(id, body)');
});
