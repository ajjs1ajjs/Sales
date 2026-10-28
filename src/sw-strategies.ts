export interface ServiceWorkerCachePort {
  match(request: RequestInfo | URL, options?: CacheQueryOptions): Promise<Response | undefined | null>;
  open(cacheName: string): Promise<Cache>;
}

interface StrategyOptions {
  cacheStorage: ServiceWorkerCachePort;
  fetcher: (request: Request) => Promise<Response>;
  runtimeCacheName: string;
  navigationFallback?: string;
  maxRuntimeEntries?: number;
}

async function putRuntime(
  request: Request,
  response: Response,
  cacheStorage: ServiceWorkerCachePort,
  cacheName: string,
  maxEntries: number,
): Promise<void> {
  try {
    const cache = await cacheStorage.open(cacheName);
    await cache.put(request, response);
    const keys = await cache.keys();
    if (keys.length > maxEntries) {
      await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)));
    }
  } catch {
    // Storage quota or a non-cacheable response must not fail the page request.
  }
}

export async function precacheShell(
  cacheStorage: ServiceWorkerCachePort,
  cacheName: string,
  urls: string[],
): Promise<void> {
  const cache = await cacheStorage.open(cacheName);
  await cache.addAll(urls);
}

export async function removeOldCaches(
  cacheStorage: Pick<CacheStorage, 'keys' | 'delete'>,
  prefix: string,
  keep: string[],
): Promise<void> {
  const keepSet = new Set(keep);
  const oldCaches = (await cacheStorage.keys()).filter((key) => key.startsWith(prefix) && !keepSet.has(key));
  await Promise.all(oldCaches.map((key) => cacheStorage.delete(key)));
}

export async function networkFirst(
  request: Request,
  options: StrategyOptions,
  isData: boolean,
  isNavigation: boolean,
): Promise<Response> {
  const matchCached = async (): Promise<Response | undefined> => {
    // Navigations must always fall back to the *versioned* shell. A navigation
    // response cached in the shared runtime cache can outlive an update; once
    // the old shell cache is removed, that stale HTML points at missing JS.
    if (isNavigation) {
      if (options.navigationFallback) {
        const shell = await options.cacheStorage.match(options.navigationFallback);
        if (shell) return shell;
      }
      return undefined;
    }
    const cached = await options.cacheStorage.match(request, { ignoreSearch: isData });
    return cached ?? undefined;
  };

  try {
    const response = await options.fetcher(request);
    if (response.ok) {
      // Only data belongs in the runtime cache. Navigation HTML lives in the
      // versioned shell cache; caching it again would create stale shadow copies.
      if (isData) {
        await putRuntime(
          request,
          response.clone(),
          options.cacheStorage,
          options.runtimeCacheName,
          options.maxRuntimeEntries ?? 200,
        );
      }
      return response;
    }
    return (await matchCached()) ?? response;
  } catch {
    return (await matchCached()) ?? new Response('Offline and no cached content is available.', { status: 503 });
  }
}

export async function cacheFirst(
  request: Request,
  cacheStorage: Pick<ServiceWorkerCachePort, 'match'>,
  fetcher: (request: Request) => Promise<Response>,
): Promise<Response> {
  const cached = await cacheStorage.match(request);
  if (cached) return cached;
  try {
    return await fetcher(request);
  } catch {
    return new Response('Offline', { status: 503 });
  }
}
