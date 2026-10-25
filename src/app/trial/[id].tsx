import { Link, Stack, router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Divider, Section } from '@/components/section';
import { ThemedText } from '@/components/themed-text';
import { daysLeftLabel, formatDeadline } from '@/components/trial-card';
import { Spacing } from '@/constants/theme';
import { deleteTrial, setTrialStatus } from '@/lib/actions';
import { hasLiveActivity, isInLiveActivityWindow, startLiveActivity } from '@/lib/glance';
import { planReminders } from '@/lib/reminders';
import { useSettings } from '@/lib/settings';
import { formatPrice, useTrial } from '@/lib/trials';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';

const APP_STORE_SUBSCRIPTIONS = 'https://apps.apple.com/account/subscriptions';

export default function TrialScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const trial = useTrial(id);
  const theme = useTheme();
  const settings = useSettings();
  const now = useNow();
  const [, forceRender] = useState(0);

  if (!trial) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ThemedText themeColor="textSecondary">This trial was deleted.</ThemedText>
      </View>
    );
  }

  const price = formatPrice(trial);
  const active = trial.status === 'active';
  const reminders = planReminders(trial, settings, now);
  const canPin = Platform.OS === 'ios' && isInLiveActivityWindow(trial, now) && !hasLiveActivity(trial);

  function confirmDelete() {
    Alert.alert(`Delete ${trial!.service}?`, 'Its reminders will be removed too.', [
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
        {active ? (
          <ThemedText style={[styles.countdown, { color: theme.accent }]}>{daysLeftLabel(trial, now)}</ThemedText>
        ) : (
          <ThemedText style={[styles.countdown, { color: trial.status === 'cancelled' ? theme.success : theme.textSecondary }]}>
            {trial.status === 'cancelled' ? 'Cancelled' : 'Kept'}
          </ThemedText>
        )}
        <ThemedText themeColor="textSecondary">
          {price ? `${price} · ` : ''}Charge day {formatDeadline(trial)}
        </ThemedText>
      </View>

      {active ? (
        <View style={styles.actions}>
          {trial.cancelUrl ? (
            <Button title={`Cancel ${trial.service}`} onPress={() => WebBrowser.openBrowserAsync(trial.cancelUrl!)} />
          ) : null}
          <Button
            title="App Store subscriptions"
            variant={trial.cancelUrl ? 'secondary' : 'primary'}
            onPress={() => Linking.openURL(APP_STORE_SUBSCRIPTIONS)}
          />
          <View style={styles.row}>
            <Button title="I cancelled it" variant="secondary" style={styles.flex} onPress={() => setTrialStatus(trial.id, 'cancelled')} />
            <Button title="I'll keep it" variant="secondary" style={styles.flex} onPress={() => setTrialStatus(trial.id, 'kept')} />
          </View>
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
      ) : (
        <Button title="Track it again" variant="secondary" onPress={() => setTrialStatus(trial.id, 'active')} />
      )}

      {active ? (
        <Section
          title="Reminders"
          footer={
            reminders.length === 0
              ? 'No reminders left before the charge day. Check notifications are on in Settings.'
              : 'A Lock Screen countdown starts on its own in the final hours.'
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
      ) : null}

      {trial.notes ? (
        <Section title="Notes">
          <ThemedText style={styles.notes}>{trial.notes}</ThemedText>
        </Section>
      ) : null}

      <Button title="Delete trial" variant="destructive" onPress={confirmDelete} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.three, gap: Spacing.four, paddingBottom: Spacing.six },
  header: { gap: Spacing.one, alignItems: 'center', paddingVertical: Spacing.three },
  service: { fontSize: 28, lineHeight: 34, fontWeight: '700', textAlign: 'center' },
  countdown: { fontSize: 40, lineHeight: 48, fontWeight: '800' },
  actions: { gap: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two },
  reminder: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three },
  notes: { padding: Spacing.three },
  headerButton: { minHeight: 32, paddingHorizontal: 4 },
});
