import { describe, expect, it, vi } from 'vitest';
import {
  cacheFirst,
  networkFirst,
  precacheShell,
  removeOldCaches,
  type ServiceWorkerCachePort,
} from '../sw-strategies';

class MemoryCache {
  private readonly records = new Map<string, Response>();

  async addAll(urls: string[]) {
    for (const url of urls) this.records.set(url, new Response(`precache:${url}`));
  }

  async put(request: RequestInfo | URL, response: Response) {
    const key = request instanceof Request ? request.url : String(request);
    this.records.set(key, response.clone());
  }

  async match(request: RequestInfo | URL, options?: CacheQueryOptions) {
    const key = request instanceof Request ? request.url : String(request);
    const exact = this.records.get(key);
    if (exact) return exact.clone();
    if (options?.ignoreSearch) {
      const base = new URL(key).origin + new URL(key).pathname;
      const entry = [...this.records].find(([candidate]) => candidate.startsWith(`${base}?`));
      return entry?.[1].clone();
    }
    return undefined;
  }

  async keys() {
    return [...this.records.keys()].map((url) => new Request(new URL(url, 'https://sales.test')));
  }

  async delete(request: RequestInfo | URL) {
    return this.records.delete(request instanceof Request ? request.url : String(request));
  }
}

function createCacheStorage(): ServiceWorkerCachePort & Pick<CacheStorage, 'keys' | 'delete'> {
  const caches = new Map<string, MemoryCache>();
  return {
    open: async (name) => {
      let cache = caches.get(name);
      if (!cache) {
        cache = new MemoryCache();
        caches.set(name, cache);
      }
      return cache as unknown as Cache;
    },
    match: async (request, options) => {
      for (const cache of caches.values()) {
        const response = await cache.match(request, options);
        if (response) return response;
      }
      return undefined;
    },
    keys: async () => [...caches.keys()],
    delete: async (name) => caches.delete(name),
  };
}

describe('service worker cache lifecycle and strategies', () => {
  it('precaches the shell and removes only obsolete prefixed caches', async () => {
    const storage = createCacheStorage();
    await precacheShell(storage, 'game-sales-shell-v2', ['/index.html', '/assets/app.js']);
    await storage.open('game-sales-runtime');
    await storage.open('game-sales-shell-old');
    await storage.open('unrelated-cache');
    await removeOldCaches(storage, 'game-sales', ['game-sales-shell-v2', 'game-sales-runtime']);
    expect(await storage.keys()).toEqual(['game-sales-shell-v2', 'game-sales-runtime', 'unrelated-cache']);
    expect(await (await storage.match('/index.html'))?.text()).toBe('precache:/index.html');
  });

  it('uses cached data on HTTP errors and offline navigation falls back to the shell', async () => {
    const storage = createCacheStorage();
    const runtime = await storage.open('runtime');
    const dataRequest = new Request('https://sales.test/data/deals.json');
    await runtime.put(dataRequest, new Response('{"games":1}'));
    const failedFetch = vi.fn(async () => new Response('upstream error', { status: 503 }));
    const cachedData = await networkFirst(dataRequest, {
      cacheStorage: storage, fetcher: failedFetch, runtimeCacheName: 'runtime',
    }, true, false);
    expect(await cachedData.text()).toBe('{"games":1}');

    const shell = await storage.open('shell-v2');
    await shell.put('/index.html', new Response('<main>shell</main>'));
    const offlineNavigation = await networkFirst(new Request('https://sales.test/deals'), {
      cacheStorage: storage, fetcher: async () => { throw new Error('offline'); },
      runtimeCacheName: 'runtime', navigationFallback: '/index.html',
    }, false, true);
    expect(await offlineNavigation.text()).toBe('<main>shell</main>');
  });

  it('waits for successful runtime writes and trims only runtime entries', async () => {
    const storage = createCacheStorage();
    const fetcher = vi.fn(async () => new Response('fresh data'));
    const request = new Request('https://sales.test/data/deals.json');
    const response = await networkFirst(request, {
      cacheStorage: storage, fetcher, runtimeCacheName: 'runtime', maxRuntimeEntries: 1,
    }, true, false);
    expect(await response.text()).toBe('fresh data');
    expect(await storage.match(request)).toBeInstanceOf(Response);

    const runtime = await storage.open('runtime');
    await runtime.put(new Request('https://sales.test/extra'), new Response('extra'));
    await networkFirst(new Request('https://sales.test/next'), {
      cacheStorage: storage, fetcher, runtimeCacheName: 'runtime', maxRuntimeEntries: 1,
    }, true, false);
    expect((await runtime.keys()).length).toBe(1);
    expect(await storage.keys()).toContain('runtime');
  });

  it('serves cached immutable assets offline and returns 503 if no copy exists', async () => {
    const storage = createCacheStorage();
    const shell = await storage.open('shell');
    const request = new Request('https://sales.test/assets/app.js');
    await shell.put(request, new Response('cached asset'));
    expect(await (await cacheFirst(request, storage, async () => { throw new Error('offline'); })).text()).toBe('cached asset');
    expect((await cacheFirst(new Request('https://sales.test/missing'), storage, async () => { throw new Error('offline'); })).status).toBe(503);
  });
});
