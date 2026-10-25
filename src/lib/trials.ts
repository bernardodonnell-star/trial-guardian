import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

import { addDays, fromDateKey } from '@/lib/dates';
import type { BillingPeriod } from '@/lib/parse/types';

export type TrialStatus = 'active' | 'cancelled' | 'kept';

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
  source: 'shared-text' | 'shared-image' | 'manual';
  createdAt: string;
  /** Scheduled local notification ids, so they can be replaced when the trial changes. */
  notificationIds: string[];
};

export type TrialDraft = Omit<Trial, 'id' | 'status' | 'createdAt' | 'notificationIds'>;

const STORAGE_KEY = 'trials.v1';

let trials: Trial[] = load();
const listeners = new Set<() => void>();

function load(): Trial[] {
  try {
    const raw = Storage.getItemSync(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Trial[]) : [];
  } catch {
    return [];
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
  const trial: Trial = {
    ...draft,
    id: newId(),
    status: 'active',
    createdAt: new Date().toISOString(),
    notificationIds: [],
  };
  commit([...trials, trial]);
  return trial;
}

export function updateTrial(id: string, changes: Partial<Trial>): Trial | undefined {
  let updated: Trial | undefined;
  commit(
    trials.map((t) => {
      if (t.id !== id) return t;
      updated = { ...t, ...changes };
      return updated;
    })
  );
  return updated;
}

export function removeTrial(id: string) {
  commit(trials.filter((t) => t.id !== id));
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

export function formatPrice(trial: Pick<Trial, 'price' | 'currency' | 'billingPeriod'>): string | null {
  if (trial.price === null) return null;
  let amount: string;
  try {
    amount = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: trial.currency ?? 'USD',
    }).format(trial.price);
  } catch {
    amount = `${trial.currency ?? ''} ${trial.price.toFixed(2)}`.trim();
  }
  return trial.billingPeriod ? `${amount}/${trial.billingPeriod}` : amount;
}
