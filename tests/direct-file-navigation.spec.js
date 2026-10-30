const { test, expect } = require('@playwright/test');

const RESERVATION_FILE = 'https://drive.google.com/file/d/1Ea0rcbyqvFjmXzc_yuNREdgk8Pq4LEQW/view?usp=drivesdk';
const MFA_FILE = 'https://drive.google.com/file/d/1G4QFoa_jyItVPd1OTZkCGGabk9h2gIa6/view?usp=drivesdk';
const REFERENCE_FILE = 'https://docs.google.com/document/d/1-T7WkQseiRqyScmFJiSiv8tcfQ83Ln054-xJBzoME30/edit?usp=sharing';
const PARENTS_MEETING_FOLDER = 'https://drive.google.com/drive/folders/12H3rEFMgOWAfFQaaiJcAXK2egsyHvQZD';
const OCTOBER_PED_DAY_FILE = 'https://drive.google.com/file/d/1zyMK5pY5kGBVr1qbrBGyNWrJRpuTGHDs/view?usp=drivesdk';
const ETUDE_DEPART_FILE = 'https://docs.google.com/spreadsheets/d/1WkRtBb3EIMnHIO8_XYen7lrQzPeEK20Q/edit?usp=drivesdk&ouid=109187652422234365096&rtpof=true&sd=true';

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
  await expect(first).toHaveAttribute('data-direct-file-suggestion', 'reference-direction-appsp');
  await expect(first).toHaveAttribute('href', REFERENCE_FILE);
  await expect(first).toContainText('Accéder au fichier');
});

test('la fiche Référence à la direction contient le lien direct vers le procédurier', async ({ page }) => {
  await openPortal(page);
  const link = page.locator('#reference-direction a').filter({ hasText: 'Accéder au fichier' });
  await expect(link).toHaveCount(1);
  await expect(link).toHaveAttribute('href', REFERENCE_FILE);
  await expect(link).toHaveAttribute('target', '_blank');
});

test('la fiche Étude surveillée contient la liste des élèves non autorisés à quitter', async ({ page }) => {
  await openPortal(page);
  const section = page.locator('#section-organisation');
  const card = section.locator('#etude-surveillee');
  await expect(card).toHaveCount(1);
  const link = card.locator('a').filter({ hasText: "Consulter la liste des élèves qui n'ont pas l'autorisation de quitter" });
  await expect(link).toHaveCount(1);
  await expect(link).toHaveAttribute('href', ETUDE_DEPART_FILE);
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveClass(/\bbtn\b/);
});

for (const query of ['étude', 'etude', 'autorisation', 'autorisation de quitter', 'refus de départ', 'liste 15h30', 'départ étude surveillée']) {
  test(`la recherche précise « ${query} » ouvre directement la liste SAÉ`, async ({ page }) => {
    await openPortal(page);
    const first = await search(page, query);
    await expect(first).toBeVisible();
    await expect(first).toHaveAttribute('data-direct-file-suggestion', 'etude-surveillee-depart-2026-2027');
    await expect(first).toHaveAttribute('href', ETUDE_DEPART_FILE);
    await expect(first).toContainText('Élèves devant demeurer à l’école jusqu’à 15 h 30 (SAÉ)');
    await expect(first).toContainText('Accéder au fichier');
  });
}

for (const query of ['récupération', 'SAÉ']) {
  test(`la recherche générale « ${query} » ne force pas la liste des départs SAÉ`, async ({ page }) => {
    await openPortal(page);
    const first = await search(page, query);
    await expect(first).toBeVisible();
    await expect(first).not.toHaveAttribute('data-direct-file-suggestion', 'etude-surveillee-depart-2026-2027');
  });
}

test('la Nouveauté Étude surveillée ouvre directement le tableur mis à jour', async ({ page }) => {
  await openPortal(page);
  const update = page.locator('#portal-updates [data-update-id="etude-surveillee-depart-2026-10-06"]');
  await expect(update).toHaveCount(1);
  await expect(update).toHaveAttribute('href', ETUDE_DEPART_FILE);
  await expect(update).toHaveAttribute('target', '_blank');
  await expect(update.locator('.portal-update-action')).toHaveText('Accéder au fichier');
});

