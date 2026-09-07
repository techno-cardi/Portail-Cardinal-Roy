(() => {
  'use strict';

  const frame = document.getElementById('portal-health-frame');
  const host = document.getElementById('admin-status');
  const refreshButton = document.getElementById('refresh-status');
  const clearButton = document.getElementById('clear-analytics');
  if (!frame || !host) return;

  const escapeHtml = value => String(value ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  const sortedEntries = map => Object.entries(map || {})
    .sort((a,b) => (b[1]?.count || 0) - (a[1]?.count || 0) || String(a[0]).localeCompare(String(b[0]),'fr'));

  const resourceLink = (id, registry) => {
    const resource = registry.get(id);
    const label = resource?.title || id;
    return `<a class="resource-link" href="./#${encodeURIComponent(id)}">${escapeHtml(label)}</a>`;
  };

  const listOrEmpty = (items, renderItem, emptyText = 'Aucun problème détecté.') => {
    if (!items?.length) return `<p class="empty">✓ ${escapeHtml(emptyText)}</p>`;
    return `<ul>${items.map(item => `<li>${renderItem(item)}</li>`).join('')}</ul>`;
  };

  const analyticsTable = (entries, columns) => {
    if (!entries.length) return '<p class="muted">Aucune donnée locale pour le moment.</p>';
    return `<table><thead><tr>${columns.map(col => `<th>${escapeHtml(col.label)}</th>`).join('')}</tr></thead><tbody>${entries.slice(0,15).map(([key,data]) => `<tr>${columns.map(col => `<td${col.numeric ? ' class="num"' : ''}>${col.render ? col.render(key,data) : escapeHtml(data?.[col.key] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  };

  const render = () => {
    const win = frame.contentWindow;
    const registry = win?.PORTAL_REGISTRY;
    const analyticsApi = win?.PORTAL_ANALYTICS;
    if (!registry || !analyticsApi) return false;

    registry.refresh();
    const audit = registry.audit();
    const analytics = analyticsApi.snapshot();
    const topSearches = sortedEntries(analytics.searches);
    const noResults = sortedEntries(analytics.noResults);
    const topOpens = sortedEntries(analytics.opens);
    const freshResources = registry.resources
      .filter(resource => resource.updatedAt)
      .map(resource => ({...resource, ageDays: registry.ageDays(resource.updatedAt)}))
      .sort((a,b) => (b.ageDays ?? -1) - (a.ageDays ?? -1));

    const warningCount = audit.duplicateIds.length + audit.malformedLinks.length + audit.orphaned.length + audit.stale.length;

    host.innerHTML = `
      <div class="summary">
        <div class="metric"><strong>${audit.totalResources}</strong><span>ressources enregistrées</span></div>
        <div class="metric"><strong>${audit.totalCategories}</strong><span>catégories</span></div>
        <div class="metric"><strong>${audit.totalExternalLinks}</strong><span>liens externes structurés</span></div>
        <div class="metric"><strong>${warningCount}</strong><span>éléments à surveiller</span></div>
      </div>

      <section class="section">
        <h2>État du registre</h2>
        <div class="grid">
          <div><strong>Identifiants en double</strong>${listOrEmpty(audit.duplicateIds, id => resourceLink(id, registry))}</div>
          <div><strong>Ressources hors catégorie</strong>${listOrEmpty(audit.orphaned, id => resourceLink(id, registry))}</div>
          <div><strong>Liens mal formés</strong>${listOrEmpty(audit.malformedLinks, item => `${resourceLink(item.id, registry)} — <code>${escapeHtml(item.href)}</code>`)}</div>
          <div><strong>Liens HTTP non chiffrés</strong>${listOrEmpty(audit.insecureLinks, item => `${resourceLink(item.id, registry)} — <code>${escapeHtml(item.href)}</code>`, 'Aucun lien HTTP non chiffré.')}</div>
        </div>
        <div class="note">Cet audit vérifie la structure des liens dans le navigateur. Les sites externes protégés par une connexion, un pare-feu ou des règles CORS ne sont pas sondés automatiquement afin d’éviter de faux « liens morts ».</div>
      </section>

      <section class="section">
        <h2>Fraîcheur des documents</h2>
        ${freshResources.length ? `<table><thead><tr><th>Ressource</th><th>Dernière mise à jour connue</th><th>Âge</th><th>État</th></tr></thead><tbody>${freshResources.map(resource => {
          const stale = resource.ageDays !== null && resource.ageDays > resource.cadenceDays;
          return `<tr><td>${resourceLink(resource.id, registry)}</td><td>${escapeHtml(resource.updatedAt)}</td><td>${resource.ageDays ?? '—'} j</td><td class="${stale ? 'warn' : 'good'}">${stale ? 'À vérifier' : 'À jour'}</td></tr>`;
        }).join('')}</tbody></table>` : '<p class="muted">Aucune date de mise à jour explicite enregistrée.</p>'}
      </section>

      <section class="section">
        <h2>Couverture du contenu</h2>
        <div class="grid">
          <div><strong>Ressources sans lien</strong>${listOrEmpty(audit.noLinks, id => resourceLink(id, registry), 'Toutes les ressources ont au moins un lien.')}</div>
          <div><strong>Recherche peu documentée</strong>${listOrEmpty(audit.weakSearch, id => resourceLink(id, registry), 'Toutes les ressources ont une couverture de recherche suffisante.')}</div>
        </div>
      </section>

      <section class="section">
        <h2>Statistiques locales d’utilisation</h2>
        <p class="muted">Conservées uniquement dans le stockage local de ce navigateur. Aucun identifiant de personne ni aucune donnée n’est envoyée à un service externe. Les courriels et numéros ressemblant à des données privées sont masqués.</p>
        <div class="summary" style="margin-top:12px">
          <div class="metric"><strong>${analytics.totals?.searches || 0}</strong><span>recherches enregistrées</span></div>
          <div class="metric"><strong>${analytics.totals?.noResults || 0}</strong><span>recherches sans résultat</span></div>
          <div class="metric"><strong>${analytics.totals?.opens || 0}</strong><span>ouvertures de ressources</span></div>
          <div class="metric"><strong>${Object.keys(analytics.opens || {}).length}</strong><span>ressources consultées</span></div>
        </div>
        <div class="grid" style="margin-top:18px">
          <div><strong>Recherches les plus fréquentes</strong>${analyticsTable(topSearches,[
            {label:'Recherche',render:key=>escapeHtml(key)},
            {label:'Nombre',numeric:true,render:(key,data)=>escapeHtml(data.count)},
            {label:'Résultats',numeric:true,render:(key,data)=>escapeHtml(data.lastResultCount)}
          ])}</div>
          <div><strong>Recherches sans résultat</strong>${analyticsTable(noResults,[
            {label:'Recherche',render:key=>escapeHtml(key)},
            {label:'Nombre',numeric:true,render:(key,data)=>escapeHtml(data.count)}
          ])}</div>
        </div>
        <div style="margin-top:18px"><strong>Ressources les plus ouvertes</strong>${analyticsTable(topOpens,[
          {label:'Ressource',render:(key,data)=>resourceLink(key, registry)},
          {label:'Ouvertures',numeric:true,render:(key,data)=>escapeHtml(data.count)}
        ])}</div>
      </section>

      <p class="muted" style="margin-top:16px">Registre ${escapeHtml(registry.version)} · audit généré ${escapeHtml(new Date(audit.generatedAt).toLocaleString('fr-CA'))}</p>`;
    return true;
  };

  const waitForPortal = () => {
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (render() || attempts > 160) {
        window.clearInterval(timer);
        if (attempts > 160 && !frame.contentWindow?.PORTAL_REGISTRY) host.innerHTML = '<p class="warn">Le portail n’a pas pu être chargé pour l’audit.</p>';
      }
    }, 125);
  };

  frame.addEventListener('load', waitForPortal);
  refreshButton?.addEventListener('click', () => {
    host.innerHTML = '<p>Actualisation de l’audit…</p>';
    frame.contentWindow?.location.reload();
  });
  clearButton?.addEventListener('click', () => {
    const win = frame.contentWindow;
    if (!win?.PORTAL_ANALYTICS) return;
    if (!window.confirm('Effacer les statistiques locales enregistrées dans ce navigateur?')) return;
    win.PORTAL_ANALYTICS.clear();
    render();
  });
})();
