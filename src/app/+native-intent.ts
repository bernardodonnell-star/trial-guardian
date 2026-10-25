import { getShareExtensionKey } from 'expo-share-intent';

/** Sends content shared from another app's share sheet to the import screen. */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    if (path.includes(`dataUrl=${getShareExtensionKey()}`)) return '/import';
    return path;
  } catch {
    return '/';
  }
}
