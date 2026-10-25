import { parseTrialText } from '../heuristic';
import type { ParseOptions } from '../types';

const uk: ParseOptions = { today: new Date(2026, 9, 25), dayFirst: true, dollarCurrency: 'USD' };
const us: ParseOptions = { ...uk, dayFirst: false };

describe('parseTrialText', () => {
  it('reads an App Store subscription confirmation', () => {
    const text = `Subscription Confirmation
Dear Bernard,
You subscribed to the following subscription:
App: Headspace
Subscription: Headspace Annual
Content Provider: Headspace Inc.
Date of Purchase: 25 Oct 2026
Free Trial: 1 week
Renewal Price: £49.99/year
Your subscription will automatically renew for £49.99/year starting 1 Nov 2026 until you cancel.`;
    expect(parseTrialText(text, uk)).toEqual({
      service: 'Headspace',
      price: 49.99,
      currency: 'GBP',
      billingPeriod: 'year',
      chargeDate: '2026-11-01',
      cancelUrl: null,
      billedByAppStore: true,
    });
  });

  it('reads a streaming welcome email with a US date', () => {
    const text = `From: Disney+ <disneyplus@mail.disneyplus.com>
Welcome to Disney+!
Your free trial ends on November 8, 2026. After that, you'll be charged $13.99/month
unless you cancel. Manage your plan any time at https://www.disneyplus.com/account/subscription.
Unsubscribe: https://www.disneyplus.com/unsubscribe`;
    expect(parseTrialText(text, us)).toEqual({
      service: 'Disney+',
      price: 13.99,
      currency: 'USD',
      billingPeriod: 'month',
      chargeDate: '2026-11-08',
      cancelUrl: 'https://www.disneyplus.com/account/subscription',
      billedByAppStore: false,
    });
  });

  it('uses the trial length when there is no end date', () => {
    const text = `Thanks for signing up for Calm. Enjoy your 7-day free trial, then £39.99 per year.`;
    const result = parseTrialText(text, uk);
    expect(result.service).toBe('Calm');
    expect(result.chargeDate).toBe('2026-11-01');
    expect(result.price).toBe(39.99);
    expect(result.billingPeriod).toBe('year');
  });

  it('handles European prices and day-first numeric dates', () => {
    const text = `Willkommen! Your Spotify Premium trial is active.
Your first payment of 10,99 € per month will be taken on 24.11.2026.
Order date: 24.10.2026`;
    const result = parseTrialText(text, uk);
    expect(result.service).toBe('Spotify Premium');
    expect(result.price).toBe(10.99);
    expect(result.currency).toBe('EUR');
    expect(result.billingPeriod).toBe('month');
    expect(result.chargeDate).toBe('2026-11-24');
  });

  it('ignores order dates and amounts due today', () => {
    const text = `Order date: October 25, 2026
Total due today: $0.00
Your NordVPN trial renews on Dec 1 at US$12.99 a month.`;
    const result = parseTrialText(text, us);
    expect(result.service).toBe('NordVPN');
    expect(result.chargeDate).toBe('2026-12-01');
    expect(result.price).toBe(12.99);
    expect(result.billingPeriod).toBe('month');
  });

  it('rolls a date without a year into next year when it has passed', () => {
    const text = `Your trial of Babbel ends Jan 3. Then €8.95/month.`;
    const result = parseTrialText(text, uk);
    expect(result.chargeDate).toBe('2027-01-03');
    expect(result.service).toBe('Babbel');
  });

  it('reads messy OCR text from a screenshot', () => {
    const text = `9:41
Start your free trial
Duolingo
Super Duolingo
14 days free
Then £83.99/yr
Cancel anytime before 8 Nov`;
    const result = parseTrialText(text, uk);
    expect(result.service).toBe('Duolingo');
    expect(result.price).toBe(83.99);
    expect(result.billingPeriod).toBe('year');
    expect(result.chargeDate).toBe('2026-11-08');
  });

  it('prefers a cancel link and skips unsubscribe links', () => {
    const text = `Your Peacock trial ends in 3 days.
Cancel: https://www.peacocktv.com/account/cancel?src=email.
Unsubscribe https://email.peacocktv.com/unsubscribe`;
    const result = parseTrialText(text, us);
    expect(result.chargeDate).toBe('2026-10-28');
    expect(result.cancelUrl).toBe('https://www.peacocktv.com/account/cancel?src=email');
  });

  it('returns nulls when there is nothing to find', () => {
    expect(parseTrialText('Hello, see you on Saturday!', uk)).toEqual({
      service: null,
      price: null,
      currency: null,
      billingPeriod: null,
      chargeDate: null,
      cancelUrl: null,
      billedByAppStore: false,
    });
  });
});