test('la fiche Référence à la direction est classée dans Suivre un élève', async ({ page }) => {
  await openPortal(page);
  const section = page.locator('#section-suivi');
  await expect(section.locator('#reference-direction')).toHaveCount(1);
  await expect(section.locator('#reference-direction')).toContainText('Référence à la direction');
});

for (const query of ['ortho', 'orthopédagogue', 'orthopédagogie', 'psychoéducation', 'orientation']) {
  test(`la recherche générale « ${query} » trouve la fiche Référence à la direction`, async ({ page }) => {
    await openPortal(page);
    await search(page, query);
    const result = page.locator('#search-suggestions .suggestion[data-search-open="reference-direction"]');
    await expect(result).toBeVisible();
  });
}

for (const query of ['demande ortho', 'demande orthopédagogue', 'demande psychoéducation', 'demande orientation']) {
  test(`la recherche précise « ${query} » ouvre directement le nouveau procédurier`, async ({ page }) => {
    await openPortal(page);
    const first = await search(page, query);
    await expect(first).toBeVisible();
    await expect(first).toHaveAttribute('data-direct-file-suggestion', 'reference-direction-appsp');
    await expect(first).toHaveAttribute('href', REFERENCE_FILE);
  });
}

for (const query of ['rencontre', 'rencontre de parents']) {
  test(`la recherche « ${query} » ouvre directement le dossier de la rencontre de parents`, async ({ page }) => {
    await page.addInitScript(() => {
      Date.now = () => new Date('2026-09-25T10:00:00-04:00').getTime();
    });
    await openPortal(page);
    const input = page.locator('#guide-search');
    await input.fill(query);
    const result = page.locator(`#search-suggestions a[href="${PARENTS_MEETING_FOLDER}"]`).first();
    await expect(result).toBeVisible();
    await expect(result).toContainText('Rencontre de parents');
    await expect(result).toContainText('Accéder au fichier');
  });
}

test('la recherche rencontre de parents n’injecte plus le dossier après le 29 septembre', async ({ page }) => {
  await page.addInitScript(() => {
    Date.now = () => new Date('2026-09-30T00:00:01-04:00').getTime();
  });
  await openPortal(page);
  await search(page, 'rencontre de parents');
  await expect(page.locator(`#search-suggestions a[href="${PARENTS_MEETING_FOLDER}"]`)).toHaveCount(0);
});

for (const query of ['pédago', 'pedago', 'péda', 'peda', 'pédagogique', 'pédagogie', 'journée pédagogique', 'journée péda', 'horaire pédago', 'pédagogique 5 octobre']) {
  test(`la recherche « ${query} » ouvre directement l’horaire de la pédagogique du 5 octobre`, async ({ page }) => {
    await page.addInitScript(() => {
      Date.now = () => new Date('2026-10-02T10:00:00-04:00').getTime();
    });
    await openPortal(page);
    const first = await search(page, query);
    await expect(first).toBeVisible();
    await expect(first).toHaveAttribute('data-direct-file-suggestion', 'pedagogique-2026-10-05');
    await expect(first).toHaveAttribute('href', OCTOBER_PED_DAY_FILE);
    await expect(first).toContainText('Horaire de la journée pédagogique - 5 octobre 2026');
    await expect(first).toContainText('Accéder au fichier');
  });
}

test('l’horaire de la pédagogique du 5 octobre disparaît de la recherche après cette journée', async ({ page }) => {
  await page.addInitScript(() => {
    Date.now = () => new Date('2026-10-06T00:00:01-04:00').getTime();
  });
  await openPortal(page);
  await search(page, 'pédago');
  await expect(page.locator(`#search-suggestions a[href="${OCTOBER_PED_DAY_FILE}"]`)).toHaveCount(0);
});

