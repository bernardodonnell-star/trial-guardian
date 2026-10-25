import { Link, Stack, router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Alert, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Divider, Section } from '@/components/section';
import { ThemedText } from '@/components/themed-text';
import { daysLeftLabel, formatDeadline } from '@/components/trial-card';
import { Spacing } from '@/constants/theme';
import { addProof, deleteTrial, removeProof, setTrialStatus } from '@/lib/actions';
import { addTrialToCalendar } from '@/lib/calendar';
import { APP_STORE_SUBSCRIPTIONS_URL, APPLE_REFUND_URL, cancelGuideFor } from '@/lib/cancel-guides';
import { addDays } from '@/lib/dates';
import { pickProof, proofFile } from '@/lib/files';
import { hasLiveActivity, isInLiveActivityWindow, startLiveActivity } from '@/lib/glance';
import { describePriceRise, findPriceRise } from '@/lib/price-watch';
import { planReminders } from '@/lib/reminders';
import { useSettings } from '@/lib/settings';
import { chargeDayOf, deadlineOf, formatMoney, formatPrice, nextPaymentOf, useTrials, type Trial } from '@/lib/trials';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';

const longDate = (date: Date) => date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

function showRefundHelp(trial: Trial) {
  if (trial.billedByAppStore) {
    Alert.alert(
      'Ask Apple for a refund',
      'Sign in at reportaproblem.apple.com, find the charge and choose “Request a refund”. Say you cancelled before the trial ended. Your proof screenshot helps.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Report a Problem', onPress: () => WebBrowser.openBrowserAsync(APPLE_REFUND_URL) },
      ]
    );
  } else {
    Alert.alert(
      'Ask for a refund',
      `Contact ${trial.service} support, say you cancelled during the free trial and attach your proof. If they refuse, your bank or card provider can dispute the charge.`
    );
  }
}

