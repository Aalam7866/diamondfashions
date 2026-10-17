/* DF Reports: opens fast and without internet with the last copy; always tries the newest version first.
   Firebase (the shop's data) is never stored here – it always comes live. */
var CACHE = 'admin-reports-v1';
var CORE = ['./', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', '/admin-shared/df.js', '/admin-shared/df.css'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf('admin-reports-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); })); })
    .then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;   // Firebase, sign-in: always live
  e.respondWith(fetch(req).then(function (r) {
    if (r.ok) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(req.mode === 'navigate' ? './' : req, cp); }); }
    return r;
  }).catch(function () { return caches.match(req.mode === 'navigate' ? './' : req); }));
});