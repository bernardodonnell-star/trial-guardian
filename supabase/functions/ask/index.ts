// Ask: the trip-aware assistant. Each call is one message against the monthly allowance.
// Past the allowance it still answers, from the trip and checked data only (no live search).

import { createClient } from 'npm:@supabase/supabase-js@2';

import { callClaude, MODELS, type Message } from '../_shared/anthropic.ts';

const ALLOWANCE: Record<string, number> = { free: 10, monthly: 150, annual: 150, 'super-user': 500 };

const SYSTEM = `You are Attaché, a travel readiness and safety assistant for a professional traveller.
Answer from the trip details and checked data provided. Say plainly when you cannot confirm something.
Never invent phone numbers, addresses, entry rules or advice levels. Do not give medical or legal advice
beyond pointing to official guidance. Name the source of every fact. Keep answers short.`;

Deno.serve(async (req) => {
  const jwt = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!jwt) return new Response('Sign in required', { status: 401 });

  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: user } = await admin.auth.getUser(jwt);
  if (!user?.user) return new Response('Sign in required', { status: 401 });
  const uid = user.user.id;

  const { question, tripContext, history } = (await req.json()) as {
    question: string;
    tripContext: string; // summary of the trip and brief, built by the app
    history?: Message[];
  };
  if (!question?.trim()) return Response.json({ error: 'Empty question' }, { status: 400 });

  const { data: profile } = await admin.from('profiles').select('plan').eq('id', uid).single();
  const month = new Date().toISOString().slice(0, 7) + '-01';
  const { data: usage } = await admin.from('usage').select('used, top_up_remaining').eq('owner', uid).eq('month', month).maybeSingle();
  const used = usage?.used ?? 0;
  const topUp = usage?.top_up_remaining ?? 0;
  const allowance = ALLOWANCE[profile?.plan ?? 'free'];
  const withinAllowance = used < allowance || topUp > 0;

  // TODO stage 2: when withinAllowance, give the model the web search tool restricted to
  // official and allow-listed domains. Outside it, answer from tripContext only.
  const answer = await callClaude({
    model: MODELS.writer,
    system: `${SYSTEM}\n\nTrip and checked data:\n${tripContext}${withinAllowance ? '' : '\n\nLive search is off for this month: answer only from the data above.'}`,
    messages: [...(history ?? []).slice(-10), { role: 'user', content: question }],
  });

  await admin.from('usage').upsert({
    owner: uid,
    month,
    used: used < allowance ? used + 1 : used,
    top_up_remaining: used < allowance ? topUp : Math.max(0, topUp - 1),
  });

  return Response.json({ answer, liveSearch: withinAllowance, remaining: Math.max(0, allowance - used - 1) + topUp });
});
