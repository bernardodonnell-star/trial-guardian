import type { Confirmation, Iso, Report, Source } from './types.ts';

/**
 * Decide how an event is labelled from the reports gathered about it.
 *
 * Rules (from the product plan, "Source reliability and news reports"):
 * - Only a tier 1 (official) source can confirm or deny. Tier 2 data services
 *   are shown as sources but do not mark an alert Confirmed on their own.
 * - News (tier 3) never confirms. A news-only event is Unconfirmed, and every
 *   independent outlet carrying it is listed with when it last updated.
 * - A syndicated copy (an outlet repeating another's story) counts as one
 *   source with the original, not as an extra independent outlet.
 * - Tier 0 (social media, unknown sites) is ignored entirely.
 * - If official sources disagree, the most recent official statement wins.
 */
export function decideConfirmation(
  reports: Report[],
  sources: Map<string, Source>,
  awaiting: Source[] = [],
): Confirmation {
  const known = reports
    .map((r) => ({ r, s: sources.get(r.sourceId) }))
    .filter((x): x is { r: Report; s: Source } => x.s !== undefined && x.s.tier !== 0);

  const official = known
    .filter((x) => x.s.tier === 1 && x.r.stance !== 'reports')
    .sort((a, b) => time(lastUpdate(b.r)) - time(lastUpdate(a.r)));

  if (official.length > 0) {
    const latest = official[0].r.stance;
    const by = unique(official.filter((x) => x.r.stance === latest).map((x) => x.s));
    return latest === 'confirms' ? { status: 'confirmed', by } : { status: 'denied', by };
  }

  // Group news and data reports by their original outlet.
  const groups = new Map<string, { source: Source; lastUpdate: Iso; repeatedBy: Source[] }>();
  for (const { r, s } of known) {
    const originId = r.syndicatedFrom && sources.has(r.syndicatedFrom) ? r.syndicatedFrom : s.id;
    const origin = sources.get(originId)!;
    const g = groups.get(originId) ?? { source: origin, lastUpdate: lastUpdate(r), repeatedBy: [] };
    if (time(lastUpdate(r)) > time(g.lastUpdate)) g.lastUpdate = lastUpdate(r);
    if (originId !== s.id && !g.repeatedBy.some((x) => x.id === s.id)) g.repeatedBy.push(s);
    groups.set(originId, g);
  }

  const outlets = [...groups.values()].sort((a, b) => time(b.lastUpdate) - time(a.lastUpdate));
  return { status: 'unconfirmed', outlets, awaiting };
}

/** The line shown on an alert card, e.g. "Unconfirmed · accuracy not yet known". */
export function confirmationLabel(c: Confirmation): string {
  switch (c.status) {
    case 'confirmed':
      return `Confirmed by ${listNames(c.by)}`;
    case 'denied':
      return `Denied by ${listNames(c.by)}`;
    case 'unconfirmed': {
      const n = c.outlets.length;
      const reported = n === 0 ? 'no reports yet' : `reported by ${n} independent outlet${n === 1 ? '' : 's'}`;
      return `Unconfirmed · accuracy not yet known · ${reported}`;
    }
  }
}

function listNames(sources: Source[]): string {
  const names = sources.map((s) => s.name);
  if (names.length <= 2) return names.join(' and ');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

function lastUpdate(r: Report): Iso {
  return r.updatedAt ?? r.publishedAt;
}

function time(iso: Iso): number {
  return Date.parse(iso);
}

function unique(sources: Source[]): Source[] {
  const seen = new Set<string>();
  return sources.filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)));
}
