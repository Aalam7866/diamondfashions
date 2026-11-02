/* OneSignal push notifications (offers / new items) */
try { importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js'); } catch(e){}
/* Diamond Fashions app: opens fast and works offline with the last saved copy. Always tries the newest version first. */
var CACHE = 'df-v3';
var CORE = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png'];
self.addEventListener('install', function(e){ e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(CORE); }).then(function(){ return self.skipWaiting(); })); });
self.addEventListener('activate', function(e){ e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); })); }).then(function(){ return self.clients.claim(); })); });
self.addEventListener('fetch', function(e){
  var req = e.request, url = new URL(req.url);
  // Firebase, WhatsApp and the staff apps (Admin, Rider, Karigar, Staff, Tailoring, Reports – they live on apps.diamondfashions.in): never touched here
  if (req.method !== 'GET' || url.origin !== location.origin || /^\/(admin|rider|karigar)/.test(url.pathname)) return;
  if (req.mode === 'navigate'){
    var key = url.pathname;   // each page keeps its own copy (a page never stands in for another)
    e.respondWith(fetch(req).then(function(r){ if (r.ok){ var cp = r.clone(); caches.open(CACHE).then(function(c){ c.put(key, cp); }); } return r; })
      .catch(function(){ return caches.match(key).then(function(h){ return h || caches.match('/'); }); }));
    return;
  }
  e.respondWith(caches.match(req).then(function(hit){ var net = fetch(req).then(function(r){ if (r.ok){ var cp = r.clone(); caches.open(CACHE).then(function(c){ c.put(req, cp); }); } return r; }).catch(function(){ return hit; }); return hit || net; }));
});
