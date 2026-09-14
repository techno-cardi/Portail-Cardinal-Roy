(() => {
  'use strict';

  function selectionOffsets(textEl) {
    const textLength = (textEl.textContent || '').length;
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return { start: textLength, end: textLength };
    const range = selection.getRangeAt(0);
    if (!textEl.contains(range.startContainer) || !textEl.contains(range.endContainer)) {
      return { start: textLength, end: textLength };
    }

    const beforeStart = document.createRange();
    beforeStart.selectNodeContents(textEl);
    beforeStart.setEnd(range.startContainer, range.startOffset);

    const beforeEnd = document.createRange();
    beforeEnd.selectNodeContents(textEl);
    beforeEnd.setEnd(range.endContainer, range.endOffset);

    const start = Math.max(0, Math.min(textLength, beforeStart.toString().length));
    const end = Math.max(start, Math.min(textLength, beforeEnd.toString().length));
    return { start, end };
  }

  function setCaret(textEl, offset = 0) {
    textEl.focus();
    const selection = window.getSelection();
    if (!selection) return;

    const range = document.createRange();
    let remaining = Math.max(0, offset);
    const walker = document.createTreeWalker(textEl, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();

    while (node) {
      const length = node.nodeValue?.length || 0;
      if (remaining <= length) {
        range.setStart(node, remaining);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }
      remaining -= length;
      node = walker.nextNode();
    }

    range.selectNodeContents(textEl);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function makeBlock(kind, text = '') {
    const block = document.createElement('div');
    block.className = kind === 'numbered' ? 'editor-block numbered-block' : 'editor-block plain-block';
    block.dataset.kind = kind;

    if (kind === 'numbered') {
      const badge = document.createElement('span');
      badge.className = 'number-badge';
      badge.setAttribute('role', 'button');
      badge.setAttribute('tabindex', '0');
      badge.setAttribute('aria-label', 'Glisser cet élément');
      block.appendChild(badge);
    }

    const textEl = document.createElement('div');
    textEl.className = 'block-text';
    textEl.contentEditable = 'true';
    textEl.setAttribute('role', 'textbox');
    textEl.setAttribute('spellcheck', 'true');
    textEl.dataset.placeholder = 'Écrire…';
    textEl.textContent = text;
    block.appendChild(textEl);
    return block;
  }

  function convertEmptyNumberedToPlain(block, textEl) {
    block.querySelector('.number-badge')?.remove();
    block.dataset.kind = 'plain';
    block.classList.remove('numbered-block');
    block.classList.add('plain-block');
    textEl.textContent = '';
    textEl.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertParagraph' }));
    requestAnimationFrame(() => setCaret(textEl, 0));
  }

  function splitBlock(block, textEl, kind, start, end) {
    const original = textEl.textContent || '';
    const left = original.slice(0, start);
    const right = original.slice(end);

    textEl.textContent = left;
    const newBlock = makeBlock(kind, right);
    block.after(newBlock);

    // L'Agenda écoute déjà l'événement input pour renuméroter,
    // marquer la cellule modifiée et lancer la sauvegarde automatique.
    textEl.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertParagraph' }));
    requestAnimationFrame(() => setCaret(newBlock.querySelector('.block-text'), 0));
  }

  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;

    const textEl = event.target.closest?.('.block-text');
    const block = textEl?.closest('.editor-block');
    const editor = textEl?.closest('.block-editor');
    if (!textEl || !block || !editor) return;

    // On prend le contrôle avant le gestionnaire historique d'app.js.
    event.preventDefault();
    event.stopImmediatePropagation();

    const isNumbered = block.dataset.kind === 'numbered';
    const currentText = textEl.textContent || '';

    // Deuxième Entrée sur un nouvel élément numéroté vide : on sort de la liste
    // sans changer de ligne ni créer un bloc supplémentaire.
    if (!event.shiftKey && isNumbered && currentText.trim() === '') {
      convertEmptyNumberedToPlain(block, textEl);
      return;
    }

    const { start, end } = selectionOffsets(textEl);
    const newKind = event.shiftKey ? 'plain' : (isNumbered ? 'numbered' : 'plain');
    splitBlock(block, textEl, newKind, start, end);
  }, true);
})();
