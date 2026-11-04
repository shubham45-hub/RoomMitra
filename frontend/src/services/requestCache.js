const cache = new Map();
const MAX_CACHE_ENTRIES = 200;

function store(key, entry) {
  const now = Date.now();
  for (const [cachedKey, cachedEntry] of cache) {
    if (!cachedEntry.request && cachedEntry.expiresAt <= now) cache.delete(cachedKey);
  }
  cache.delete(key);
  cache.set(key, entry);
  while (cache.size > MAX_CACHE_ENTRIES) {
    cache.delete(cache.keys().next().value);
  }
}

export function getCachedRequest(key, request, ttlMs) {
  const cached = cache.get(key);
  if (cached?.data !== undefined && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.data);
  }
  if (cached?.request) return cached.request;

  const entry = { expiresAt: 0, request: null };
  entry.request = Promise.resolve()
    .then(request)
    .then((data) => {
      entry.data = data;
      entry.expiresAt = Date.now() + ttlMs;
      entry.request = null;
      return data;
    })
    .catch((error) => {
      if (cache.get(key) === entry) cache.delete(key);
      throw error;
    });
  store(key, entry);
  return entry.request;
}

export function setCachedData(key, data, ttlMs) {
  store(key, { data, expiresAt: Date.now() + ttlMs, request: null });
}

export function updateCachedData(key, update) {
  const entry = cache.get(key);
  if (entry?.data !== undefined) {
    entry.data = update(entry.data);
  }
}

export function updateCachedDataByPrefix(prefix, update) {
  for (const [key, entry] of cache) {
    if (key.startsWith(prefix) && entry.data !== undefined) {
      entry.data = update(entry.data);
    }
  }
}

export function invalidateCachedData(prefix) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

export function clearRequestCache() {
  cache.clear();
}
