import { NextRequest, NextResponse } from 'next/server';
import { readIdeas, writeIdeas } from '@/lib/ideas-store';
import { IdeaStatus } from '@/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const ideas = await readIdeas();
    const index = ideas.findIndex((idea) => idea.id === id);

    if (index === -1) {
      return NextResponse.json({ error: 'not_found', message: 'Idea not found' }, { status: 404 });
    }

    const updatableFields = ['title', 'hook', 'angle', 'viral_score', 'status', 'tags', 'youtube_url'] as const;
    const updated = { ...ideas[index] };
    const bodyRecord = body as Record<string, unknown>;
    for (const field of updatableFields) {
      if (field in bodyRecord) {
        (updated as Record<string, unknown>)[field] = bodyRecord[field];
      }
    }
    updated.updated_at = new Date().toISOString();

    const validStatuses: IdeaStatus[] = ['Idea', 'Scripting', 'Filmed', 'Live'];
    if (updated.status && !validStatuses.includes(updated.status)) {
      return NextResponse.json({ error: 'bad_request', message: 'Invalid status value' }, { status: 400 });
    }

    ideas[index] = updated;
    await writeIdeas(ideas);
    return NextResponse.json({ idea: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'store_error', message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const ideas = await readIdeas();
    const filtered = ideas.filter((idea) => idea.id !== id);
    if (filtered.length === ideas.length) {
      return NextResponse.json({ error: 'not_found', message: 'Idea not found' }, { status: 404 });
    }
    await writeIdeas(filtered);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'store_error', message }, { status: 500 });
  }
}
