const CACHE = 'stand-v9';
const SHELL = ['./', 'logik.js', 'manifest.webmanifest', 'icon-192.png', 'fonts/archivo.woff2', 'fonts/atkinson-mono-var.woff2'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
});
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('stand-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
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
  let m = { title: 'Stand', body: '' };
  try { m = e.data.json(); } catch {}
  const schritte = [self.registration.showNotification(m.title, { body: m.body, tag: m.tag, icon: 'icon-192.png', lang: 'de' })];
  if (typeof m.badge === 'number' && 'setAppBadge' in self.navigator) schritte.push((m.badge ? self.navigator.setAppBadge(m.badge) : self.navigator.clearAppBadge()).catch(() => {}));
  e.waitUntil(Promise.all(schritte));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const offen = list.find(c => new URL(c.url).pathname.startsWith(new URL(self.registration.scope).pathname));
    return offen ? offen.focus() : self.clients.openWindow(self.registration.scope);
  }));
});
