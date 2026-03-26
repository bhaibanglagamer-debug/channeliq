import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GeneratedIdea } from '@/types';

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'missing_api_key', message: 'OPENAI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { topVideos, competitorVideos, gaps, topTopics, constraints } = body as {
      topVideos: string[];
      competitorVideos: { channel: string; title: string; views: number }[];
      gaps: string[];
      topTopics: string[];
      constraints: string;
    };

    const openai = new OpenAI({ apiKey });

    const topCompetitorVideos = (competitorVideos || [])
      .sort((a, b) => b.views - a.views)
      .slice(0, 15);

    const userPrompt = `Generate 10 viral YouTube video ideas for a creator in the AI automation / agency niche (Make.com, n8n, AI agents).

Michele's top performing videos (high outlier score = overperformed vs channel median):
${topVideos.slice(0, 10).map((t) => `- ${t}`).join('\n') || '- No data yet'}

Competitors' best performing videos (what's working in the niche right now):
${topCompetitorVideos.length > 0
  ? topCompetitorVideos.map((v) => `- [${v.channel}] ${v.title} (${(v.views / 1000).toFixed(0)}k views)`).join('\n')
  : '- No competitor data'}

Content gaps — topics competitors covered that Michele hasn't:
${gaps.slice(0, 5).map((g) => `- ${g}`).join('\n') || '- No gaps identified yet'}

Best performing topic clusters:
${topTopics.slice(0, 5).map((t) => `- ${t}`).join('\n') || '- No topic data yet'}

${constraints ? `Specific focus/constraints: ${constraints}` : ''}

Rules:
- Titles must be punchy, specific, and click-worthy (no vague titles like "How to automate X")
- Hook should be the first sentence you'd say in the video that makes people stay
- Angle = why THIS video beats all existing ones on this topic
- viral_score 1-10 based on: niche relevance, curiosity gap, specificity, trending demand
- Prioritize ideas that combine Michele's proven formats with competitor gaps

Respond with ONLY valid JSON: {"ideas": [{"title": "...", "hook": "...", "angle": "...", "viral_score": 9}]}
Exactly 10 ideas, sorted by viral_score descending.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a viral YouTube content strategist specializing in AI automation, Make.com, n8n, and AI agency content. You output only valid JSON.',
        },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.85,
    });

    const content = completion.choices[0]?.message?.content || '{"ideas":[]}';
    let parsed: { ideas?: GeneratedIdea[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { ideas: [] };
    }

    const ideas = (parsed.ideas || []).slice(0, 10);
    ideas.sort((a, b) => b.viral_score - a.viral_score);
    return NextResponse.json({ ideas });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'api_error', message }, { status: 500 });
  }
}
