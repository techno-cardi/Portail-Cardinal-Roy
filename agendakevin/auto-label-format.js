(() => {
  'use strict';

  const LABEL_CLASS = 'agenda-auto-label';
  const TITLE_CLASS = 'agenda-auto-work-title';
  const LABEL_RE = /^((?:Devoirs?|Rappels?|Dates? importantes?)\s*:)([\s\S]*)$/i;
  const RICH_MARK_RE = /[\u2062]/;
  const lastFormat = new WeakMap();

  function injectStyle() {
    if (document.getElementById('agendaAutoLabelStyle')) return;
    const style = document.createElement('style');
    style.id = 'agendaAutoLabelStyle';
    style.textContent =
      '.' + LABEL_CLASS + '{font-weight:800;text-decoration-line:underline;text-underline-offset:2px;text-decoration-thickness:1.5px}' +
      '.' + TITLE_CLASS + '{font-style:italic}';
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

  function restoreCaret(textEl, offset) {
    if (offset == null) return;
    let remaining = Math.max(0, offset);
    let last = null;
    const walker = document.createTreeWalker(textEl, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      last = node;
      const length = node.nodeValue?.length || 0;
      if (remaining <= length) {
        const selection = window.getSelection();
        if (!selection) return;
        const range = document.createRange();
        range.setStart(node, remaining);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }
      remaining -= length;
    }

    const node = last || textEl.appendChild(document.createTextNode(''));
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.setStart(node, node.nodeValue?.length || 0);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function appendWorkText(target, value) {
    const formatter = window.CRAgendaWorkTitles;
    if (formatter?.fragment) {
      target.appendChild(formatter.fragment(value));
      return;
    }
    target.appendChild(document.createTextNode(String(value ?? '')));
  }

  function expectedAutoNodes(textEl, hasLabel, hasTitle) {
    if (hasLabel && !textEl.querySelector(':scope > .' + LABEL_CLASS)) return false;
    if (hasTitle && !textEl.querySelector('.' + TITLE_CLASS)) return false;
    return true;
  }

  function formatTextEl(textEl) {
    if (!(textEl instanceof HTMLElement) || !textEl.matches('.block-text')) return;

    const raw = textEl.textContent || '';
    if (RICH_MARK_RE.test(raw)) return;

    const labelMatch = raw.match(LABEL_RE);
    const formatter = window.CRAgendaWorkTitles;
    const hasTitle = Boolean(formatter?.hasMatch?.(raw));
    const hasLabel = Boolean(labelMatch);
    const currentAuto = textEl.querySelector(':scope > .' + LABEL_CLASS + ', .' + TITLE_CLASS);

    if (!hasLabel && !hasTitle) {
      if (currentAuto) {
        const offset = document.activeElement === textEl ? caretOffset(textEl) : null;
        textEl.textContent = raw;
        if (offset != null) restoreCaret(textEl, offset);
      }
      lastFormat.set(textEl, raw);
      return;
    }

    const signature = (formatter?.version || '') + '|' + raw;
    if (lastFormat.get(textEl) === signature && expectedAutoNodes(textEl, hasLabel, hasTitle)) return;

    const offset = document.activeElement === textEl ? caretOffset(textEl) : null;
    const fragment = document.createDocumentFragment();

    if (labelMatch) {
      const labelEl = document.createElement('span');
      labelEl.className = LABEL_CLASS;
      labelEl.textContent = labelMatch[1];
      fragment.appendChild(labelEl);
      appendWorkText(fragment, labelMatch[2]);
    } else {
      appendWorkText(fragment, raw);
    }

    textEl.replaceChildren(fragment);
    lastFormat.set(textEl, signature);
    if (offset != null) restoreCaret(textEl, offset);
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
