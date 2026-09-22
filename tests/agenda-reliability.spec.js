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
  const response = await request.get('/agendakevin/app.js?v=20260922-2');
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


test('les sauvegardes d’une même case sont envoyées au serveur dans l’ordre', async ({ page }) => {
  let inFlight = 0;
  let maxInFlight = 0;
  const bodies = [];

  await page.addInitScript(() => {
    localStorage.setItem('cr-planner-access-v1', 'cle-test-locale');
  });

  await page.route('**/functions/v1/planner-api**', async route => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === 'POST') {
      const payload = request.postDataJSON();
      if (payload?.action === 'save_note') {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        bodies.push(payload.body);
        await new Promise(resolve => setTimeout(resolve, payload.body === 'premier' ? 180 : 20));
        inFlight -= 1;
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        return;
      }
    }

    if (url.searchParams.get('action') === 'ping') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ calendar: [], notes: [] })
    });
  });

  await page.goto('/agendakevin/');
  await expect(page.locator('#appShell')).toBeVisible();

  await page.evaluate(async () => {
    const first = window.CardinalAgendaPersistence.saveNote('2026-09-22', 'p1', 'premier');
    const second = window.CardinalAgendaPersistence.saveNote('2026-09-22', 'p1', 'deuxième');
    await Promise.all([first, second]);
  });

  expect(bodies).toEqual(['premier', 'deuxième']);
  expect(maxInFlight).toBe(1);
  expect(await page.evaluate(() => localStorage.getItem('cr-planner-draft:2026-09-22:p1'))).toBeNull();
});

test('les outils de cours utilisent la même file de sauvegarde que l’éditeur', async ({ request }) => {
  const response = await request.get('/agendakevin/planner-tools.js?v=20260922-1');
  expect(response.ok()).toBeTruthy();
  const source = await response.text();
  expect(source).toContain('window.CardinalAgendaPersistence?.saveNote');
});

test('le service worker ne renvoie index.html que pour une navigation', async ({ request }) => {
  const response = await request.get('/agendakevin/sw.js');
  expect(response.ok()).toBeTruthy();
  const source = await response.text();
  expect(source).toContain("if(e.request.mode==='navigate') return caches.match('./index.html')");
  expect(source).toContain('return Response.error()');
});
