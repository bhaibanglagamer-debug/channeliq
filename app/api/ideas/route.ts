import { NextRequest, NextResponse } from 'next/server';
import { readIdeas, writeIdeas } from '@/lib/ideas-store';
import { Idea, IdeaStatus } from '@/types';
import { randomUUID } from 'crypto';

export async function GET() {
  try {
    const ideas = await readIdeas();
    return NextResponse.json({ ideas });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'store_error', message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, hook, angle, viral_score, status, tags } = body as {
      title: string;
      hook?: string;
      angle?: string;
      viral_score?: number;
      status?: IdeaStatus;
      tags?: string[];
    };

    if (!title) {
      return NextResponse.json({ error: 'bad_request', message: 'title is required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const newIdea: Idea = {
      id: randomUUID(),
      title,
      hook: hook || '',
      angle: angle || '',
      viral_score: viral_score ?? 5,
      status: status || 'Idea',
      tags: tags || [],
      created_at: now,
      updated_at: now,
    };

    const ideas = await readIdeas();
    ideas.unshift(newIdea);
    await writeIdeas(ideas);
    return NextResponse.json({ idea: newIdea }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'store_error', message }, { status: 500 });
  }
}
