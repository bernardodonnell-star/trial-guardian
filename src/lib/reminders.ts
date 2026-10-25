import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { addDays } from '@/lib/dates';
import type { Settings } from '@/lib/settings';
import { chargeDayOf, deadlineOf, formatPrice, getTrials, nextPaymentOf, updateTrial, type Trial } from '@/lib/trials';

/** The kind decides which buttons the notification shows. */
export type ReminderKind = 'deadline' | 'charge-check' | 'renewal';

export type PlannedReminder = { date: Date; title: string; body: string; kind: ReminderKind };

/** Notification categories (the buttons under a reminder). */
export const REMINDER_CATEGORY = 'trial-reminder';
export const CHARGE_CHECK_CATEGORY = 'charge-check';

export type ReminderAction = 'cancelled' | 'keep' | 'tonight' | 'not-charged' | 'charged';

/** Works out when to nudge for one trial. Pure, so it can be tested without a phone. */
export function planReminders(trial: Trial, settings: Settings, now: Date = new Date()): PlannedReminder[] {
  const plans =
    trial.status === 'active'
      ? planDeadlineReminders(trial, settings)
      : trial.status === 'cancelled'
        ? planChargeCheck(trial, settings)
        : planRenewalReminders(trial, settings, now);
  return plans.filter((p) => p.date > now).sort((a, b) => a.date.getTime() - b.date.getTime());
}

function planDeadlineReminders(trial: Trial, settings: Settings): PlannedReminder[] {
  const deadline = deadlineOf(trial);
  const chargeDay = chargeDayOf(trial);
  const price = formatPrice(trial);
  const charge = price ? `${price} ` : '';
  const plans: PlannedReminder[] = [];

  const days = new Set(settings.reminderDays.filter((d) => d >= 1));
  // Persistent mode: every morning of the final week, so a missed reminder is never the last one.
  if (settings.persistentReminders) for (let d = 1; d <= 7; d++) days.add(d);

  for (const daysBefore of [...days].sort((a, b) => b - a)) {
    const date = addDays(deadline, -daysBefore);
    date.setHours(settings.reminderHour, 0, 0, 0);
    plans.push(
      daysBefore === 1
        ? {
            date,
            kind: 'deadline',
            title: `Last day to cancel ${trial.service}`,
            body: trial.billedByAppStore
              ? `Apple needs 24 hours' notice. Cancel today to avoid the ${charge}charge on ${formatDay(chargeDay)}.`
              : `Your free trial ends tonight. Cancel today to avoid the ${charge}charge.`,
          }
        : {
            date,
            kind: 'deadline',
            title: `${trial.service} trial ends in ${daysBefore} days`,
            body: `You'll be charged ${charge}on ${formatDay(chargeDay)} unless you cancel${trial.billedByAppStore ? ` by ${formatDay(addDays(deadline, -1))}` : ''}.`,
          }
    );
  }

  if (settings.lastEveningReminder) {
    const date = addDays(deadline, -1);
    date.setHours(18, 0, 0, 0);
    plans.push({
      date,
      kind: 'deadline',
      title: `Last chance to cancel ${trial.service}`,
      body: `Still want it? If not, cancel tonight. Tap to see the countdown.`,
    });
  }
  return plans;
}

/** The day after the charge day, check that the cancellation really worked. */
function planChargeCheck(trial: Trial, settings: Settings): PlannedReminder[] {
  if (!settings.chargeCheckReminder) return [];
  const date = addDays(chargeDayOf(trial), 1);
  date.setHours(settings.reminderHour, 0, 0, 0);
  return [
    {
      date,
      kind: 'charge-check',
      title: `Check ${trial.service} didn't charge you`,
      body: `Your trial would have renewed yesterday. Glance at your bank or card app to make sure no payment went through.`,
    },
  ];
}

