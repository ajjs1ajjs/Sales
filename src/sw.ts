/// <reference lib="webworker" />

declare let self: ServiceWorkerGlobalScope;

const manifestEntries: { url: string; revision: string | null }[] = (self as unknown as { __WB_MANIFEST: { url: string; revision: string | null }[] }).__WB_MANIFEST;
const CACHE_PREFIX = 'game-sales';
const CACHE = `${CACHE_PREFIX}-${manifestEntries.map((e) => e.revision || '0').join('-').slice(0, 32) || Date.now()}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(manifestEntries.map((e) => e.url)),
    ),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE).map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  const isDynamic =
    event.request.mode === 'navigate' ||
    event.request.url.includes('/data/deals.json');

  if (isDynamic) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            throw new Error('Offline and no cached data available');
          });
        })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetched = fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
        return cached || fetched;
      }),
    );
  }
});
