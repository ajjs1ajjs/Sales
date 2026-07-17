/// <reference lib="webworker" />

declare let self: ServiceWorkerGlobalScope;

const manifestEntries: { url: string; revision: string | null }[] = (self as unknown as { __WB_MANIFEST: { url: string; revision: string | null }[] }).__WB_MANIFEST;
const CACHE_PREFIX = 'game-sales';
const CACHE = `${CACHE_PREFIX}-${manifestEntries.map((e) => e.revision || '0').join('-').slice(0, 32) || 'static'}`;
const NAV_FALLBACK =
  manifestEntries.find((e) => e.url.endsWith('index.html'))?.url ?? manifestEntries[0]?.url;
const MAX_DYNAMIC_ENTRIES = 50;

async function putWithLimit(request: Request, response: Response) {
  try {
    const cache = await caches.open(CACHE);
    await cache.put(request, response);
    const keys = await cache.keys();
    if (keys.length > MAX_DYNAMIC_ENTRIES) {
      const oldest = keys.slice(0, keys.length - MAX_DYNAMIC_ENTRIES);
      await Promise.all(oldest.map((k) => cache.delete(k)));
    }
  } catch {
    /* quota exceeded — ignore */
  }
}

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
            putWithLimit(event.request, clone);
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request, { ignoreSearch: true });
          if (cached) return cached;
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
        return fetch(event.request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              putWithLimit(event.request, clone);
              return response;
            }
            // Fetch returned an error — fall back to cache if available
            return cached || response;
          })
          .catch(() => cached || new Response('Offline', { status: 503 }));
      }),
    );
  }
});
