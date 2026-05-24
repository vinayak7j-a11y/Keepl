const CACHE_NAME = 'keepl-v2';
const STATIC_ASSETS = ['/', '/keepl.css', '/manifest.json'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.includes('/api/')) return;
  const neverCache = ['/dashboard','/customers','/analytics','/scan','/poster','/login','/register','/shop'];
  if (neverCache.some(p => url.pathname.startsWith(p))) { e.respondWith(fetch(e.request)); return; }
  e.respondWith(fetch(e.request).then(res => { const clone = res.clone(); caches.open(CACHE_NAME).then(c => c.put(e.request, clone)); return res; }).catch(() => caches.match(e.request)));
});