/* Décor du 30 et 31 octobre 2026. Aucun impact sur les moteurs ou les données du portail. */
(() => {
  'use strict';

  const TIME_ZONE = 'America/Toronto';
  const END_MS = Date.parse('2026-11-01T00:00:00-04:00');
  const formatDate = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const schoolDate = () => {
    const parts = Object.fromEntries(
      formatDate.formatToParts(new Date()).map(({ type, value }) => [type, value])
    );
    return `${parts.year}-${parts.month}-${parts.day}`;
  };
  const isHalloween = () => {
    const day = schoolDate();
    return day === '2026-10-30' || day === '2026-10-31';
  };

  if (!isHalloween()) return;

  const decorAttribute = 'data-halloween-2026';
  const web = `<svg viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <g fill="none" stroke="#ffe0b9" stroke-width="1.7" stroke-linecap="round">
      <path d="M1 1 H179 M1 1 V179 M1 1 L179 179 M1 1 L179 89 M1 1 L89 179 M1 1 L148 47 M1 1 L47 148"/>
      <path d="M1 31 Q19 24 31 1 M1 60 Q41 48 60 1 M1 91 Q64 73 91 1 M1 121 Q86 97 121 1 M1 151 Q108 122 151 1"/>
    </g>
  </svg>`;

  let observer;
  let expired = false;

  const endHalloween = () => {
    if (expired) return;
    expired = true;
    document.documentElement.classList.remove('cardi-halloween');
    observer?.disconnect();
    document.querySelectorAll(`[${decorAttribute}]`).forEach(node => node.remove());
  };

  const addDecoration = (parent, className, content, asHtml = false) => {
    const el = document.createElement('div');
    el.className = className;
    el.setAttribute(decorAttribute, '');
    el.setAttribute('aria-hidden', 'true');
    if (asHtml) el.innerHTML = content;
    else el.textContent = content;
    parent.appendChild(el);
    return el;
  };

  const decorate = () => {
    if (expired) return true;
    if (!isHalloween()) {
      endHalloween();
      return true;
    }

    const masthead = document.querySelector('#app .masthead');
    const intro = masthead?.querySelector('.masthead-copy');
    const stage = document.querySelector('#app .search-stage');
    if (!masthead || !intro || !stage) return false;

    if (!intro.querySelector('.halloween-greeting')) {
      const greeting = addDecoration(
        intro,
        'halloween-greeting',
        '<span aria-hidden="true">🎃</span> Joyeuse Halloween!',
        true
      );
      greeting.removeAttribute('aria-hidden');
    }

    if (!masthead.querySelector('.halloween-masthead-art')) {
      addDecoration(masthead, 'halloween-masthead-art',
        '<span class="halloween-moon">🌙</span>' +
        '<span class="halloween-witch">🧙‍♀️</span>' +
        '<span class="halloween-bat">🦇</span>' +
        '<span class="halloween-pumpkins">🎃🎃</span>', true);
    }

    if (!stage.querySelector('.halloween-web--left')) {
      addDecoration(stage, 'halloween-web halloween-web--left', web, true);
      addDecoration(stage, 'halloween-web halloween-web--right', web, true);
      addDecoration(stage, 'halloween-spider', '🕷️');
      addDecoration(stage, 'halloween-stage-pumpkin', '🎃');
    }
    return true;
  };

  const observeUntilReady = () => {
    if (expired || decorate()) return;
    if (observer) return;
    observer = new MutationObserver(() => {
      if (decorate()) {
        observer.disconnect();
        observer = null;
      }
    });
    observer.observe(document.getElementById('app') || document.body, {
      childList: true,
      subtree: true
    });
  };

  const onVisible = () => {
    if (expired) return;
    if (!isHalloween()) endHalloween();
    else observeUntilReady();
  };

  document.documentElement.classList.add('cardi-halloween');
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeUntilReady, { once: true });
  } else {
    observeUntilReady();
  }

  // Retire le thème même si l'onglet est resté ouvert après minuit à Québec.
  window.setTimeout(endHalloween, Math.max(0, END_MS - Date.now()));
  window.addEventListener('pageshow', onVisible);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) onVisible();
  });
})();
