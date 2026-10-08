const { test, expect } = require('@playwright/test');

test.use({ serviceWorkers: 'block' });

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
  expect(source).toContain('function enqueueNoteSave(id, body)');
  expect(saveNote).toContain('await enqueueNoteSave(id, body)');
  expect(saveNote).not.toContain('localStorage.removeItem(`${DRAFT_PREFIX}${id}`)');
  expect(retryDrafts).toContain('await enqueueNoteSave(id, body)');
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


test('les raccourcis d’édition restaurés fonctionnent sans barre de texte riche', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('cr-planner-access-v1', 'cle-test-locale');
  });

  await page.route('**/functions/v1/planner-api**', async route => {
    const url = new URL(route.request().url());
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

  await page.evaluate(() => {
    const fixture = document.createElement('div');
    fixture.id = 'agenda-editor-fixture';
    fixture.innerHTML = [
      '<div class="block-editor">',
      '<div class="editor-block plain-block" data-kind="plain"><div class="block-text" contenteditable="true">Premier bloc</div></div>',
      '<div class="editor-block plain-block" data-kind="plain"><div class="block-text" contenteditable="true">Deuxième bloc</div></div>',
      '<div class="editor-block plain-block" data-kind="plain"><div class="block-text" contenteditable="true"></div></div>',
      '</div>'
    ].join('');
    document.body.appendChild(fixture);
  });

  const blocks = page.locator('#agenda-editor-fixture .block-text');
  const first = blocks.nth(0);
  const third = blocks.nth(2);

  await first.focus();
  await page.evaluate(() => {
    const textEl = document.querySelector('#agenda-editor-fixture .block-text');
    const range = document.createRange();
    range.selectNodeContents(textEl);
    range.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await page.keyboard.press('Control+A');
  expect(await page.locator('#agenda-editor-fixture .block-editor').getAttribute('data-full-selection')).toBe('1');

  await page.keyboard.press('Control+I');
  await expect.poll(() => first.evaluate(el => el.innerHTML)).toContain('<em');
  await expect.poll(() => blocks.nth(1).evaluate(el => el.innerHTML)).toContain('<em');
  expect(await first.evaluate(el => el.textContent.includes('\u2062'))).toBeTruthy();
  expect(await blocks.nth(1).evaluate(el => el.textContent.includes('\u2062'))).toBeTruthy();

  await third.click();
  await page.keyboard.type('"Le Passeur"');
  expect(await third.evaluate(el => el.textContent)).toBe('« Le Passeur »');

  await third.evaluate(el => { el.textContent = 'Texte'; });
  await third.focus();
  await page.evaluate(() => {
    const textEl = document.querySelectorAll('#agenda-editor-fixture .block-text')[2];
    const range = document.createRange();
    range.selectNodeContents(textEl);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await page.keyboard.type('"');
  expect(await third.evaluate(el => el.textContent)).toBe('« Texte »');

  await expect(page.locator('#agendaRichTextToolbar')).toHaveCount(0);
});


test('un lien de planification reste ouvrable dans Agenda et le glisser-surligner traverse plusieurs points', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('cr-planner-access-v1', 'cle-test-locale');
  });

  await page.route('**/functions/v1/planner-api**', async route => {
    const url = new URL(route.request().url());
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

  await page.evaluate(() => {
    const fixture = document.createElement('div');
    fixture.id = 'agenda-link-selection-fixture';
    fixture.style.width = '520px';
    fixture.innerHTML = [
      '<div class="block-editor">',
      '<div class="editor-block plain-block" data-kind="plain"><div class="block-text" contenteditable="true">ALPHA premier point</div></div>',
      '<div class="editor-block plain-block" data-kind="plain"><div class="block-text" contenteditable="true">OMEGA « Document test » | https://example.com/document</div></div>',
      '</div>'
    ].join('');
    document.body.appendChild(fixture);
  });

  const link = page.locator('#agenda-link-selection-fixture .agenda-inline-link');
  await expect(link).toHaveAttribute('href', 'https://example.com/document');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveText('« Document test »');
  await expect(page.locator('#agenda-link-selection-fixture .agenda-link-source')).toBeHidden();

  const first = page.locator('#agenda-link-selection-fixture .block-text').nth(0);
  const second = page.locator('#agenda-link-selection-fixture .block-text').nth(1);
  const firstBox = await first.boundingBox();
  const secondBox = await second.boundingBox();
  expect(firstBox).toBeTruthy();
  expect(secondBox).toBeTruthy();

  await page.mouse.move(secondBox.x + Math.max(8, secondBox.width - 45), secondBox.y + secondBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(firstBox.x + 5, firstBox.y + firstBox.height / 2, { steps: 12 });

  const selectedWhileDragging = await page.evaluate(() => window.getSelection()?.toString() || '');
  expect(selectedWhileDragging).toContain('ALPHA');
  expect(selectedWhileDragging).toContain('OMEGA');

  await page.mouse.up();
  const selectedAfterRelease = await page.evaluate(() => window.getSelection()?.toString() || '');
  expect(selectedAfterRelease).toContain('ALPHA');
  expect(selectedAfterRelease).toContain('OMEGA');
});

test('Mode Tableau et publication Classroom masquent les URL de la planification', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('cr-planner-access-v1', 'cle-test-locale');
  });

  await page.route('**/functions/v1/planner-api**', async route => {
    const url = new URL(route.request().url());
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

  await page.evaluate(() => {
    const fixture = document.createElement('div');
    fixture.id = 'agenda-classroom-url-fixture';
    fixture.dataset.noteCell = '2026-10-08:p1';
    fixture.innerHTML = [
      '<div class="course-strip" data-course-group="FRA5SE-51"><span class="course-strip-name">FRA5SE-51</span></div>',
      '<div class="block-editor">',
      '<div class="editor-block numbered-block" data-kind="numbered"><span class="number-badge">1.</span><div class="block-text" contenteditable="true">Atelier atmosphère - sections 1 à 4 | https://example.com/document</div></div>',
      '</div>'
    ].join('');
    document.body.appendChild(fixture);
  });

  await page.locator('#agenda-classroom-url-fixture .course-strip-name').dispatchEvent('dblclick');
  await expect(page.locator('#classroomBoard')).toBeVisible();
  await expect(page.locator('#classroomBoard .cr-board-plan')).toContainText('Atelier atmosphère - sections 1 à 4');
  await expect(page.locator('#classroomBoard .cr-board-plan')).not.toContainText('https://example.com/document');

  await page.locator('#classroomBoard .cr-board-close').click();
  await page.locator('#agenda-classroom-url-fixture .course-strip-name').dispatchEvent('click');
  await expect(page.locator('#classroomPublishDialog')).toHaveJSProperty('open', true);
  await expect(page.locator('#crpPreview')).toContainText('Atelier atmosphère - sections 1 à 4');
  await expect(page.locator('#crpPreview')).not.toContainText('https://example.com/document');
});

 
test('un rappel peut sortir de la liste sans perdre son contenu et les points vides se corrigent', async ({ page }) => {
  const saves = [];
  await page.addInitScript(() => localStorage.setItem('cr-planner-access-v1', 'cle-test-locale'));
  await page.route('**/functions/v1/planner-api**', async route => {
    const request = route.request();
    if (request.method() === 'POST') {
      const data = request.postDataJSON();
      if (data?.action === 'save_note') saves.push(data.body);
    }
    await route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ calendar: [], notes: [] }) });
  });
  await page.goto('/agendakevin/');
  await expect(page.locator('#appShell')).toBeVisible();
  const editor = page.locator('.block-editor').first();
  await editor.evaluate(el => {
    el.innerHTML = [
      '<div class="editor-block numbered-block" data-kind="numbered"><span class="number-badge"></span><div class="block-text" contenteditable="true">Activité du cours</div></div>',
      '<div class="editor-block numbered-block" data-kind="numbered"><span class="number-badge"></span><div class="block-text" contenteditable="true">Rappel : évaluation mardi</div></div>',
      '<div class="editor-block numbered-block" data-kind="numbered"><span class="number-badge"></span><div class="block-text" contenteditable="true"></div></div>',
    ].join('');
  });

  const reminder = editor.locator('.editor-block').nth(1);
  const reminderText = reminder.locator('.block-text');
  await reminderText.focus();
  await reminderText.evaluate(el => {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(true);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
  });
  await page.keyboard.press('Backspace');
  await expect(reminder).toHaveAttribute('data-kind', 'plain');
  await expect(reminderText).toHaveText('Rappel : évaluation mardi');
  await expect(editor.locator('.editor-block').nth(0)).toHaveAttribute('data-kind', 'numbered');

  const empty = editor.locator('.editor-block').nth(2);
  await empty.locator('.block-text').focus();
  await page.keyboard.press('Backspace');
  await expect(empty).toHaveAttribute('data-kind', 'plain');
  await expect(empty.locator('.number-badge')).toHaveCount(0);

  // Une touche Entrée à la fin d'un point poursuit la liste; la deuxième en sort.
  const firstText = editor.locator('.editor-block').nth(0).locator('.block-text');
  await firstText.focus();
  await firstText.evaluate(el => {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
  });
  await page.keyboard.press('Enter');
  await expect(editor.locator('.editor-block').nth(1)).toHaveAttribute('data-kind', 'numbered');
  await page.keyboard.press('Enter');
  await expect(editor.locator('.editor-block').nth(1)).toHaveAttribute('data-kind', 'plain');
  await expect.poll(() => saves.at(-1) || '').toContain('Rappel : évaluation mardi');
  expect(saves.at(-1)).not.toContain('2. Rappel :');
  expect(saves.at(-1)).not.toContain('3. ');
});

