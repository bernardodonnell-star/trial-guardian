import { endLiveActivity, syncLiveActivities, syncWidget } from '@/lib/glance';
import { cancelTrialReminders, ensureNotificationPermission, rescheduleAll, scheduleTrialReminders } from '@/lib/reminders';
import { getSettings } from '@/lib/settings';
import {
  addTrial,
  getTrial,
  getTrials,
  removeTrial,
  updateTrial,
  type Trial,
  type TrialDraft,
  type TrialStatus,
} from '@/lib/trials';

/**
 * Every change to a trial goes through here, so reminders, the widget and the
 * Lock Screen countdown never drift out of step with what is saved.
 */
async function afterChange() {
  const trials = getTrials();
  syncWidget(trials);
  await syncLiveActivities(trials, getSettings());
}

export async function saveNewTrial(draft: TrialDraft): Promise<Trial> {
  const trial = addTrial(draft);
  await ensureNotificationPermission().catch(() => false);
  await scheduleTrialReminders(trial, getSettings()).catch((e) => console.warn(e));
  await afterChange();
  return getTrial(trial.id) ?? trial;
}

export async function editTrial(id: string, changes: Partial<TrialDraft>) {
  const trial = updateTrial(id, changes);
  if (!trial) return;
  await scheduleTrialReminders(trial, getSettings()).catch((e) => console.warn(e));
  await afterChange();
}

export async function setTrialStatus(id: string, status: TrialStatus) {
  const trial = updateTrial(id, { status });
  if (!trial) return;
  if (status === 'active') {
    await scheduleTrialReminders(trial, getSettings()).catch((e) => console.warn(e));
  } else {
    await cancelTrialReminders(trial);
    updateTrial(id, { notificationIds: [] });
    await endLiveActivity(trial);
  }
  await afterChange();
}

export async function deleteTrial(id: string) {
  const trial = getTrial(id);
  if (!trial) return;
  await cancelTrialReminders(trial);
  await endLiveActivity(trial);
  removeTrial(id);
  await afterChange();
}

/** Called when the app opens or returns to the foreground. */
export async function refreshGlances() {
  await afterChange();
}

/** Called after the reminder settings change. */
export async function replanReminders() {
  await rescheduleAll(getSettings());
  await afterChange();
}
