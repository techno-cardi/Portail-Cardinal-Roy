(() => {
  'use strict';

  const LABEL_RE = /^((?:Devoirs?|Rappels?|Dates? importantes?)\s*:)([\s\S]*)$/i;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
  }

  function inlineHtml(value) {
    const formatter = window.CRAgendaWorkTitles;
    return formatter?.html ? formatter.html(value) : escapeHtml(value);
  }

  function formatParagraph(paragraph) {
    if (!(paragraph instanceof HTMLElement) || paragraph.tagName !== 'P') return;

    const raw = paragraph.textContent || '';
    const match = raw.match(LABEL_RE);
    const hasTitle = Boolean(window.CRAgendaWorkTitles?.hasMatch?.(raw));
    if (!match && !hasTitle) return;

    paragraph.innerHTML = match
      ? '<b><u>' + escapeHtml(match[1]) + '</u></b>' + inlineHtml(match[2])
      : inlineHtml(raw);
  }

  function enrichHtml(html) {
    const template = document.createElement('template');
    template.innerHTML = String(html || '');
    template.content.querySelectorAll('p').forEach(formatParagraph);
    return template.innerHTML;
  }

  // Aucun MutationObserver ici : l’aperçu est déjà formaté nativement par
  // classroom-tools.js. Cette couche ne fait qu’une dernière passe au moment
  // exact de la publication pour le HTML transmis au pont Classroom.
  document.addEventListener('pdc:publish-course', event => {
    const detail = event.detail;
    if (!detail || !detail.richHtml) return;
    detail.richHtml = enrichHtml(detail.richHtml);
  }, true);
})();
