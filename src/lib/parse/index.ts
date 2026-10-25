import { getLocales } from 'expo-localization';

import { extractWithOnDeviceModel } from '@/modules/trial-extractor';
import { addDays, fromDateKey, toDateKey } from '@/lib/dates';

import { parseTrialText } from './heuristic';
import type { BillingPeriod, ParseOptions, ParsedTrial } from './types';

export type { BillingPeriod, ParsedTrial } from './types';
export { parseTrialText } from './heuristic';

export type ReadResult = {
  trial: ParsedTrial;
  /** Which reader produced the result, shown so people know nothing left the phone. */
  method: 'on-device-model' | 'rules';
};

const MODEL_TIMEOUT_MS = 12000;

/** Locale defaults: day-first dates outside the US, and the local dollar for a bare `$`. */
export function defaultParseOptions(today: Date = new Date()): ParseOptions {
  const locale = getLocales()[0];
  const region = locale?.regionCode ?? 'US';
  const dollarRegions: Record<string, string> = { AU: 'AUD', CA: 'CAD', NZ: 'NZD', SG: 'SGD', HK: 'HKD' };
  return {
    today,
    dayFirst: !['US', 'PH', 'CA'].includes(region),
    dollarCurrency: dollarRegions[region] ?? 'USD',
  };
}

/** Reads trial details from shared text: the on-device model first, rules to fill any gaps. */
export async function readTrialFromText(
  text: string,
  options: ParseOptions = defaultParseOptions()
): Promise<ReadResult> {
  const rules = parseTrialText(text, options);
  let model: Partial<ParsedTrial> | null = null;
  try {
    const raw = await withTimeout(
      extractWithOnDeviceModel(text, toDateKey(options.today)),
      MODEL_TIMEOUT_MS
    );
    model = raw ? validateModelOutput(raw, text, options.today) : null;
  } catch {
    model = null;
  }
  if (!model) return { trial: rules, method: 'rules' };

  const merged: ParsedTrial = { ...rules };
  for (const key of Object.keys(rules) as (keyof ParsedTrial)[]) {
    const value = model[key];
    if (value !== null && value !== undefined) {
      (merged as Record<string, unknown>)[key] = value;
    }
  }
  return { trial: merged, method: 'on-device-model' };
}

/** Reads the text in a screenshot with on-device OCR, then parses it. */
export async function readTrialFromImage(
  uri: string,
  options: ParseOptions = defaultParseOptions()
): Promise<ReadResult & { text: string }> {
  // Loaded lazily: the native module throws at import time where it is missing (web, Expo Go).
  let ocr: typeof import('expo-text-extractor');
  try {
    ocr = await import('expo-text-extractor');
  } catch {
    throw new Error('Text recognition is not available on this device.');
  }
  if (!ocr.isSupported) throw new Error('Text recognition is not available on this device.');
  const lines = await ocr.extractTextFromImage(uri);
  const text = lines.join('\n');
  return { ...(await readTrialFromText(text, options)), text };
}

const PAYMENT_PROVIDERS = /^(?:apple|app store|google|google play|paypal|stripe|visa|mastercard)$/i;

/** The model can invent things, so only keep fields that are well formed and plausible. */
export function validateModelOutput(
  raw: Record<string, string>,
  sourceText: string,
  today: Date
): Partial<ParsedTrial> {
  const result: Partial<ParsedTrial> = {};

  const service = raw.service?.trim();
  if (service && service.length <= 40 && !PAYMENT_PROVIDERS.test(service)) result.service = service;

  const price = parseFloat(raw.price);
  if (isFinite(price) && price > 0 && price < 10000) result.price = Math.round(price * 100) / 100;

  const currency = raw.currency?.trim().toUpperCase();
  if (currency && /^[A-Z]{3}$/.test(currency)) result.currency = currency;

  if (['week', 'month', 'year'].includes(raw.billingPeriod)) {
    result.billingPeriod = raw.billingPeriod as BillingPeriod;
  }

  const date = raw.chargeDate?.trim();
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const parsed = fromDateKey(date);
    const valid = toDateKey(parsed) === date;
    if (valid && parsed >= addDays(today, -7) && parsed <= addDays(today, 800)) {
      result.chargeDate = date;
    }
  }

  // Only accept a link that really appears in the text.
  const url = raw.cancelUrl?.trim();
  if (url && /^https?:\/\//i.test(url) && sourceText.includes(url) && !/unsubscribe/i.test(url)) {
    result.cancelUrl = url;
  }

  return result;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}
