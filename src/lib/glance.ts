import Storage from 'expo-sqlite/kv-store';
import { Platform } from 'react-native';

import { writeShared } from '@/modules/trial-system';

import { addDays, startOfDay } from '@/lib/dates';
import type { Settings } from '@/lib/settings';
import { deadlineOf, formatPrice, upcomingTrials, type Trial } from '@/lib/trials';
import { TrialCountdown } from '@/widgets/trial-countdown';
import { UpcomingTrials, type UpcomingTrialsProps } from '@/widgets/upcoming-trials';

/** iOS ends a Live Activity after eight hours, so we only start one in the final stretch. */
export const LIVE_ACTIVITY_WINDOW_MS = 8 * 60 * 60 * 1000;

const ACTIVITY_MAP_KEY = 'liveActivities.v1';

/** Builds widget timeline dates: now, every midnight for a month, and each deadline. */
export function widgetTimelineDates(trials: Trial[], now: Date = new Date()): Date[] {
  const dates = new Map<number, Date>();
  dates.set(now.getTime(), now);
  const today = startOfDay(now);
  for (let i = 1; i <= 30; i++) {
    const midnight = addDays(today, i);
    dates.set(midnight.getTime(), midnight);
  }
  for (const trial of trials) {
    const deadline = deadlineOf(trial);
    if (deadline > now) dates.set(deadline.getTime(), deadline);
  }
  return [...dates.values()].sort((a, b) => a.getTime() - b.getTime());
}

function widgetProps(trials: Trial[], now: Date): UpcomingTrialsProps {
  return {
    trials: upcomingTrials(trials, now)
      .slice(0, 8)
      .map((t) => ({
        id: t.id,
        service: t.service,
        deadline: deadlineOf(t).getTime(),
        price: formatPrice(t),
      })),
  };
}

/**
 * Pushes the latest trials to the Home Screen and Lock Screen widgets, and to the snapshot
 * that the Siri and Shortcuts actions read.
 */
export function syncWidget(trials: Trial[]) {
  if (Platform.OS !== 'ios') return;
  try {
    const now = new Date();
    const props = widgetProps(trials, now);
    UpcomingTrials.updateTimeline(widgetTimelineDates(trials, now).map((date) => ({ date, props })));
    writeShared('trialSnapshot', JSON.stringify(props.trials));
  } catch (error) {
    console.warn('Could not update the widget', error);
  }
}

/** Ids of trials ticked off with the widget's "I cancelled it" button since the app last wrote the timeline. */
export async function readWidgetTicks(): Promise<string[]> {
  if (Platform.OS !== 'ios') return [];
  try {
    const entries = await UpcomingTrials.getTimeline();
    return [...new Set(entries.flatMap((entry) => Object.keys(entry.props?.cancelled ?? {})))];
  } catch {
    return [];
  }
}

function readActivityMap(): Record<string, string> {
  try {
    return JSON.parse(Storage.getItemSync(ACTIVITY_MAP_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function writeActivityMap(map: Record<string, string>) {
  Storage.setItemSync(ACTIVITY_MAP_KEY, JSON.stringify(map));
}

export function isInLiveActivityWindow(trial: Trial, now: Date = new Date()): boolean {
  const left = deadlineOf(trial).getTime() - now.getTime();
  return trial.status === 'active' && left > 0 && left <= LIVE_ACTIVITY_WINDOW_MS;
}

export function hasLiveActivity(trial: Trial): boolean {
  if (Platform.OS !== 'ios') return false;
  const id = readActivityMap()[trial.id];
  if (!id) return false;
  try {
    return TrialCountdown.getInstances().some((a) => a.getId() === id);
  } catch {
    return false;
  }
}

/** Starts the Lock Screen countdown for one trial. Must be called while the app is open. */
export function startLiveActivity(trial: Trial): boolean {
  if (Platform.OS !== 'ios' || !isInLiveActivityWindow(trial) || hasLiveActivity(trial)) return false;
  try {
    const deadline = deadlineOf(trial);
    const activity = TrialCountdown.start(
      {
        service: trial.service,
        price: formatPrice(trial),
        startedAt: Date.now(),
        deadline: deadline.getTime(),
      },
      `trialguardian://trial/${trial.id}`,
      deadline
    );
    writeActivityMap({ ...readActivityMap(), [trial.id]: activity.getId() });
    return true;
  } catch (error) {
    console.warn('Could not start the Lock Screen countdown', error);
    return false;
  }
}

/**
 * Starts countdowns for trials in their final hours (when allowed) and ends the ones that
 * no longer apply, such as a trial the person just cancelled.
 */
export async function syncLiveActivities(trials: Trial[], settings: Settings) {
  if (Platform.OS !== 'ios') return;
  const map = readActivityMap();
  let instances: ReturnType<typeof TrialCountdown.getInstances> = [];
  try {
    instances = TrialCountdown.getInstances();
  } catch {
    return;
  }

  for (const [trialId, activityId] of Object.entries(map)) {
    const trial = trials.find((t) => t.id === trialId);
    const activity = instances.find((a) => a.getId() === activityId);
    const stillWanted = trial && trial.status === 'active' && deadlineOf(trial) > new Date();
    if (!activity) {
      delete map[trialId];
    } else if (!stillWanted) {
      await activity.end('immediate').catch(() => {});
      delete map[trialId];
    }
  }
  writeActivityMap(map);

  if (!settings.autoLiveActivity) return;
  for (const trial of trials) {
    if (isInLiveActivityWindow(trial) && !map[trial.id]) startLiveActivity(trial);
  }
}

export async function endLiveActivity(trial: Trial) {
  if (Platform.OS !== 'ios') return;
  const map = readActivityMap();
  const id = map[trial.id];
  if (!id) return;
  try {
    const activity = TrialCountdown.getInstances().find((a) => a.getId() === id);
    await activity?.end('immediate');
  } catch {
    // Already gone.
  }
  delete map[trial.id];
  writeActivityMap(map);
}
