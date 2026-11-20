const CACHE = 'liber-public-offline-v22'
const FILES = ['/offline.html', '/offline.js', '/warehouse-preview.html', '/warehouse-preview.css', '/warehouse-preview.js', '/warehouse-preview-v22.css', '/warehouse-preview-v22.js']
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES))))
self.addEventListener('activate', event => event.waitUntil((async () => {
  const keys = await caches.keys()
  await Promise.all(keys.filter(key => key.startsWith('liber-public-offline-') && key !== CACHE).map(key => caches.delete(key)))
  await self.clients.claim()
})()))
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  if (url.pathname === '/warehouse-preview.html') { event.respondWith(fetch(request).catch(() => caches.open(CACHE).then(cache => cache.match('/warehouse-preview.html')))); return }
  if (request.mode === 'navigate') event.respondWith(fetch(request).catch(() => caches.open(CACHE).then(cache => cache.match('/offline.html'))))
  else if (FILES.includes(url.pathname)) event.respondWith(caches.open(CACHE).then(cache => cache.match(request, { ignoreSearch: true })).then(saved => saved || fetch(request)))
})