export default function TrialScreen() {
  const { id, refund } = useLocalSearchParams<{ id: string; refund?: string }>();
  const trials = useTrials();
  const trial = trials.find((t) => t.id === id);
  const theme = useTheme();
  const settings = useSettings();
  const now = useNow();
  const [, forceRender] = useState(0);

  // Opened from "I was charged" on the charge-check reminder.
  useEffect(() => {
    if (refund && trial) showRefundHelp(trial);
    // Only once, when the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refund]);

  if (!trial) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ThemedText themeColor="textSecondary">This trial was deleted.</ThemedText>
      </View>
    );
  }

  const price = formatPrice(trial);
  const { status } = trial;
  const active = status === 'active';
  const guide = cancelGuideFor(trial.service, trial.billedByAppStore);
  const cancelLink = trial.cancelUrl ?? guide.url ?? null;
  const reminders = planReminders(trial, settings, now);
  const rise = findPriceRise(trial, trials);
  const accessUntil = status === 'cancelled' && deadlineOf(trial) > now ? deadlineOf(trial) : null;
  const canPin = Platform.OS === 'ios' && isInLiveActivityWindow(trial, now) && !hasLiveActivity(trial);
  const proofs = trial.proofUris ?? [];

  function openCancel() {
    if (!cancelLink) return;
    if (cancelLink === APP_STORE_SUBSCRIPTIONS_URL) Linking.openURL(cancelLink);
    else WebBrowser.openBrowserAsync(cancelLink);
  }

  function confirmDelete() {
    Alert.alert(`Delete ${trial!.service}?`, 'Its reminders and proof photos will be removed too.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTrial(trial!.id);
          router.back();
        },
      },
    ]);
  }

  async function attachProof() {
    const name = await pickProof(trial!);
    if (name) await addProof(trial!.id, name);
  }

  async function addToCalendar() {
    try {
      await addTrialToCalendar(trial!);
    } catch {
      Alert.alert('Calendar not available', 'Allow Trial Guardian to add events in Settings › Privacy › Calendars.');
    }
  }

  const headline = active
    ? daysLeftLabel(trial, now)
    : status === 'cancelled'
      ? 'Cancelled'
      : 'Paying';
  const headlineColor = active ? theme.accent : status === 'cancelled' ? theme.success : theme.textSecondary;
  const subline = active
    ? `Cancel before ${formatDeadline(trial)} · ${price ? `${price} on ` : 'Charges '}${longDate(chargeDayOf(trial))}`
    : status === 'cancelled'
      ? accessUntil
        ? `You can keep using it until ${longDate(accessUntil)}`
        : `Trial ended ${longDate(chargeDayOf(trial))}`
      : `${price ? `${price} · ` : ''}Next payment ${longDate(nextPaymentOf(trial, now))}`;

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link href={`/edit/${trial.id}`} asChild>
              <Button title="Edit" variant="plain" style={styles.headerButton} />
            </Link>
          ),
        }}
      />

      <View style={styles.header}>
        <ThemedText style={styles.service}>{trial.service}</ThemedText>
        <ThemedText style={[styles.countdown, { color: headlineColor }]}>{headline}</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.centerText}>
          {subline}
        </ThemedText>
      </View>

      {rise ? (
        <View style={[styles.banner, { backgroundColor: theme.accentSoft }]}>
          <ThemedText type="smallBold" style={{ color: theme.accent }}>
            {`Price rise: ${describePriceRise(rise)}`}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.accent }}>
            {`It was ${formatMoney(rise.from, rise.currency)} on ${rise.since}. Look for a cheaper plan, or cancel and ask for a loyalty offer.`}
          </ThemedText>
        </View>
      ) : null}

      {active ? (
        <View style={styles.actions}>
          {guide.keepsAccess ? (
            <View style={[styles.banner, { backgroundColor: theme.successSoft }]}>
              <ThemedText type="smallBold" style={{ color: theme.success }}>
                Cancel now, keep watching
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.success }}>
                {`${trial.service} normally lets you use the rest of your free trial after you cancel, so there’s no reason to wait.`}
              </ThemedText>
            </View>
          ) : guide.keepsAccess === false ? (
            <View style={[styles.banner, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="small">
                {`Cancelling ${trial.service} can end the trial straight away, so cancel on the last day. Your reminders are set for that.`}
              </ThemedText>
            </View>
          ) : null}
          {cancelLink ? <Button title={`Cancel ${trial.service}`} onPress={openCancel} /> : null}
          {cancelLink !== APP_STORE_SUBSCRIPTIONS_URL ? (
            <Button
              title="App Store subscriptions"
              variant={cancelLink ? 'secondary' : 'primary'}
              onPress={() => Linking.openURL(APP_STORE_SUBSCRIPTIONS_URL)}
            />
          ) : null}
          <View style={styles.row}>
            <Button title="I cancelled it" variant="secondary" style={styles.flex} onPress={() => setTrialStatus(trial.id, 'cancelled')} />
            <Button title="I'll keep it" variant="secondary" style={styles.flex} onPress={() => setTrialStatus(trial.id, 'kept')} />
          </View>
          <Button title="Add to Calendar" variant="plain" onPress={addToCalendar} />
          {canPin ? (
            <Button
              title="Show countdown on Lock Screen"
              variant="plain"
              onPress={() => {
                if (!startLiveActivity(trial)) {
                  Alert.alert('Countdown not available', 'Live Activities may be turned off for Trial Guardian in Settings.');
                }
                forceRender((n) => n + 1);
              }}
            />
          ) : null}
        </View>
      ) : null}

      {status === 'kept' ? (
        <View style={styles.actions}>
          {cancelLink ? <Button title={`Cancel ${trial.service}`} variant="secondary" onPress={openCancel} /> : null}
          <View style={styles.row}>
            <Button title="I cancelled it" variant="secondary" style={styles.flex} onPress={() => setTrialStatus(trial.id, 'cancelled')} />
            <Button title="It's a trial" variant="secondary" style={styles.flex} onPress={() => setTrialStatus(trial.id, 'active')} />
          </View>
        </View>
      ) : null}

      {status === 'cancelled' ? (
        <Section
          title="Proof you cancelled"
          footer="A screenshot of the cancellation email or page makes a refund easy if you’re charged anyway. Photos stay on this iPhone.">
          {proofs.length > 0 ? (
            <ScrollView horizontal contentContainerStyle={styles.proofs} showsHorizontalScrollIndicator={false}>
              {proofs.map((name) => {
                const file = proofFile(name);
                return (
                  <Pressable
                    key={name}
                    accessibilityLabel="Proof photo. Long press to remove."
                    onLongPress={() =>
                      Alert.alert('Remove this photo?', undefined, [
                        { text: 'Keep', style: 'cancel' },
                        { text: 'Remove', style: 'destructive', onPress: () => removeProof(trial.id, name) },
                      ])
                    }>
                    {file ? (
                      <Image source={{ uri: file.uri }} style={styles.proof} resizeMode="cover" />
                    ) : (
                      <View style={[styles.proof, styles.center, { backgroundColor: theme.backgroundSelected }]}>
                        <ThemedText type="small" themeColor="textSecondary">
                          On another device
                        </ThemedText>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}
          <Button title={proofs.length ? 'Add another' : 'Add a screenshot'} variant="plain" onPress={attachProof} />
        </Section>
      ) : null}

      {status === 'cancelled' && now >= chargeDayOf(trial) ? (
        <Section title="Charged anyway?">
          <ThemedText type="small" themeColor="textSecondary" style={styles.padded}>
            {`Check your bank or card app for a ${trial.service} payment around ${longDate(chargeDayOf(trial))}.`}
          </ThemedText>
          <Button title="Get refund help" variant="plain" onPress={() => showRefundHelp(trial)} />
        </Section>
      ) : null}

      {status === 'cancelled' ? (
        <Button title="Track it again" variant="secondary" onPress={() => setTrialStatus(trial.id, 'active')} />
      ) : null}

      {status !== 'kept' || guide.known ? (
        <Section title={`How to cancel ${trial.service}`} footer={guide.note}>
          {guide.steps.map((step, index) => (
            <View key={step}>
              {index > 0 ? <Divider /> : null}
              <View style={styles.step}>
                <View style={[styles.stepNumber, { backgroundColor: theme.accentSoft }]}>
                  <ThemedText type="smallBold" style={{ color: theme.accent }}>
                    {String(index + 1)}
                  </ThemedText>
                </View>
                <ThemedText style={styles.flex}>{step}</ThemedText>
              </View>
            </View>
          ))}
        </Section>
      ) : null}

      <Section
        title="Reminders"
        footer={
          reminders.length > 0
            ? active
              ? 'A Lock Screen countdown starts on its own in the final hours.'
              : undefined
            : active
              ? 'No reminders left before the charge day. Check notifications are on in Settings.'
              : status === 'kept'
                ? 'Turn on renewal reminders in Settings to hear before each payment.'
                : 'No reminders for this one.'
        }>
        {reminders.map((reminder, index) => (
          <View key={reminder.date.toISOString()}>
            {index > 0 ? <Divider /> : null}
            <View style={styles.reminder}>
              <ThemedText style={styles.flex}>{reminder.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {reminder.date.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
              </ThemedText>
            </View>
          </View>
        ))}
      </Section>

      {(trial.priceHistory?.length ?? 0) > 1 ? (
        <Section title="Price history">
          {trial.priceHistory!.map((point, index) => (
            <View key={`${point.date}-${index}`}>
              {index > 0 ? <Divider /> : null}
              <View style={styles.reminder}>
                <ThemedText style={styles.flex}>{formatMoney(point.price, point.currency)}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {point.date}
                </ThemedText>
              </View>
            </View>
          ))}
        </Section>
      ) : null}

      {trial.notes ? (
        <Section title="Notes">
          <ThemedText style={styles.padded}>{trial.notes}</ThemedText>
        </Section>
      ) : null}

      <Button title={status === 'kept' ? 'Delete subscription' : 'Delete trial'} variant="destructive" onPress={confirmDelete} />
      {status === 'cancelled' && accessUntil ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
          {`We’ll check in on ${longDate(addDays(chargeDayOf(trial), 1))} to make sure you weren’t charged.`}
        </ThemedText>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerText: { textAlign: 'center' },
  content: { padding: Spacing.three, gap: Spacing.four, paddingBottom: Spacing.six },
  header: { gap: Spacing.one, alignItems: 'center', paddingVertical: Spacing.three },
  service: { fontSize: 28, lineHeight: 34, fontWeight: '700', textAlign: 'center' },
  countdown: { fontSize: 40, lineHeight: 48, fontWeight: '800' },
  banner: { padding: Spacing.three, borderRadius: 14, gap: 2 },
  actions: { gap: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two },
  reminder: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three },
  step: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three },
  stepNumber: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  proofs: { gap: Spacing.two, padding: Spacing.three },
  proof: { width: 96, height: 128, borderRadius: 10 },
  padded: { padding: Spacing.three },
  headerButton: { minHeight: 32, paddingHorizontal: 4 },
});
