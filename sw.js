/* 온종일 AI 서비스워커 — network-first(항상 최신 우선, 오프라인 폴백) */
const CACHE = 'onjongil-ai-v1';
const CORE = ['/', '/index.html', '/lab.html', '/manifest.webmanifest',
  '/icon-192.png', '/icon-512.png', '/css/style2.css'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;
  e.respondWith(
    fetch(req).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return r;
    }).catch(() => caches.match(req).then(r => r || caches.match('/index.html')))
  );
});
