/// <reference lib="webworker" />

declare let self: ServiceWorkerGlobalScope;

const manifestEntries: { url: string; revision: string | null }[] = (self as unknown as { __WB_MANIFEST: { url: string; revision: string | null }[] }).__WB_MANIFEST;
const CACHE_PREFIX = 'game-sales';

function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

const revisions = manifestEntries.map((e) => e.revision || '0').join('-');
const SHELL_CACHE = `${CACHE_PREFIX}-shell-${revisions ? fnv1a(revisions) : 'static'}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime`;
const NAV_FALLBACK = manifestEntries.find((e) => e.url.endsWith('index.html'))?.url ?? manifestEntries[0]?.url;
const MAX_RUNTIME_ENTRIES = 200;

async function putRuntime(request: Request, response: Response): Promise<void> {
  try {
    const cache = await caches.open(RUNTIME_CACHE);
    await cache.put(request, response);
    const keys = await cache.keys();
    if (keys.length > MAX_RUNTIME_ENTRIES) {
      await Promise.all(keys.slice(0, keys.length - MAX_RUNTIME_ENTRIES).map((key) => cache.delete(key)));
    }
  } catch {
    // Storage quota or a non-cacheable response must not fail the page request.
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(manifestEntries.map((entry) => entry.url))));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== SHELL_CACHE && key !== RUNTIME_CACHE)
        .map((key) => caches.delete(key)),
    )),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith('http') || new URL(request.url).origin !== self.location.origin) return;

  const isData = new URL(request.url).pathname.endsWith('/data/deals.json');
  const isNavigation = request.mode === 'navigate';

  if (isData || isNavigation) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await putRuntime(request, response.clone());
          return response;
        }
        const cached = await caches.match(request, { ignoreSearch: isData });
        if (cached) return cached;
        if (isNavigation && NAV_FALLBACK) {
          const shell = await caches.match(NAV_FALLBACK);
          if (shell) return shell;
        }
        return response;
      } catch {
        const cached = await caches.match(request, { ignoreSearch: isData });
        if (cached) return cached;
        if (isNavigation && NAV_FALLBACK) {
          const shell = await caches.match(NAV_FALLBACK);
          if (shell) return shell;
        }
        return new Response('Offline and no cached content is available.', { status: 503 });
      }
    })());
    return;
  }

  // Build assets are immutable and already in the shell precache. Serve them
  // cache-first so a deployed app does not depend on a network round trip.
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      return await fetch(request);
    } catch {
      return new Response('Offline', { status: 503 });
    }
  })());
});
