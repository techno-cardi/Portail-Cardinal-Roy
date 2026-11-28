const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sourceFile = path.join(__dirname, '..', 'holidays-2026.js');

function launchTheme(timestamp, hasPortal = true, search = '') {
  const nodes = new Map();
  const attributes = new Map();
  const classes = new Set();
  const timers = [];
  const handlers = new Map();
  let observerCallback;

  function makeNode(name) {
    return {
      name, children: [], attributes: {}, innerHTML: '',
      appendChild(child) { this.children.push(child); if (child.attributes['data-holiday-decor']) nodes.set(child.attributes['data-holiday-decor'], child); },
      setAttribute(key, value) { this.attributes[key] = value; },
      remove() { nodes.delete(this.attributes['data-holiday-decor']); },
      querySelector(selector) { return nodes.get(selector.match(/data-holiday-decor="([^"]+)"/)?.[1]); }
    };
  }
  const masthead = makeNode('masthead');
  const stage = makeNode('search-stage');
  const body = makeNode('body');
  const document = {
    readyState: 'complete', hidden: false, body,
    documentElement: { classList: {
      add: n => classes.add(n),
      remove: (...names) => names.forEach(n => classes.delete(n)),
      contains: n => classes.has(n),
      toggle: (n, force) => force ? classes.add(n) : classes.delete(n)
    } },
    querySelector: selector => hasPortal && ({ '.masthead': masthead, '.search-stage': stage, '#app': body })[selector],
    querySelectorAll: () => [...nodes.values()],
    createElement: makeNode,
    addEventListener: (name, cb) => handlers.set(name, cb)
  };
  const window = {
    innerWidth: 1200,
    location: { search },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    addEventListener: (name, cb) => handlers.set(name, cb)
  };
  class MutationObserver {
    constructor(cb) { observerCallback = cb; }
    observe() {}
    disconnect() {}
  }
  const FakeDate = class extends Date { static now() { return timestamp; } };
  const context = {
    document, window, MutationObserver, Date: FakeDate,
    setTimeout: (cb, delay) => { timers.push({ cb, delay }); return timers.length; },
    clearTimeout() {},
    console
  };
  vm.runInNewContext(fs.readFileSync(sourceFile, 'utf8'), context, { filename: sourceFile });
  return { nodes, classes, timers, handlers, triggerObserver: () => observerCallback?.(), masthead, stage };
}

test('holiday decor waits for December 1 in Toronto', () => {
  const page = launchTheme(Date.parse('2026-11-30T23:59:59-05:00'));
  assert.equal(page.classes.has('cardi-holiday'), false);
  assert.equal(page.nodes.size, 0);
  assert.ok(page.timers.some(t => t.delay > 0 && t.delay <= 1000));
});

test('holiday preview displays decorations before December 1 only with the preview URL', () => {
  const page = launchTheme(Date.parse('2026-11-28T12:00:00-05:00'), true, '?theme=noel');
  assert.equal(page.classes.has('cardi-holiday'), true);
  assert.ok(page.nodes.has('scene'));
  assert.ok(page.nodes.has('lights'));
});

test('holiday decor adds illuminated tree, snowman and garland during the season', () => {
  const page = launchTheme(Date.parse('2026-12-24T12:00:00-05:00'));
  assert.equal(page.classes.has('cardi-holiday'), true);
  assert.ok(page.nodes.has('scene'));
  assert.ok(page.nodes.has('lights'));
  assert.ok(page.nodes.has('snow'));
  assert.match(page.nodes.get('scene').innerHTML, /holiday-tree-light/);
  assert.match(page.nodes.get('scene').innerHTML, /holiday-snowman/);
  assert.ok(page.timers.some(t => t.delay > 0));
});

test('holiday decor expires on January 7 and remains absent thereafter', () => {
  const page = launchTheme(Date.parse('2027-01-07T00:00:00-05:00'));
  assert.equal(page.classes.has('cardi-holiday'), false);
  assert.equal(page.nodes.size, 0);
});

test('holiday decorations never appear in forced reduced motion as falling snow', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'holidays-2026.css'), 'utf8');
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /\.holiday-snowflake\s*\{[^}]*animation:\s*none/s);
});
