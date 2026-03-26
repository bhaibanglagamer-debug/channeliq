import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const TOPIC_CATEGORIES = [
  'Make.com Tutorial',
  'n8n Tutorial',
  'AI Agency Tips',
  'Case Study',
  'AI Tools Review',
  'Automation Workflow',
  'Business Growth',
  'Other',
];

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
    const { titles } = body as { titles: string[] };

    if (!titles || !Array.isArray(titles) || titles.length === 0) {
      return NextResponse.json(
        { error: 'bad_request', message: 'titles array is required' },
        { status: 400 }
      );
    }

    const openai = new OpenAI({ apiKey });

    const systemPrompt = `You are a YouTube video classifier. Classify each video title into exactly one of these categories:
${TOPIC_CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Respond with a JSON array where each item has "title" and "topic" fields.
Only use the exact category names listed above.`;

    const userPrompt = `Classify these YouTube video titles:\n${titles.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Respond with JSON array: [{"title": "...", "topic": "..."}]`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content || '{"classifications":[]}';
    let parsed: { classifications?: { title: string; topic: string }[]; results?: { title: string; topic: string }[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { classifications: [] };
    }

    const classifications = parsed.classifications || parsed.results || [];

    return NextResponse.json({ classifications });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'api_error', message }, { status: 500 });
  }
}
