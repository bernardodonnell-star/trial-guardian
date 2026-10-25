import { validateModelOutput } from '..';

const today = new Date(2026, 9, 25);
const source = 'Your trial ends 2026-11-01. Manage at https://example.com/account then $9.99/mo';

describe('validateModelOutput', () => {
  it('keeps well-formed fields', () => {
    expect(
      validateModelOutput(
        {
          service: 'Example Plus',
          price: '9.99',
          currency: 'usd',
          billingPeriod: 'month',
          chargeDate: '2026-11-01',
          cancelUrl: 'https://example.com/account',
        },
        source,
        today
      )
    ).toEqual({
      service: 'Example Plus',
      price: 9.99,
      currency: 'USD',
      billingPeriod: 'month',
      chargeDate: '2026-11-01',
      cancelUrl: 'https://example.com/account',
    });
  });

  it('drops invented links, impossible dates and payment providers', () => {
    expect(
      validateModelOutput(
        {
          service: 'Apple',
          price: '',
          currency: 'dollars',
          billingPeriod: 'unknown',
          chargeDate: '2026-02-30',
          cancelUrl: 'https://example.com/cancel',
        },
        source,
        today
      )
    ).toEqual({});
  });
});
