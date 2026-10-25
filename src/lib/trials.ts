import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

import { addDays, addMonths, fromDateKey, startOfDay, toDateKey } from '@/lib/dates';
import type { BillingPeriod } from '@/lib/parse/types';

/**
 * `active`: a free trial we are counting down. `cancelled`: the person cancelled it (access may
 * continue until the deadline). `kept`: they decided to pay, so it is tracked as a subscription.
 */
export type TrialStatus = 'active' | 'cancelled' | 'kept';

export type PricePoint = { date: string; price: number; currency: string | null };

export type Trial = {
  id: string;
  service: string;
  price: number | null;
  currency: string | null;
  billingPeriod: BillingPeriod | null;
  /** `YYYY-MM-DD`: the day the first charge is taken. We remind before the start of this day. */
  chargeDate: string;
  cancelUrl: string | null;
  /** Apple renews unless cancelled more than 24 hours before, so the deadline is a day earlier. */
  billedByAppStore?: boolean;
  notes: string;
  status: TrialStatus;
  source: 'shared-text' | 'shared-image' | 'manual' | 'subscription-list';
  createdAt: string;
  /** Last local change, used to merge copies from iCloud. */
  updatedAt?: string;
  /** When the person said they cancelled. */
  cancelledAt?: string;
  /** Photos or screenshots proving the cancellation, kept in the app's documents folder. */
  proofUris?: string[];
  /** Prices seen for this service, oldest first, to spot price rises. */
  priceHistory?: PricePoint[];
  /** Scheduled local notification ids, so they can be replaced when the trial changes. */
  notificationIds: string[];
};

export type TrialDraft = Omit<
  Trial,
  'id' | 'status' | 'createdAt' | 'updatedAt' | 'notificationIds' | 'cancelledAt' | 'proofUris' | 'priceHistory'
> & { status?: TrialStatus };

const STORAGE_KEY = 'trials.v1';
const DELETED_KEY = 'trials.deleted.v1';

let trials: Trial[] = load();
/** Ids of deleted trials with the time of deletion, so iCloud does not bring them back. */
let deleted: Record<string, string> = loadDeleted();
const listeners = new Set<() => void>();

function load(): Trial[] {
  try {
    const raw = Storage.getItemSync(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Trial[]) : [];
  } catch {
    return [];
  }
}

