/* Diamond Fashions app: opens fast and works offline with the last saved copy. Always tries the newest version first. */
var CACHE = 'df-v1';
var CORE = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png'];
self.addEventListener('install', function(e){ e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(CORE); }).then(function(){ return self.skipWaiting(); })); });
self.addEventListener('activate', function(e){ e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); })); }).then(function(){ return self.clients.claim(); })); });
self.addEventListener('fetch', function(e){
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.indexOf('/admin') === 0) return; // Firebase, WhatsApp, Admin: always live
  if (req.mode === 'navigate'){
    e.respondWith(fetch(req).then(function(r){ var cp = r.clone(); caches.open(CACHE).then(function(c){ c.put('/', cp); }); return r; })
      .catch(function(){ return caches.match('/'); }));
    return;
  }
  e.respondWith(caches.match(req).then(function(hit){ var net = fetch(req).then(function(r){ if (r.ok){ var cp = r.clone(); caches.open(CACHE).then(function(c){ c.put(req, cp); }); } return r; }).catch(function(){ return hit; }); return hit || net; }));
});
