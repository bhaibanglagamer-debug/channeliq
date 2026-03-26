/**
 * Simple in-memory cache with TTL
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<any>>();

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

export function setCached<T>(key: string, data: T, ttlSeconds: number = 3600): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export function clearCache(): void {
  cache.clear();
}

export function getCacheStats(): { size: number; keys: string[] } {
  // Clean expired entries
  const now = Date.now();
  const keysToDelete: string[] = [];

  const entries = Array.from(cache.entries());
  for (const [key, entry] of entries) {
    if (now > entry.expiresAt) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach(key => cache.delete(key));

  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}
