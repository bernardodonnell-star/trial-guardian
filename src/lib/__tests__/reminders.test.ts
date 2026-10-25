import { planReminders, snoozeTime } from '../reminders';
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

  it('moves everything a day earlier for App Store trials (24-hour rule)', () => {
    const plans = planReminders({ ...trial, billedByAppStore: true }, defaultSettings, new Date(2026, 9, 25, 8));
    expect(plans.map((p) => [p.date.getDate(), p.date.getHours()])).toEqual([
      [28, 9],
      [30, 9],
      [30, 18],
    ]);
    expect(plans[1].body).toContain("Apple needs 24 hours' notice");
  });

  it('checks for a sneaky charge the day after a cancelled trial would have renewed', () => {
    const plans = planReminders({ ...trial, status: 'cancelled' }, defaultSettings, new Date(2026, 9, 25));
    expect(plans).toHaveLength(1);
    expect(plans[0].kind).toBe('charge-check');
    expect([plans[0].date.getDate(), plans[0].date.getHours()]).toEqual([2, 9]);
    expect(planReminders({ ...trial, status: 'cancelled' }, { ...defaultSettings, chargeCheckReminder: false })).toEqual([]);
  });

  it('reminds every morning of the final week in persistent mode', () => {
    const plans = planReminders(trial, { ...defaultSettings, persistentReminders: true }, new Date(2026, 9, 24, 8));
    const mornings = plans.filter((p) => p.date.getHours() === 9).map((p) => p.date.getDate());
    expect(mornings).toEqual([25, 26, 27, 28, 29, 30, 31]);
    expect(plans.every((p) => p.kind === 'deadline')).toBe(true);
  });

  it('reminds before the next two renewals of a kept subscription', () => {
    const kept: Trial = { ...trial, status: 'kept', chargeDate: '2026-09-15' };
    const plans = planReminders(kept, defaultSettings, new Date(2026, 9, 25, 8));
    expect(plans.map((p) => [p.date.getMonth() + 1, p.date.getDate()])).toEqual([
      [11, 12],
      [12, 12],
    ]);
    expect(plans[0].title).toBe('Netflix renews in 3 days');
    const yearly = planReminders({ ...kept, billingPeriod: 'year' }, defaultSettings, new Date(2026, 9, 25, 8));
    expect([yearly[0].date.getFullYear(), yearly[0].date.getMonth() + 1, yearly[0].date.getDate()]).toEqual([2027, 9, 8]);
    expect(planReminders(kept, { ...defaultSettings, renewalReminders: false })).toEqual([]);
  });
});

describe('snoozeTime', () => {
  it('uses 8pm today, or two hours later when it is already evening', () => {
    expect(snoozeTime(trial, new Date(2026, 9, 25, 10))?.getHours()).toBe(20);
    expect(snoozeTime(trial, new Date(2026, 9, 25, 21))?.getHours()).toBe(23);
  });

  it('never snoozes past the deadline', () => {
    const at = snoozeTime(trial, new Date(2026, 9, 31, 23));
    expect(at?.getTime()).toBe(new Date(2026, 9, 31, 23, 30).getTime());
    expect(snoozeTime(trial, new Date(2026, 9, 31, 23, 45))).toBeNull();
  });
});
