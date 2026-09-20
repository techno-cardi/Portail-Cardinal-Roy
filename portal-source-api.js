(() => {
  'use strict';

  const root = document.getElementById('legacy-source');
  if (!root) return;

  const VERSION = '1.0';
  const CATEGORIES = new Set([
    'commencer',
    'classe',
    'encadrement-sae',
    'suivi',
    'organisation',
    'organisation-scolaire',
    'outils'
  ]);

  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
  const validId = id => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);

  const validateMetadata = ({ id, category, keywords }, { requireKeywords = true } = {}) => {
    const errors = [];
    if (!validId(id)) errors.push('id invalide');
    if (!CATEGORIES.has(category)) errors.push(`catégorie inconnue: ${category || '(vide)'}`);
    if (requireKeywords && clean(keywords).length < 20) errors.push('mots-clés absents ou trop courts');
    return errors;
  };

  const applyMetadata = (node, metadata) => {
    if (!node) return null;
    const id = clean(metadata.id || node.id);
    const category = clean(metadata.category);
    const incomingKeywords = clean(metadata.keywords);
    const keywords = clean(`${node.dataset.keywords || ''} ${incomingKeywords}`);
    const errors = validateMetadata({ id, category, keywords });
    if (errors.length) throw new Error(`Ressource ${id || '(sans id)'}: ${errors.join(', ')}`);

    node.id = id;
    node.dataset.portalManaged = 'true';
    node.dataset.portalCategory = category;
    node.dataset.keywords = keywords;
    if (metadata.title) node.dataset.title = clean(metadata.title);
    if (metadata.updatedAt) node.dataset.portalUpdatedAt = clean(metadata.updatedAt);
    if (metadata.owner) node.dataset.portalOwner = clean(metadata.owner);
    return node;
  };

  const annotate = (id, metadata = {}) => {
    const node = root.querySelector(`#${CSS.escape(id)}`);
    if (!node) return null;
    return applyMetadata(node, {
      ...metadata,
      id,
      keywords: metadata.keywords || node.dataset.keywords || node.textContent
    });
  };

  const upsert = resource => {
    const id = clean(resource?.id);
    const category = clean(resource?.category);
    const keywords = clean(resource?.keywords);
    const errors = validateMetadata({ id, category, keywords });
    if (!clean(resource?.title)) errors.push('titre absent');
    if (!clean(resource?.body)) errors.push('contenu absent');
    if (errors.length) throw new Error(`Ressource ${id || '(sans id)'}: ${errors.join(', ')}`);

    let card = root.querySelector(`#${CSS.escape(id)}`);
    if (!card) {
      card = document.createElement('section');
      root.appendChild(card);
    }

    const title = clean(resource.title);
    const subtitle = clean(resource.subtitle);
    const icon = clean(resource.icon || '📌');
    card.className = 'card searchable';
    card.innerHTML = `
      <div class="card-head">
        <div class="card-icon" aria-hidden="true">${icon}</div>
        <div>
          <h3></h3>
          <div class="card-sub"></div>
        </div>
      </div>
      <div class="card-body"></div>`;
    card.querySelector('h3').textContent = title;
    card.querySelector('.card-sub').textContent = subtitle;
    card.querySelector('.card-body').innerHTML = resource.body;
    card.dataset.icon = icon;
    applyMetadata(card, {
      id,
      category,
      keywords,
      title,
      updatedAt: resource.updatedAt,
      owner: resource.owner
    });
    return card;
  };

  const remove = id => {
    const cleanId = clean(id);
    if (!validId(cleanId)) throw new Error(`Identifiant invalide: ${cleanId}`);
    const node = root.querySelector(`#${CSS.escape(cleanId)}`);
    if (!node) return false;
    node.remove();
    return true;
  };

  window.PORTAL_SOURCE_API = Object.freeze({
    version: VERSION,
    categories: Object.freeze([...CATEGORIES]),
    annotate,
    upsert,
    remove,
    validateMetadata
  });
})();
