import * as Calendar from 'expo-calendar/legacy';

import { addDays } from '@/lib/dates';
import { deadlineOf, formatPrice, type Trial } from '@/lib/trials';

/**
 * Opens the system "New Event" sheet with an all-day event on the last day to cancel.
 * On iOS 17 and later this needs no calendar permission, because the person saves it themselves.
 */
export async function addTrialToCalendar(trial: Trial): Promise<boolean> {
  const lastDay = addDays(deadlineOf(trial), -1);
  const price = formatPrice(trial);
  const event = {
    title: `Cancel ${trial.service} trial`,
    startDate: lastDay,
    endDate: addDays(lastDay, 1),
    allDay: true,
    notes: [
      `Last day to cancel before ${price ? `the ${price} ` : 'the first '}charge.`,
      trial.cancelUrl ? `Cancel here: ${trial.cancelUrl}` : null,
      'Added by Trial Guardian.',
    ]
      .filter(Boolean)
      .join('\n'),
    url: trial.cancelUrl ?? undefined,
    alarms: [{ relativeOffset: 9 * 60 }],
  };
  try {
    const result = await Calendar.createEventInCalendarAsync(event);
    return result.action === 'saved';
  } catch {
    // Older iOS versions need permission before showing the sheet.
    const { granted } = await Calendar.requestCalendarPermissionsAsync();
    if (!granted) return false;
    const result = await Calendar.createEventInCalendarAsync(event);
    return result.action === 'saved';
  }
}
