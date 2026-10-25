import { planReminders } from '../reminders';
import { defaultSettings } from '../settings';
import type { Trial } from '../trials';

jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: { getItemSync: () => null, setItemSync: () => {} },
}));

const trial: Trial = {
  id: 't1',
  service: 'Netflix',
  price: 12.99,
  currency: 'GBP',
  billingPeriod: 'month',
  chargeDate: '2026-11-01',
  cancelUrl: null,
  notes: '',
  status: 'active',
  source: 'manual',
  createdAt: '2026-10-25T08:00:00.000Z',
  notificationIds: [],
};

describe('planReminders', () => {
  it('plans morning reminders and a last-evening nudge before the charge day', () => {
    const plans = planReminders(trial, defaultSettings, new Date(2026, 9, 25, 8));
    expect(plans.map((p) => [p.date.getDate(), p.date.getHours()])).toEqual([
      [29, 9],
      [31, 9],
      [31, 18],
    ]);
    expect(plans[0].title).toBe('Netflix trial ends in 3 days');
    expect(plans[1].title).toBe('Last day to cancel Netflix');
    expect(plans[1].body).toContain('/month charge');
  });

  it('drops reminders that are already in the past', () => {
    const plans = planReminders(trial, defaultSettings, new Date(2026, 9, 31, 12));
    expect(plans).toHaveLength(1);
    expect(plans[0].date.getHours()).toBe(18);
  });

  it('plans nothing for a cancelled trial', () => {
    expect(planReminders({ ...trial, status: 'cancelled' }, defaultSettings, new Date(2026, 9, 25))).toEqual([]);
  });
});
