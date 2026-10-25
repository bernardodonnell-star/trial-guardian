import { cancelGuideFor } from '../cancel-guides';
import { trialsToBackup, trialsToCsv } from '../export';
import { mergeTrialSets, parseTrialSet, sameTrialSet } from '../merge';
import { describePriceRise, findPriceRise } from '../price-watch';
import { monthlyCost, nextPaymentOf, subscriptionTotals, type Trial } from '../trials';

jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: { getItemSync: () => null, setItemSync: () => {} },
}));

const base: Trial = {
  id: 'a',
  service: 'Netflix',
  price: 12.99,
  currency: 'GBP',
  billingPeriod: 'month',
  chargeDate: '2026-11-01',
  cancelUrl: null,
  notes: '',
  status: 'active',
  source: 'manual',
  createdAt: '2026-10-01T08:00:00.000Z',
  updatedAt: '2026-10-01T08:00:00.000Z',
  notificationIds: [],
};

describe('subscriptions', () => {
  it('rolls the next payment forward by the billing period', () => {
    const kept = { ...base, chargeDate: '2026-01-31' };
    expect(nextPaymentOf(kept, new Date(2026, 9, 25)).toDateString()).toBe(new Date(2026, 9, 31).toDateString());
    expect(nextPaymentOf({ ...kept, billingPeriod: 'year' }, new Date(2026, 9, 25)).getFullYear()).toBe(2027);
  });

  it('adds up monthly and yearly totals per currency', () => {
    const totals = subscriptionTotals([
      { ...base, status: 'kept' },
      { ...base, id: 'b', status: 'kept', price: 60, billingPeriod: 'year' },
      { ...base, id: 'c', status: 'kept', price: 10, currency: 'EUR' },
      { ...base, id: 'd', status: 'active', price: 100 },
    ]);
    expect(totals.map((t) => t.currency)).toEqual(['GBP', 'EUR']);
    expect(totals[0].monthly).toBeCloseTo(17.99);
    expect(totals[0].yearly).toBeCloseTo(215.88);
    expect(totals[1]).toEqual({ currency: 'EUR', monthly: 10, yearly: 120 });
    expect(monthlyCost({ price: 12, billingPeriod: 'week' })).toBe(52);
  });
});

describe('cancel guides', () => {
  it('knows popular services and whether cancelling keeps access', () => {
    expect(cancelGuideFor('Netflix')).toMatchObject({ known: true, keepsAccess: true });
    expect(cancelGuideFor('Spotify Premium').known).toBe(true);
    expect(cancelGuideFor('Apple TV+').keepsAccess).toBe(false);
  });

  it('sends App Store trials to Apple and falls back to general steps', () => {
    expect(cancelGuideFor('Headspace', true).url).toBe('https://apps.apple.com/account/subscriptions');
    expect(cancelGuideFor('Some New App')).toMatchObject({ known: false });
  });
});

describe('price rises', () => {
  it('compares with an earlier trial of the same service', () => {
    const old: Trial = { ...base, id: 'old', status: 'cancelled', price: 10.99, priceHistory: [{ date: '2025-06-01', price: 10.99, currency: 'GBP' }] };
    const rise = findPriceRise(base, [old, base]);
    expect(rise).toEqual({ from: 10.99, to: 12.99, currency: 'GBP', since: '2025-06-01' });
    expect(describePriceRise(rise!)).toMatch(/^Up 18% from/);
  });

  it('uses the trial’s own price history and ignores other currencies or periods', () => {
    const edited = { ...base, priceHistory: [{ date: '2026-01-01', price: 9.99, currency: 'GBP' }, { date: '2026-10-01', price: 12.99, currency: 'GBP' }] };
    expect(findPriceRise(edited, [edited])?.from).toBe(9.99);
    const euro: Trial = { ...base, id: 'e', currency: 'EUR', price: 5 };
    const yearly: Trial = { ...base, id: 'y', billingPeriod: 'year', price: 5 };
    expect(findPriceRise(base, [euro, yearly])).toBeNull();
  });
});

describe('iCloud merge', () => {
  it('keeps the newest edit of each trial and this device’s notification ids', () => {
    const mine = { ...base, notificationIds: ['n1'] };
    const theirs = { ...base, price: 15, updatedAt: '2026-10-02T08:00:00.000Z', notificationIds: ['other'] };
    const merged = mergeTrialSets({ trials: [mine], deleted: {} }, { trials: [theirs], deleted: {} });
    expect(merged.trials).toEqual([{ ...theirs, notificationIds: ['n1'] }]);
  });

  it('adds new trials from the other device and respects deletions', () => {
    const other = { ...base, id: 'b', service: 'Hulu', notificationIds: ['x'] };
    const merged = mergeTrialSets(
      { trials: [base], deleted: {} },
      { trials: [other], deleted: { a: '2026-10-05T00:00:00.000Z' } }
    );
    expect(merged.trials.map((t) => t.id)).toEqual(['b']);
    expect(merged.trials[0].notificationIds).toEqual([]);
    expect(merged.deleted).toEqual({ a: '2026-10-05T00:00:00.000Z' });
  });

  it('round-trips through the backup format', () => {
    const json = trialsToBackup([{ ...base, notificationIds: ['n1'] }], {}, new Date(2026, 9, 25));
    const set = parseTrialSet(json)!;
    expect(set.trials[0].notificationIds).toEqual([]);
    expect(sameTrialSet(set, { trials: [base], deleted: {} })).toBe(true);
    expect(parseTrialSet('{"trials": [{"id": 1}]}')).toEqual({ trials: [], deleted: {} });
    expect(parseTrialSet('not json')).toBeNull();
  });
});

describe('CSV export', () => {
  it('writes a header and quotes awkward values', () => {
    const csv = trialsToCsv([{ ...base, notes: 'Family plan, "shared"' }], new Date(2026, 9, 25));
    const [header, row] = csv.trim().split('\n');
    expect(header).toBe('Service,Status,Price,Currency,Billing,Charge date,Cancel by,Next payment,Billed by Apple,Cancel link,Notes');
    expect(row).toBe('Netflix,Trial,12.99,GBP,month,2026-11-01,2026-11-01,,No,,"Family plan, ""shared"""');
  });
});
