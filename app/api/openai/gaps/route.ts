import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Gap } from '@/types';

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'missing_api_key', message: 'OPENAI_API_KEY not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { micheleTitles, competitorTitles } = body as {
      micheleTitles: string[];
      competitorTitles: { channel: string; title: string }[];
    };

    if (!micheleTitles || !competitorTitles) {
      return NextResponse.json(
        { error: 'bad_request', message: 'micheleTitles and competitorTitles are required' },
        { status: 400 }
      );
    }

    const openai = new OpenAI({ apiKey });

    const systemPrompt = `You are a YouTube content strategy analyst. Analyze content gaps between a creator and their competitors.
Find topics that competitors covered successfully that Michele has NOT covered.
Focus on topics with high viewer interest (automation, AI tools, agency building, workflows).
Return actionable content gap suggestions.`;

    const userPrompt = `Michele's recent video titles:
${micheleTitles.map((t) => `- ${t}`).join('\n')}

Competitor videos:
${competitorTitles.map((c) => `[${c.channel}]: ${c.title}`).join('\n')}

Identify the top 5-8 content gaps — topics competitors covered that Michele hasn't.
Respond with JSON: {"gaps": [{"topic": "string", "coveredBy": ["channel1", "channel2"], "suggestion": "specific video title suggestion for Michele"}]}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    });

    const content = completion.choices[0]?.message?.content || '{"gaps":[]}';
    let parsed: { gaps?: Gap[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { gaps: [] };
    }

    return NextResponse.json({ gaps: parsed.gaps || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'api_error', message }, { status: 500 });
  }
}
