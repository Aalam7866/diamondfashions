/* Diamond Fashions Karigar page – keeps the app shell available and handles parcel alerts. */
var CACHE = 'df-karigar-v8';
self.addEventListener('install', function(e){ e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(['./', 'manifest.webmanifest', 'icon-192.png']); }).catch(function(){})); self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.filter(function(k){ return k.indexOf('df-karigar-') === 0 && k !== CACHE; }).map(function(k){ return caches.delete(k); })); }).then(function(){ return self.clients.claim(); })); });
self.addEventListener('fetch', function(e){
  var r = e.request; if (r.method !== 'GET' || r.mode !== 'navigate') return;
  if (new URL(r.url).origin !== location.origin) return;
  e.respondWith(fetch(r).then(function(res){ var cp = res.clone(); caches.open(CACHE).then(function(c){ c.put('./', cp); }); return res; }).catch(function(){ return caches.match('./'); }));
});
self.addEventListener('notificationclick', function(e){
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type:'window', includeUncontrolled:true}).then(function(list){
    var base = self.registration.scope;
    for (var i = 0; i < list.length; i++){ if (list[i].url.indexOf(base) === 0){ return list[i].focus(); } }
    return self.clients.openWindow(base);
  }));
});
