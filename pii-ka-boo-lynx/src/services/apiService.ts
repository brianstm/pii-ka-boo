export interface PiiAnalysis {
  hasPII: boolean;
  scrubbedText: string;
}

export function analyzePII(text: string): PiiAnalysis {
  return {
    hasPII: false,
    scrubbedText: text,
  };
}

export async function sendMessage(text: string): Promise<string> {
  // Call local Next API /api/text
  const res = await fetch('http://localhost:3000/api/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text }),
  });
  if (!res.ok) throw new Error('text API error');
  const data = await res.json();
  return data.response || '';
}

export async function callGemini(text: string): Promise<string> {
  const res = await fetch('http://localhost:3000/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text }),
  });
  if (!res.ok) throw new Error('gemini API error');
  const data = await res.json();
  return data.response || '';
}
