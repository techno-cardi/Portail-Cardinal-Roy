(() => {
  'use strict';

  const VERSION = '20260928-2';
  const TITLES = [
    'Nébulosité croissante en fin de journée',
    'Ahayute et le mangeur de nuages',
    'Petit frère et Petite sœur',
    'La tour des mille tristesses',
    'Kilan - Fils de l’Olympe',
    'Le nom sur l’interphone',
    'Le diable et le paysan',
    'Bonheur d’occasion',
    'Alicia, à l’aube',
    'La Lumière bleue',
    'Le dernier carton',
    'La salle d’attente',
    'La chasse-galerie',
    'Les Six Cygnes',
    'Le Serpent blanc',
    'La chaise libre',
    'Le Petit Poucet',
    'L’Eau de la vie',
    'L’étranger',
    'Le Passeur',
    'La digue',
    'Rage',
  ].sort((a, b) => b.length - a.length);

  function normalize(value) {
    return String(value ?? '')
      .replace(/[’‘ʼ]/g, "'")
      .replace(/[‐‑‒–—−]/g, '-')
      .toLocaleLowerCase('fr-CA');
  }

  function isWordChar(char) {
    return Boolean(char && /[\p{L}\p{N}]/u.test(char));
  }

  const normalizedTitles = TITLES.map(title => ({
    title,
    normalized: normalize(title),
    caseSensitive: title === 'Rage',
  }));

  function matches(value) {
    const text = String(value ?? '');
    const normalized = normalize(text);
    const candidates = [];

    for (const entry of normalizedTitles) {
      let from = 0;
      while (from <= normalized.length - entry.normalized.length) {
        const start = normalized.indexOf(entry.normalized, from);
        if (start < 0) break;
        const end = start + entry.normalized.length;
        const first = entry.normalized[0] || '';
        const last = entry.normalized.at(-1) || '';
        const before = normalized[start - 1] || '';
        const after = normalized[end] || '';
        const leftOk = !isWordChar(first) || !isWordChar(before);
        const rightOk = !isWordChar(last) || !isWordChar(after);
        const caseOk = !entry.caseSensitive || text.slice(start, end) === entry.title;
        if (leftOk && rightOk && caseOk) candidates.push({ start, end, title: entry.title });
        from = start + 1;
      }
    }

    candidates.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
    const selected = [];
    let cursor = -1;
    for (const match of candidates) {
      if (match.start < cursor) continue;
      selected.push(match);
      cursor = match.end;
    }
    return selected;
  }

  function segments(value) {
    const text = String(value ?? '');
    const found = matches(text);
    if (!found.length) return [{ kind: 'text', text }];

    const result = [];
    let cursor = 0;
    for (const match of found) {
      if (match.start > cursor) result.push({ kind: 'text', text: text.slice(cursor, match.start) });
      result.push({ kind: 'title', text: text.slice(match.start, match.end), canonical: match.title });
      cursor = match.end;
    }
    if (cursor < text.length) result.push({ kind: 'text', text: text.slice(cursor) });
    return result;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
  }

  function html(value) {
    return segments(value).map(part => part.kind === 'title'
      ? `<em class="agenda-auto-work-title">${escapeHtml(part.text)}</em>`
      : escapeHtml(part.text)
    ).join('');
  }

  function fragment(value, doc = document) {
    const out = doc.createDocumentFragment();
    for (const part of segments(value)) {
      if (part.kind === 'title') {
        const em = doc.createElement('em');
        em.className = 'agenda-auto-work-title';
        em.dataset.rt = '1';
        em.textContent = part.text;
        out.appendChild(em);
      } else if (part.text) {
        out.appendChild(doc.createTextNode(part.text));
      }
    }
    return out;
  }

  window.CRAgendaWorkTitles = Object.freeze({
    version: VERSION,
    titles: Object.freeze([...TITLES]),
    matches,
    segments,
    html,
    fragment,
    hasMatch(value) { return matches(value).length > 0; },
  });
})();
