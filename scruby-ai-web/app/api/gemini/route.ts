import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    const apiKey = process.env.NEXT_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing NEXT_GEMINI_API_KEY' }, { status: 500 });
    }

    const geminiRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: message }]}],
      }),
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      return NextResponse.json({ error: 'Gemini call failed', details: err }, { status: 500 });
    }

    const data = await geminiRes.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return NextResponse.json({ response: text });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 });
  }
}


