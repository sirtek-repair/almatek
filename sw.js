var CACHE = 'almatek-v3';
self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(caches.delete('almatek-v2').catch(function(){}));
});
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); })
  );
});
self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.pathname === '/' || url.pathname.endsWith('index.html')) {
    e.respondWith(fetch(e.request, { cache: 'no-store' }).catch(function() { return caches.match(e.request); }));
    return;
  }
  e.respondWith(fetch(e.request).catch(function() { return caches.match(e.request); }));
});
