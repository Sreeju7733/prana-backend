interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const memoryStore = new Map<string, CacheEntry<unknown>>();

/**
 * Fast in-memory cache with TTL.
 * Default TTL: 30 seconds for fast data sync and sub-1ms responses.
 */
export function getCached<T>(key: string): T | null {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCached<T>(key: string, data: T, ttlSeconds: number = 30): void {
  memoryStore.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    memoryStore.clear();
    return;
  }
  for (const key of memoryStore.keys()) {
    if (key.startsWith(prefix) || key.includes(prefix)) {
      memoryStore.delete(key);
    }
  }
}