test('le retour arrière mobile dénumérote un rappel sans keydown', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('cr-planner-access-v1', 'cle-test-locale'));
  await page.route('**/functions/v1/planner-api**', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ calendar: [], notes: [] }),
  }));
  await page.goto('/agendakevin/');
  const editor = page.locator('.block-editor').first();
  const wasPrevented = await editor.evaluate(el => {
    el.innerHTML = '<div class="editor-block numbered-block" data-kind="numbered"><span class="number-badge"></span><div class="block-text" contenteditable="true">Rappel : notes de lecture</div></div>';
    const textEl = el.querySelector('.block-text');
    textEl.focus();
    const range = document.createRange();
    range.selectNodeContents(textEl);
    range.collapse(true);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    const event = new InputEvent('beforeinput', {
      bubbles: true, cancelable: true, inputType: 'deleteContentBackward'
    });
    textEl.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(wasPrevented).toBe(true);
  await expect(editor.locator('.editor-block')).toHaveAttribute('data-kind', 'plain');
  await expect(editor.locator('.block-text')).toHaveText('Rappel : notes de lecture');
});


async function setupMultiSelectionTest(page) {
  const saved = [];
  await page.addInitScript(() => localStorage.setItem('cr-planner-access-v1', 'cle-test-locale'));
  await page.route('**/functions/v1/planner-api**', route => {
    const data = route.request().method() === 'POST' ? route.request().postDataJSON() : null;
    if (data?.action === 'save_note') saved.push(data.body);
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ calendar: [], notes: [] }) });
  });
  await page.goto('/agendakevin/');
  return { editor: page.locator('.block-editor').first(), saved };
}

