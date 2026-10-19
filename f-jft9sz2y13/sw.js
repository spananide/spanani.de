const CACHE = 'zuhause-v1';
const SHELL = ['./', '/t-7yhbbwj4/termine.json', 'manifest.webmanifest', 'icon-192.png', 'fonts/barlow-400.woff2', 'fonts/barlow-600.woff2', 'fonts/barlow-condensed-700.woff2'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
});
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('zuhause-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.search) return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreVary: true }).then(r => r || Promise.reject(new Error('offline')))));
});

self.addEventListener('push', e => {
  let m = { title: 'Zuhause', body: '' };
  try { m = e.data.json(); } catch {}
  e.waitUntil(self.registration.showNotification(m.title, { body: m.body, tag: m.tag, icon: 'icon-192.png', lang: 'de' }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const offen = list.find(c => new URL(c.url).pathname.startsWith(new URL(self.registration.scope).pathname));
    return offen ? offen.focus() : self.clients.openWindow(self.registration.scope);
  }));
});
