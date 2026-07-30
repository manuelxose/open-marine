const CACHE_NAME = 'omi-marine-fields-v1';
const MAX_ENTRIES = 48;
const MAX_CACHE_BYTES = 100 * 1024 * 1024;
const CACHED_AT_HEADER = 'x-omi-cached-at';
const CACHED_SIZE_HEADER = 'x-omi-cached-size';

/** Network-first fetch with an explicit browser cache fallback for passages offline. */
export async function fetchMarineResource(url: string, signal?: AbortSignal): Promise<Response> {
  const cache = 'caches' in globalThis ? await caches.open(CACHE_NAME) : null;
  try {
    const response = await fetch(url, signal ? { signal } : {});
    if (response.ok && cache) {
      await putWithMetadata(cache, url, response);
      void trimCache(cache);
    }
    return response;
  } catch (error) {
    const cached = await cache?.match(url);
    if (cached) return cached;
    throw error;
  }
}

/** Populate adjacent forecast frames without delaying the current render. */
export async function prefetchMarineResources(urls: string[]): Promise<void> {
  await Promise.allSettled(urls.map(async (url) => {
    const cache = 'caches' in globalThis ? await caches.open(CACHE_NAME) : null;
    if (await cache?.match(url)) return;
    const response = await fetch(url);
    if (response.ok && cache) await putWithMetadata(cache, url, response);
  }));
  const cache = 'caches' in globalThis ? await caches.open(CACHE_NAME) : null;
  if (cache) await trimCache(cache);
}

const trimCache = async (cache: Cache): Promise<void> => {
  const keys = await cache.keys();
  const entries = await Promise.all(keys.map(async (request) => {
    const response = await cache.match(request);
    return {
      request,
      cachedAt: Number(response?.headers.get(CACHED_AT_HEADER) ?? 0),
      size: Number(response?.headers.get(CACHED_SIZE_HEADER) ?? response?.headers.get('content-length') ?? 0),
    };
  }));
  const storage: StorageEstimate = typeof navigator !== 'undefined' && navigator.storage?.estimate
    ? await navigator.storage.estimate().catch(() => ({}))
    : {};
  const quotaShare = typeof storage.quota === 'number' ? Math.floor(storage.quota * 0.05) : MAX_CACHE_BYTES;
  const byteLimit = Math.min(MAX_CACHE_BYTES, Math.max(10 * 1024 * 1024, quotaShare));
  let total = entries.reduce((sum, entry) => sum + entry.size, 0);
  let count = entries.length;
  const oldest = entries.sort((left, right) => left.cachedAt - right.cachedAt);
  for (const entry of oldest) {
    if (count <= MAX_ENTRIES && total <= byteLimit) break;
    if (await cache.delete(entry.request)) {
      total -= entry.size;
      count--;
    }
  }
};

const putWithMetadata = async (cache: Cache, url: string, response: Response): Promise<void> => {
  const body = await response.clone().blob();
  const headers = new Headers(response.headers);
  headers.set(CACHED_AT_HEADER, String(Date.now()));
  headers.set(CACHED_SIZE_HEADER, String(body.size));
  await cache.put(url, new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  }));
};