function loadDeleted(): Record<string, string> {
  try {
    return JSON.parse(Storage.getItemSync(DELETED_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function commit(next: Trial[]) {
  trials = next;
  Storage.setItemSync(STORAGE_KEY, JSON.stringify(next));
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getTrials(): Trial[] {
  return trials;
}

export function getDeletedIds(): Record<string, string> {
  return deleted;
}

export function getTrial(id: string): Trial | undefined {
  return trials.find((t) => t.id === id);
}

export function useTrials(): Trial[] {
  return useSyncExternalStore(subscribe, getTrials, getTrials);
}

export function useTrial(id: string): Trial | undefined {
  const all = useTrials();
  return all.find((t) => t.id === id);
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function addTrial(draft: TrialDraft): Trial {
  const now = new Date().toISOString();
  const trial: Trial = {
    ...draft,
    id: newId(),
    status: draft.status ?? 'active',
    createdAt: now,
    updatedAt: now,
    notificationIds: [],
    priceHistory: draft.price !== null ? [{ date: toDateKey(new Date()), price: draft.price, currency: draft.currency }] : [],
  };
  commit([...trials, trial]);
  return trial;
}

export function updateTrial(id: string, changes: Partial<Trial>): Trial | undefined {
  let updated: Trial | undefined;
  // Notification ids are device bookkeeping, not a change worth syncing.
  const meaningful = Object.keys(changes).some((key) => key !== 'notificationIds');
  commit(
    trials.map((t) => {
      if (t.id !== id) return t;
      updated = { ...t, ...changes, ...(meaningful ? { updatedAt: new Date().toISOString() } : {}) };
      return updated;
    })
  );
  return updated;
}

export function removeTrial(id: string) {
  deleted = { ...deleted, [id]: new Date().toISOString() };
  Storage.setItemSync(DELETED_KEY, JSON.stringify(deleted));
  commit(trials.filter((t) => t.id !== id));
}

/** Replaces everything, after an iCloud merge or a restore from backup. */
export function replaceAll(next: Trial[], nextDeleted: Record<string, string> = deleted) {
  deleted = nextDeleted;
  Storage.setItemSync(DELETED_KEY, JSON.stringify(deleted));
  commit(next);
}

/** The day the first payment is taken, at local midnight. */
export function chargeDayOf(trial: Pick<Trial, 'chargeDate'>): Date {
  return fromDateKey(trial.chargeDate);
}

/**
 * The moment we count down to: the start of the charge day, or a day earlier for App Store
 * trials, which renew unless cancelled more than 24 hours before the renewal time.
 */
export function deadlineOf(trial: Pick<Trial, 'chargeDate' | 'billedByAppStore'>): Date {
  const chargeDay = chargeDayOf(trial);
  return trial.billedByAppStore ? addDays(chargeDay, -1) : chargeDay;
}

/** Active trials whose deadline has not passed, soonest first. */
export function upcomingTrials(all: Trial[], now: Date = new Date()): Trial[] {
  return all
    .filter((t) => t.status === 'active' && deadlineOf(t) > now)
    .sort((a, b) => deadlineOf(a).getTime() - deadlineOf(b).getTime());
}

/** Active trials whose deadline has passed and that the person has not dealt with yet. */
export function overdueTrials(all: Trial[], now: Date = new Date()): Trial[] {
  return all.filter((t) => t.status === 'active' && deadlineOf(t) <= now);
}

/** Subscriptions the person kept, by next payment. */
export function keptSubscriptions(all: Trial[], now: Date = new Date()): Trial[] {
  return all
    .filter((t) => t.status === 'kept')
    .sort((a, b) => nextPaymentOf(a, now).getTime() - nextPaymentOf(b, now).getTime());
}

/** Rolls the first charge date forward by the billing period until it is today or later. */
export function nextPaymentOf(trial: Pick<Trial, 'chargeDate' | 'billingPeriod'>, now: Date = new Date()): Date {
  const today = startOfDay(now);
  let date = chargeDayOf(trial);
  if (!trial.billingPeriod) return date;
  for (let step = 1; date < today && step < 1000; step++) {
    const first = chargeDayOf(trial);
    date =
      trial.billingPeriod === 'week'
        ? addDays(first, 7 * step)
        : addMonths(first, trial.billingPeriod === 'month' ? step : 12 * step);
  }
  return date;
}

export function formatMoney(amount: number, currency: string | null): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency ?? 'USD' }).format(amount);
  } catch {
    return `${currency ?? ''} ${amount.toFixed(2)}`.trim();
  }
}

export function formatPrice(trial: Pick<Trial, 'price' | 'currency' | 'billingPeriod'>): string | null {
  if (trial.price === null) return null;
  const amount = formatMoney(trial.price, trial.currency);
  return trial.billingPeriod ? `${amount}/${trial.billingPeriod}` : amount;
}

/** Monthly cost of a subscription, for totals. */
export function monthlyCost(trial: Pick<Trial, 'price' | 'billingPeriod'>): number {
  if (trial.price === null) return 0;
  switch (trial.billingPeriod) {
    case 'week':
      return (trial.price * 52) / 12;
    case 'year':
      return trial.price / 12;
    default:
      return trial.price;
  }
}

/** Monthly and yearly totals of kept subscriptions, one entry per currency. */
export function subscriptionTotals(all: Trial[]): { currency: string | null; monthly: number; yearly: number }[] {
  const byCurrency = new Map<string | null, number>();
  for (const trial of all) {
    if (trial.status !== 'kept' || trial.price === null) continue;
    byCurrency.set(trial.currency, (byCurrency.get(trial.currency) ?? 0) + monthlyCost(trial));
  }
  return [...byCurrency.entries()]
    .map(([currency, monthly]) => ({ currency, monthly, yearly: monthly * 12 }))
    .sort((a, b) => b.monthly - a.monthly);
}
