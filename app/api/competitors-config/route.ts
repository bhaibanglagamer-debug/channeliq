import { NextRequest, NextResponse } from 'next/server';
import { kvGet, kvSet } from '@/lib/kv-store';

const KEY = 'competitors:handles:v1';
const DEFAULT_HANDLES = ['@LiamOttley', '@NicholasPuru', '@nateherk', '@nicksaraev', '@corbingpt'];

export async function GET() {
  try {
    const handles = await kvGet<string[]>(KEY);
    return NextResponse.json({ handles: handles ?? DEFAULT_HANDLES });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ handles: DEFAULT_HANDLES, error: message });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { handles } = await request.json() as { handles: string[] };
    if (!Array.isArray(handles)) {
      return NextResponse.json({ error: 'bad_request', message: 'handles must be an array' }, { status: 400 });
    }
    await kvSet(KEY, handles);
    return NextResponse.json({ handles });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'store_error', message }, { status: 500 });
  }
}
