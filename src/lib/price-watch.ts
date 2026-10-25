import { formatMoney, type PricePoint, type Trial } from '@/lib/trials';

export type PriceRise = { from: number; to: number; currency: string | null; since: string };

const sameService = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Compares a price with what this service cost before, from the trial's own history and from
 * earlier trials or subscriptions with the same name. Only like-for-like prices count:
 * the same currency and billing period.
 */
export function findPriceRise(
  candidate: Pick<Trial, 'id' | 'service' | 'price' | 'currency' | 'billingPeriod'> & { priceHistory?: PricePoint[] },
  all: Trial[]
): PriceRise | null {
  if (candidate.price === null) return null;
  const earlier: PricePoint[] = [...(candidate.priceHistory ?? [])];
  for (const other of all) {
    if (other.id === candidate.id || !sameService(other.service, candidate.service)) continue;
    if (other.billingPeriod !== candidate.billingPeriod) continue;
    for (const point of other.priceHistory ?? []) earlier.push(point);
    if (other.price !== null && !(other.priceHistory ?? []).length) {
      earlier.push({ date: other.createdAt.slice(0, 10), price: other.price, currency: other.currency });
    }
  }
  const comparable = earlier
    .filter((p) => p.currency === candidate.currency && p.price < candidate.price!)
    .sort((a, b) => a.date.localeCompare(b.date));
  // The most recent lower price is the fairest comparison.
  const last = comparable[comparable.length - 1];
  return last ? { from: last.price, to: candidate.price, currency: candidate.currency, since: last.date } : null;
}

export function describePriceRise(rise: PriceRise): string {
  const percent = Math.round(((rise.to - rise.from) / rise.from) * 100);
  return `Up ${percent}% from ${formatMoney(rise.from, rise.currency)}`;
}
