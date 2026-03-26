/**
 * Manages YouTube API key rotation when quota is exceeded
 */

// In-memory tracking of which keys have hit quota
const quotaExceededKeys = new Set<string>();

// Current key index
let currentKeyIndex = 0;

function getAllKeys(): string[] {
  const keysStr = process.env.YOUTUBE_API_KEYS || '';
  return keysStr.split(',').filter(k => k.trim());
}

export function getNextApiKey(): string {
  const keys = getAllKeys();
  if (keys.length === 0) {
    throw new Error('No YouTube API keys configured');
  }

  // Find the first non-exceeded key, starting from current index
  const attemptLimit = keys.length;
  let attempts = 0;

  while (attempts < attemptLimit) {
    const key = keys[currentKeyIndex % keys.length];
    currentKeyIndex = (currentKeyIndex + 1) % keys.length;

    if (!quotaExceededKeys.has(key)) {
      return key;
    }
    attempts++;
  }

  // All keys exceeded, reset and use the oldest one (quota might have reset)
  if (quotaExceededKeys.size >= keys.length) {
    console.warn('All YouTube API keys exceeded quota. Resetting oldest key.');
    quotaExceededKeys.clear();
    currentKeyIndex = 0;
    return keys[0];
  }

  return keys[0];
}

export function markKeyQuotaExceeded(key: string): void {
  quotaExceededKeys.add(key);
  console.warn(`[API] YouTube key quota exceeded: ${key.slice(0, 10)}...`);
}

export function getAvailableKeysCount(): number {
  const keys = getAllKeys();
  return keys.length - quotaExceededKeys.size;
}

export function resetQuotaTracking(): void {
  quotaExceededKeys.clear();
  currentKeyIndex = 0;
}
