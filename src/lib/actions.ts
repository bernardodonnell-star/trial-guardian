import Storage from 'expo-sqlite/kv-store';

import { syncWithCloud } from '@/lib/cloud';
import { toDateKey } from '@/lib/dates';
import { deleteProof } from '@/lib/files';
import { endLiveActivity, readWidgetTicks, syncLiveActivities, syncWidget } from '@/lib/glance';
import { mergeTrialSets, type TrialSet } from '@/lib/merge';
import {
  cancelTrialReminders,
  ensureNotificationPermission,
  rescheduleAll,
  scheduleSnooze,
  scheduleTrialReminders,
  type ReminderAction,
} from '@/lib/reminders';
import { getSettings } from '@/lib/settings';
import {
  addTrial,
  getDeletedIds,
  getTrial,
  getTrials,
  removeTrial,
  replaceAll,
  updateTrial,
  type Trial,
  type TrialDraft,
  type TrialStatus,
} from '@/lib/trials';

/**
 * Every change to a trial goes through here, so reminders, the widget, the Lock Screen
 * countdown and the iCloud copy never drift out of step with what is saved.
 */
async function afterChange({ cloud = true } = {}) {
  if (cloud && syncWithCloud()) await rescheduleAll(getSettings()).catch((e) => console.warn(e));
  const trials = getTrials();
  syncWidget(trials);
  await syncLiveActivities(trials, getSettings());
}

async function replan(trial: Trial | undefined) {
  if (trial) await scheduleTrialReminders(trial, getSettings()).catch((e) => console.warn(e));
}

export async function saveNewTrial(draft: TrialDraft): Promise<Trial> {
  const trial = addTrial(draft);
  await ensureNotificationPermission().catch(() => false);
  await replan(trial);
  await afterChange();
  return getTrial(trial.id) ?? trial;
}

/** Saves several at once, e.g. from a screenshot of the Subscriptions screen. */
export async function saveNewTrials(drafts: TrialDraft[]): Promise<Trial[]> {
  const saved = drafts.map((draft) => addTrial(draft));
  await ensureNotificationPermission().catch(() => false);
  for (const trial of saved) await replan(trial);
  await afterChange();
  return saved;
}

export async function editTrial(id: string, changes: Partial<TrialDraft>) {
  const before = getTrial(id);
  if (!before) return;
  const priceChanged =
    changes.price !== undefined && changes.price !== null && (changes.price !== before.price || changes.currency !== before.currency);
  const trial = updateTrial(id, {
    ...changes,
    ...(priceChanged
      ? {
          priceHistory: [
            ...(before.priceHistory ?? []),
            { date: toDateKey(new Date()), price: changes.price!, currency: changes.currency ?? before.currency },
          ],
        }
      : {}),
  });
  await replan(trial);
  await afterChange();
}

export async function setTrialStatus(id: string, status: TrialStatus) {
  const trial = updateTrial(id, {
    status,
    cancelledAt: status === 'cancelled' ? new Date().toISOString() : undefined,
  });
  if (!trial) return;
  // Each status has its own reminders: deadlines, a charge check, or renewals.
  await replan(trial);
  if (status !== 'active') await endLiveActivity(trial);
  await afterChange();
}

export async function addProof(id: string, name: string) {
  const trial = getTrial(id);
  if (!trial) return;
  updateTrial(id, { proofUris: [...(trial.proofUris ?? []), name] });
  await afterChange();
}

export async function removeProof(id: string, name: string) {
  const trial = getTrial(id);
  if (!trial) return;
  deleteProof(name);
  updateTrial(id, { proofUris: (trial.proofUris ?? []).filter((n) => n !== name) });
  await afterChange();
}

export async function deleteTrial(id: string) {
  const trial = getTrial(id);
  if (!trial) return;
  await cancelTrialReminders(trial);
  await endLiveActivity(trial);
  (trial.proofUris ?? []).forEach(deleteProof);
  removeTrial(id);
  await afterChange();
}

/** A button pressed under a reminder notification. */
export async function handleReminderAction(trialId: string, action: ReminderAction) {
  const trial = getTrial(trialId);
  if (!trial) return;
  switch (action) {
    case 'cancelled':
      return setTrialStatus(trialId, 'cancelled');
    case 'keep':
      return setTrialStatus(trialId, 'kept');
    case 'tonight':
      return scheduleSnooze(trial).catch((e) => console.warn(e));
    case 'not-charged':
      return;
    case 'charged':
      // Handled by the screen it opens (refund help); nothing to change here.
      return;
  }
}

/** Replaces this device's trials with a merge of them and a backup file. */
export async function restoreBackup(backup: TrialSet): Promise<number> {
  const local: TrialSet = { trials: getTrials(), deleted: getDeletedIds() };
  const merged = mergeTrialSets(local, { ...backup, deleted: {} });
  replaceAll(merged.trials, merged.deleted);
  await rescheduleAll(getSettings()).catch((e) => console.warn(e));
  await afterChange();
  return merged.trials.length - local.trials.length;
}

const LAST_DAILY_KEY = 'daily.v1';

/** Called when the app opens or returns to the foreground. */
export async function refreshGlances() {
  // Taps on the widget's "I cancelled it" button, recorded while the app was closed.
  for (const id of await readWidgetTicks()) {
    if (getTrial(id)?.status === 'active') await setTrialStatus(id, 'cancelled');
  }
  // Once a day, roll subscription renewal reminders forward.
  const today = toDateKey(new Date());
  if (Storage.getItemSync(LAST_DAILY_KEY) !== today) {
    Storage.setItemSync(LAST_DAILY_KEY, today);
    for (const trial of getTrials()) if (trial.status === 'kept') await replan(trial);
  }
  await afterChange();
}

/** Called after the reminder settings change. */
export async function replanReminders() {
  await rescheduleAll(getSettings());
  await afterChange({ cloud: false });
}

/** Called when another device changed the iCloud copy, or when sync is switched on. */
export async function syncNow() {
  await afterChange();
}
