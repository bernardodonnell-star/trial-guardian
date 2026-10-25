import { requireOptionalNativeModule, type EventSubscription } from 'expo';

type TrialSystemModule = {
  isCloudAvailable(): boolean;
  cloudGet(key: string): string | null;
  cloudSet(key: string, value: string): void;
  cloudSynchronize(): boolean;
  writeShared(group: string, key: string, value: string): void;
  takeShared(group: string, key: string): string | null;
  addListener(event: 'onCloudChange', listener: () => void): EventSubscription;
};

// Missing on Android, web and in tests: every caller treats that as "feature unavailable".
const native = requireOptionalNativeModule<TrialSystemModule>('TrialSystem');

export const APP_GROUP = 'group.com.bernardodonnell.trialguardian';

function attempt<T>(fn: (m: TrialSystemModule) => T, fallback: T): T {
  if (!native) return fallback;
  try {
    return fn(native);
  } catch (error) {
    console.warn('TrialSystem call failed', error);
    return fallback;
  }
}

/** True when the person is signed in to iCloud on this device. */
export const isCloudAvailable = () => attempt((m) => m.isCloudAvailable(), false);
export const cloudGet = (key: string) => attempt((m) => m.cloudGet(key), null);
export const cloudSet = (key: string, value: string) => attempt((m) => m.cloudSet(key, value), undefined);
export const cloudSynchronize = () => attempt((m) => m.cloudSynchronize(), false);

/** Calls back when another device changes the iCloud copy. */
export function onCloudChange(listener: () => void): { remove(): void } {
  return attempt((m) => m.addListener('onCloudChange', listener), { remove() {} });
}

/** Values shared with the Siri and Shortcuts intents through the App Group. */
export const writeShared = (key: string, value: string) => attempt((m) => m.writeShared(APP_GROUP, key, value), undefined);
export const takeShared = (key: string) => attempt((m) => m.takeShared(APP_GROUP, key), null);
