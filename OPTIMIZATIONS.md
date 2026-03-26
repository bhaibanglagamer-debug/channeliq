# YouTube API Quota Optimizations

## Problem
Initial implementation was burning through YouTube API quota very quickly (10,000 units/day limit exceeded after 2-3 refreshes).

## Root Causes
1. **Multiple search.list calls** — Fetching 100 videos required 2+ paginated search requests (100 units each)
2. **No caching** — Every refresh re-fetched all data from scratch
3. **Single API key** — Quota exceeded immediately with no failover

## Solutions Implemented

### 1. **API Key Rotation** (`lib/api-key-manager.ts`)
- Store all 9 API keys in `.env.local` as comma-separated list
- Automatic rotation when a key hits quota (403 error)
- In-memory tracking of exceeded keys
- Seamless fallback to next available key

**Usage:**
```typescript
import { getNextApiKey, markKeyQuotaExceeded } from '@/lib/api-key-manager';

const key = getNextApiKey(); // Gets next available key
// If API call fails with 403:
markKeyQuotaExceeded(key);
const retryKey = getNextApiKey(); // Gets different key
```

### 2. **Response Caching** (`lib/cache.ts`)
- In-memory TTL-based cache for all YouTube API responses
- Configurable cache durations per data type:
  - **Channel IDs**: 24 hours (rarely change)
  - **Channel titles**: 24 hours
  - **Video data**: 1 hour (balance between freshness and quota savings)

**Impact:** Subsequent refreshes cost 0 API units if cache is fresh.

### 3. **Reduced Video Fetches**
- **Before:** Fetched 100 videos per channel
- **After:** Fetches 50 videos per channel
- **Why:** Reduces search.list cost from 200+ units to ~150 units per load

### 4. **Optimized API Calls**
- **Single search request** instead of paginated (max 50 videos per request)
- **Batch video stats calls** (50 videos per request using video IDs)
- **Eliminated redundant calls** through proper caching

## Quota Cost Comparison

### Before Optimizations
```
Dashboard load (100 videos):
  - search.list (paginated): ~200 units
  - videos.list (stats): ~100 units
  - channels.list (title): 1 unit
  Total per load: ~301 units

With 3 refreshes: ~900 units
With 10 refreshes: ~3,000 units
⚠️ Daily limit (10,000) exceeded easily
```

### After Optimizations
```
First dashboard load (50 videos, no cache):
  - search.list (single request): 100 units
  - videos.list (stats): ~50 units
  - channels.list (title): 1 unit
  Total: ~151 units

Subsequent refreshes (with 1h cache): 0 units (cached response)
10 refreshes in 1 hour: ~151 units (only first counts)
Daily usage: ~500-1,000 units (very safe)
```

## How It Works

### On First Load
1. API route called
2. Check cache → miss
3. Get next available key
4. Fetch channel ID (cached for 24h)
5. Fetch channel title (cached for 24h)
6. Fetch 50 videos (cached for 1h)
7. Return response to client

### On Subsequent Load (within cache TTL)
1. API route called
2. Check cache → hit
3. Return cached response (0 API units)

### When Quota Exceeded (403 error)
1. Mark current key as exceeded
2. Automatically get next available key
3. Retry request with new key
4. Continue seamlessly without user seeing error

## API Key Rotation Status

With 9 API keys provided, you can handle:
- ~9x more API calls before hitting quota on all keys
- Time to recovery: 24 hours (YouTube resets quota daily at midnight PT)

## Configuration

Update `.env.local`:
```
YOUTUBE_API_KEYS=key1,key2,key3,...,key9
OPENAI_API_KEY=...
```

## Monitoring

Check available keys at runtime:
```typescript
import { getAvailableKeysCount } from '@/lib/api-key-manager';

const available = getAvailableKeysCount(); // Returns 0-9
```

## Future Optimizations

If quota is still an issue, consider:
1. Increase cache TTL (trade freshness for quota savings)
2. Add backend persistent cache (Redis/database)
3. Reduce monitored competitors
4. Implement scheduled data refresh instead of on-demand
