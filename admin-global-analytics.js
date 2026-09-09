(() => {
  'use strict';

  const frame = document.getElementById('portal-health-frame');
  const host = document.getElementById('admin-status');
  if (!frame || !host) return;

  const escapeHtml = value => String(value ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  const resourceLabel = (id, registry) => registry?.get(id)?.title || id;
  const resourceLink = (id, registry) =>
    `<a class="resource-link" href="./#${encodeURIComponent(id)}">${escapeHtml(resourceLabel(id, registry))}</a>`;

  const table = (rows, columns, emptyText) => {
    if (!rows?.length) return `<p class="muted">${escapeHtml(emptyText)}</p>`;
    return `<table><thead><tr>${columns.map(column => `<th>${escapeHtml(column.label)}</th>`).join('')}</tr></thead><tbody>${rows.slice(0,20).map(row => `<tr>${columns.map(column => `<td${column.numeric ? ' class="num"' : ''}>${column.render(row)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  };

  const formatDateTime = value => {
    if (!value) return 'Aucune activité enregistrée pour le moment';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('fr-CA', { dateStyle: 'medium', timeStyle: 'short' });
  };

  let loading = false;
  let lastRequestAt = 0;

  const mount = async (force = false) => {
    if (loading) return;
    const existing = host.querySelector('#global-analytics');
    if (existing && !force) return;

    const win = frame.contentWindow;
    const analytics = win?.PORTAL_ANALYTICS;
    const registry = win?.PORTAL_REGISTRY;
    if (!analytics?.remoteSnapshot || !registry) return;
    if (!host.querySelector('.section')) return;

    loading = true;
    lastRequestAt = Date.now();

    const section = existing || document.createElement('section');
    section.className = 'section';
    section.id = 'global-analytics';
    section.innerHTML = '<h2>Consultation du portail</h2><p class="muted">Chargement des statistiques globales anonymes…</p>';

    if (!existing) {
      const firstSection = host.querySelector('.section');
      if (firstSection) host.insertBefore(section, firstSection);
      else host.prepend(section);
    }

    try {
      const summary = await analytics.remoteSnapshot(30);
      const totals = summary?.totals || {};
      const periods = summary?.periods || {};
      const topOpens = Array.isArray(summary?.topOpens) ? summary.topOpens : [];

      section.innerHTML = `
        <h2>Consultation du portail</h2>
        <p class="muted">Une « visite » est comptée au maximum une fois par navigateur toutes les 30 minutes. Aucun compte utilisateur, adresse IP ou identifiant de personne n’est enregistré. Dernière activité : ${escapeHtml(formatDateTime(summary?.lastEventAt))}.</p>

        <div class="summary" style="margin-top:12px">
          <div class="metric"><strong>${escapeHtml(periods.visitsToday || 0)}</strong><span>visites aujourd’hui</span></div>
          <div class="metric"><strong>${escapeHtml(periods.visits7Days || 0)}</strong><span>visites - 7 jours</span></div>
          <div class="metric"><strong>${escapeHtml(periods.visits30Days || totals.visits || 0)}</strong><span>visites - 30 jours</span></div>
          <div class="metric"><strong>${escapeHtml(periods.opens30Days || totals.opens || 0)}</strong><span>ressources ouvertes - 30 jours</span></div>
        </div>

        <div class="summary" style="margin-top:12px">
          <div class="metric"><strong>${escapeHtml(periods.opensToday || 0)}</strong><span>ouvertures aujourd’hui</span></div>
          <div class="metric"><strong>${escapeHtml(periods.opens7Days || 0)}</strong><span>ouvertures - 7 jours</span></div>
          <div class="metric"><strong>${escapeHtml(periods.searches30Days || totals.searches || 0)}</strong><span>recherches - 30 jours</span></div>
          <div class="metric"><strong>${escapeHtml(totals.noResults || 0)}</strong><span>recherches sans résultat - 30 jours</span></div>
        </div>

        <div style="margin-top:18px">
          <strong>Ressources les plus consultées - 30 jours</strong>
          ${table(topOpens,[
            {label:'Ressource',render:row=>resourceLink(row.resourceId, registry)},
            {label:'Ouvertures',numeric:true,render:row=>escapeHtml(row.count)}
          ],'Aucune ouverture globale enregistrée pour le moment.')}
        </div>

        <p class="note">Les textes recherchés ne sont pas affichés ici parce que cette page admin est cachée et non indexée, mais elle n’est pas protégée par une authentification. Les statistiques globales exposées ici restent donc agrégées.</p>`;
    } catch (error) {
      const message = String(error?.message || '');
      const is404 = /\(404\)/.test(message);
      section.innerHTML = `
        <h2>Consultation du portail</h2>
        <p class="warn">${is404 ? 'La fonction Supabase n’est pas encore déployée.' : 'Les statistiques Supabase sont temporairement indisponibles.'}</p>
        <p class="muted">${escapeHtml(message)}</p>
        <button type="button" class="btn" id="retry-global-analytics" style="background:#7f1427;border-color:#7f1427">Réessayer</button>`;
      section.querySelector('#retry-global-analytics')?.addEventListener('click', () => mount(true), { once: true });
    } finally {
      loading = false;
    }
  };

  const scheduleMount = () => window.setTimeout(mount, 100);
  const observer = new MutationObserver(() => {
    if (Date.now() - lastRequestAt < 1000 && !host.querySelector('#global-analytics')) return;
    scheduleMount();
  });
  observer.observe(host, { childList:true });

  frame.addEventListener('load', () => {
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      mount();
      if (host.querySelector('#global-analytics') || attempts > 160) window.clearInterval(timer);
    }, 125);
  });

  scheduleMount();
})();
