import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { TrialForm } from '@/components/trial-form';
import { Spacing } from '@/constants/theme';
import { saveNewTrial } from '@/lib/actions';
import { readTrialFromImage, readTrialFromText, type ReadResult } from '@/lib/parse';
import type { TrialDraft } from '@/lib/trials';
import { useTheme } from '@/hooks/use-theme';

export type ImportJob = { kind: 'text'; text: string } | { kind: 'image'; uri: string } | { kind: 'manual' };

type State =
  | { step: 'reading' }
  | { step: 'review'; result: ReadResult | null }
  | { step: 'failed'; message: string };

/** Reads shared content on the device, then lets the person check and save the trial. */
export function ImportFlow({ job, onDone }: { job: ImportJob; onDone?: () => void }) {
  const theme = useTheme();
  const [state, setState] = useState<State>(job.kind === 'manual' ? { step: 'review', result: null } : { step: 'reading' });

  useEffect(() => {
    let cancelled = false;
    if (job.kind === 'manual') return;
    const read = job.kind === 'text' ? readTrialFromText(job.text) : readTrialFromImage(job.uri);
    read
      .then((result) => !cancelled && setState({ step: 'review', result }))
      .catch((error: Error) => !cancelled && setState({ step: 'failed', message: error.message }));
    return () => {
      cancelled = true;
    };
  }, [job]);

  if (state.step === 'reading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.accent} size="large" />
        <ThemedText style={styles.centerTitle}>Reading on your iPhone…</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
          Looking for the service, price and the day you&apos;ll be charged. Nothing is uploaded.
        </ThemedText>
      </View>
    );
  }

  if (state.step === 'failed') {
    return (
      <View style={styles.center}>
        <ThemedText style={styles.centerTitle}>Couldn&apos;t read that</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
          {state.message}
        </ThemedText>
        <Button title="Type it in instead" onPress={() => setState({ step: 'review', result: null })} />
      </View>
    );
  }

  const { result } = state;
  const foundAnything = result && Object.values(result.trial).some((v) => v !== null);
  const source: TrialDraft['source'] =
    job.kind === 'text' ? 'shared-text' : job.kind === 'image' ? 'shared-image' : 'manual';
  const banner = !result
    ? undefined
    : !foundAnything
      ? "We couldn't find trial details in that. Fill them in below."
      : result.method === 'on-device-model'
        ? 'Read on your iPhone with Apple Intelligence. Check the details, then save.'
        : 'Read on your iPhone. Check the details, then save.';

  return (
    <TrialForm
      initial={result?.trial ?? {}}
      source={source}
      banner={banner}
      submitLabel="Save and remind me"
      onSubmit={async (draft) => {
        const trial = await saveNewTrial(draft);
        if (router.canDismiss()) router.dismissAll();
        router.push(`/trial/${trial.id}`);
        onDone?.();
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.three },
  centerTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  centerText: { textAlign: 'center' },
});
