// Minimal Claude Messages API client for Edge Functions (Deno).
// The API key lives only in Supabase secrets (ANTHROPIC_API_KEY), never in the app.

export const MODELS = {
  writer: 'claude-sonnet-5-5', // briefs, alert wording, the assistant
  triage: 'claude-haiku-5-5', // relevance triage, the checker
} as const;

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function callClaude(opts: {
  model: string;
  system: string;
  messages: Message[];
  maxTokens?: number;
}): Promise<string> {
  const key = Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set in Supabase secrets');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 1024,
      system: opts.system,
      messages: opts.messages,
    }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.content ?? [])
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('');
}
