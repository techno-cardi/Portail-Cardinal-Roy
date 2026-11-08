/* Skin saisonnier autonome du 1er au 30 novembre 2026, fuseau de Québec. */
(function () {
  'use strict';

  var ROOT_CLASS = 'cardi-november';
  var MARKER = 'data-november-decor';
  var START = Date.parse('2026-11-01T00:00:00-04:00');
  var END = Date.parse('2026-12-01T00:00:00-05:00');
  var CHANGE_TIMES = [
    '2026-11-01T00:00:00-04:00',
    '2026-11-11T00:00:00-05:00',
    '2026-11-12T00:00:00-05:00',
    '2026-11-15T00:00:00-05:00',
    '2026-11-24T00:00:00-05:00',
    '2026-12-01T00:00:00-05:00'
  ].map(function (date) { return Date.parse(date); });
  var formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit'
  });
  var observer = null;
  var schedule = null;
  var layer = null;
  var stopped = false;
  var particleKey = '';
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  var leafSvg = '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M20 2l4 8 7-3-2 9 8 4-9 5 2 9-9-3-2 7-3-8-9 2 3-8-7-5 9-3-2-9 8 3z" fill="currentColor"/><path d="M19 10l1 23" stroke="#fff5e9" stroke-width="1.1" opacity=".38"/></svg>';
  var snowSvg = '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"><path d="M20 4v32M4 20h32M9 9l22 22M31 9L9 31"/><path d="M15 8l5 5 5-5M15 32l5-5 5 5M8 15l5 5-5 5M32 15l-5 5 5 5"/></g></svg>';
  var branchSvg = '<svg viewBox="0 0 260 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<g fill="none" stroke="#ad856e" stroke-width="2.3" stroke-linecap="round">' +
    '<path d="M265-4C233 16 217 44 182 59S119 83 87 115"/>' +
    '<path d="M217 38C217 27 215 20 200 6M182 59C176 42 161 30 149 26M155 70C157 56 152 41 143 34M120 88C110 80 99 75 84 75M109 96C113 112 108 124 97 135"/>' +
    '</g><g opacity=".92">' +
    '<path d="M200 5c-13-1-23 4-24 17 13 0 23-5 24-17z" fill="#bc623f"/>' +
    '<path d="M148 26c-9-11-22-15-33-7 8 12 20 15 33 7z" fill="#d99a55"/>' +
    '<path d="M143 34c8-15 8-27-3-35-9 12-8 26 3 35z" fill="#9f3441"/>' +
    '<path d="M83 75c-10-13-23-17-36-10 8 13 21 17 36 10z" fill="#b95339"/>' +
    '<path d="M97 135c-14-4-24-2-29 11 14 4 25-1 29-11z" fill="#d28d47"/>' +
    '<path d="M234 22c6-14 5-26-7-34-8 13-5 27 7 34z" fill="#d19850"/>' +
    '</g></svg>';
  var frostSvg = '<svg viewBox="0 0 130 115" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<g fill="none" stroke="#d7e9ed" stroke-width="1.4" stroke-linecap="round">' +
    '<path d="M130 0L35 86M94 31l-4-20m4 20 22-1M71 52l-5-19m5 19 20 1M49 73l-18-3m18 3 3 21"/>' +
    '<path d="M130 35L86 79m24-24-3-15m3 15 16 1M91 74l-14-2m14 2 3 13"/>' +
    '<path d="M104 0L87 18m9-9-1-9m1 9 10 2"/></g></svg>';
  var poppySvg = '<svg viewBox="0 0 50 56" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<path d="M25 30C27 40 26 46 22 55" fill="none" stroke="#557c52" stroke-width="2"/>' +
    '<path d="M25 23C9 6-3 19 12 29 1 40 17 47 25 33c10 16 25 4 16-6C53 13 35 5 25 23z" fill="#b82236"/>' +
    '<path d="M25 23C13 16 8 24 19 29c-6 8 4 12 7 4 5 8 13 1 7-5 8-7-1-13-8-5z" fill="#e0464d" opacity=".55"/>' +
    '<circle cx="26" cy="28" r="6" fill="#292429"/><circle cx="26" cy="28" r="2.4" fill="#d2a44f"/></svg>';

  function dateAtSchool() {
    var parts = {};
    formatter.formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
    return parts.year + '-' + parts.month + '-' + parts.day;
  }
  function isActive(date) {
    return date >= '2026-11-01' && date <= '2026-11-30' && Date.now() < END;
  }
  function phaseFor(date) {
    if (date < '2026-11-15') return 'autumn';
    if (date < '2026-11-24') return 'transition';
    return 'winter';
  }
  function addArt(parent, type, cssClass, svg) {
    if (parent.querySelector('[' + MARKER + '="' + type + '"]')) return;
    var element = document.createElement('div');
    element.className = cssClass;
    element.setAttribute(MARKER, type);
    element.setAttribute('aria-hidden', 'true');
    element.innerHTML = svg;
    parent.appendChild(element);
  }
  function decoratePortal(date) {
    var masthead = document.querySelector('#app .masthead');
    var stage = document.querySelector('#app .search-stage');
    if (!masthead || !stage) return false;

    addArt(masthead, 'branch', 'november-branch', branchSvg);
    addArt(stage, 'frost', 'november-frost', frostSvg);

    var poppy = masthead.querySelector('[' + MARKER + '="poppy"]');
    if (date === '2026-11-11') {
      addArt(masthead, 'poppy', 'november-poppy', poppySvg);
    } else if (poppy) {
      poppy.remove();
    }
    return true;
  }
  function observePortal(date) {
    if (decoratePortal(date)) {
      if (observer) observer.disconnect();
      observer = null;
      return;
    }
    if (observer) return;
    var root = document.getElementById('app');
    if (!root) return;
    observer = new MutationObserver(function () {
      if (stopped) return;
      if (decoratePortal(dateAtSchool())) {
        observer.disconnect();
        observer = null;
      }
    });
    observer.observe(root, { childList:true, subtree:true });
  }
  function deviceTier() {
    return window.innerWidth <= 720 ? 'mobile' : window.innerWidth <= 1000 ? 'tablet' : 'desktop';
  }
  function addParticle(type, index) {
    var point = [5,91,13,83,3,96,20,79,9,88][index % 10];
    var element = document.createElement('div');
    var isSnow = type === 'snow';
    element.className = 'november-particle november-particle--' + type;
    element.setAttribute('aria-hidden', 'true');
    element.style.setProperty('--november-x', point + '%');
    element.style.setProperty('--november-size', (isSnow ? 10 + (index % 3) * 3 : 16 + (index % 4) * 3) + 'px');
    element.style.setProperty('--november-duration', (isSnow ? 20 + (index % 4) * 3 : 17 + (index % 4) * 4) + 's');
    element.style.setProperty('--november-delay', '-' + (2 + index * 3.8) + 's');
    element.style.setProperty('--november-drift', ((index % 2 ? -1 : 1) * (20 + index * 5)) + 'px');
    element.style.setProperty('--november-color',
      isSnow ? '#9dbbc6' : ['#b6593c','#d59b50','#9c3440','#ba7241'][index % 4]);
    element.innerHTML = isSnow ? snowSvg : leafSvg;
    layer.appendChild(element);
  }
  function renderParticles(phase) {
    var tier = deviceTier();
    var key = phase + '|' + tier + '|' + (reducedMotion.matches ? 'still' : 'motion');
    if (particleKey === key) return;
    particleKey = key;
    layer.textContent = '';
    if (reducedMotion.matches) return;
    var counts = {
      autumn: { desktop:[8,0], tablet:[6,0], mobile:[4,0] },
      transition: { desktop:[4,3], tablet:[3,2], mobile:[2,2] },
      winter: { desktop:[2,6], tablet:[2,4], mobile:[1,3] }
    }[phase][tier];
    for (var i = 0; i < counts[0]; i++) addParticle('leaf',i);
    for (var j = 0; j < counts[1]; j++) addParticle('snow',counts[0] + j);
  }
  function nextWake() {
    if (schedule) clearTimeout(schedule);
    var now = Date.now();
    var next = CHANGE_TIMES.find(function (time) { return time > now; }) || END;
    schedule = setTimeout(sync, Math.max(1,Math.min(86400000,next - now)));
  }
  function cleanUp() {
    if (stopped) return;
    stopped = true;
    if (schedule) clearTimeout(schedule);
    if (observer) observer.disconnect();
    document.documentElement.classList.remove(ROOT_CLASS,'november-paused');
    document.documentElement.removeAttribute('data-november-phase');
    document.querySelectorAll('[' + MARKER + ']').forEach(function (node) { node.remove(); });
    layer = null;
  }
  function sync() {
    if (stopped) return;
    var date = dateAtSchool();
    if (!isActive(date)) {
      if (Date.now() < START) { nextWake(); return; }
      cleanUp(); return;
    }

    document.documentElement.classList.add(ROOT_CLASS);
    document.documentElement.classList.toggle('november-paused',document.hidden);
    var phase = phaseFor(date);
    document.documentElement.setAttribute('data-november-phase',phase);
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'november-ambient';
      layer.setAttribute(MARKER,'layer');
      layer.setAttribute('aria-hidden','true');
      document.body.appendChild(layer);
    }
    renderParticles(phase);
    observePortal(date);
    nextWake();
  }
  if (Date.now() >= END) return;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded',sync,{once:true});
  } else {
    sync();
  }
  window.addEventListener('pageshow',sync);
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('resize',function () {
    if (!stopped && layer && !document.hidden) renderParticles(phaseFor(dateAtSchool()));
  },{passive:true});
  if (typeof reducedMotion.addEventListener === 'function') {
    reducedMotion.addEventListener('change',sync);
  } else if (typeof reducedMotion.addListener === 'function') {
    reducedMotion.addListener(sync);
  }
})();
