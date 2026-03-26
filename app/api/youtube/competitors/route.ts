import { NextRequest, NextResponse } from 'next/server';
import { resolveChannelId, getVideos, getChannelTitle } from '@/lib/youtube';
import { CompetitorData } from '@/types';

const DEFAULT_HANDLES = ['@LiamOttley', '@hasantoor', '@nicksaraev', '@corbingpt'];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const handlesParam = searchParams.get('handles');

  const handles = handlesParam
    ? handlesParam.split(',').map((h) => h.trim()).filter(Boolean)
    : DEFAULT_HANDLES;

  try {
    const competitors: CompetitorData[] = [];

    for (const handle of handles) {
      try {
        const channelId = await resolveChannelId(handle);
        const channelTitle = await getChannelTitle(channelId);
        const videos = await getVideos(channelId, 20);
        const avgOutlierScore =
          videos.length > 0
            ? Math.round((videos.reduce((sum, v) => sum + v.outlierScore, 0) / videos.length) * 100) / 100
            : 0;

        competitors.push({ handle, channelId, channelTitle, videos, avgOutlierScore });
      } catch (err: unknown) {
        console.error(`Failed to fetch competitor ${handle}:`, err instanceof Error ? err.message : err);
      }
    }

    return NextResponse.json({ competitors });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'api_error', message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { handle } = body as { handle: string };
    if (!handle) {
      return NextResponse.json({ error: 'bad_request', message: 'handle is required' }, { status: 400 });
    }

    const channelId = await resolveChannelId(handle);
    const channelTitle = await getChannelTitle(channelId);
    const videos = await getVideos(channelId, 20);
    const avgOutlierScore =
      videos.length > 0
        ? Math.round((videos.reduce((sum, v) => sum + v.outlierScore, 0) / videos.length) * 100) / 100
        : 0;

    const competitor: CompetitorData = { handle, channelId, channelTitle, videos, avgOutlierScore };
    return NextResponse.json({ competitor });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'api_error', message }, { status: 500 });
  }
}
