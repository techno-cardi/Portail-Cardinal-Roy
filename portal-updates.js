(() => {
  'use strict';

  const main = document.querySelector('.main-layout');
  const quickArea = main?.querySelector('.quick-area');
  if (!main || document.getElementById('portal-updates')) return;

  const FEED_URL = 'portal-updates.json';
  const MAX_VISIBLE = 3;
  const DEFAULT_LIFETIME_DAYS = 28;
  const REFRESH_MS = 10 * 60 * 1000;
  const ROTATION_MS = 6000;
  const TIMEZONE = 'America/Toronto';
  const MOBILE_QUERY = '(max-width: 620px)';

  const style = document.createElement('style');
  style.id = 'portal-updates-style';
  style.textContent = `
    .portal-updates{margin:22px 0 8px}
    .portal-updates[hidden]{display:none!important}
    .portal-updates-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:10px}
    .portal-updates-head h2{margin:0;font-size:1.18rem;line-height:1.15}
    .portal-updates-head p{margin:3px 0 0;color:#65707d;font-size:.9rem}
    .portal-updates-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
    .portal-updates[data-item-count="1"] .portal-updates-list{grid-template-columns:minmax(0,520px)}
    .portal-updates[data-item-count="2"] .portal-updates-list{grid-template-columns:repeat(2,minmax(0,1fr))}
    .portal-update-item{min-width:0;padding:12px 13px;border:1px solid #e0e4e8;border-radius:12px;background:#fff;box-shadow:0 2px 9px rgba(32,39,49,.05);color:inherit;text-decoration:none;transition:transform .15s ease,border-color .15s ease,box-shadow .15s ease}
    a.portal-update-item:hover,a.portal-update-item:focus-visible{transform:translateY(-1px);border-color:#c9a7af;box-shadow:0 5px 16px rgba(32,39,49,.09);outline:none;text-decoration:none}
    .portal-update-meta{display:flex;align-items:center;gap:7px;min-width:0;margin-bottom:6px}
    .portal-update-badge{flex:0 0 auto;display:inline-flex;align-items:center;min-height:21px;padding:2px 7px;border-radius:999px;background:#f5e9ec;color:#7f1427;font-size:.69rem;font-weight:800;letter-spacing:.025em;text-transform:uppercase}
    .portal-update-date{min-width:0;color:#7a838d;font-size:.76rem;font-weight:600;white-space:nowrap}
    .portal-update-title{margin:0;color:#242a31;font-size:.96rem;font-weight:750;line-height:1.25}
    .portal-update-description{margin:5px 0 0;color:#5f6872;font-size:.84rem;line-height:1.38}
    .portal-update-action{display:inline-flex;align-items:center;gap:4px;margin-top:8px;color:#7f1427;font-size:.78rem;font-weight:750}
    .portal-updates-controls{display:none;align-items:center;gap:7px;white-space:nowrap}
    .portal-updates-nav{display:grid;place-items:center;width:34px;height:34px;padding:0;border:1px solid #d6dbe0;border-radius:8px;background:#fff;color:#7f1427;font:800 1.1rem/1 system-ui,sans-serif;cursor:pointer;box-shadow:0 1px 4px rgba(32,39,49,.05)}
    .portal-updates-nav:hover,.portal-updates-nav:focus-visible{background:#f8eef1;border-color:#c9a7af;outline:none}
    .portal-updates-count{min-width:38px;text-align:center;color:#6d7680;font-size:.78rem;font-weight:700;font-variant-numeric:tabular-nums}
    @media(max-width:900px) and (min-width:621px){.portal-updates-list{grid-template-columns:repeat(2,minmax(0,1fr))}.portal-updates[data-item-count="3"] .portal-update-item:last-child{grid-column:1 / -1}}
    @media(max-width:620px){
      .portal-updates{margin-top:18px}
      .portal-updates-head{align-items:center}
      .portal-updates-list,.portal-updates[data-item-count="1"] .portal-updates-list,.portal-updates[data-item-count="2"] .portal-updates-list{display:block;max-width:none;touch-action:pan-y}
      .portal-update-item{display:none;padding:12px}
      .portal-update-item.is-active{display:block}
      .portal-updates-controls{display:flex}
      .portal-updates[data-item-count="1"] .portal-updates-controls{display:none}
    }
    @media(prefers-reduced-motion:reduce){.portal-update-item{transition:none}}
  `;
  document.head.appendChild(style);

  const section = document.createElement('section');
  section.id = 'portal-updates';
  section.className = 'portal-updates';
  section.hidden = true;
  section.setAttribute('aria-labelledby', 'portal-updates-title');
  section.innerHTML = `
    <div class="portal-updates-head">
      <div>
        <h2 id="portal-updates-title">Nouveautés</h2>
        <p>Ajouts et mises à jour à connaître.</p>
      </div>
      <div class="portal-updates-controls" aria-label="Navigation des nouveautés">
        <button class="portal-updates-nav portal-updates-prev" type="button" aria-label="Nouveauté précédente">‹</button>
        <span class="portal-updates-count" aria-hidden="true"></span>
        <button class="portal-updates-nav portal-updates-next" type="button" aria-label="Nouveauté suivante">›</button>
      </div>
    </div>
    <div class="portal-updates-list" id="portal-updates-list"></div>`;

  if (quickArea) quickArea.insertAdjacentElement('afterend', section);
  else main.prepend(section);

  const list = section.querySelector('#portal-updates-list');
  const count = section.querySelector('.portal-updates-count');
  const prevButton = section.querySelector('.portal-updates-prev');
  const nextButton = section.querySelector('.portal-updates-next');
  const mobileMedia = window.matchMedia(MOBILE_QUERY);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let refreshTimer = 0;
  let rotationTimer = 0;
  let lastSignature = '';
  let renderedItems = [];
  let currentIndex = 0;
  let touchStartX = 0;
  let touchStartY = 0;

  const localDateKey = value => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(value);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  };

  const isDateKey = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));

  const addDays = (dateKey, days) => {
    if (!isDateKey(dateKey)) return '';
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day + days, 12));
    return date.toISOString().slice(0, 10);
  };

  const safeTarget = value => {
    const target = String(value || '').trim();
    if (/^#[A-Za-z0-9][A-Za-z0-9_-]*$/.test(target)) return target;
    if (/^https:\/\//i.test(target)) return target;
    return '';
  };

  const normalizeItem = (raw, position) => {
    if (!raw || typeof raw !== 'object') return null;
    const title = String(raw.title || '').trim();
    const publishedAt = String(raw.published_at || raw.date || '').slice(0, 10);
    if (!title || !isDateKey(publishedAt)) return null;

    const expiresAt = isDateKey(raw.expires_at)
      ? String(raw.expires_at)
      : addDays(publishedAt, DEFAULT_LIFETIME_DAYS);
    const target = safeTarget(raw.target);
    const requestedTargetType = String(raw.target_type || '').trim().toLowerCase();
    const targetType = requestedTargetType === 'file' && /^https:\/\//i.test(target) ? 'file' : 'resource';

    return {
      id: String(raw.id || `${publishedAt}-${position}`),
      title,
      description: String(raw.description || '').trim(),
      publishedAt,
      expiresAt,
      target,
      targetType,
      kind: String(raw.kind || 'nouveau').toLowerCase() === 'maj' ? 'maj' : 'nouveau'
    };
  };

  const visibleItems = feed => {
    const today = localDateKey(new Date());
    const rawItems = Array.isArray(feed?.items) ? feed.items : [];
    const seen = new Set();
    return rawItems
      .map(normalizeItem)
      .filter(Boolean)
      .filter(item => item.publishedAt <= today && item.expiresAt >= today)
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.title.localeCompare(b.title, 'fr'))
      .filter(item => {
        const key = item.target || `${item.title.toLocaleLowerCase('fr')}|${item.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, MAX_VISIBLE);
  };

  const dateLabel = dateKey => {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Intl.DateTimeFormat('fr-CA', {
      timeZone: TIMEZONE,
      day: 'numeric',
      month: 'short'
    }).format(new Date(Date.UTC(year, month - 1, day, 12))).replace('.', '');
  };

  const renderItem = item => {
    const element = document.createElement(item.target ? 'a' : 'article');
    element.className = 'portal-update-item';
    element.dataset.updateId = item.id;
    element.dataset.targetType = item.targetType;

    if (item.target) {
      element.href = item.target;
      if (item.target.startsWith('https://')) {
        element.target = '_blank';
        element.rel = 'noopener noreferrer';
      }
    }

    const meta = document.createElement('div');
    meta.className = 'portal-update-meta';

    const badge = document.createElement('span');
    badge.className = 'portal-update-badge';
    badge.textContent = item.kind === 'maj' ? 'Mis à jour' : 'Nouveau';

    const date = document.createElement('span');
    date.className = 'portal-update-date';
    date.textContent = dateLabel(item.publishedAt);

    const title = document.createElement('h3');
    title.className = 'portal-update-title';
    title.textContent = item.title;

    meta.append(badge, date);
    element.append(meta, title);

    if (item.description) {
      const description = document.createElement('p');
      description.className = 'portal-update-description';
      description.textContent = item.description;
      element.appendChild(description);
    }

    if (item.target) {
      const action = document.createElement('span');
      action.className = 'portal-update-action';
      if (item.targetType === 'file') action.textContent = 'Accéder au fichier';
      else action.textContent = item.target.startsWith('#') ? 'Voir la procédure →' : 'Ouvrir ↗';
      element.appendChild(action);
    }

    return element;
  };

  const stopRotation = () => {
    if (rotationTimer) window.clearInterval(rotationTimer);
    rotationTimer = 0;
  };

  const syncCarousel = () => {
    const cards = [...list.querySelectorAll('.portal-update-item')];
    if (!cards.length) return;

    currentIndex = Math.max(0, Math.min(currentIndex, cards.length - 1));
    const mobile = mobileMedia.matches;

    cards.forEach((card, index) => {
      const active = !mobile || index === currentIndex;
      card.classList.toggle('is-active', index === currentIndex);
      card.setAttribute('aria-hidden', active ? 'false' : 'true');
      if (card.matches('a')) {
        if (active) card.removeAttribute('tabindex');
        else card.setAttribute('tabindex', '-1');
      }
    });

    count.textContent = `${currentIndex + 1}/${cards.length}`;
    section.dataset.currentIndex = String(currentIndex);
  };

  const startRotation = () => {
    stopRotation();
    if (!mobileMedia.matches || reducedMotion.matches || document.hidden || renderedItems.length <= 1) return;
    rotationTimer = window.setInterval(() => {
      currentIndex = (currentIndex + 1) % renderedItems.length;
      syncCarousel();
    }, ROTATION_MS);
  };

  const browse = direction => {
    if (renderedItems.length <= 1) return;
    currentIndex = (currentIndex + direction + renderedItems.length) % renderedItems.length;
    syncCarousel();
    startRotation();
  };

  const render = items => {
    const signature = JSON.stringify(items.map(item => [item.id, item.title, item.publishedAt, item.expiresAt, item.target, item.targetType]));
    if (signature === lastSignature) {
      syncCarousel();
      startRotation();
      return;
    }

    const previousId = renderedItems[currentIndex]?.id || '';
    lastSignature = signature;
    renderedItems = items;
    list.replaceChildren(...items.map(renderItem));
    section.hidden = items.length === 0;
    section.dataset.itemCount = String(items.length);
    section.dataset.rotationMs = String(ROTATION_MS);

    if (!items.length) {
      currentIndex = 0;
      stopRotation();
      return;
    }

    const previousIndex = previousId ? items.findIndex(item => item.id === previousId) : -1;
    currentIndex = previousIndex >= 0 ? previousIndex : 0;
    syncCarousel();
    startRotation();
  };

  const openInternalTarget = (anchor, event) => {
    if (!anchor || event.defaultPrevented) return;
    const href = anchor.getAttribute('href') || '';
    if (!href.startsWith('#')) return;

    const id = decodeURIComponent(href.slice(1));
    const target = document.getElementById(id);
    if (!target) return;

    const procedure = target.classList.contains('procedure') ? target : target.closest('.procedure');
    if (procedure) procedure.open = true;

    event.preventDefault();
    history.replaceState(null, '', `#${id}`);
    requestAnimationFrame(() => {
      const scrollTarget = target || procedure;
      if (typeof window.PORTAL_SCROLL_AND_FLASH === 'function') window.PORTAL_SCROLL_AND_FLASH(scrollTarget, 'start');
      else scrollTarget.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
    });
  };

  const load = async () => {
    try {
      const response = await fetch(`${FEED_URL}?v=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      render(visibleItems(await response.json()));
    } catch (error) {
      console.warn('Nouveautés du portail indisponibles :', error);
    }
  };

  const startRefresh = () => {
    if (refreshTimer) window.clearInterval(refreshTimer);
    refreshTimer = window.setInterval(load, REFRESH_MS);
  };

  prevButton.addEventListener('click', () => browse(-1));
  nextButton.addEventListener('click', () => browse(1));

  section.addEventListener('click', event => {
    openInternalTarget(event.target.closest('a.portal-update-item[href^="#"]'), event);
  });

  list.addEventListener('touchstart', event => {
    if (!mobileMedia.matches || event.touches.length !== 1) return;
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
  }, { passive: true });

  list.addEventListener('touchend', event => {
    if (!mobileMedia.matches || !touchStartX || !event.changedTouches.length) return;
    const deltaX = event.changedTouches[0].clientX - touchStartX;
    const deltaY = event.changedTouches[0].clientY - touchStartY;
    touchStartX = 0;
    touchStartY = 0;
    if (Math.abs(deltaX) < 45 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    browse(deltaX < 0 ? 1 : -1);
  }, { passive: true });

  section.addEventListener('mouseenter', stopRotation);
  section.addEventListener('mouseleave', startRotation);
  section.addEventListener('focusin', stopRotation);
  section.addEventListener('focusout', () => window.setTimeout(() => {
    if (!section.contains(document.activeElement)) startRotation();
  }, 0));

  mobileMedia.addEventListener?.('change', () => {
    currentIndex = Math.min(currentIndex, Math.max(0, renderedItems.length - 1));
    syncCarousel();
    startRotation();
  });
  reducedMotion.addEventListener?.('change', startRotation);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (refreshTimer) window.clearInterval(refreshTimer);
      refreshTimer = 0;
      stopRotation();
      return;
    }
    load();
    startRefresh();
    startRotation();
  });

  load();
  startRefresh();
})();