/** Before the next two renewals of a kept subscription: 7 days for yearly plans, 1 for weekly, 3 otherwise. */
function planRenewalReminders(trial: Trial, settings: Settings, now: Date): PlannedReminder[] {
  if (!settings.renewalReminders || !trial.billingPeriod) return [];
  const daysBefore = trial.billingPeriod === 'year' ? 7 : trial.billingPeriod === 'week' ? 1 : 3;
  const price = formatPrice(trial);
  const plans: PlannedReminder[] = [];
  let from = now;
  for (let i = 0; i < 2; i++) {
    const payment = nextPaymentOf(trial, from);
    const date = addDays(payment, -daysBefore);
    date.setHours(settings.reminderHour, 0, 0, 0);
    plans.push({
      date,
      kind: 'renewal',
      title: `${trial.service} renews ${daysBefore === 1 ? 'tomorrow' : `in ${daysBefore} days`}`,
      body: `${price ? `${price} ` : 'A payment '}will be taken on ${formatDay(payment)}. Still using it?`,
    });
    from = addDays(payment, 1);
  }
  return plans;
}

/** When "Remind me tonight" fires: 8pm today, or in two hours if it is already late, and never after the deadline. */
export function snoozeTime(trial: Trial, now: Date = new Date()): Date | null {
  const tonight = new Date(now);
  tonight.setHours(20, 0, 0, 0);
  let date = tonight > now ? tonight : new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const deadline = deadlineOf(trial);
  if (date >= deadline) date = new Date(deadline.getTime() - 30 * 60 * 1000);
  return date > now ? date : null;
}

function formatDay(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Registers the buttons shown under reminders. Safe to call on every launch. */
export async function registerReminderCategories(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.setNotificationCategoryAsync(REMINDER_CATEGORY, [
    { identifier: 'cancelled', buttonTitle: 'I cancelled it', options: { opensAppToForeground: true } },
    { identifier: 'keep', buttonTitle: 'Keep it', options: { opensAppToForeground: true } },
    { identifier: 'tonight', buttonTitle: 'Remind me tonight', options: { opensAppToForeground: true } },
  ]);
  await Notifications.setNotificationCategoryAsync(CHARGE_CHECK_CATEGORY, [
    { identifier: 'not-charged', buttonTitle: 'No charge, all good', options: { opensAppToForeground: true } },
    { identifier: 'charged', buttonTitle: 'I was charged', options: { opensAppToForeground: true } },
  ]);
}

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

function categoryFor(kind: ReminderKind): string | undefined {
  if (kind === 'deadline') return REMINDER_CATEGORY;
  if (kind === 'charge-check') return CHARGE_CHECK_CATEGORY;
  return undefined;
}

async function schedule(trial: Trial, plan: PlannedReminder): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: plan.title,
      body: plan.body,
      data: { trialId: trial.id, url: `/trial/${trial.id}` },
      sound: 'default',
      categoryIdentifier: categoryFor(plan.kind),
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: plan.date },
  });
}

/** Replaces the scheduled notifications for a trial with a fresh plan. */
export async function scheduleTrialReminders(trial: Trial, settings: Settings): Promise<void> {
  if (Platform.OS === 'web') return;
  await cancelTrialReminders(trial);
  const ids: string[] = [];
  for (const plan of planReminders(trial, settings)) ids.push(await schedule(trial, plan));
  updateTrial(trial.id, { notificationIds: ids });
}

/** One extra reminder this evening, on top of the plan. */
export async function scheduleSnooze(trial: Trial): Promise<void> {
  if (Platform.OS === 'web') return;
  const date = snoozeTime(trial);
  if (!date) return;
  const id = await schedule(trial, {
    date,
    kind: 'deadline',
    title: `Decide on ${trial.service}`,
    body: `You asked for a nudge tonight. Cancel now, or tap Keep it if you want to pay.`,
  });
  updateTrial(trial.id, { notificationIds: [...trial.notificationIds, id] });
}

export async function cancelTrialReminders(trial: Trial): Promise<void> {
  if (Platform.OS === 'web') return;
  await Promise.all(
    trial.notificationIds.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {}))
  );
}

/** Re-plans every trial, e.g. after the reminder settings change or when renewals roll over. */
export async function rescheduleAll(settings: Settings): Promise<void> {
  for (const trial of getTrials()) await scheduleTrialReminders(trial, settings);
}

