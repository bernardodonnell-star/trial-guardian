import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

export type Settings = {
  /** Days before the charge day to send a morning reminder. 1 means the last day. */
  reminderDays: number[];
  /** Hour of the day (0-23) for morning reminders. */
  reminderHour: number;
  /** Also remind at 6pm on the last day. */
  lastEveningReminder: boolean;
  /** Start a Lock Screen countdown automatically during the final hours. */
  autoLiveActivity: boolean;
  /** Remind every morning of the final week until the person decides. */
  persistentReminders: boolean;
  /** The day after a cancelled trial's charge day, remind to check no charge went through. */
  chargeCheckReminder: boolean;
  /** Remind before each renewal of a kept subscription. */
  renewalReminders: boolean;
  /** Ask for Face ID (or the passcode) when the app opens. */
  appLock: boolean;
  /** Keep trials in step across the person's devices through iCloud. */
  iCloudSync: boolean;
};

export const defaultSettings: Settings = {
  reminderDays: [3, 1],
  reminderHour: 9,
  lastEveningReminder: true,
  autoLiveActivity: true,
  persistentReminders: false,
  chargeCheckReminder: true,
  renewalReminders: true,
  appLock: false,
  iCloudSync: false,
};

const STORAGE_KEY = 'settings.v1';

let settings: Settings = load();
const listeners = new Set<() => void>();

function load(): Settings {
  try {
    const raw = Storage.getItemSync(STORAGE_KEY);
    return raw ? { ...defaultSettings, ...(JSON.parse(raw) as Partial<Settings>) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

export function getSettings(): Settings {
  return settings;
}

export function updateSettings(changes: Partial<Settings>) {
  settings = { ...settings, ...changes };
  Storage.setItemSync(STORAGE_KEY, JSON.stringify(settings));
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings, getSettings);
}
