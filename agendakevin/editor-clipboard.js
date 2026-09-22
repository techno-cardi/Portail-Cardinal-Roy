(() => {
  'use strict';

  function editorFromTarget(target) {
    return target?.closest?.('.block-editor') || null;
  }

  function serializeEditor(editor) {
    let n = 0;
    const lines = [];
    for (const block of editor.querySelectorAll(':scope > .editor-block')) {
      if (block.classList.contains('drag-source') || block.classList.contains('drag-placeholder')) continue;
      const text = (block.querySelector('.block-text')?.textContent || '').replace(/[\r\n]+/g, ' ').trimEnd();
      if (block.dataset.kind === 'numbered') lines.push(`${++n}. ${text}`.trimEnd());
      else lines.push(text);
    }
    while (lines.length && !lines.at(-1).trim()) lines.pop();
    return lines.join('\n');
  }

  function selectWholeEditor(editor) {
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(editor);
    selection.removeAllRanges();
    selection.addRange(range);
    document.querySelectorAll('.block-editor[data-full-selection="1"]').forEach(el => {
      if (el !== editor) delete el.dataset.fullSelection;
    });
    editor.dataset.fullSelection = '1';
  }

  function clearFullSelection(editor) {
    if (editor) delete editor.dataset.fullSelection;
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

  function parseText(text) {
    const raw = String(text || '').replace(/\r/g, '');
    if (!raw) return [{ kind: 'plain', text: '' }];
    const blocks = raw.split('\n').map(line => {
      const match = line.match(/^\s*\d+\.\s*(.*)$/);
      return match ? { kind: 'numbered', text: match[1] } : { kind: 'plain', text: line };
    });
    while (blocks.length > 1 && blocks.at(-1).kind === 'plain' && blocks.at(-1).text === '') blocks.pop();
    return blocks.length ? blocks : [{ kind: 'plain', text: '' }];
  }

  function replaceEditor(editor, text) {
    const blocks = parseText(text);
    editor.replaceChildren(...blocks.map(block => makeBlock(block.kind, block.text)));
    clearFullSelection(editor);

    // L'écouteur input existant de l'Agenda renumérote, sauvegarde et crée l'historique.
    const first = editor.querySelector('.block-text');
    first?.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      inputType: 'insertFromPaste',
      data: text,
    }));

    const last = editor.querySelector('.editor-block:last-child .block-text') || first;
    if (last) {
      last.focus();
      const range = document.createRange();
      range.selectNodeContents(last);
      range.collapse(false);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }

  document.addEventListener('keydown', event => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey || event.key.toLowerCase() !== 'a') return;
    const textEl = event.target?.closest?.('.block-text');
    const editor = textEl?.closest('.block-editor');
    if (!editor) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    selectWholeEditor(editor);
  }, true);

  document.addEventListener('copy', event => {
    const editor = editorFromTarget(event.target);
    if (!editor || editor.dataset.fullSelection !== '1') return;
    event.preventDefault();
    event.clipboardData?.setData('text/plain', serializeEditor(editor));
  }, true);

  document.addEventListener('cut', event => {
    const editor = editorFromTarget(event.target);
    if (!editor || editor.dataset.fullSelection !== '1') return;
    event.preventDefault();
    event.clipboardData?.setData('text/plain', serializeEditor(editor));
    replaceEditor(editor, '');
  }, true);

  document.addEventListener('paste', event => {
    const editor = editorFromTarget(event.target);
    if (!editor || editor.dataset.fullSelection !== '1') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const text = (event.clipboardData || window.clipboardData)?.getData('text/plain') || '';
    replaceEditor(editor, text);
  }, true);

  document.addEventListener('pointerdown', event => {
    const editor = editorFromTarget(event.target);
    document.querySelectorAll('.block-editor[data-full-selection="1"]').forEach(el => {
      if (el !== editor) clearFullSelection(el);
    });
    if (editor && !event.target.closest('.block-text')) clearFullSelection(editor);
  }, true);
})();
