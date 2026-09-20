(() => {
  'use strict';

  const VERSION = '1.0';
  const CATEGORY_SECTIONS = Object.freeze({
    commencer: 'section-commencer',
    classe: 'section-classe',
    'encadrement-sae': 'section-encadrement-sae',
    suivi: 'section-suivi',
    organisation: 'section-organisation',
    'organisation-scolaire': 'section-organisation-scolaire',
    outils: 'section-outils'
  });

  const source = document.getElementById('legacy-source');
  const app = document.getElementById('app');
  if (!source || !app) return;

  const managedSourceNodes = () => [...source.querySelectorAll('[data-portal-managed="true"][id]')];
  const renderedById = id => app.querySelector(`#${CSS.escape(id)}`);
  const sectionForCategory = category => document.getElementById(CATEGORY_SECTIONS[category] || '');

  const repairPlacements = () => {
    const moved = [];
    managedSourceNodes().forEach(src => {
      const category = src.dataset.portalCategory || '';
      const section = sectionForCategory(category);
      const procedure = renderedById(src.id);
      const list = section?.querySelector('.procedure-list');
      if (!procedure || !list || list.contains(procedure)) return;
      list.appendChild(procedure);
      moved.push(src.id);
    });
    return moved;
  };

  const duplicatesWithin = root => {
    const seen = new Set();
    const duplicates = new Set();
    root.querySelectorAll('[id]').forEach(node => {
      if (seen.has(node.id)) duplicates.add(node.id);
      seen.add(node.id);
    });
    return [...duplicates];
  };

  const audit = () => {
    const fatal = [];
    const warnings = [];
    const managed = managedSourceNodes();
    const declaredIds = new Set(window.PORTAL_MANAGED_RESOURCE_IDS || []);
    const missingDeclared = [...(window.PORTAL_MANAGED_RESOURCE_MISSING || [])];

    const duplicateSourceIds = duplicatesWithin(source);
    const duplicateRenderedIds = duplicatesWithin(app);
    if (duplicateSourceIds.length) fatal.push({ type:'duplicate-source-id', ids:duplicateSourceIds });
    if (duplicateRenderedIds.length) fatal.push({ type:'duplicate-rendered-id', ids:duplicateRenderedIds });
    if (missingDeclared.length) fatal.push({ type:'declared-resource-missing-from-source', ids:missingDeclared });

    managed.forEach(src => {
      const category = src.dataset.portalCategory || '';
      const keywords = (src.dataset.keywords || '').replace(/\s+/g, ' ').trim();
      const title = (src.dataset.title || src.querySelector('h2,h3')?.textContent || '').replace(/\s+/g, ' ').trim();
      const procedure = renderedById(src.id);
      const section = sectionForCategory(category);

      if (!declaredIds.has(src.id)) warnings.push({ type:'managed-not-declared', id:src.id });
      if (!title) fatal.push({ type:'missing-title', id:src.id });
      if (keywords.length < 20) fatal.push({ type:'missing-keywords', id:src.id });
      if (!CATEGORY_SECTIONS[category]) fatal.push({ type:'invalid-category', id:src.id, category });
      if (!section) fatal.push({ type:'missing-category-section', id:src.id, category });
      if (!procedure) fatal.push({ type:'missing-rendered-resource', id:src.id });
      if (procedure && section && !section.contains(procedure)) fatal.push({ type:'category-mismatch', id:src.id, category });
    });

    app.querySelectorAll('.procedure a[href]').forEach(link => {
      const href = (link.getAttribute('href') || '').trim();
      const id = link.closest('.procedure')?.id || '';
      if (!href) warnings.push({ type:'empty-link', id });
      if (/^javascript:/i.test(href)) fatal.push({ type:'javascript-link', id, href });
      if (/^http:\/\//i.test(href)) warnings.push({ type:'insecure-link', id, href });
    });

    document.querySelectorAll('.section-nav-inner a[href^="#section-"]').forEach(link => {
      const id = decodeURIComponent(link.getAttribute('href').slice(1));
      if (!document.getElementById(id)) fatal.push({ type:'broken-navigation', id });
    });

    return {
      version: VERSION,
      generatedAt: new Date().toISOString(),
      managedResources: managed.map(node => node.id),
      fatal,
      warnings
    };
  };

  const repairAndAudit = () => {
    const moved = repairPlacements();
    const report = audit();
    document.documentElement.dataset.portalMaintenance = VERSION;
    document.documentElement.dataset.portalMaintenanceFatal = String(report.fatal.length);
    window.PORTAL_MAINTENANCE_LAST_AUDIT = report;
    if (report.fatal.length) console.warn('Portail Cardinal-Roy: anomalies de maintenance', report.fatal);
    return { moved, report };
  };

  window.PORTAL_MAINTENANCE = Object.freeze({
    version: VERSION,
    categories: CATEGORY_SECTIONS,
    repairPlacements,
    audit,
    repairAndAudit
  });

  const result = repairAndAudit();
  window.dispatchEvent(new CustomEvent('portal:maintenance-ready', {
    detail: { version:VERSION, moved:result.moved.length, fatal:result.report.fatal.length }
  }));
})();
