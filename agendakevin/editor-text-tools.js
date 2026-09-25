(() => {
  'use strict';

  const ITALIC_MARK = '\u2062';
  const MARK_RE = /\u2062/g;
  let composing = false;

  function stripMarkers(value) {
    return String(value ?? '').replace(MARK_RE, '');
  }

  function styleOf(node) {
    return node?.tagName === 'I' || node?.tagName === 'EM' ? 'i' : '';
  }

  function tokensNode(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || '';
    if (!(node instanceof HTMLElement)) return '';
    if (node.classList.contains('rt-mark')) return node.textContent || '';

    const inner = [...node.childNodes].map(tokensNode).join('');
    const style = styleOf(node);
    return style && node.dataset.rt !== '1' ? ITALIC_MARK + inner + ITALIC_MARK : inner;
  }

  function tokensFromElement(textEl) {
    return [...textEl.childNodes].map(tokensNode).join('');
  }

  function marker() {
    const span = document.createElement('span');
    span.className = 'rt-mark';
    span.contentEditable = 'false';
    span.setAttribute('aria-hidden', 'true');
    span.textContent = ITALIC_MARK;
    return span;
  }

  function italicNode(node) {
    const em = document.createElement('em');
    em.dataset.rt = '1';
    em.append(node);
    return em;
  }

  function visibleSelectionOffsets(textEl) {
    const selection = window.getSelection();
    const length = stripMarkers(textEl?.textContent || '').length;
    if (!selection?.rangeCount || !textEl) return { start: length, end: length };

    const range = selection.getRangeAt(0);
    if (!textEl.contains(range.startContainer) || !textEl.contains(range.endContainer)) {
      return { start: length, end: length };
    }

    const offsetTo = (node, offset) => {
      const probe = document.createRange();
      probe.selectNodeContents(textEl);
      try {
        probe.setEnd(node, offset);
      } catch {
        return length;
      }
      return stripMarkers(probe.toString()).length;
    };

    const start = offsetTo(range.startContainer, range.startOffset);
    const end = offsetTo(range.endContainer, range.endOffset);
    return { start, end: Math.max(start, end) };
  }

  function visiblePoint(textEl, wanted) {
    let remaining = Math.max(0, wanted);
    let last = null;
    const walker = document.createTreeWalker(textEl, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return node.parentElement?.closest('.rt-mark')
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT;
      },
    });

    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      last = node;
      const length = node.nodeValue?.length || 0;
      if (remaining <= length) return [node, remaining];
      remaining -= length;
    }

    if (last) return [last, last.nodeValue?.length || 0];
    const node = document.createTextNode('');
    textEl.append(node);
    return [node, 0];
  }

  function restoreVisibleSelection(textEl, offsets, focus = false) {
    if (!textEl || !offsets) return;
    const selection = window.getSelection();
    if (!selection) return;
    if (focus) textEl.focus({ preventScroll: true });

    const start = visiblePoint(textEl, offsets.start);
    const end = visiblePoint(textEl, offsets.end);
    const range = document.createRange();
    try {
      range.setStart(...start);
      range.setEnd(...end);
      selection.removeAllRanges();
      selection.addRange(range);
    } catch {}
  }

  function renderTokens(textEl, tokens, preserveSelection = true) {
    if (!textEl) return;
    const selection = window.getSelection();
    const offsets = preserveSelection && selection?.anchorNode && textEl.contains(selection.anchorNode)
      ? visibleSelectionOffsets(textEl)
      : null;

    const fragment = document.createDocumentFragment();
    let italic = false;
    let buffer = '';

    const flush = () => {
      if (!buffer) return;
      let node = document.createTextNode(buffer);
      if (italic) node = italicNode(node);
      fragment.append(node);
      buffer = '';
    };

    for (const char of String(tokens ?? '')) {
      if (char !== ITALIC_MARK) {
        buffer += char;
        continue;
      }
      flush();
      fragment.append(marker());
      italic = !italic;
    }
    flush();

    textEl.replaceChildren(fragment);
    textEl.dataset.rtReady = '1';
    if (offsets) restoreVisibleSelection(textEl, offsets);
  }

  function normalize(textEl, force = false) {
    if (!textEl?.matches?.('.block-text') || composing) return false;
    const tokens = tokensFromElement(textEl);
    const raw = textEl.textContent || '';
    const needsRender = force || textEl.dataset.rtReady !== '1' || tokens !== raw;
    if (needsRender) renderTokens(textEl, tokens, document.activeElement === textEl);
    return needsRender;
  }

  function normalizeWithin(root) {
    if (root?.matches?.('.block-text')) normalize(root, true);
    root?.querySelectorAll?.('.block-text').forEach(textEl => normalize(textEl, true));
  }

  function materialize(textEl, offsets) {
    textEl.querySelectorAll('.rt-mark').forEach(node => node.remove());
    textEl.querySelectorAll('[data-rt="1"]').forEach(node => delete node.dataset.rt);
    textEl.dataset.rtReady = '0';
    restoreVisibleSelection(textEl, offsets, true);
  }

  function tokenIndexAtVisibleOffset(tokens, wanted) {
    let visible = 0;
    let index = 0;
    while (index < tokens.length) {
      if (tokens[index] === ITALIC_MARK) {
        index += 1;
        continue;
      }
      if (visible >= wanted) break;
      visible += 1;
      index += 1;
    }
    while (index < tokens.length && tokens[index] === ITALIC_MARK) index += 1;
    return index;
  }

  function italicActiveAt(tokens, index) {
    let active = false;
    for (let i = 0; i < index; i += 1) {
      if (tokens[i] === ITALIC_MARK) active = !active;
    }
    return active;
  }

  function splitTokensAtVisibleRange(tokens, start, end) {
    tokens = String(tokens ?? '');
    const startIndex = tokenIndexAtVisibleOffset(tokens, start);
    const endIndex = tokenIndexAtVisibleOffset(tokens, end);
    const startItalic = italicActiveAt(tokens, startIndex);
    const endItalic = italicActiveAt(tokens, endIndex);

    let left = tokens.slice(0, startIndex) + (startItalic ? ITALIC_MARK : '');
    let right = (endItalic ? ITALIC_MARK : '') + tokens.slice(endIndex);

    if (!stripMarkers(left)) left = '';
    if (!stripMarkers(right)) right = '';
    return { left, right };
  }

  function editorFromTarget(target) {
    return target?.closest?.('.block-editor')
      || document.activeElement?.closest?.('.block-editor')
      || document.querySelector('.block-editor[data-full-selection="1"]');
  }

  function serializeVisibleEditor(editor) {
    let number = 0;
    const lines = [];
    for (const block of editor.querySelectorAll(':scope > .editor-block')) {
      if (block.classList.contains('drag-source') || block.classList.contains('drag-placeholder')) continue;
      const textEl = block.querySelector('.block-text');
      const text = stripMarkers(textEl?.textContent || '').replace(/[\r\n]+/g, ' ').trimEnd();
      if (block.dataset.kind === 'numbered') lines.push((++number) + '. ' + text);
      else lines.push(text);
    }
    while (lines.length && !lines.at(-1).trim()) lines.pop();
    return lines.join('\n');
  }

  function selectWholeEditor(editor) {
    const selection = window.getSelection();
    if (!selection || !editor) return;

    document.querySelectorAll('.block-editor[data-full-selection="1"]').forEach(node => {
      if (node !== editor) delete node.dataset.fullSelection;
    });

    editor.dataset.fullSelection = '1';

    // Chromium ne permet pas une sélection native continue entre plusieurs
    // racines contenteditable. On garde donc une sélection logique sur toute
    // la case et une sélection DOM valide dans le bloc actif.
    const active = document.activeElement?.closest?.('.block-text');
    const textEl = active && editor.contains(active)
      ? active
      : editor.querySelector('.block-text');

    if (textEl) {
      const range = document.createRange();
      range.selectNodeContents(textEl);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  function clearFullSelection(editor) {
    if (editor) delete editor.dataset.fullSelection;
  }

  function makeBlock(kind, text = '') {
    const block = document.createElement('div');
    block.className = kind === 'numbered'
      ? 'editor-block numbered-block'
      : 'editor-block plain-block';
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

  function parsePlainText(text) {
    const raw = String(text || '').replace(/\r/g, '');
    if (!raw) return [{ kind: 'plain', text: '' }];

    const blocks = raw.split('\n').map(line => {
      const match = line.match(/^\s*\d+\.\s*(.*)$/);
      return match ? { kind: 'numbered', text: match[1] } : { kind: 'plain', text: line };
    });

    while (blocks.length > 1 && blocks.at(-1).kind === 'plain' && blocks.at(-1).text === '') {
      blocks.pop();
    }
    return blocks.length ? blocks : [{ kind: 'plain', text: '' }];
  }

  function replaceEditor(editor, text) {
    const blocks = parsePlainText(text);
    editor.replaceChildren(...blocks.map(block => makeBlock(block.kind, block.text)));
    clearFullSelection(editor);
    normalizeWithin(editor);

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

  function allVisibleTextItalic(tokens) {
    let italic = false;
    let sawText = false;
    for (const char of String(tokens ?? '')) {
      if (char === ITALIC_MARK) {
        italic = !italic;
        continue;
      }
      if (/\s/.test(char)) continue;
      sawText = true;
      if (!italic) return false;
    }
    return sawText;
  }

  function toggleWholeEditorItalic(editor) {
    const textEls = [...editor.querySelectorAll(':scope > .editor-block .block-text')];
    const nonEmpty = textEls.filter(textEl => stripMarkers(tokensFromElement(textEl)).trim());
    if (!nonEmpty.length) return;

    const removeItalic = nonEmpty.every(textEl => allVisibleTextItalic(tokensFromElement(textEl)));

    for (const textEl of textEls) {
      const visible = stripMarkers(tokensFromElement(textEl));
      const next = removeItalic || !visible ? visible : ITALIC_MARK + visible + ITALIC_MARK;
      renderTokens(textEl, next, false);
    }

    textEls[0]?.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      inputType: 'formatItalic',
    }));
    requestAnimationFrame(() => selectWholeEditor(editor));
  }

  function toggleSelectionItalic(textEl) {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!textEl.contains(range.startContainer) || !textEl.contains(range.endContainer)) return;

    const collapsed = range.collapsed;
    const offsets = visibleSelectionOffsets(textEl);
    materialize(textEl, offsets);

    let applied = false;
    try {
      applied = document.execCommand('italic', false, null);
    } catch {}

    if (!applied && !collapsed) {
      const current = window.getSelection()?.rangeCount ? window.getSelection().getRangeAt(0) : null;
      if (current && textEl.contains(current.startContainer) && textEl.contains(current.endContainer)) {
        const em = document.createElement('em');
        em.append(current.extractContents());
        current.insertNode(em);
        current.selectNodeContents(em);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(current);
      }
    }

    if (!collapsed) {
      normalize(textEl, true);
      textEl.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        inputType: 'formatItalic',
      }));
    }
  }

  function insertSmartQuote(event, textEl) {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!textEl.contains(range.startContainer) || !textEl.contains(range.endContainer)) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const offsets = visibleSelectionOffsets(textEl);
    const visible = stripMarkers(tokensFromElement(textEl));

    if (offsets.start !== offsets.end) {
      const selectedText = range.toString();
      const contents = range.extractContents();
      const left = document.createTextNode(/^\s/.test(selectedText) ? '«' : '« ');
      const right = document.createTextNode(/\s$/.test(selectedText) ? '»' : ' »');
      const fragment = document.createDocumentFragment();
      fragment.append(left, contents, right);
      range.insertNode(fragment);
      range.setStartAfter(right);
      range.collapse(true);
    } else {
      const before = visible.slice(0, offsets.start);
      const previous = offsets.start > 0 ? visible[offsets.start - 1] : '';
      const next = offsets.start < visible.length ? visible[offsets.start] : '';
      const insideQuotes = before.lastIndexOf('«') > before.lastIndexOf('»');
      const opening = !insideQuotes && (offsets.start === 0 || /[\s([{‹:;!?]/.test(previous));
      const quoteText = opening
        ? (next && /\s/.test(next) ? '«' : '« ')
        : (previous && /\s/.test(previous) ? '»' : ' »');
      const quote = document.createTextNode(quoteText);
      range.deleteContents();
      range.insertNode(quote);
      range.setStartAfter(quote);
      range.collapse(true);
    }

    selection.removeAllRanges();
    selection.addRange(range);
    textEl.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      inputType: 'insertText',
      data: '"',
    }));
  }

  function setup() {
    if (!document.getElementById('agendaTextToolsStyle')) {
      const style = document.createElement('style');
      style.id = 'agendaTextToolsStyle';
      style.textContent = '.rt-mark{display:none!important}.block-editor[data-full-selection="1"] .block-text{background:rgba(11,107,150,.18)!important}';
      document.head.append(style);
    }

    normalizeWithin(document);

    document.addEventListener('compositionstart', event => {
      if (event.target.closest?.('.block-text')) composing = true;
    }, true);

    document.addEventListener('compositionend', event => {
      composing = false;
      const textEl = event.target.closest?.('.block-text');
      if (textEl) normalize(textEl, true);
    }, true);

    document.addEventListener('focusin', event => {
      const textEl = event.target.closest?.('.block-text');
      if (textEl) normalize(textEl);
    }, true);

    document.addEventListener('input', event => {
      const textEl = event.target.closest?.('.block-text');
      if (textEl && !composing) normalize(textEl);
    }, true);

    document.addEventListener('keydown', event => {
      const textEl = event.target?.closest?.('.block-text');
      if (!textEl || event.isComposing) return;
      const editor = textEl.closest('.block-editor');
      if (!editor) return;

      const command = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (command && !event.altKey && !event.shiftKey && key === 'a') {
        event.preventDefault();
        event.stopImmediatePropagation();
        selectWholeEditor(editor);
        return;
      }

      if (command && !event.altKey && !event.shiftKey && key === 'i') {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (editor.dataset.fullSelection === '1') toggleWholeEditorItalic(editor);
        else toggleSelectionItalic(textEl);
        return;
      }

      if (!command && !event.altKey && event.key === '"') {
        if (editor.dataset.fullSelection === '1') {
          event.preventDefault();
          event.stopImmediatePropagation();
          replaceEditor(editor, '« ');
        } else {
          insertSmartQuote(event, textEl);
        }
        return;
      }

      if (editor.dataset.fullSelection === '1' && event.key === 'Enter') {
        event.preventDefault();
        event.stopImmediatePropagation();
        replaceEditor(editor, '');
        return;
      }

      if (editor.dataset.fullSelection === '1'
        && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Escape', 'Tab'].includes(event.key)) {
        clearFullSelection(editor);
      }
    }, true);

    document.addEventListener('beforeinput', event => {
      const textEl = event.target?.closest?.('.block-text');
      const editor = textEl?.closest('.block-editor');
      if (!editor || editor.dataset.fullSelection !== '1') return;

      if (event.inputType === 'insertText' && typeof event.data === 'string') {
        event.preventDefault();
        replaceEditor(editor, event.data);
        return;
      }

      if (event.inputType === 'deleteContentBackward'
        || event.inputType === 'deleteContentForward'
        || event.inputType === 'deleteByCut') {
        event.preventDefault();
        replaceEditor(editor, '');
      }
    }, true);

    document.addEventListener('copy', event => {
      const editor = editorFromTarget(event.target);
      if (!editor || editor.dataset.fullSelection !== '1') return;
      event.preventDefault();
      event.clipboardData?.setData('text/plain', serializeVisibleEditor(editor));
    }, true);

    document.addEventListener('cut', event => {
      const editor = editorFromTarget(event.target);
      if (!editor || editor.dataset.fullSelection !== '1') return;
      event.preventDefault();
      event.clipboardData?.setData('text/plain', serializeVisibleEditor(editor));
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

    document.addEventListener('pointerdown', () => {
      document.querySelectorAll('.block-editor[data-full-selection="1"]').forEach(clearFullSelection);
    }, true);

    new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) normalizeWithin(node);
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  window.CRAgendaRichText = Object.freeze({
    stripMarkers,
    tokensFromElement,
    renderTokens,
    visibleSelectionOffsets,
    restoreVisibleSelection,
    splitTokensAtVisibleRange,
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup, { once: true });
  } else {
    setup();
  }
})();
