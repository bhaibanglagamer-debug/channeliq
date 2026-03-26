import { VideoData } from '@/types';
import { getCached, setCached } from './cache';
import { getNextApiKey, markKeyQuotaExceeded } from './api-key-manager';

export function calcMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function calcOutlierScore(views: number, medianViews: number): number {
  if (medianViews === 0) return 1;
  return Math.round((views / medianViews) * 100) / 100;
}

export async function resolveChannelId(handle: string, apiKey?: string): Promise<string> {
  const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle;
  const cacheKey = `channelId:${cleanHandle}`;

  // Check cache
  const cached = getCached<string>(cacheKey);
  if (cached) return cached;

  const key = apiKey || getNextApiKey();
  const url = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(cleanHandle)}&key=${key}`;

  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json();
    if (res.status === 403) {
      markKeyQuotaExceeded(key);
      // Retry with next key
      const retryKey = getNextApiKey();
      return resolveChannelId(handle, retryKey);
    }
    throw new Error(err?.error?.message || `YouTube API error: ${res.status}`);
  }

  const data = await res.json();
  if (!data.items || data.items.length === 0) {
    throw new Error(`Channel not found for handle: ${handle}`);
  }

  const channelId = data.items[0].id as string;
  // Cache for 24 hours
  setCached(cacheKey, channelId, 86400);
  return channelId;
}

export async function getChannelTitle(channelId: string, apiKey?: string): Promise<string> {
  const cacheKey = `channelTitle:${channelId}`;
  const cached = getCached<string>(cacheKey);
  if (cached) return cached;

  const key = apiKey || getNextApiKey();
  const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${key}`;

  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 403) {
      markKeyQuotaExceeded(key);
      return getChannelTitle(channelId, getNextApiKey());
    }
    throw new Error(`YouTube API error: ${res.status}`);
  }

  const data = await res.json();
  const title = data.items?.[0]?.snippet?.title || channelId;
  setCached(cacheKey, title, 86400);
  return title;
}

function parseDurationSeconds(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1] || '0') * 3600) + (parseInt(m[2] || '0') * 60) + parseInt(m[3] || '0');
}

export async function getVideos(
  channelId: string,
  maxResults: number = 50,
  apiKey?: string
): Promise<VideoData[]> {
  const cacheKey = `videos:v2:${channelId}:${maxResults}`;
  const cached = getCached<VideoData[]>(cacheKey);
  if (cached) return cached;

  const key = apiKey || getNextApiKey();
  let currentKey = key;

  try {
    // Step 1: Get video IDs via search.list (only 1 request for 50 videos)
    const videoIds: string[] = [];
    const params = new URLSearchParams({
      part: 'id',
      channelId,
      type: 'video',
      order: 'date',
      maxResults: String(Math.min(maxResults, 50)), // Max 50 per request
      key: currentKey,
    });

    let res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);

    if (!res.ok && res.status === 403) {
      markKeyQuotaExceeded(currentKey);
      currentKey = getNextApiKey();
      params.set('key', currentKey);
      res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
    }

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err?.error?.message || `YouTube API error: ${res.status}`);
    }

    const data = await res.json();
    const items: { id: { videoId: string } }[] = data.items || [];
    items.forEach((item) => videoIds.push(item.id.videoId));

    if (videoIds.length === 0) return [];

    // Step 2: Get video stats via videos.list (batch up to 50)
    const videos: VideoData[] = [];
    for (let i = 0; i < videoIds.length; i += 50) {
      const batch = videoIds.slice(i, i + 50);
      const statsParams = new URLSearchParams({
        part: 'snippet,statistics,contentDetails',
        id: batch.join(','),
        key: currentKey,
      });

      let statsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?${statsParams}`);

      if (!statsRes.ok && statsRes.status === 403) {
        markKeyQuotaExceeded(currentKey);
        currentKey = getNextApiKey();
        statsParams.set('key', currentKey);
        statsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?${statsParams}`);
      }

      if (!statsRes.ok) {
        const err = await statsRes.json();
        throw new Error(err?.error?.message || `YouTube API error: ${statsRes.status}`);
      }

      const statsData = await statsRes.json();
      for (const item of statsData.items || []) {
        videos.push({
          id: item.id,
          title: item.snippet?.title || '',
          views: parseInt(item.statistics?.viewCount || '0', 10),
          likes: parseInt(item.statistics?.likeCount || '0', 10),
          comments: parseInt(item.statistics?.commentCount || '0', 10),
          publishedAt: item.snippet?.publishedAt || '',
          outlierScore: 0,
          thumbnail: item.snippet?.thumbnails?.medium?.url || '',
          durationSeconds: parseDurationSeconds(item.contentDetails?.duration || ''),
        });
      }
    }

    // Step 3: Calculate outlier scores using median of last 30 videos
    const last30 = videos.slice(0, 30);
    const medianViews = calcMedian(last30.map((v) => v.views));
    videos.forEach((v) => {
      v.outlierScore = calcOutlierScore(v.views, medianViews);
    });

    // Cache for 1 hour
    setCached(cacheKey, videos, 86400); // 24 hours
    return videos;
  } catch (err) {
    throw err;
  }
}