test('une recherche générique horaire ne force pas l’horaire de la pédagogique', async ({ page }) => {
  await page.addInitScript(() => {
    Date.now = () => new Date('2026-10-02T10:00:00-04:00').getTime();
  });
  await openPortal(page);
  const first = await search(page, 'horaire');
  await expect(first).toBeVisible();
  await expect(first).not.toHaveAttribute('data-direct-file-suggestion', 'pedagogique-2026-10-05');
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

test('les convocations SAÉ AM et PM sont distinguées sans modifier la réservation de local', async ({ page }) => {
  await openPortal(page);
  const procedure = page.locator('#reservation');
  const notice = procedure.locator('[data-sae-convocations-am-pm]');
  await expect(notice).toHaveCount(1);
  await expect(notice).toContainText('Récupérations et mises à jour SAÉ (AM)');
  await expect(notice).toContainText('Récupérations et mises à jour SAÉ (PM)');
  await expect(notice).toContainText('avant les cours');
  await expect(notice).toContainText('heure du dîner');
  await expect(notice).toContainText('La réservation des locaux ne change pas');
  await expect(notice).toContainText('consigner leurs présences');
  await expect(procedure.locator('a[href="' + RESERVATION_FILE + '"]')).toHaveCount(1);
});

for (const query of ['convocation SAÉ matin', 'récupération matin', 'SAÉ AM']) {
  test('la recherche précise « ' + query + ' » ouvre directement la procédure', async ({ page }) => {
    await openPortal(page);
    const first = await search(page, query);
    await expect(first).toHaveAttribute('data-direct-file-suggestion', 'reservation-procedure');
    await expect(first).toHaveAttribute('href', RESERVATION_FILE);
  });
}

test('la recherche générale convocation conserve la fiche sans imposer le fichier', async ({ page }) => {
  await openPortal(page);
  const first = await search(page, 'convocation');
  await expect(first).toBeVisible();
  await expect(first).not.toHaveAttribute('data-direct-file-suggestion', 'reservation-procedure');
});

test('la nouveauté SAÉ annonce la procédure actualisée et ouvre directement le fichier', async ({ page }) => {
  await openPortal(page);
  const update = page.locator('#portal-updates [data-update-id="reservation-recuperation-2026-09-21"]');
  await expect(update).toContainText('Convocations SAÉ le matin');
  await expect(update).toContainText('La réservation du local ne change pas');
  await expect(update).toHaveAttribute('href', RESERVATION_FILE);
  await expect(update.locator('.portal-update-action')).toHaveText('Accéder au fichier');
});

for (const query of ['référence à la direction', 'reference direction', 'procédurier référence', 'procédure mes suivis', 'référer un élève', 'demande ortho']) {
  test('La référence AppSP ouvre directement le procédurier pour « ' + query + ' »', async ({ page }) => {
    await openPortal(page);
    const first = await search(page, query);
    await expect(first).toHaveAttribute('data-direct-file-suggestion', 'reference-direction-appsp');
    await expect(first).toHaveAttribute('href', REFERENCE_FILE);
    await expect(first).toContainText('Accéder au fichier');
  });
}

for (const query of ['référence', 'direction', 'orthopédagogue', 'services complémentaires']) {
  test('La requête générale « ' + query + ' » ne force pas le document', async ({ page }) => {
    await openPortal(page);
    await search(page, query);
    await expect(page.locator('#search-suggestions [data-direct-file-suggestion="reference-direction-appsp"]')).toHaveCount(0);
  });
}

test('La nouvelle rubrique remplace entièrement l’ancienne demande papier', async ({ page }) => {
  await openPortal(page);
  const suivi = page.locator('#section-suivi');
  const card = suivi.locator('#reference-direction');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('Référence à la direction');
  await expect(card).toContainText('Mes suivis');
  await expect(card).toContainText('Envoyer');
  await expect(card.locator('a[href="' + REFERENCE_FILE + '"]')).toHaveCount(1);
  await expect(page.locator('#aide-eleve-services-appui')).toHaveCount(0);
  await expect(page.locator('a[href="https://drive.google.com/file/d/17R4NSbb1JJInv61vJobHIZvBvNOPOH0H/view?usp=drive_link"]')).toHaveCount(0);
});

test('La nouvelle carte Nouveautés pointe directement au procédurier AppSP', async ({ page }) => {
  await openPortal(page);
  const update = page.locator('#portal-updates [data-update-id="reference-direction-appsp-2026-10-30"]');
  await expect(update).toHaveCount(1);
  await expect(update).toHaveAttribute('href', REFERENCE_FILE);
  await expect(update).toHaveAttribute('target', '_blank');
  await expect(update.locator('.portal-update-action')).toHaveText('Accéder au fichier');
});
