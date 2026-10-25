import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { TrialForm } from '@/components/trial-form';
import { Spacing } from '@/constants/theme';
import { Divider, Section } from '@/components/section';
import { saveNewTrial, saveNewTrials } from '@/lib/actions';
import { fromDateKey } from '@/lib/dates';
import { defaultParseOptions, readTrialFromImage, readTrialFromText, type ReadResult } from '@/lib/parse';
import { parseSubscriptionList, type ListedSubscription } from '@/lib/parse/subscription-list';
import { formatPrice, type TrialDraft } from '@/lib/trials';
import { useTheme } from '@/hooks/use-theme';

export type ImportJob = { kind: 'text'; text: string } | { kind: 'image'; uri: string } | { kind: 'manual' };

type State =
  | { step: 'reading' }
  | { step: 'review'; result: ReadResult | null }
  | { step: 'list'; rows: ListedSubscription[] }
  | { step: 'failed'; message: string };

/** Reads shared content on the device, then lets the person check and save the trial. */
export function ImportFlow({ job, onDone }: { job: ImportJob; onDone?: () => void }) {
  const theme = useTheme();
  const [state, setState] = useState<State>(job.kind === 'manual' ? { step: 'review', result: null } : { step: 'reading' });

  useEffect(() => {
    let cancelled = false;
    if (job.kind === 'manual') return;
    const read: Promise<State> =
      job.kind === 'text'
        ? readTrialFromText(job.text).then((result) => ({ step: 'review', result }))
        : readTrialFromImage(job.uri).then((result) => {
            // A screenshot of Settings › Subscriptions lists several at once.
            const rows = parseSubscriptionList(result.text, defaultParseOptions());
            return rows.length >= 2 || (rows.length === 1 && /^subscriptions$/im.test(result.text))
              ? { step: 'list', rows }
              : { step: 'review', result };
          });
    read
      .then((next) => !cancelled && setState(next))
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

  if (state.step === 'list') {
    return (
      <SubscriptionListReview
        rows={state.rows}
        onSaved={() => {
          if (router.canDismiss()) router.dismissAll();
          onDone?.();
        }}
      />
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

type RowChoice = { selected: boolean; kind: 'trial' | 'subscription' };

/** Lets the person choose which subscriptions from the screenshot to track. */
function SubscriptionListReview({ rows, onSaved }: { rows: ListedSubscription[]; onSaved: () => void }) {
  const theme = useTheme();
  const [choices, setChoices] = useState<RowChoice[]>(() =>
    rows.map((row) => ({ selected: row.renews, kind: row.isTrial ? 'trial' : 'subscription' }))
  );
  const [saving, setSaving] = useState(false);
  const count = choices.filter((c) => c.selected).length;
  const update = (index: number, change: Partial<RowChoice>) =>
    setChoices((all) => all.map((c, i) => (i === index ? { ...c, ...change } : c)));

  async function save() {
    setSaving(true);
    try {
      const drafts: TrialDraft[] = rows.flatMap((row, i) =>
        choices[i].selected
          ? [
              {
                service: row.service,
                price: row.price,
                currency: row.currency,
                billingPeriod: row.billingPeriod,
                chargeDate: row.date,
                cancelUrl: null,
                billedByAppStore: true,
                notes: row.plan ?? '',
                source: 'subscription-list',
                status: choices[i].kind === 'trial' ? 'active' : 'kept',
              },
            ]
          : []
      );
      await saveNewTrials(drafts);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.listContent}>
      <View style={[styles.banner, { backgroundColor: theme.successSoft }]}>
        <ThemedText type="small" style={{ color: theme.success }}>
          {`Found ${rows.length} subscription${rows.length === 1 ? '' : 's'} billed by Apple. Choose the ones to track, and whether each is still a free trial.`}
        </ThemedText>
      </View>
      <Section>
        {rows.map((row, i) => {
          const choice = choices[i];
          const date = fromDateKey(row.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
          const price = formatPrice(row);
          return (
            <View key={`${row.service}-${i}`}>
              {i > 0 ? <Divider /> : null}
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: choice.selected }}
                onPress={() => update(i, { selected: !choice.selected })}
                style={styles.row}>
                <SymbolView
                  name={choice.selected ? 'checkmark.circle.fill' : 'circle'}
                  tintColor={choice.selected ? theme.accent : theme.textSecondary}
                  size={24}
                  fallback={null}
                />
                <View style={styles.flex}>
                  <ThemedText style={styles.rowTitle}>{row.service}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {[row.renews ? `${row.isTrial ? 'Trial ends' : 'Renews'} ${date}` : `Already cancelled, ends ${date}`, price]
                      .filter(Boolean)
                      .join(' · ')}
                  </ThemedText>
                </View>
                {choice.selected ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Mark ${row.service} as ${choice.kind === 'trial' ? 'a paid subscription' : 'a free trial'}`}
                    onPress={() => update(i, { kind: choice.kind === 'trial' ? 'subscription' : 'trial' })}
                    style={[styles.pill, { backgroundColor: choice.kind === 'trial' ? theme.accentSoft : theme.backgroundSelected }]}>
                    <ThemedText type="smallBold" style={{ color: choice.kind === 'trial' ? theme.accent : theme.text }}>
                      {choice.kind === 'trial' ? 'Trial' : 'Paid'}
                    </ThemedText>
                  </Pressable>
                ) : null}
              </Pressable>
            </View>
          );
        })}
      </Section>
      <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
        Tap Trial or Paid to switch. Trials get cancel reminders; paid ones get a reminder before each renewal.
      </ThemedText>
      <Button title={count ? `Track ${count}` : 'Choose at least one'} onPress={save} loading={saving} disabled={!count} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listContent: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  banner: { padding: Spacing.three, borderRadius: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  hint: { marginHorizontal: Spacing.three, marginTop: -Spacing.two },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.three },
  centerTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  centerText: { textAlign: 'center' },
});
