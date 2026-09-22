const CACHE='cr-agenda-v37-restored-mobile-width';
const ASSETS=['./','./index.html','./app.css?v=20260913-3','./ui-tweaks.css?v=20260914-2','./print.css?v=20260913-1','./app.js?v=20260913-4','./editor-enter.js?v=20260914-1','./course-meta.js?v=20260914-4','./planner-tools.js?v=20260913-2','./agenda-tools.js?v=20260913-1','./agenda-ui.js?v=20260914-2','./course-list.js?v=20260914-2','./google-sync-ui.js?v=20260917-3','./mobile-gestures.js?v=20260916-1','./mobile-auto-position.js?v=20260917-3','./mobile-context-bar.js?v=20260917-3','./classroom-tools.js?v=20260914-1','./board-homework-guard.js?v=20260917-1','./title-edit.js?v=20260913-2','./google-calendar-sync.gs.txt','./logo-cardinal-roy.png','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const u=new URL(e.request.url);
  if(u.hostname.endsWith('supabase.co')) return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});
