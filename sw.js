const CACHE_NAME='mogumogu-static-v57';
const ART_CACHE='mogumogu-art-v1';
// Only the app shell is eagerly cached. Card art is loaded when requested.
const ASSETS=["./push-config.js","./push-notifications.js","./assets/audio/success.m4a","./assets/audio/confirm.m4a","./assets/audio/error.m4a","./assets/audio/flowerbed-fields.m4a","./social-core.js","./account-compat.js","./manifest.webmanifest","./p/app/","./account.html","./account-id.js","./developer-access.js","./account-entry.js","./account-bootstrap.js","./stamp-art.js","./pwa-guide.html","./design.css","./room-view.js","./multi-draw.js","./sound.js","./progress-store.js","./card-profiles.js","./nutrition-models.js","./ssr-prism-trial.js","./quest-core.js","./quest-ui.js","./adventure.js","./card-details.js","./","./index.html","./style.css","./app.js","./firebase-sync.js","./game.js","./game-catalog.js","./card-layer-manifest.js","./card-layer-lab.js","./sw.js","./icons/icon.svg","./p/ichika/","./p/jun/","./p/sato/","./manifest-ichika.webmanifest","./manifest-jun.webmanifest","./manifest-sato.webmanifest"];
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE_NAME);
  await cache.addAll(ASSETS.map(path=>new Request(new URL(path,self.registration.scope),{cache:'reload'})));
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const names=await caches.keys();
  const old=names.filter(name=>name.startsWith('mogumogu-static-')&&name!==CACHE_NAME)
    .sort((a,b)=>Number(b.match(/v(\d+)$/)?.[1]||0)-Number(a.match(/v(\d+)$/)?.[1]||0));
  // Failed installs can leave an empty cache; keep the newest usable shell.
  let previous='';
  for(const name of old){if((await (await caches.open(name)).keys()).length){previous=name;break;}}
  await Promise.all(old.filter(name=>name!==previous).map(name=>caches.delete(name)));
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin)return;
 if(url.pathname.includes('/assets/cards/')||url.pathname.includes('/assets/ui/')){
  const work=(async()=>{
   const cache=await caches.open(ART_CACHE),hit=await cache.match(req);
   if(hit)return {response:hit};
   const legacy=await caches.match(req);
   const response=legacy||await fetch(req);
   return {response,cache,copy:response.ok?response.clone():null};
  })();
  event.respondWith(work.then(value=>value.response));
  event.waitUntil(work.then(value=>value.copy?value.cache.put(req,value.copy):undefined).catch(()=>{}));
  return;
 }
 const work=(async()=>{
  const cache=await caches.open(CACHE_NAME);
  try{
   const response=await fetch(req);
   return {response,cache,copy:response.ok?response.clone():null};
  }catch{
   const response=await cache.match(req,{ignoreSearch:req.mode==='navigate'})||await caches.match(req);
   return {response:response||Response.error()};
  }
 })();
 event.respondWith(work.then(value=>value.response));
 event.waitUntil(work.then(value=>value.copy?value.cache.put(req,value.copy):undefined).catch(()=>{}));
});

// Web Push is registered separately from the offline cache lifecycle.
// The server controls who may receive a push; never accept an arbitrary URL from payloads.
self.addEventListener('push',event=>{
  event.waitUntil((async()=>{
    let data={};
    try{data=event.data?.json()||{};}catch{data={};}
    const groupId=typeof data.groupId==='string'&&/^[A-Za-z0-9_-]{24}$/.test(data.groupId)?data.groupId:'';
    const title=typeof data.groupName==='string'&&data.groupName.length<=60?data.groupName:'モグモグのおしゃべり';
    const sender=typeof data.sender==='string'&&data.sender.length<=40?data.sender:'メンバー';
    await self.registration.showNotification(title,{
      body:sender+'さんから新着メッセージ',
      icon:new URL('./icons/onigiri-192.png',self.registration.scope).href,
      badge:new URL('./icons/onigiri-192.png',self.registration.scope).href,
      tag:groupId?'mogumogu-chat-'+groupId:'mogumogu-chat',
      data:{groupId},
    });
  })());
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil((async()=>{
    const groupId=event.notification.data?.groupId;
    const url=new URL('./p/app/',self.registration.scope);
    if(typeof groupId==='string'&&/^[A-Za-z0-9_-]{24}$/.test(groupId))url.searchParams.set('chatGroup',groupId);
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows){
      const current=new URL(client.url);
      if(current.origin===url.origin&&current.pathname===url.pathname){
        await client.navigate(url.href);
        return client.focus();
      }
    }
    return self.clients.openWindow(url.href);
  })());
});