async function putMultiSelectionBlocks(editor, values) {
  await editor.evaluate((el, rows) => {
    el.innerHTML = rows.map((value, i) =>
      '<div class="editor-block numbered-block" data-kind="numbered">' +
      '<span class="number-badge">' + (i+1) + '.</span>' +
      '<div class="block-text" contenteditable="true">' + value + '</div></div>'
    ).join('');
  }, values);
}

async function selectMultiBlocks(editor, fromBlock, fromOffset, toBlock, toOffset) {
  await editor.evaluate((el, args) => {
    const blocks = el.querySelectorAll('.block-text');
    blocks[args.fromBlock].focus({ preventScroll: true });
    const range = document.createRange();
    range.setStart(blocks[args.fromBlock].firstChild, args.fromOffset);
    range.setEnd(blocks[args.toBlock].firstChild, args.toOffset);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }, { fromBlock, fromOffset, toBlock, toOffset });
}

test('surligner trois points et taper remplace la selection complete', async ({ page }) => {
  const { editor, saved } = await setupMultiSelectionTest(page);
  await putMultiSelectionBlocks(editor, ['ALPHA premier', 'BETA milieu', 'OMEGA dernier']);
  const first = editor.locator('.block-text').first();
  const last = editor.locator('.block-text').last();
  await first.scrollIntoViewIfNeeded();
  const top = await first.boundingBox();
  const bottom = await last.boundingBox();
  await page.evaluate(() => {
    window.__dragCheck = [];
    for (const type of ['pointerdown','pointermove','mousemove','pointerup']) {
      document.addEventListener(type, event => {
        const target = event.target?.closest?.('.block-text');
        window.__dragCheck.push({ type, pointerId: event.pointerId, pointerType: event.pointerType,
          target: target?.textContent?.slice(0,20) || '', selected: window.getSelection()?.toString() || '',
          active: document.activeElement?.className || '', canceled: event.defaultPrevented });
      });
    }
  });
  await page.mouse.move(bottom.x + bottom.width - 5, bottom.y + bottom.height/2);
  await page.mouse.down();
  await page.mouse.move(top.x + 3, top.y + top.height/2, { steps: 15 });
  const highlighted = await page.evaluate(() => window.getSelection()?.toString() || '');
  console.log('MULTI_DRAG_DEBUG', JSON.stringify(await page.evaluate(() => window.__dragCheck)));
  expect(highlighted).toContain('BETA');
  expect(highlighted).toContain('ALPHA');
  await page.mouse.up();
  await page.keyboard.type('Remplacement');
  await expect(editor.locator('.editor-block')).toHaveCount(1);
  await expect(editor).toContainText('Remplacement');
  await expect(editor).not.toContainText('BETA');
  await expect.poll(() => saved.at(-1) || '').toContain('Remplacement');
});

