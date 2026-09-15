(() => {
  'use strict';

  const LABEL_CLASS = 'agenda-auto-label';
  const LABEL_RE = /^((?:Devoirs?|Rappels?)\s*:)([\s\S]*)$/i;

  function injectStyle() {
    if (document.getElementById('agendaAutoLabelStyle')) return;
    const style = document.createElement('style');
    style.id = 'agendaAutoLabelStyle';
    style.textContent = `
      .${LABEL_CLASS}{
        font-weight:800;
        text-decoration-line:underline;
        text-underline-offset:2px;
        text-decoration-thickness:1.5px;
      }
    `;
    document.head.appendChild(style);
  }

  function caretOffset(textEl) {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return null;
    const range = selection.getRangeAt(0);
    if (!textEl.contains(range.startContainer)) return null;
    const before = document.createRange();
    before.selectNodeContents(textEl);
    before.setEnd(range.startContainer, range.startOffset);
    return before.toString().length;
  }

  function restorePlainCaret(textEl, offset) {
    if (offset == null) return;
    const node = textEl.firstChild || textEl.appendChild(document.createTextNode(''));
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.setStart(node, Math.max(0, Math.min(offset, node.nodeValue?.length || 0)));
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function restoreFormattedCaret(textEl, offset, labelLength) {
    if (offset == null) return;
    const label = textEl.firstChild;
    const tail = textEl.childNodes[1] || textEl.appendChild(document.createTextNode(''));
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();

    if (offset < labelLength) {
      const node = label?.firstChild || label;
      if (!node) return;
      range.setStart(node, Math.max(0, Math.min(offset, node.nodeValue?.length || 0)));
    } else {
      range.setStart(tail, Math.max(0, Math.min(offset - labelLength, tail.nodeValue?.length || 0)));
    }

    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function alreadyFormatted(textEl, label, tail) {
    const first = textEl.firstChild;
    const second = textEl.childNodes[1];
    return textEl.childNodes.length === 2
      && first?.nodeType === Node.ELEMENT_NODE
      && first.classList?.contains(LABEL_CLASS)
      && first.textContent === label
      && second?.nodeType === Node.TEXT_NODE
      && second.nodeValue === tail;
  }

  function formatTextEl(textEl) {
    if (!(textEl instanceof HTMLElement) || !textEl.matches('.block-text')) return;

    const raw = textEl.textContent || '';
    const match = raw.match(LABEL_RE);
    const currentLabel = textEl.querySelector(`:scope > .${LABEL_CLASS}`);

    if (!match) {
      if (!currentLabel) return;
      const offset = document.activeElement === textEl ? caretOffset(textEl) : null;
      textEl.textContent = raw;
      if (offset != null) restorePlainCaret(textEl, offset);
      return;
    }

    const label = match[1];
    const tail = match[2];
    if (alreadyFormatted(textEl, label, tail)) return;

    const offset = document.activeElement === textEl ? caretOffset(textEl) : null;
    const labelEl = document.createElement('span');
    labelEl.className = LABEL_CLASS;
    labelEl.textContent = label;
    const tailNode = document.createTextNode(tail);
    textEl.replaceChildren(labelEl, tailNode);

    if (offset != null) restoreFormattedCaret(textEl, offset, label.length);
  }

  function formatWithin(root) {
    if (root instanceof HTMLElement && root.matches('.block-text')) formatTextEl(root);
    root.querySelectorAll?.('.block-text').forEach(formatTextEl);
  }

  function start() {
    injectStyle();
    formatWithin(document);

    document.addEventListener('input', event => {
      const textEl = event.target.closest?.('.block-text');
      if (!textEl) return;
      queueMicrotask(() => formatTextEl(textEl));
    }, true);

    document.addEventListener('focusin', event => {
      const textEl = event.target.closest?.('.block-text');
      if (textEl) formatTextEl(textEl);
    });

    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) formatWithin(node);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
