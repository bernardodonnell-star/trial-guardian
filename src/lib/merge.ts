import type { Trial } from '@/lib/trials';

export type TrialSet = { trials: Trial[]; deleted: Record<string, string> };

const changedAt = (t: Trial) => t.updatedAt ?? t.createdAt;

/**
 * Merges this device's trials with a copy from iCloud or a backup. For each trial the most
 * recent change wins, deletions win over older edits, and notification ids always stay
 * with this device because they mean nothing elsewhere.
 */
export function mergeTrialSets(local: TrialSet, remote: TrialSet): TrialSet {
  const deleted: Record<string, string> = { ...local.deleted };
  for (const [id, at] of Object.entries(remote.deleted)) {
    if (!deleted[id] || deleted[id] < at) deleted[id] = at;
  }

  const byId = new Map<string, Trial>();
  for (const trial of local.trials) byId.set(trial.id, trial);
  for (const theirs of remote.trials) {
    const mine = byId.get(theirs.id);
    if (!mine) byId.set(theirs.id, { ...theirs, notificationIds: [] });
    else if (changedAt(theirs) > changedAt(mine)) byId.set(theirs.id, { ...theirs, notificationIds: mine.notificationIds });
  }

  const trials = [...byId.values()].filter((t) => !deleted[t.id] || changedAt(t) > deleted[t.id]);
  return { trials, deleted };
}

/** Checks that something read from a file or iCloud really is a list of trials. */
export function parseTrialSet(json: string): TrialSet | null {
  try {
    const data = JSON.parse(json) as Partial<TrialSet> & { app?: string };
    if (!Array.isArray(data.trials)) return null;
    const trials = data.trials.filter(
      (t): t is Trial =>
        !!t &&
        typeof t.id === 'string' &&
        typeof t.service === 'string' &&
        typeof t.chargeDate === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(t.chargeDate) &&
        ['active', 'cancelled', 'kept'].includes(t.status)
    );
    const deleted = data.deleted && typeof data.deleted === 'object' ? data.deleted : {};
    return { trials: trials.map((t) => ({ ...t, notificationIds: Array.isArray(t.notificationIds) ? t.notificationIds : [] })), deleted };
  } catch {
    return null;
  }
}

/** True when two sets hold the same trials, ignoring device-only notification ids. */
export function sameTrialSet(a: TrialSet, b: TrialSet): boolean {
  const strip = (s: TrialSet) =>
    JSON.stringify({
      trials: [...s.trials].sort((x, y) => x.id.localeCompare(y.id)).map((t) => ({ ...t, notificationIds: [] })),
      deleted: s.deleted,
    });
  return strip(a) === strip(b);
}