for (const key of ['Backspace', 'Delete']) {
  test('selection sur trois points supprimee par ' + key, async ({ page }) => {
    const { editor, saved } = await setupMultiSelectionTest(page);
    await putMultiSelectionBlocks(editor, ['Debut SUPPRIMER', 'MILIEU', 'SUPPRIMER fin']);
    await selectMultiBlocks(editor, 0, 6, 2, 9);
    await page.keyboard.press(key);
    await expect(editor.locator('.editor-block')).toHaveCount(1);
    await expect(editor.locator('.block-text')).toHaveText('Debut  fin');
    await expect(editor.locator('.editor-block')).toHaveAttribute('data-kind', 'numbered');
    await expect.poll(() => saved.at(-1) || '').toContain('Debut  fin');
  });
}

test('collage sur trois points conserve le texte hors selection', async ({ page }) => {
  const { editor } = await setupMultiSelectionTest(page);
  await putMultiSelectionBlocks(editor, ['Garder avant retirer', 'MILIEU', 'retirer apres']);
  await selectMultiBlocks(editor, 0, 13, 2, 7);
  const canceled = await editor.evaluate(el => {
    const data = new DataTransfer();
    data.setData('text/plain', 'NOUVEAU');
    const event = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data });
    Object.defineProperty(event, 'clipboardData', { value: { getData: () => 'NOUVEAU' } });
    el.querySelector('.block-text').dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(canceled).toBe(true);
  await expect(editor.locator('.editor-block')).toHaveCount(1);
  await expect(editor.locator('.block-text')).toHaveText('Garder avant NOUVEAU apres');
});

test('suppression mobile beforeinput traverse plusieurs points', async ({ page }) => {
  const { editor } = await setupMultiSelectionTest(page);
  await putMultiSelectionBlocks(editor, ['Premier', 'Second']);
  await selectMultiBlocks(editor, 0, 0, 1, 6);
  const prevented = await editor.evaluate(el => {
    const event = new InputEvent('beforeinput', { bubbles: true, cancelable: true,
      inputType: 'deleteContentBackward' });
    el.querySelector('.block-text').dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(prevented).toBe(true);
  await expect(editor.locator('.editor-block')).toHaveCount(1);
  await expect(editor.locator('.block-text')).toHaveText('');
});
