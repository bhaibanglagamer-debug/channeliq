/**
 * Client-side localStorage cache with TTL.
 * Pages that share data (e.g. Michele's channel videos) use this so
 * navigating between tabs doesn't re-fetch the same data from YouTube.
 */

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export function clientGet<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function clientSet<T>(key: string, data: T, ttlMs: number = TTL_MS): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: CacheEntry<T> = { data, expiresAt: Date.now() + ttlMs };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Ignore storage errors (private browsing, full storage, etc.)
  }
}
