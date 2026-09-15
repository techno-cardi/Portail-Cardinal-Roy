(() => {
  'use strict';

  const LABEL_RE = /^((?:Devoirs?|Rappels?)\s*:)([\s\S]*)$/i;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
  }

  function formatParagraph(paragraph) {
    if (!(paragraph instanceof HTMLElement) || paragraph.tagName !== 'P') return;
    const match = (paragraph.textContent || '').match(LABEL_RE);
    if (!match) return;

    const current = paragraph.querySelector(':scope > b > u, :scope > strong > u');
    if (current && current.textContent === match[1]) return;

    paragraph.dataset.pdcAutoLabel = '1';
    paragraph.innerHTML = `<b><u>${escapeHtml(match[1])}</u></b>${escapeHtml(match[2])}`;
  }

  function formatPreview(root = document) {
    const preview = root.id === 'crpPreview' ? root : root.querySelector?.('#crpPreview');
    if (!preview) return;
    preview.querySelectorAll('p').forEach(formatParagraph);
  }

  function enrichHtml(html) {
    const template = document.createElement('template');
    template.innerHTML = String(html || '');
    template.content.querySelectorAll('p').forEach(formatParagraph);
    return template.innerHTML;
  }

  // Important : ce listener est enregistré par la page avant le userscript
  // Tampermonkey. On enrichit donc le HTML avant que GM_setClipboard le copie.
  document.addEventListener('pdc:publish-course', event => {
    const detail = event.detail;
    if (!detail || !detail.richHtml) return;
    detail.richHtml = enrichHtml(detail.richHtml);
  }, true);

  function start() {
    formatPreview(document);
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.target instanceof HTMLElement && mutation.target.closest?.('#crpPreview')) {
          formatPreview(document);
          return;
        }
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE && (node.id === 'crpPreview' || node.querySelector?.('#crpPreview'))) {
            formatPreview(node.id === 'crpPreview' ? node : document);
            return;
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
