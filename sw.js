const CACHE_NAME='mogumogu-static-v4';
const ASSETS=['./','./index.html','./style.css','./app.js','./firebase-sync.js','./game.js','./game-catalog.js','./sw.js','./icons/icon.svg','./p/ichika/','./p/jun/','./p/sato/','./manifest-ichika.webmanifest','./manifest-jun.webmanifest','./manifest-sato.webmanifest'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS.map(path=>new URL(path,self.registration.scope).toString()))));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(name=>name.startsWith('mogumogu-static-')&&name!==CACHE_NAME).map(name=>caches.delete(name)))));self.clients.claim();});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
 event.respondWith(fetch(req).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(req,copy));}return response;}).catch(()=>caches.match(req)));
});