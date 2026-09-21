(() => {
  'use strict';

  const host = document.getElementById('admin-status');
  if (!host) return;

  const REPO = 'techno-cardi/Portail-Cardinal-Roy';
  const WORKFLOWS = [
    ['Nouveautés', 'update-portal-updates.yml'],
    ['Nouvelles', 'update-news-feed.yml'],
    ['Tests portail', 'portal-tests.yml'],
    ['Liens', 'check-links.yml']
  ];

  const escapeHtml = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const fetchJson = async url => {
    const response = await fetch(url, { cache: 'no-store', headers: url.startsWith('https://api.github.com/') ? { Accept: 'application/vnd.github+json' } : {} });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  };
  const formatDateTime = value => {
    if (!value) return 'Jamais';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Toronto' }).format(date);
  };
  const stateClass = state => ['success', 'completed', 'ok'].includes(String(state || '').toLowerCase()) ? 'good' : ['queued', 'in_progress', 'waiting'].includes(String(state || '').toLowerCase()) ? 'muted' : 'warn';

  const workflowStatus = async ([label, file]) => {
    try {
      const payload = await fetchJson(`https://api.github.com/repos/${REPO}/actions/workflows/${encodeURIComponent(file)}/runs?branch=main&per_page=1`);
      const run = payload.workflow_runs?.[0];
      if (!run) return { label, state: 'aucune exécution', at: '', url: '' };
      return { label, state: run.conclusion || run.status || 'inconnu', at: run.updated_at || run.run_started_at || run.created_at || '', url: run.html_url || '' };
    } catch (error) {
      return { label, state: 'indisponible', at: '', url: '', error: error.message };
    }
  };

  let busy = false;
  let queued = false;
  const render = async () => {
    if (busy || host.querySelector('#admin-maintenance-health')) return;
    busy = true;
    try {
      const [maintenanceResult, updatesResult, linksResult, workflowResults] = await Promise.all([
        fetchJson('./portal-maintenance.json').catch(error => ({ __error: error.message })),
        fetchJson(`./portal-updates.json?v=${Date.now()}`).catch(error => ({ __error: error.message })),
        fetchJson(`./link-health.json?v=${Date.now()}`).catch(error => ({ __error: error.message })),
        Promise.all(WORKFLOWS.map(workflowStatus))
      ]);
      if (host.querySelector('#admin-maintenance-health')) return;

      const school = maintenanceResult.school_year || {};
      const updateCount = Array.isArray(updatesResult.items) ? Math.min(updatesResult.items.length, updatesResult.max_visible || 3) : 0;
      const linkStatus = linksResult.status || (linksResult.__error ? 'indisponible' : 'jamais vérifié');
      const reviewDate = school.rollover_review || '';
      const reviewDue = reviewDate && new Date(`${reviewDate}T12:00:00`) <= new Date();
      const workflowRows = workflowResults.map(item => `<tr><td>${escapeHtml(item.label)}</td><td class="${stateClass(item.state)}">${escapeHtml(item.state)}</td><td>${escapeHtml(formatDateTime(item.at))}</td><td>${item.url ? `<a class="resource-link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">Voir</a>` : '<span class="muted">-</span>'}</td></tr>`).join('');

      const section = document.createElement('section');
      section.className = 'section';
      section.id = 'admin-maintenance-health';
      section.innerHTML = `
        <h2>Automatisation et maintenance</h2>
        <div class="summary">
          <div class="metric"><strong>${escapeHtml(school.label || '?')}</strong><span>année scolaire configurée</span></div>
          <div class="metric"><strong>${escapeHtml(updateCount)}</strong><span>nouveautés affichables</span></div>
          <div class="metric"><strong class="${stateClass(linkStatus)}">${escapeHtml(linkStatus)}</strong><span>dernier contrôle des liens</span></div>
          <div class="metric"><strong class="${reviewDue ? 'warn' : 'good'}">${reviewDue ? 'À préparer' : 'OK'}</strong><span>changement d’année${reviewDate ? ` · ${escapeHtml(reviewDate)}` : ''}</span></div>
        </div>
        <div class="grid" style="margin-top:18px">
          <div><strong>Nouvelle génération</strong><p class="muted">Fil généré : ${escapeHtml(formatDateTime(updatesResult.generated_at))}</p><p class="muted">Durée normale : ${escapeHtml(updatesResult.default_lifetime_days ?? '?')} jours · maximum ${escapeHtml(updatesResult.max_visible ?? 3)} visibles.</p></div>
          <div><strong>Vérification des liens</strong><p class="muted">Dernière vérification : ${escapeHtml(formatDateTime(linksResult.checked_at))}</p><p class="${linksResult.broken_count ? 'warn' : 'good'}">${escapeHtml(linksResult.broken_count ?? 0)} brisé(s) · ${escapeHtml(linksResult.warning_count ?? 0)} avertissement(s)</p></div>
        </div>
        ${Array.isArray(linksResult.broken) && linksResult.broken.length ? `<div style="margin-top:16px"><strong>Liens réellement brisés</strong><ul>${linksResult.broken.slice(0, 15).map(item => `<li><code>${escapeHtml(item.url)}</code> (${escapeHtml(item.code)})</li>`).join('')}</ul></div>` : ''}
        <div style="margin-top:18px"><strong>Dernières exécutions GitHub Actions</strong><table><thead><tr><th>Workflow</th><th>État</th><th>Dernière activité</th><th></th></tr></thead><tbody>${workflowRows}</tbody></table><div class="note">Les statuts GitHub sont consultés seulement sur cette page d’administration. Une limite ou une panne de l’API GitHub n’affecte jamais le portail du personnel.</div></div>`;
      host.appendChild(section);
    } finally {
      busy = false;
    }
  };

  const schedule = () => {
    if (queued) return;
    queued = true;
    window.setTimeout(() => { queued = false; render(); }, 80);
  };
  new MutationObserver(schedule).observe(host, { childList: true });
  document.getElementById('refresh-status')?.addEventListener('click', () => {
    document.getElementById('admin-maintenance-health')?.remove();
    window.setTimeout(schedule, 300);
  });
  schedule();
})();
