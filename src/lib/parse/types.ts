export type BillingPeriod = 'week' | 'month' | 'year';

/** What we could pull out of a sign-up email, receipt or screenshot. Every field is optional. */
export type ParsedTrial = {
  service: string | null;
  price: number | null;
  /** ISO 4217 code, e.g. `GBP`. */
  currency: string | null;
  billingPeriod: BillingPeriod | null;
  /** The day the first charge happens (or the trial ends), as `YYYY-MM-DD`. */
  chargeDate: string | null;
  cancelUrl: string | null;
  /** Billed through Apple, which needs cancelling more than 24 hours before renewal. */
  billedByAppStore: boolean;
};

export type ParseOptions = {
  /** The day the text was shared, used for "7-day free trial" and dates without a year. */
  today: Date;
  /** Read `03/04/2026` as 3 April (most of the world) rather than March 4 (US). */
  dayFirst: boolean;
  /** Currency to assume for a bare `$` amount. */
  dollarCurrency: string;
};

export const emptyParsedTrial: ParsedTrial = {
  service: null,
  price: null,
  currency: null,
  billingPeriod: null,
  chargeDate: null,
  cancelUrl: null,
  billedByAppStore: false,
};
