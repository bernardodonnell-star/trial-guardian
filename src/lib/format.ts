import type { Iso } from './types.ts';

/** "Wed 25 Nov, 17:40" in the time zone the event happens in (the offset in the ISO string). */
export function localDateTime(iso: Iso): string {
  return `${localDay(iso)}, ${localTime(iso)}`;
}

export function localTime(iso: Iso): string {
  const m = /T(\d{2}):(\d{2})/.exec(iso);
  return m ? `${m[1]}:${m[2]}` : iso;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function localDay(iso: Iso): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dow = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
  return `${DAYS[dow]} ${d} ${MONTHS[mo - 1]}`;
}
