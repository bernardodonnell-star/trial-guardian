import { addDays, addMonths, isValidDateParts, startOfDay, toDateKey } from '@/lib/dates';

import { findKnownService } from './services';
import type { BillingPeriod, ParseOptions, ParsedTrial } from './types';

/**
 * Rule-based extraction that works on every device, with no model. It also fills gaps
 * left by the on-device model, so it should never guess wildly: a null is better than
 * a wrong date.
 */
export function parseTrialText(rawText: string, options: ParseOptions): ParsedTrial {
  const text = normalize(rawText);
  const price = findPrice(text, options);
  return {
    service: findService(text),
    price: price?.amount ?? null,
    currency: price?.currency ?? null,
    billingPeriod: price?.period ?? findPlanPeriod(text),
    chargeDate: findChargeDate(text, options),
    cancelUrl: findCancelUrl(text),
  };
}

function normalize(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[   ]/g, ' ')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/[ \t]+/g, ' ');
}

// ---------------------------------------------------------------------------
// Dates

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9,
  september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

const MONTH_NAME = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?';
const ORDINAL = '(?:st|nd|rd|th)?';

type DateCandidate = { key: string; index: number; end: number };

const POSITIVE_CONTEXT = [
  /trial (?:period )?(?:will )?(?:end|expire|finish)s?(?: on)?/,
  /(?:end|expire)s? on/,
  /(?:will be |you'll be |be )?(?:charged|billed)(?: on)?/,
  /(?:first|next) (?:payment|charge|billing|bill)(?: date)?(?: on| is)?/,
  /(?:renews?|renewal)(?: date| on)?/,
  /(?:subscription|membership|plan) (?:starts|begins)/,
  /starting(?: on| from)?/,
  /(?:payment|billing) date/,
  /until/,
  /cancel (?:before|by|anytime before)/,
  /free (?:through|thru|till|until)/,
];

const NEGATIVE_CONTEXT = [
  /(?:date of purchase|purchase date|order date|invoice date|receipt date|purchased on|ordered on)/,
  /\b(?:signed up|joined|registered|sent|issued|started)(?: on)?\b/,
  /trial (?:started|began|start date)/,
  /^date:|\ndate:/,
];

function findDates(text: string, options: ParseOptions): DateCandidate[] {
  const found: DateCandidate[] = [];
  const add = (match: RegExpExecArray, year: number | null, month: number, day: number) => {
    const key = resolveDate(year, month, day, options.today);
    if (key && !found.some((f) => f.index === match.index)) {
      found.push({ key, index: match.index, end: match.index + match[0].length });
    }
  };

  const iso = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g;
  for (let m; (m = iso.exec(text)); ) add(m, +m[1], +m[2], +m[3]);

  const monthFirst = new RegExp(`\\b${MONTH_NAME} (\\d{1,2})${ORDINAL}(?:,? (\\d{4}))?\\b`, 'gi');
  for (let m; (m = monthFirst.exec(text)); ) {
    add(m, m[3] ? +m[3] : null, MONTHS[m[1].toLowerCase()], +m[2]);
  }

  const dayFirst = new RegExp(`\\b(\\d{1,2})${ORDINAL} (?:of )?${MONTH_NAME},? ?(\\d{4})?\\b`, 'gi');
  for (let m; (m = dayFirst.exec(text)); ) {
    add(m, m[3] ? +m[3] : null, MONTHS[m[2].toLowerCase()], +m[1]);
  }

  const numeric = /\b(\d{1,2})[/.](\d{1,2})[/.](\d{4}|\d{2})\b/g;
  for (let m; (m = numeric.exec(text)); ) {
    let a = +m[1];
    let b = +m[2];
    const year = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    // Unambiguous when one side cannot be a month.
    const isDayFirst = a > 12 ? true : b > 12 ? false : options.dayFirst;
    if (!isDayFirst) [a, b] = [b, a];
    add(m, year, b, a);
  }

  return found.sort((x, y) => x.index - y.index);
}

/** Dates without a year are taken as the next such day (allowing a week of lateness). */
function resolveDate(year: number | null, month: number, day: number, today: Date): string | null {
  if (year === null) {
    const base = startOfDay(today);
    let candidateYear = base.getFullYear();
    if (!isValidDateParts(candidateYear, month, day)) return null;
    if (new Date(candidateYear, month - 1, day) < addDays(base, -7)) candidateYear += 1;
    year = candidateYear;
  }
  if (year < 2000 || year > 2100 || !isValidDateParts(year, month, day)) return null;
  return toDateKey(new Date(year, month - 1, day));
}

function scoreDate(text: string, candidate: DateCandidate): number {
  const before = text.slice(Math.max(0, candidate.index - 70), candidate.index).toLowerCase();
  const after = text.slice(candidate.end, candidate.end + 30).toLowerCase();
  let score = 0;
  // The closest phrase matters most, so look at the tail of the window first.
  const tail = before.slice(-35);
  if (POSITIVE_CONTEXT.some((p) => p.test(tail))) score += 3;
  else if (POSITIVE_CONTEXT.some((p) => p.test(before))) score += 1;
  if (NEGATIVE_CONTEXT.some((p) => p.test(tail))) score -= 4;
  if (/^[^.\n]{0,12}(?:you(?:'ll| will) be charged|your (?:card|account) will be)/.test(after)) score += 2;
  return score;
}

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fourteen: 14, thirty: 30,
};

const COUNT = '(\\d{1,3}|an?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fourteen|thirty)';
const UNIT = '(day|week|month|year)s?';

const RELATIVE_PATTERNS = [
  new RegExp(`\\b(?:ends|expires|renews|be charged) in ${COUNT} ${UNIT}`, 'i'),
  new RegExp(`\\b${COUNT}[- ]${UNIT}[- ](?:free[- ])?trial`, 'i'),
  new RegExp(`\\bfree (?:trial )?for (?:the first )?${COUNT} ${UNIT}`, 'i'),
  new RegExp(`\\b(?:first )?${COUNT} ${UNIT} (?:free|on us|for free)`, 'i'),
  new RegExp(`\\btrial (?:period )?(?:of|lasts?) ${COUNT} ${UNIT}`, 'i'),
];

function findRelativeDate(text: string, today: Date): string | null {
  for (const pattern of RELATIVE_PATTERNS) {
    const match = pattern.exec(text);
    if (!match) continue;
    const raw = match[1].toLowerCase();
    const count = /^\d+$/.test(raw) ? +raw : NUMBER_WORDS[raw];
    if (!count || count > 400) continue;
    const base = startOfDay(today);
    const unit = match[2].toLowerCase();
    const date =
      unit === 'day' ? addDays(base, count)
      : unit === 'week' ? addDays(base, count * 7)
      : unit === 'month' ? addMonths(base, count)
      : addMonths(base, count * 12);
    return toDateKey(date);
  }
  return null;
}

function findChargeDate(text: string, options: ParseOptions): string | null {
  const todayKey = toDateKey(options.today);
  const candidates = findDates(text, options).map((c) => ({ ...c, score: scoreDate(text, c) }));

  const best = candidates
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)[0];
  if (best) return best.key;

  const relative = findRelativeDate(text, options.today);
  if (relative) return relative;

  // No wording to go on: take the first future date that is not obviously a start date.
  const future = candidates.find((c) => c.score >= 0 && c.key > todayKey);
  return future?.key ?? null;
}

// ---------------------------------------------------------------------------
// Prices

const SYMBOLS: Record<string, string> = {
  '£': 'GBP', '€': 'EUR', '¥': 'JPY', '₹': 'INR', 'us$': 'USD', 'a$': 'AUD', 'au$': 'AUD',
  'c$': 'CAD', 'ca$': 'CAD', 'nz$': 'NZD', 'r$': 'BRL', 'chf': 'CHF',
};
const CODES = 'USD|GBP|EUR|AUD|CAD|NZD|CHF|JPY|INR|SEK|NOK|DKK|PLN|BRL|MXN|ZAR|SGD|HKD';
const AMOUNT = '(\\d{1,3}(?:[,.]\\d{3})*(?:[.,]\\d{1,2})?|\\d+(?:[.,]\\d{1,2})?)';

type PriceCandidate = { amount: number; currency: string; period: BillingPeriod | null; score: number; index: number };

function parseAmount(raw: string): number {
  // The last separator is a decimal point only when followed by one or two digits.
  const decimal = /[.,](\d{1,2})$/.exec(raw);
  const whole = (decimal ? raw.slice(0, decimal.index) : raw).replace(/[.,]/g, '');
  return parseFloat(decimal ? `${whole}.${decimal[1]}` : whole);
}

function periodAfter(text: string, end: number): BillingPeriod | null {
  const after = text.slice(end, end + 28).toLowerCase();
  if (/^\s*(?:\/\s*|per |a |each |every |p\/?)?(?:mo\b|mth|month|monthly)|^\s*pm\b/.test(after)) return 'month';
  if (/^\s*(?:\/\s*|per |a |each |every |p\/?)?(?:yr\b|year|annum|annual|yearly)|^\s*p\.?a\.?\b/.test(after)) return 'year';
  if (/^\s*(?:\/\s*|per |a |each |every )?(?:wk\b|week|weekly)/.test(after)) return 'week';
  return null;
}

function findPrice(text: string, options: ParseOptions): Omit<PriceCandidate, 'score' | 'index'> | null {
  const candidates: PriceCandidate[] = [];
  const push = (index: number, end: number, rawAmount: string, currency: string) => {
    const amount = parseAmount(rawAmount);
    if (!isFinite(amount) || amount <= 0 || amount > 10000) return;
    const before = text.slice(Math.max(0, index - 45), index).toLowerCase();
    const period = periodAfter(text, end);
    let score = 0;
    if (period) score += 3;
    if (/(?:then|after(?: that| the trial| your trial)?|renews? at|charged|billed|will be|costs?|price|regular)\W*$/.test(before)) score += 3;
    else if (/(?:then|charged|billed|renew|subscription|plan|price)/.test(before)) score += 1;
    if (/(?:today|due now|discount|save|off|credit|refund|tax|vat)\W*$/.test(before)) score -= 3;
    if (/^\s*(?:off|discount|credit)/i.test(text.slice(end, end + 12))) score -= 3;
    if (!candidates.some((c) => c.index === index)) {
      candidates.push({ amount, currency, period, score, index });
    }
  };

  const symbolFirst = new RegExp(`(us\\$|a\\$|au\\$|c\\$|ca\\$|nz\\$|r\\$|chf|[£€¥₹$])\\s?${AMOUNT}`, 'gi');
  for (let m; (m = symbolFirst.exec(text)); ) {
    const symbol = m[1].toLowerCase();
    push(m.index, m.index + m[0].length, m[2], symbol === '$' ? options.dollarCurrency : SYMBOLS[symbol]);
  }

  const codeFirst = new RegExp(`\\b(${CODES})\\s?${AMOUNT}`, 'g');
  for (let m; (m = codeFirst.exec(text)); ) push(m.index, m.index + m[0].length, m[2], m[1]);

  const amountFirst = new RegExp(`${AMOUNT}\\s?(€|£|\\b(?:${CODES})\\b)`, 'g');
  for (let m; (m = amountFirst.exec(text)); ) {
    if (/\d/.test(text[m.index - 1] ?? '')) continue;
    const currency = SYMBOLS[m[2]] ?? m[2];
    push(m.index, m.index + m[0].length, m[1], currency);
  }

  const best = candidates.sort((a, b) => b.score - a.score || a.index - b.index)[0];
  if (!best) return null;
  return { amount: best.amount, currency: best.currency, period: best.period };
}

function findPlanPeriod(text: string): BillingPeriod | null {
  const lower = text.toLowerCase();
  if (/\b(?:annual|yearly|12[- ]month) (?:plan|subscription|membership)\b/.test(lower)) return 'year';
  if (/\bmonthly (?:plan|subscription|membership)\b/.test(lower)) return 'month';
  if (/\bweekly (?:plan|subscription|membership)\b/.test(lower)) return 'week';
  return null;
}

// ---------------------------------------------------------------------------
// Service name

const GENERIC_NAMES = /^(?:hi|hello|hey|dear|thanks|thank you|welcome|your|the|our|this|free|trial|subscription|receipt|order|account|premium|plus)$/i;

const WORD = "[\\w+&'-]*(?:\\.\\w+)*";
const NAME = `([A-Z0-9]${WORD}(?: [A-Z0-9+]${WORD}){0,3})`;

const NAME_PATTERNS = [
  new RegExp(`\\bApp:? ${NAME}`),
  new RegExp(`\\bSubscription:? ${NAME}`),
  new RegExp(`\\b[Ww]elcome to ${NAME}`),
  new RegExp(`\\b(?:[Tt]hanks|[Tt]hank you) for (?:signing up|subscribing|joining|choosing|trying)(?: to| for)? ${NAME}`),
  new RegExp(`\\b(?:[Yy]our|[Ss]tart(?:ed)? your|[Ee]njoy your) ${NAME} (?:free )?trial`),
  new RegExp(`\\b(?:free )?trial (?:of|for) ${NAME}`),
  new RegExp(`\\bsubscription to ${NAME}`),
  new RegExp(`\\b(?:[Yy]ou(?:'re| are) (?:now )?(?:subscribed|signed up) to) ${NAME}`),
];

function cleanName(raw: string): string | null {
  const name = raw
    .replace(/[.!,:;]+$/, '')
    .replace(/\s+(?:free|trial|subscription|membership|plan|account)$/i, '')
    .trim();
  if (name.length < 2 || name.length > 40 || GENERIC_NAMES.test(name)) return null;
  return name;
}

function findService(text: string): string | null {
  const known = findKnownService(text);
  for (const pattern of NAME_PATTERNS) {
    const match = pattern.exec(text);
    const name = match ? cleanName(match[1]) : null;
    if (!name) continue;
    // A known brand inside the guessed name ("Spotify Premium") keeps the fuller name.
    if (known && !name.toLowerCase().includes(known.toLowerCase())) return known;
    return name;
  }
  if (known) return known;

  const from = /^from:\s*"?([^"<\n]+?)"?\s*</im.exec(text);
  if (from) {
    const name = cleanName(from[1]);
    if (name) return name;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Links

function findCancelUrl(text: string): string | null {
  const urls = text.match(/https?:\/\/[^\s<>"')\]]+/gi) ?? [];
  const useful = urls
    .map((url) => url.replace(/[.,;:!?]+$/, ''))
    .filter((url) => !/unsubscribe|privacy|terms|legal|help\/article|email-preferences|tracking/i.test(url));
  return (
    useful.find((url) => /cancel/i.test(url)) ??
    useful.find((url) => /(?:account|subscription|membership|billing|manage|plan)/i.test(url)) ??
    null
  );
}
