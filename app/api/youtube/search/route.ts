import { NextRequest, NextResponse } from 'next/server';
import { VideoData } from '@/types';
import { calcMedian, calcOutlierScore } from '@/lib/youtube';
import { getNextApiKey, markKeyQuotaExceeded } from '@/lib/api-key-manager';
import { getCached, setCached } from '@/lib/cache';

const DEFAULT_KEYWORDS = [
  'make.com', 'n8n', 'AI automation', 'AI agency',
  'no-code AI', 'AI agents', 'Claude AI', 'ChatGPT automation',
];

interface KeywordBucket {
  label: string;       // e.g. "4w ago"
  periodStart: string; // ISO
  periodEnd: string;   // ISO
  videos: VideoData[];
  totalViews: number;
  videoCount: number;
}

interface TrendKeywordData {
  keyword: string;
  buckets: KeywordBucket[];
  latestViews: number;
  prevViews: number;
  changePercent: number;
  topVideo: VideoData | null;
}

async function searchKeyword(
  keyword: string,
  publishedAfter: string,
  publishedBefore: string
): Promise<VideoData[]> {
  const cacheKey = `search2:${keyword}:${publishedAfter.slice(0, 10)}:${publishedBefore.slice(0, 10)}`;
  const cached = getCached<VideoData[]>(cacheKey);
  if (cached) return cached;

  let currentKey = getNextApiKey();

  const params = new URLSearchParams({
    part: 'id',
    q: keyword,
    type: 'video',
    order: 'viewCount',
    maxResults: '8',
    publishedAfter,
    publishedBefore,
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
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `YouTube API error: ${res.status}`);
  }

  const data = await res.json();
  const videoIds: string[] = (data.items || [])
    .map((item: { id: { videoId: string } }) => item.id.videoId)
    .filter(Boolean);

  if (videoIds.length === 0) return [];

  const statsParams = new URLSearchParams({
    part: 'snippet,statistics',
    id: videoIds.join(','),
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
    const err = await statsRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || `YouTube API error: ${statsRes.status}`);
  }

  const statsData = await statsRes.json();
  const videos: VideoData[] = (statsData.items || []).map((item: any) => ({
    id: item.id,
    title: item.snippet?.title || '',
    views: parseInt(item.statistics?.viewCount || '0', 10),
    likes: parseInt(item.statistics?.likeCount || '0', 10),
    comments: parseInt(item.statistics?.commentCount || '0', 10),
    publishedAt: item.snippet?.publishedAt || '',
    outlierScore: 0,
    thumbnail: item.snippet?.thumbnails?.medium?.url || '',
  }));

  const median = calcMedian(videos.map((v) => v.views));
  videos.forEach((v) => { v.outlierScore = calcOutlierScore(v.views, median); });

  setCached(cacheKey, videos, 4 * 3600);
  return videos;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  // weekSpan = how many weeks of history to fetch (default 4)
  const weekSpan = Math.min(parseInt(searchParams.get('weeks') || '4', 10), 6);
  const keywordsParam = searchParams.get('keywords');
  const keywords = keywordsParam
    ? keywordsParam.split(',').map((k) => k.trim()).filter(Boolean)
    : DEFAULT_KEYWORDS;

  const cacheKey = `trend-v2:weeks=${weekSpan}:kw=${keywords.join(',')}:${new Date().toISOString().slice(0, 13)}`;
  const cached = getCached<{ keywords: TrendKeywordData[] }>(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const now = new Date();

    // Build weekly bucket boundaries (oldest → newest)
    const bucketBoundaries: { start: Date; end: Date; label: string }[] = [];
    for (let w = weekSpan - 1; w >= 0; w--) {
      const end = new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000);
      const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      const label = w === 0 ? 'This week' : w === 1 ? 'Last week' : `${w}w ago`;
      bucketBoundaries.push({ start, end, label });
    }

    const result: TrendKeywordData[] = [];

    for (const keyword of keywords) {
      const buckets: KeywordBucket[] = [];

      // Fetch all buckets in parallel
      const bucketResults = await Promise.allSettled(
        bucketBoundaries.map((b) =>
          searchKeyword(keyword, b.start.toISOString(), b.end.toISOString())
        )
      );

      bucketResults.forEach((res, i) => {
        const b = bucketBoundaries[i];
        const videos = res.status === 'fulfilled' ? res.value : [];
        const totalViews = videos.reduce((s, v) => s + v.views, 0);
        buckets.push({
          label: b.label,
          periodStart: b.start.toISOString(),
          periodEnd: b.end.toISOString(),
          videos,
          totalViews,
          videoCount: videos.length,
        });
      });

      const latestViews = buckets[buckets.length - 1]?.totalViews ?? 0;
      const prevViews = buckets[buckets.length - 2]?.totalViews ?? 0;
      const changePercent = prevViews > 0 ? Math.round(((latestViews - prevViews) / prevViews) * 100) : 0;

      // Top video across all buckets
      const allVideos = buckets.flatMap((b) => b.videos);
      const topVideo = allVideos.sort((a, b) => b.views - a.views)[0] ?? null;

      result.push({ keyword, buckets, latestViews, prevViews, changePercent, topVideo });
    }

    const payload = { keywords: result };
    setCached(cacheKey, payload, 4 * 3600);
    return NextResponse.json(payload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'api_error', message }, { status: 500 });
  }
}
