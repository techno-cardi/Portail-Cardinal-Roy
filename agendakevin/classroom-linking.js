(() => {
  'use strict';

  const GROUP_MAP_UPDATE = 'PDC_NATIVE_GROUP_MAP_UPDATE';
  const GROUP_MAP_STATUS_REQUEST = 'PDC_NATIVE_GROUP_MAP_STATUS_REQUEST';
  const GROUP_MAP_STATUS = 'PDC_NATIVE_GROUP_MAP_STATUS';

  function currentGroup() {
    const text = document.getElementById('crpTarget')?.textContent || '';
    return text.match(/(?:^|\D)(31|32|51)(?:\D|$)/)?.[1] || '';
  }

  function parseClassroomLink(value) {
    const url = new URL(String(value || '').trim());
    if (url.origin !== 'https://classroom.google.com') {
      throw new Error('Le lien doit provenir de classroom.google.com.');
    }
    const match = url.pathname.match(/\/c\/([^/?#]+)/);
    if (!match) {
      throw new Error('Ouvre le cours Classroom, puis copie son adresse contenant /c/.');
    }

    const token = decodeURIComponent(match[1]);
    let courseId = /^\d+$/.test(token) ? token : '';
    if (!courseId) {
      try {
        const base64 = token.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
        const decoded = atob(padded);
        if (/^\d+$/.test(decoded)) courseId = decoded;
      } catch (_) { /* validation ci-dessous */ }
    }
    if (!courseId) {
      throw new Error('Impossible de reconnaître ce lien Classroom. Copie l’adresse du cours ouverte dans Classroom.');
    }

    return { courseId, alternateLink: url.toString() };
  }

  function requestGroupMapStatus(timeout = 1600) {
    return new Promise(resolve => {
      const requestId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      let done = false;
      const finish = value => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        window.removeEventListener('message', onMessage);
        resolve(value);
      };
      const onMessage = event => {
        if (event.source !== window || event.origin !== location.origin || event.data?.type !== GROUP_MAP_STATUS) return;
        if (String(event.data.requestId || '') !== requestId) return;
        finish({ ok: Boolean(event.data.ok), groups: event.data.groups || {}, error: String(event.data.error || '') });
      };
      const timer = setTimeout(() => finish({ ok: false, groups: {}, error: 'Pont Chrome non détecté.' }), timeout);
      window.addEventListener('message', onMessage);
      window.postMessage({ type: GROUP_MAP_STATUS_REQUEST, requestId }, location.origin);
    });
  }

  async function rememberGroup(group, classroomUrl) {
    const target = parseClassroomLink(classroomUrl);
    window.postMessage({
      type: GROUP_MAP_UPDATE,
      groups: [{
        group,
        courseId: target.courseId,
        courseName: `Français SAÉ - Groupe ${group}`,
        courseSection: group === '51' ? '5e secondaire' : '3e secondaire',
        alternateLink: target.alternateLink,
      }],
    }, location.origin);

    for (let attempt = 0; attempt < 12; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 250));
      const status = await requestGroupMapStatus(1200);
      if (status.ok && status.groups?.[group]) return status.groups[group];
    }
    throw new Error('Le pont Chrome n’a pas confirmé la liaison.');
  }

  function injectStyle() {
    if (document.getElementById('classroomLinkingStyles')) return;
    const style = document.createElement('style');
    style.id = 'classroomLinkingStyles';
    style.textContent = `
      .crp-link-action{border:0;background:none;padding:0;color:#07577f;font:inherit;font-weight:800;text-decoration:underline;text-underline-offset:2px;cursor:pointer}
      .crp-link-action:hover{text-decoration-thickness:2px}
    `;
    document.head.appendChild(style);
  }

  function renderLinkAction() {
    const state = document.getElementById('crpLinkState');
    const group = currentGroup();
    if (!state || !group || state.querySelector('.crp-link-action')) return;

    const text = state.textContent || '';
    if (text.includes('Mise à jour du pont/Tampermonkey')) return;

    if (text.includes('Groupe non lié')) {
      state.className = 'crp-link-state warn';
      state.innerHTML = `Groupe ${group} non lié · <button type="button" class="crp-link-action" data-classroom-link-group="${group}">Lier à Classroom</button>`;
      return;
    }

    if (text.includes(`Groupe ${group} lié à Classroom`)) {
      state.className = 'crp-link-state ok';
      state.innerHTML = `Groupe ${group} lié à Classroom · <button type="button" class="crp-link-action" data-classroom-link-group="${group}">Modifier</button>`;
    }
  }

  async function handleLinkClick(event) {
    const button = event.target.closest('.crp-link-action');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();

    const group = button.dataset.classroomLinkGroup || currentGroup();
    if (!group) return;

    const state = document.getElementById('crpLinkState');
    const status = await requestGroupMapStatus();
    const previous = status.groups?.[group]?.alternateLink || '';
    const classroomUrl = window.prompt(
      `Colle le lien du Classroom du groupe ${group}. Tu n’auras à le faire qu’une fois sur cet ordinateur.`,
      previous
    );
    if (classroomUrl == null) return;

    try {
      if (state) {
        state.className = 'crp-link-state';
        state.textContent = `Enregistrement du groupe ${group}…`;
      }
      await rememberGroup(group, classroomUrl);
      if (state) {
        state.className = 'crp-link-state ok';
        state.textContent = `Groupe ${group} lié à Classroom`;
      }
      renderLinkAction();
    } catch (error) {
      if (state) {
        state.className = 'crp-link-state warn';
        state.textContent = String(error?.message || error);
      }
      window.alert(`Liaison Classroom impossible : ${error?.message || error}`);
    }
  }

  function start() {
    injectStyle();
    const state = document.getElementById('crpLinkState');
    if (!state) return;
    new MutationObserver(renderLinkAction).observe(state, { childList: true, subtree: true, characterData: true });
    document.addEventListener('click', handleLinkClick, true);
    renderLinkAction();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
