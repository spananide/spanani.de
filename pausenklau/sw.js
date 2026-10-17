// Pausenklau offline: erst Netz (damit Updates sofort ankommen), sonst die zuletzt geladene Version.
// Nur eigene GET-Anfragen ohne Query; API, Ferien- und Zeitdienste laufen immer übers Netz.
const CACHE = 'pausenklau-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['/pausenklau/', '/assets/css/design-system.css', '/assets/js/site.js', '/favicon.svg'])));
});
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.search) return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request).then(r => r || Promise.reject(new Error('offline')))));
});
