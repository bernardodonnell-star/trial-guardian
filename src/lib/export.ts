import { deadlineOf, nextPaymentOf, type Trial } from '@/lib/trials';
import { toDateKey } from '@/lib/dates';

const STATUS_LABEL: Record<Trial['status'], string> = { active: 'Trial', cancelled: 'Cancelled', kept: 'Subscription' };

function cell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** A spreadsheet-friendly list of every trial and subscription. */
export function trialsToCsv(trials: Trial[], now: Date = new Date()): string {
  const header = ['Service', 'Status', 'Price', 'Currency', 'Billing', 'Charge date', 'Cancel by', 'Next payment', 'Billed by Apple', 'Cancel link', 'Notes'];
  const rows = trials.map((t) => [
    t.service,
    STATUS_LABEL[t.status],
    t.price,
    t.currency,
    t.billingPeriod,
    t.chargeDate,
    t.status === 'active' ? toDateKey(deadlineOf(t)) : '',
    t.status === 'kept' ? toDateKey(nextPaymentOf(t, now)) : '',
    t.billedByAppStore ? 'Yes' : 'No',
    t.cancelUrl,
    t.notes,
  ]);
  return [header, ...rows].map((row) => row.map(cell).join(',')).join('\n') + '\n';
}

/** The JSON backup format. `app` and `version` let a future version read old backups. */
export function trialsToBackup(trials: Trial[], deleted: Record<string, string>, now: Date = new Date()): string {
  return JSON.stringify(
    { app: 'trial-guardian', version: 1, exportedAt: now.toISOString(), trials: trials.map((t) => ({ ...t, notificationIds: [] })), deleted },
    null,
    2
  );
}
