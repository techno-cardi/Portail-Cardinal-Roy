/* Décor de Noël autonome du 1er décembre 2026 au 6 janvier 2027 inclusivement, heure du Québec. */
(() => {
  'use strict';

  const START = Date.parse('2026-12-01T00:00:00-05:00');
  const END = Date.parse('2027-01-07T00:00:00-05:00');
  const PREVIEW = /(?:\?|&)theme=noel(?:&|$)/.test(window.location?.search || '');
  const ROOT_CLASS = 'cardi-holiday';
  const ATTR = 'data-holiday-decor';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let observer = null;
  let wakeTimer = null;
  let finished = false;

  const treeLights = [
    [92,51,'#ffe6a5'], [80,68,'#ef5e65'], [105,77,'#82d3e9'],
    [65,91,'#f8d076'], [119,100,'#e96d73'], [93,111,'#bfe3bb'],
    [53,123,'#f7d27a'], [76,132,'#f28c8d'], [109,127,'#a6ddea'],
    [129,139,'#ffedb5']
  ].map(([x,y,color], i) => `
    <g class="holiday-tree-light" style="--holiday-delay:-${(i % 5) * .7}s">
      <circle cx="${x}" cy="${y}" r="6" fill="${color}" opacity=".17"/>
      <circle cx="${x}" cy="${y}" r="2.7" fill="${color}" stroke="#fff9dd" stroke-width=".8"/>
    </g>`).join('');

  const sceneSvg = `<svg viewBox="0 0 288 180" xmlns="http://www.w3.org/2000/svg" role="presentation" focusable="false">
    <defs>
      <linearGradient id="holiday-pine" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#3c8761"/><stop offset=".52" stop-color="#20583f"/><stop offset="1" stop-color="#103e32"/></linearGradient>
      <linearGradient id="holiday-snow" x1="0" x2=".8" y1="0" y2="1"><stop stop-color="#fff"/><stop offset="1" stop-color="#d6eaf0"/></linearGradient>
      <linearGradient id="holiday-scarf" x1="0" x2="1"><stop stop-color="#8e1830"/><stop offset="1" stop-color="#ca3040"/></linearGradient>
    </defs>
    <ellipse cx="143" cy="167" rx="140" ry="9" fill="#d7eaf0" opacity=".64"/>
    <g class="holiday-tree">
      <path d="M88 142v22" fill="none" stroke="#7d4d35" stroke-width="14" stroke-linecap="round"/>
      <path d="M88 28L58 76l9-1-34 60 14-3-14 19h110l-14-19 14 3-34-60 9 1z" fill="url(#holiday-pine)" stroke="#174b38" stroke-width="2" stroke-linejoin="round"/>
      <path d="M88 28L68 73h20L55 127h33v24H33l14-19-14 3 34-60-9 1z" fill="#3d9467" opacity=".45"/>
      <path d="M64 71q24 13 49 0M47 118q41 19 82-2M38 142q44 16 100-1" fill="none" stroke="#e7c57f" stroke-width="3.4" stroke-linecap="round" stroke-dasharray="1 7" opacity=".96"/>
      <path d="M88 15l4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1z" fill="#f5d580" stroke="#f6b94f" stroke-width="1.3"/>
      <path d="M88 18v16M80 26h16" stroke="#fff9c7" stroke-width="1.5" opacity=".9"/>
      ${treeLights}
    </g>
    <g class="holiday-gifts">
      <rect x="17" y="148" width="28" height="20" rx="3" fill="#aa2540"/><path d="M30 148v20M17 156h28" stroke="#f3cf76" stroke-width="4"/>
      <path d="M30 148c-15-9-14-18-7-13 4 3 7 8 7 13zm0 0c14-9 13-18 7-13-4 3-7 8-7 13" fill="none" stroke="#f3cf76" stroke-width="3"/>
      <rect x="135" y="153" width="24" height="15" rx="2" fill="#3c795d"/><path d="M146 153v15M135 160h24" stroke="#f2d394" stroke-width="3"/>
    </g>
    <g class="holiday-snowman">
      <path d="M228 128l26-19M187 125l-25-15" stroke="#765342" stroke-width="3.8" stroke-linecap="round"/>
      <path d="M250 110l8-10M253 112l12 0M163 111l-7-11M160 109l-11-3" stroke="#765342" stroke-width="2.5" stroke-linecap="round"/>
      <ellipse cx="208" cy="142" rx="36" ry="31" fill="url(#holiday-snow)" stroke="#bad5dd" stroke-width="1.8"/>
      <circle cx="207" cy="98" r="26" fill="url(#holiday-snow)" stroke="#bad5dd" stroke-width="1.8"/>
      <circle cx="198" cy="92" r="2.6" fill="#303f46"/><circle cx="215" cy="92" r="2.6" fill="#303f46"/>
      <path d="M207 97l24 5-24 4z" fill="#ea8c3c" stroke="#d96d2d" stroke-width="1"/>
      <path d="M198 111q9 8 19-1" fill="none" stroke="#77625a" stroke-width="1.8" stroke-linecap="round" stroke-dasharray="1 4"/>
      <path d="M184 113q22 14 47-2l5 10q-23 17-53 1z" fill="url(#holiday-scarf)"/>
      <path d="M227 116l6 35 9-5-4-31z" fill="#b9263d"/>
      <circle cx="208" cy="132" r="2.5" fill="#45505b"/><circle cx="209" cy="145" r="2.5" fill="#45505b"/>
      <path d="M177 78h64v-8h-64z" fill="#39444b"/><path d="M189 45h40v28h-40z" fill="#303e44"/>
      <path d="M189 62h40v7h-40z" fill="#a8293f"/><path d="M194 47h30" stroke="#657983" stroke-width="2" opacity=".7"/>
      <circle cx="190" cy="82" r="5" fill="#fff" opacity=".74"/>
    </g>
    <path d="M6 172q37-10 74 0 29-6 63 1 50-12 94-1 23-5 45-1" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".8"/>
    <g fill="#fff" opacity=".86"><circle cx="164" cy="40" r="2.2"/><circle cx="252" cy="47" r="1.8"/><circle cx="19" cy="45" r="2"/><circle cx="276" cy="122" r="1.6"/></g>
  </svg>`;

  const garlandBulbs = [45,115,185,255,675,745,815,885]
    .map((x,i) => {
      const fraction = x < 325 ? x / 320 : (930 - x) / 320;
      const y = 9 + 17 * Math.sin(fraction * Math.PI);
      const color = ['#ffe2a3','#b6e5c2','#fc8d8b','#acd9f2'][i % 4];
      return `<g class="holiday-string-light" style="--holiday-delay:-${(i % 4) * .65}s">
        <path d="M${x} ${y.toFixed(1)}v7" stroke="#25483f" stroke-width="2"/>
        <rect x="${x-4}" y="${(y+5).toFixed(1)}" width="8" height="5" rx="1.5" fill="#315246"/>
        <ellipse cx="${x}" cy="${(y+16).toFixed(1)}" rx="5.5" ry="7" fill="${color}"/>
      </g>`;
    }).join('');

  const garlandSvg = `<svg viewBox="0 0 930 50" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" role="presentation" focusable="false">
    <path d="M0 0Q160 44 320 0M610 0Q770 44 930 0" stroke="#284b3d" fill="none" stroke-width="2.5"/>${garlandBulbs}
  </svg>`;

  function append(parent, name, className, markup) {
    if (parent.querySelector(`[${ATTR}="${name}"]`)) return;
    const node = document.createElement('div');
    node.className = className;
    node.setAttribute(ATTR, name);
    node.setAttribute('aria-hidden', 'true');
    node.innerHTML = markup;
    parent.appendChild(node);
  }

  function decorate() {
    const masthead = document.querySelector('.masthead');
    const stage = document.querySelector('.search-stage');
    if (!masthead || !stage) return false;
    append(masthead, 'scene', 'holiday-scene', sceneSvg);
    append(stage, 'lights', 'holiday-lightline', garlandSvg);
    const flakes = Array.from({ length: 9 }, (_,i) => `<i class="holiday-snowflake" style="--x:${8 + i*10}%;--delay:-${i*2.8}s;--duration:${15 + i%3*4}s"></i>`).join('');
    append(stage, 'snow', 'holiday-flurries', flakes);
    return true;
  }

  function observePortal() {
    if (decorate()) { observer?.disconnect(); observer = null; return; }
    if (observer) return;
    const app = document.querySelector('#app');
    if (!app) return;
    observer = new MutationObserver(() => {
      if (decorate()) { observer.disconnect(); observer = null; }
    });
    observer.observe(app, { childList:true, subtree:true });
  }

  function schedule(nextDate) {
    if (wakeTimer) clearTimeout(wakeTimer);
    const remaining = nextDate - Date.now();
    if (remaining > 0) wakeTimer = setTimeout(sync, Math.min(remaining, 86400000));
  }

  function cleanup() {
    if (finished) return;
    finished = true;
    if (wakeTimer) clearTimeout(wakeTimer);
    observer?.disconnect();
    document.documentElement.classList.remove(ROOT_CLASS, 'holiday-paused');
    document.querySelectorAll(`[${ATTR}]`).forEach(node => node.remove());
  }

  function sync() {
    if (finished) return;
    const now = Date.now();
    if (now >= END) { cleanup(); return; }
    if (now < START && !PREVIEW) { schedule(START); return; }
    document.documentElement.classList.add(ROOT_CLASS);
    document.documentElement.classList.toggle('holiday-paused', document.hidden);
    observePortal();
    schedule(END);
  }

  if (Date.now() >= END) return;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sync, {once:true});
  else sync();
  window.addEventListener('pageshow',sync);
  document.addEventListener('visibilitychange',sync);
})();
