/// <reference lib="webworker" />

declare let self: ServiceWorkerGlobalScope;

const manifestEntries: { url: string; revision: string | null }[] = (self as unknown as { __WB_MANIFEST: { url: string; revision: string | null }[] }).__WB_MANIFEST;
const CACHE_PREFIX = 'game-sales';
// Фіксований fallback замість Date.now(): якщо маніфест порожній, ім'я кешу не мусить
// мінятися щозавантаження (інакше кеш ніколи не збігається й офлайн-режим ламається).
const CACHE = `${CACHE_PREFIX}-${manifestEntries.map((e) => e.revision || '0').join('-').slice(0, 32) || 'static'}`;
// App-shell URL for the offline navigation fallback (precached as .../index.html,
// not under the bare base path), so an offline deep-link / cold start still works.
const NAV_FALLBACK =
  manifestEntries.find((e) => e.url.endsWith('index.html'))?.url ?? manifestEntries[0]?.url;

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
            caches.open(CACHE).then((cache) => cache.put(event.request, clone)).catch(() => {
              /* кеш переповнено / quota-exceeded — ігноруємо, відповідь уже віддано */
            });
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request, { ignoreSearch: true });
          if (cached) return cached;
          // For a navigation that wasn't itself cached, serve the app shell so
          // offline deep-links / cold starts render instead of throwing.
          if (event.request.mode === 'navigate' && NAV_FALLBACK) {
            const shell = await caches.match(NAV_FALLBACK);
            if (shell) return shell;
          }
          throw new Error('Offline and no cached data available');
        })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetched = fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, clone)).catch(() => {
              /* кеш переповнено / quota-exceeded — ігноруємо, відповідь уже віддано */
            });
          }
          return response;
        });
        if (cached) {
          // Background revalidation: swallow its rejection (e.g. offline) so it
          // doesn't surface as an unhandledrejection — the cached response is served.
          fetched.catch(() => {});
          return cached;
        }
        return fetched;
      }),
    );
  }
});
