import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { addDays } from '@/lib/dates';
import type { Settings } from '@/lib/settings';
import { deadlineOf, formatPrice, getTrials, updateTrial, type Trial } from '@/lib/trials';

export type PlannedReminder = { date: Date; title: string; body: string };

/** Works out when to nudge for one trial. Pure, so it can be tested without a phone. */
export function planReminders(trial: Trial, settings: Settings, now: Date = new Date()): PlannedReminder[] {
  if (trial.status !== 'active') return [];
  const deadline = deadlineOf(trial);
  const price = formatPrice(trial);
  const charge = price ? `${price} ` : '';
  const plans: PlannedReminder[] = [];

  const days = [...new Set(settings.reminderDays)].filter((d) => d >= 1).sort((a, b) => b - a);
  for (const daysBefore of days) {
    const date = addDays(deadline, -daysBefore);
    date.setHours(settings.reminderHour, 0, 0, 0);
    plans.push(
      daysBefore === 1
        ? {
            date,
            title: `Last day to cancel ${trial.service}`,
            body: `Your free trial ends tonight. Cancel today to avoid the ${charge}charge.`,
          }
        : {
            date,
            title: `${trial.service} trial ends in ${daysBefore} days`,
            body: `You'll be charged ${charge}on ${formatDay(deadline)} unless you cancel.`,
          }
    );
  }

  if (settings.lastEveningReminder) {
    const date = addDays(deadline, -1);
    date.setHours(18, 0, 0, 0);
    plans.push({
      date,
      title: `${trial.service} charges tomorrow`,
      body: `Still want it? If not, cancel tonight. Tap to see the countdown.`,
    });
  }

  return plans.filter((p) => p.date > now).sort((a, b) => a.date.getTime() - b.date.getTime());
}

function formatDay(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

/** Replaces the scheduled notifications for a trial with a fresh plan. */
export async function scheduleTrialReminders(trial: Trial, settings: Settings): Promise<void> {
  if (Platform.OS === 'web') return;
  await cancelTrialReminders(trial);
  const ids: string[] = [];
  for (const plan of planReminders(trial, settings)) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: plan.title,
        body: plan.body,
        data: { trialId: trial.id, url: `/trial/${trial.id}` },
        sound: 'default',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: plan.date },
    });
    ids.push(id);
  }
  updateTrial(trial.id, { notificationIds: ids });
}

export async function cancelTrialReminders(trial: Trial): Promise<void> {
  if (Platform.OS === 'web') return;
  await Promise.all(
    trial.notificationIds.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {}))
  );
}

/** Re-plans every active trial, e.g. after the reminder settings change. */
export async function rescheduleAll(settings: Settings): Promise<void> {
  for (const trial of getTrials()) {
    if (trial.status === 'active') await scheduleTrialReminders(trial, settings);
    else if (trial.notificationIds.length) {
      await cancelTrialReminders(trial);
      updateTrial(trial.id, { notificationIds: [] });
    }
  }
}
