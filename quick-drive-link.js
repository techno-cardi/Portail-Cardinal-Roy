(() => {
  'use strict';

  const DRIVE_URL = 'https://drive.google.com/drive/folders/0ACOxqc1_36isUk9PVA';
  const DRIVE_LOGO = 'assets/vendor/google-drive.svg';

  const normalize = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9 -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const replaceQuickLink = () => {
    const quickArea = document.querySelector('.quick-area');
    if (!quickArea) return false;

    const link = [...quickArea.querySelectorAll('a')].find(anchor => {
      const href = anchor.getAttribute('href') || '';
      const text = normalize(anchor.textContent);
      return href === '#presences' || text.includes('presences et absences dans mozaik portail') || text.includes('presences et absences');
    });
    if (!link) return false;

    link.href = DRIVE_URL;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', 'Ouvrir le Drive commun');

    let image = link.querySelector('img');
    if (image) {
      image.src = DRIVE_LOGO;
      image.alt = 'Logo Google Drive';
    }

    const preferredLabel = link.querySelector('strong, .quick-title, .quick-label, .app-name, h3, h4');
    if (preferredLabel) {
      preferredLabel.textContent = 'Drive commun';
    } else {
      const walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      const labelNode = nodes.find(node => normalize(node.nodeValue).includes('presences et absences'));
      if (labelNode) labelNode.nodeValue = 'Drive commun';
    }

    link.dataset.quickResource = 'drive-commun';
    return true;
  };

  if (replaceQuickLink()) return;

  const observer = new MutationObserver(() => {
    if (replaceQuickLink()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 10000);
})();
