const DAY_MS = 24 * 60 * 60 * 1000;

/** `YYYY-MM-DD` for a local date. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Midnight local time at the start of a `YYYY-MM-DD` day. */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return next;
}

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
}

export function isValidDateParts(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  const lastDay = new Date(year, month, 0).getDate();
  return day <= lastDay;
}

/** A short human countdown such as "3 days", "Tomorrow" or "5 hours". */
export function describeTimeLeft(deadline: Date, now: Date = new Date()): string {
  const ms = deadline.getTime() - now.getTime();
  if (ms <= 0) return 'Ended';
  const hours = ms / (60 * 60 * 1000);
  if (hours < 1) return `${Math.max(1, Math.round(ms / 60000))} min`;
  if (hours < 24) return `${Math.floor(hours)} hour${Math.floor(hours) === 1 ? '' : 's'}`;
  const days = daysBetween(now, deadline);
  if (days <= 1) return 'Tomorrow';
  return `${days} days`;
}
