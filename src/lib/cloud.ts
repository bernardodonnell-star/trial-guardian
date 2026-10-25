import { cloudGet, cloudSet, cloudSynchronize, isCloudAvailable } from '@/modules/trial-system';

import { trialsToBackup } from '@/lib/export';
import { mergeTrialSets, parseTrialSet, sameTrialSet, type TrialSet } from '@/lib/merge';
import { getSettings } from '@/lib/settings';
import { getDeletedIds, getTrials, replaceAll } from '@/lib/trials';

// iCloud key-value storage: up to 1 MB, synced by iOS between the person's devices and
// kept in their own iCloud account. A few hundred trials fit comfortably.
const CLOUD_KEY = 'trials.v1';

export function cloudSyncAvailable(): boolean {
  return isCloudAvailable();
}

/**
 * Merges this device with the iCloud copy and writes the result both ways.
 * Returns true when trials on this device changed, so reminders can be re-planned.
 */
export function syncWithCloud(): boolean {
  if (!getSettings().iCloudSync || !isCloudAvailable()) return false;
  cloudSynchronize();
  const local: TrialSet = { trials: getTrials(), deleted: getDeletedIds() };
  const raw = cloudGet(CLOUD_KEY);
  const remote = raw ? parseTrialSet(raw) : null;
  const merged = remote ? mergeTrialSets(local, remote) : local;

  const localChanged = !sameTrialSet(merged, local);
  if (localChanged) replaceAll(merged.trials, merged.deleted);
  if (!remote || !sameTrialSet(merged, remote)) cloudSet(CLOUD_KEY, trialsToBackup(merged.trials, merged.deleted));
  return localChanged;
}
