import { NextResponse } from 'next/server';
import { resolveChannelId, getVideos, getChannelTitle } from '@/lib/youtube';

export async function GET() {
  try {
    const channelId = await resolveChannelId('@michtortiyt');
    const channelTitle = await getChannelTitle(channelId);
    const videos = await getVideos(channelId, 50); // Reduced from 100 to 50 for efficiency

    return NextResponse.json({
      videos,
      channelId,
      channelTitle,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'api_error', message }, { status: 500 });
  }
}
