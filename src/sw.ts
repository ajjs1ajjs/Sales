/// <reference lib="webworker" />

import { cacheFirst, networkFirst, precacheShell, removeOldCaches } from './sw-strategies';

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

self.addEventListener('install', (event) => {
  event.waitUntil(precacheShell(caches, SHELL_CACHE, manifestEntries.map((entry) => entry.url)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    removeOldCaches(caches, CACHE_PREFIX, [SHELL_CACHE, RUNTIME_CACHE]),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith('http') || new URL(request.url).origin !== self.location.origin) return;

  const isData = new URL(request.url).pathname.endsWith('/data/deals.json');
  const isNavigation = request.mode === 'navigate';

  if (isData || isNavigation) {
    event.respondWith(networkFirst(request, {
      cacheStorage: caches,
      fetcher: fetch,
      runtimeCacheName: RUNTIME_CACHE,
      navigationFallback: NAV_FALLBACK,
      maxRuntimeEntries: MAX_RUNTIME_ENTRIES,
    }, isData, isNavigation));
    return;
  }

  // Build assets are immutable and already in the shell precache. Serve them
  // cache-first so a deployed app does not depend on a network round trip.
  event.respondWith(cacheFirst(request, caches, fetch));
});
