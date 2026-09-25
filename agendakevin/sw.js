const CACHE='cr-agenda-v40-editor-tools';
const ASSETS=['./','./index.html','./app.css?v=20260913-3','./ui-tweaks.css?v=20260914-2','./print.css?v=20260913-1','./app.js?v=20260922-2','./editor-text-tools.js?v=20260925-1','./editor-enter.js?v=20260925-1','./course-meta.js?v=20260914-4','./planner-tools.js?v=20260922-1','./agenda-tools.js?v=20260913-1','./agenda-ui.js?v=20260914-2','./course-list.js?v=20260914-2','./google-sync-ui.js?v=20260917-3','./mobile-gestures.js?v=20260916-1','./mobile-auto-position.js?v=20260917-3','./mobile-context-bar.js?v=20260917-3','./classroom-tools.js?v=20260914-1','./board-homework-guard.js?v=20260917-1','./classroom-publish-format.js?v=20260915-1','./classroom-linking.js?v=20260915-2','./auto-label-format.js?v=20260925-1','./title-edit.js?v=20260913-2','./google-calendar-sync.gs.txt','./logo-cardinal-roy.png','./manifest.webmanifest','./icon.svg','./icon-192.png?v=20260915-2','./icon-512.png?v=20260915-2'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const u=new URL(e.request.url);
  if(u.hostname.endsWith('supabase.co')) return;
  e.respondWith(fetch(e.request).then(r=>{
    if(r.ok && u.origin===self.location.origin){
      const copy=r.clone();
      caches.open(CACHE).then(c=>c.put(e.request,copy));
    }
    return r;
  }).catch(async()=>{
    const cached=await caches.match(e.request);
    if(cached) return cached;
    if(e.request.mode==='navigate') return caches.match('./index.html');
    return Response.error();
  }));
});
