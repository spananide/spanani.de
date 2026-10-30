const CACHE = 'flags-v1';
const ASSETS = [
  '/flags/',
  '/flags/index.html',
  '/flags/style.css',
  '/flags/app.js',
  '/flags/quiz.js',
  '/flags/learn.js',
  '/flags/wall.js',
  '/flags/store.js',
  '/flags/i18n.js',
  '/flags/engine.js',
  '/flags/data.js',
  '/flags/manifest.webmanifest',
  '/flags/icon.svg',
  '/flags/icon-180.png',
  '/flags/icon-192.png',
  '/flags/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith('flags-') && key !== CACHE).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put('/flags/index.html', copy));
          }
          return response;
        })
        .catch(() => caches.match('/flags/index.html'))
    );
    return;
  }

  if (url.pathname.startsWith('/flags/svg/') || url.pathname.startsWith('/assets/fonts/')) {
    event.respondWith(
      caches.match(request).then((hit) => {
        if (hit) return hit;
        return fetch(request).then((response) => {
          if (response.ok && request.method === 'GET') {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  event.respondWith(caches.match(request).then((hit) => hit || fetch(request)));
});
