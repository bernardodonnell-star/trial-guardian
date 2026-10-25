import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';

import { toDateKey } from '@/lib/dates';
import { trialsToBackup, trialsToCsv } from '@/lib/export';
import { parseTrialSet, type TrialSet } from '@/lib/merge';
import type { Trial } from '@/lib/trials';

// Proof photos are saved by name inside the app's documents folder. The folder's full path
// changes between app updates on iOS, so only the relative name is stored on the trial.
const PROOF_FOLDER = 'proofs';

function proofsDirectory(): Directory {
  const dir = new Directory(Paths.document, PROOF_FOLDER);
  dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/** Turns a stored proof name into a file URI for display, or null if the file is not on this device. */
export function proofFile(name: string): File | null {
  const file = new File(Paths.document, PROOF_FOLDER, name);
  return file.exists ? file : null;
}

/** Lets the person pick a screenshot or photo of the cancellation and keeps a copy. */
export async function pickProof(trial: Trial): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
  if (result.canceled || !result.assets[0]) return null;
  const source = new File(result.assets[0].uri);
  const name = `${trial.id}-${Date.now().toString(36)}.${source.extension.replace('.', '') || 'jpg'}`;
  await source.copy(new File(proofsDirectory(), name));
  return name;
}

export function deleteProof(name: string) {
  try {
    proofFile(name)?.delete();
  } catch {
    // Already gone.
  }
}

async function shareFile(name: string, contents: string, mimeType: string, UTI: string) {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  await file.write(contents);
  await Sharing.shareAsync(file.uri, { mimeType, UTI, dialogTitle: name });
}

/** Opens the share sheet with a CSV of every trial and subscription (for Numbers, Excel or email). */
export async function exportCsv(trials: Trial[]) {
  await shareFile(`Trial Guardian ${toDateKey(new Date())}.csv`, trialsToCsv(trials), 'text/csv', 'public.comma-separated-values-text');
}

/** Opens the share sheet with a full backup that can be restored on any iPhone. */
export async function exportBackup(trials: Trial[], deleted: Record<string, string>) {
  await shareFile(
    `Trial Guardian backup ${toDateKey(new Date())}.json`,
    trialsToBackup(trials, deleted),
    'application/json',
    'public.json'
  );
}

/** Lets the person choose a backup file. Returns null if they cancel; throws if the file is not a backup. */
export async function pickBackup(): Promise<TrialSet | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'public.json', '*/*'], copyToCacheDirectory: true });
  if (result.canceled || !result.assets[0]) return null;
  const set = parseTrialSet(await new File(result.assets[0].uri).text());
  if (!set) throw new Error('That file is not a Trial Guardian backup.');
  return set;
}
