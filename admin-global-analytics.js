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
    return `<table><thead><tr>${columns.map(column => `<th>${escapeHtml(column.label)}</th>`).join('')}</tr></thead><tbody>${rows.slice(0,15).map(row => `<tr>${columns.map(column => `<td${column.numeric ? ' class="num"' : ''}>${column.render(row)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  };

  let loading = false;
  let lastRequestAt = 0;

  const mount = async () => {
    if (loading || host.querySelector('#global-analytics')) return;
    const win = frame.contentWindow;
    const analytics = win?.PORTAL_ANALYTICS;
    const registry = win?.PORTAL_REGISTRY;
    if (!analytics?.remoteSnapshot || !registry) return;
    if (!host.querySelector('.section')) return;

    loading = true;
    lastRequestAt = Date.now();

    const section = document.createElement('section');
    section.className = 'section';
    section.id = 'global-analytics';
    section.innerHTML = '<h2>Statistiques globales d’utilisation</h2><p class="muted">Chargement des données anonymes de Supabase…</p>';

    const footer = [...host.children].find(node => node.matches?.('p.muted'));
    if (footer) host.insertBefore(section, footer);
    else host.appendChild(section);

    try {
      const summary = await analytics.remoteSnapshot(30);
      const totals = summary?.totals || {};
      const topSearches = Array.isArray(summary?.topSearches) ? summary.topSearches : [];
      const noResults = Array.isArray(summary?.noResults) ? summary.noResults : [];
      const topOpens = Array.isArray(summary?.topOpens) ? summary.topOpens : [];

      section.innerHTML = `
        <h2>Statistiques globales d’utilisation</h2>
        <p class="muted">Agrégées sur les ${escapeHtml(summary?.days || 30)} derniers jours à partir des navigateurs qui utilisent le portail. Aucun compte, adresse courriel, adresse IP ni identifiant de personne n’est enregistré par le portail.</p>
        <div class="summary" style="margin-top:12px">
          <div class="metric"><strong>${escapeHtml(totals.searches || 0)}</strong><span>recherches</span></div>
          <div class="metric"><strong>${escapeHtml(totals.noResults || 0)}</strong><span>recherches sans résultat</span></div>
          <div class="metric"><strong>${escapeHtml(totals.opens || 0)}</strong><span>ouvertures de ressources</span></div>
          <div class="metric"><strong>${escapeHtml(totals.resourcesOpened || 0)}</strong><span>ressources distinctes ouvertes</span></div>
        </div>
        <div class="grid" style="margin-top:18px">
          <div><strong>Recherches les plus fréquentes</strong>${table(topSearches,[
            {label:'Recherche',render:row=>escapeHtml(row.query)},
            {label:'Nombre',numeric:true,render:row=>escapeHtml(row.count)},
            {label:'Résultats',numeric:true,render:row=>escapeHtml(row.lastResultCount ?? '—')}
          ],'Aucune recherche globale enregistrée pour le moment.')}</div>
          <div><strong>Recherches sans résultat</strong>${table(noResults,[
            {label:'Recherche',render:row=>escapeHtml(row.query)},
            {label:'Nombre',numeric:true,render:row=>escapeHtml(row.count)}
          ],'Aucune recherche globale sans résultat pour le moment.')}</div>
        </div>
        <div style="margin-top:18px"><strong>Ressources les plus ouvertes</strong>${table(topOpens,[
          {label:'Ressource',render:row=>resourceLink(row.resourceId, registry)},
          {label:'Ouvertures',numeric:true,render:row=>escapeHtml(row.count)}
        ],'Aucune ouverture globale enregistrée pour le moment.')}</div>`;
    } catch (error) {
      section.innerHTML = `
        <h2>Statistiques globales d’utilisation</h2>
        <p class="warn">Les statistiques Supabase ne sont pas encore disponibles.</p>
        <p class="muted">Le portail continue de fonctionner normalement et les statistiques locales restent actives. ${escapeHtml(error?.message || '')}</p>`;
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
