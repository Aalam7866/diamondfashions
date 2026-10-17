/* Diamond Fashions Admin app – keeps the app shell available and shows new-order alerts. */
var CACHE = 'df-admin-v1';
var SHELL = ['/admin/', '/admin/manifest.webmanifest', '/admin/icon-192.png', '/admin/icon-512.png'];
self.addEventListener('install', function(e){ e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL); }).catch(function(){})); self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.filter(function(k){ return k.indexOf('df-admin-') === 0 && k !== CACHE; }).map(function(k){ return caches.delete(k); })); }).then(function(){ return self.clients.claim(); })); });
self.addEventListener('fetch', function(e){
  var r = e.request; if (r.method !== 'GET') return;
  var u = new URL(r.url); if (u.origin !== location.origin || u.pathname.indexOf('/admin/') !== 0) return;
  if (r.mode === 'navigate'){
    e.respondWith(fetch(r).then(function(res){ var cp = res.clone(); caches.open(CACHE).then(function(c){ c.put('/admin/', cp); }); return res; }).catch(function(){ return caches.match('/admin/'); }));
  }
});
self.addEventListener('notificationclick', function(e){
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || '/admin/';
  e.waitUntil(self.clients.matchAll({type:'window', includeUncontrolled:true}).then(function(list){
    for (var i = 0; i < list.length; i++){ if (list[i].url.indexOf('/admin') >= 0){ list[i].focus(); return; } }
    return self.clients.openWindow(url);
  }));
});
