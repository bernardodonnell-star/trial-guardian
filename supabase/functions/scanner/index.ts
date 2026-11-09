// Scanner: runs every 15 minutes (Supabase cron → this function).
// 1. Polls every active source feed (official first, then data services, then the news allow-list).
// 2. Stores new items as reports; duplicates are skipped by URL.
// 3. Matches reports to places on active trips; relevant ones are triaged by Haiku.
// 4. Labels each event with decideConfirmation(): Confirmed only on an official source;
//    news-only stays Unconfirmed with "accuracy not yet known" and its outlets listed.
// 5. A separate checker call compares the drafted alert with its sources before it is sent.
//
// This is the skeleton for stage 1: steps 1 and 2 are implemented; 3 to 5 are marked TODO.

import { createClient } from 'npm:@supabase/supabase-js@2';

interface SourceRow {
  id: string;
  tier: number;
  feed_url: string | null;
  feed_format: 'rss' | 'atom' | 'json' | null;
}

interface FeedItem {
  url: string;
  title: string;
  publishedAt: string;
}

Deno.serve(async (req) => {
  // Only the scheduler (holding the service role key) may run the scanner.
  const auth = req.headers.get('authorization') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if (auth !== `Bearer ${serviceKey}`) return new Response('Forbidden', { status: 403 });

  const db = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);
  const { data: sources, error } = await db
    .from('sources')
    .select('id, tier, feed_url, feed_format')
    .eq('active', true)
    .gt('tier', 0)
    .not('feed_url', 'is', null)
    .order('tier');
  if (error) return Response.json({ error: error.message }, { status: 500 });

  let stored = 0;
  const failures: string[] = [];
  for (const s of (sources ?? []) as SourceRow[]) {
    try {
      const items = await fetchFeed(s);
      if (items.length === 0) continue;
      const { count } = await db.from('reports').upsert(
        items.map((i) => ({ source_id: s.id, url: i.url, title: i.title, published_at: i.publishedAt })),
        { onConflict: 'url', ignoreDuplicates: true, count: 'exact' },
      );
      stored += count ?? 0;
    } catch (e) {
      failures.push(`${s.id}: ${(e as Error).message}`);
    }
  }

  // TODO stage 2: match new reports to active trips by place and time, triage with Haiku,
  // group into events, decide confirmation, draft alerts with Sonnet, run the checker,
  // then push via Expo push notifications.

  return Response.json({ sources: sources?.length ?? 0, stored, failures });
});

async function fetchFeed(s: SourceRow): Promise<FeedItem[]> {
  const res = await fetch(s.feed_url!, { headers: { 'user-agent': 'Attache-scanner/0.1' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (s.feed_format === 'json') return parseJsonFeed(text);
  return parseXmlFeed(text);
}

// Small tolerant RSS/Atom reader: enough for government and agency feeds.
function parseXmlFeed(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/g) ?? [];
  for (const b of blocks) {
    const title = tag(b, 'title');
    const link = tag(b, 'link') || (/<link[^>]*href="([^"]+)"/.exec(b)?.[1] ?? '');
    const date = tag(b, 'pubDate') || tag(b, 'updated') || tag(b, 'published') || tag(b, 'dc:date');
    if (!title || !link) continue;
    const t = Date.parse(date);
    items.push({ url: link.trim(), title: decode(title), publishedAt: new Date(isNaN(t) ? Date.now() : t).toISOString() });
  }
  return items;
}

function parseJsonFeed(text: string): FeedItem[] {
  const data = JSON.parse(text);
  const list: Record<string, unknown>[] = Array.isArray(data) ? data : (data.items ?? data.value ?? []);
  return list
    .map((i) => ({
      url: String(i.url ?? i.link ?? i.ItemDefaultUrl ?? ''),
      title: String(i.title ?? i.Title ?? ''),
      publishedAt: new Date(String(i.date_published ?? i.PublicationDate ?? i.date ?? Date.now())).toISOString(),
    }))
    .filter((i) => i.url && i.title);
}

function tag(block: string, name: string): string {
  const m = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`).exec(block);
  return m ? m[1].replace(/^<!\[CDATA\[|\]\]>$/g, '').trim() : '';
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
