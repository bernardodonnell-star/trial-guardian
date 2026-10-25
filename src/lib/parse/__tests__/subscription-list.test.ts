import { parseSubscriptionList } from '../subscription-list';
import type { ParseOptions } from '../types';

const uk: ParseOptions = { today: new Date(2026, 9, 25), dayFirst: true, dollarCurrency: 'USD' };

describe('parseSubscriptionList', () => {
  it('reads every active row of the Subscriptions screen and stops at inactive ones', () => {
    const text = `9:41
Subscriptions
ACTIVE
Apple One
Individual
Renews 12 November
Disney+
Disney+ Premium (Monthly)
Renews 3 Dec 2026
Headspace
Annual
Free trial ends 1 November
Calm
Expires 30 October
INACTIVE
Strava
Expired 2 June`;
    expect(parseSubscriptionList(text, uk)).toEqual([
      { service: 'Apple One', plan: 'Individual', date: '2026-11-12', renews: true, isTrial: false, price: null, currency: null, billingPeriod: null },
      {
        service: 'Disney+',
        plan: 'Disney+ Premium (Monthly)',
        date: '2026-12-03',
        renews: true,
        isTrial: false,
        price: null,
        currency: null,
        billingPeriod: 'month',
      },
      { service: 'Headspace', plan: 'Annual', date: '2026-11-01', renews: true, isTrial: true, price: null, currency: null, billingPeriod: 'year' },
      { service: 'Calm', plan: null, date: '2026-10-30', renews: false, isTrial: false, price: null, currency: null, billingPeriod: null },
    ]);
  });

  it('picks up prices shown on a row', () => {
    const text = `Subscriptions
YouTube Premium
£12.99/month
Renews 5 Nov`;
    const [row] = parseSubscriptionList(text, uk);
    expect(row).toMatchObject({ service: 'YouTube Premium', price: 12.99, currency: 'GBP', billingPeriod: 'month', date: '2026-11-05' });
  });

  it('returns nothing for ordinary text', () => {
    expect(parseSubscriptionList('Welcome to Netflix! Your trial ends on 8 November.', uk)).toEqual([]);
  });
});
