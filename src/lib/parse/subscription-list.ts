import { firstDateIn, priceIn } from './heuristic';
import type { BillingPeriod, ParseOptions } from './types';

/** One row read from a screenshot of Settings › Apple Account › Subscriptions. */
export type ListedSubscription = {
  service: string;
  plan: string | null;
  /** `YYYY-MM-DD` of the next renewal, or of the day access ends when it is already cancelled. */
  date: string;
  /** Renews: still charging. Expires: already cancelled, so nothing to do. */
  renews: boolean;
  /** A free trial still running ("Free trial ends ..."), as opposed to a paid renewal. */
  isTrial: boolean;
  price: number | null;
  currency: string | null;
  billingPeriod: BillingPeriod | null;
};

const DATE_LINE = /^(renews|expires|expiring|ends|free trial ends|trial ends|your free trial ends)(?: on)?:?\s+(.+)$/i;
/** Lines on that screen that are never a service or plan name. */
const NOISE =
  /^(?:subscriptions?|active|inactive|edit|done|cancel|back|see all|apple account|apple id|settings|share with family|[<>›‹]+|\d{1,2}:\d{2}(?:\s?[ap]m)?|\d+%|lte|5g|4g|wi-?fi)$/i;
const INACTIVE = /^(?:inactive|expired\b)/i;

/**
 * Reads every subscription from the text of a Subscriptions screenshot. Each row is a name,
 * an optional plan line and a "Renews 12 November" or "Expires 3 Dec" line.
 */
export function parseSubscriptionList(rawText: string, options: ParseOptions): ListedSubscription[] {
  const lines = rawText
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const results: ListedSubscription[] = [];
  let pending: string[] = [];
  for (const line of lines) {
    if (INACTIVE.test(line)) break;
    const match = DATE_LINE.exec(line);
    if (!match) {
      if (!NOISE.test(line)) pending.push(line);
      continue;
    }
    const date = firstDateIn(match[2], options);
    const [service, ...rest] = pending.filter((l) => !priceOnly(l, options));
    if (date && service && service.length <= 40) {
      const priceText = pending.join(' ') + ' ' + match[2];
      const price = priceIn(priceText, options);
      const plan = rest[0] ?? null;
      const word = match[1].toLowerCase();
      results.push({
        service: cleanService(service),
        plan,
        date,
        renews: word === 'renews' || word.includes('trial'),
        isTrial: word.includes('trial'),
        price: price?.amount ?? null,
        currency: price?.currency ?? null,
        billingPeriod: price?.period ?? periodFromPlan(plan),
      });
    }
    pending = [];
  }
  return results;
}

function priceOnly(line: string, options: ParseOptions): boolean {
  return /^[^a-z]*$/i.test(line.replace(/\b(?:month|year|week|mo|yr|per)\b/gi, '')) && priceIn(line, options) !== null;
}

function cleanService(line: string): string {
  return line.replace(/\s*[>›]$/, '').trim();
}

function periodFromPlan(plan: string | null): BillingPeriod | null {
  if (!plan) return null;
  if (/\b(?:annual|yearly|year|12 months?)\b/i.test(plan)) return 'year';
  if (/\b(?:monthly|month|1 month)\b/i.test(plan)) return 'month';
  if (/\b(?:weekly|week)\b/i.test(plan)) return 'week';
  return null;
}
