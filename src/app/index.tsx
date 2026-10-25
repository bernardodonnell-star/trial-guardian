import { Link, Stack, router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { daysLeftLabel, formatDeadline, TrialCard } from '@/components/trial-card';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { setTrialStatus } from '@/lib/actions';
import { describeTimeLeft } from '@/lib/dates';
import { deadlineOf, formatPrice, overdueTrials, upcomingTrials, useTrials, type Trial } from '@/lib/trials';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const trials = useTrials();
  const now = useNow();
  const upcoming = upcomingTrials(trials, now);
  const overdue = overdueTrials(trials, now);
  const history = trials
    .filter((t) => t.status !== 'active')
    .sort((a, b) => b.chargeDate.localeCompare(a.chargeDate));
  const cancelledCount = history.filter((t) => t.status === 'cancelled').length;
  const [next, ...rest] = upcoming;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link href="/settings" asChild>
              <Pressable accessibilityLabel="Settings" hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
                <SymbolView name="gearshape" tintColor={theme.accent} size={22} fallback={<ThemedText style={{ color: theme.accent }}>Settings</ThemedText>} />
              </Pressable>
            </Link>
          ),
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}>
        {trials.length === 0 ? <EmptyState /> : null}

        {overdue.length > 0 ? (
          <View style={styles.group}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.groupTitle}>
              DID YOU CANCEL?
            </ThemedText>
            {overdue.map((trial) => (
              <OverdueCard key={trial.id} trial={trial} />
            ))}
          </View>
        ) : null}

        {next ? <NextUpCard trial={next} now={now} /> : null}

        {rest.length > 0 ? (
          <View style={styles.group}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.groupTitle}>
              ALSO ENDING
            </ThemedText>
            {rest.map((trial) => (
              <TrialCard key={trial.id} trial={trial} now={now} />
            ))}
          </View>
        ) : null}

        {history.length > 0 ? (
          <View style={styles.group}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.groupTitle}>
              {cancelledCount > 0
                ? `HISTORY · ${cancelledCount} CANCELLED IN TIME`
                : 'HISTORY'}
            </ThemedText>
            {history.map((trial) => (
              <TrialCard key={trial.id} trial={trial} now={now} />
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.two, backgroundColor: theme.background }]}>
        <Button title="Add a trial" onPress={() => router.push('/add')} />
      </View>
    </View>
  );
}

function NextUpCard({ trial, now }: { trial: Trial; now: Date }) {
  const theme = useTheme();
  const price = formatPrice(trial);
  const msLeft = deadlineOf(trial).getTime() - now.getTime();
  const finalHours = msLeft < 24 * 60 * 60 * 1000 ? ` · ${describeTimeLeft(deadlineOf(trial), now)} to go` : '';
  return (
    <Link href={`/trial/${trial.id}`} asChild>
      <Pressable
        style={({ pressed }) => [styles.hero, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}>
        <ThemedText type="smallBold" style={styles.heroEyebrow}>
          NEXT TO CANCEL
        </ThemedText>
        <ThemedText style={styles.heroService} numberOfLines={1}>
          {trial.service}
        </ThemedText>
        <ThemedText style={styles.heroCountdown}>{daysLeftLabel(trial, now)}</ThemedText>
        <ThemedText type="small" style={styles.heroDetail}>
          {price ? `${price} will be charged on ${formatDeadline(trial)}` : `Charges on ${formatDeadline(trial)}`}
          {finalHours}
        </ThemedText>
      </Pressable>
    </Link>
  );
}

function OverdueCard({ trial }: { trial: Trial }) {
  const theme = useTheme();
  return (
    <View style={[styles.overdue, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <ThemedText style={styles.overdueTitle}>{trial.service}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        The trial ended on {formatDeadline(trial)}. Did you cancel it?
      </ThemedText>
      <View style={styles.overdueButtons}>
        <Button title="Yes, cancelled" variant="secondary" style={styles.flex} onPress={() => setTrialStatus(trial.id, 'cancelled')} />
        <Button title="I kept it" variant="secondary" style={styles.flex} onPress={() => setTrialStatus(trial.id, 'kept')} />
      </View>
    </View>
  );
}

function EmptyState() {
  const theme = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.accentSoft }]}>
        <SymbolView name="hourglass" tintColor={theme.accent} size={34} fallback={null} />
      </View>
      <ThemedText style={styles.emptyTitle}>Never pay for a forgotten trial</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.emptyBody}>
        When you start a free trial, share the sign-up email or a screenshot to Trial Guardian. It reads
        the service, price and end date on your iPhone, then reminds you before you are charged.
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.emptyBody}>
        Nothing you share leaves your phone.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  group: { gap: Spacing.two },
  groupTitle: { marginLeft: Spacing.one, fontSize: 12, letterSpacing: 0.5 },
  hero: { borderRadius: 22, padding: Spacing.four, gap: Spacing.one },
  heroEyebrow: { color: '#FFFFFFCC', fontSize: 12, letterSpacing: 0.8 },
  heroService: { color: '#FFFFFF', fontSize: 28, lineHeight: 34, fontWeight: '700' },
  heroCountdown: { color: '#FFFFFF', fontSize: 44, lineHeight: 52, fontWeight: '800', marginTop: Spacing.two },
  heroDetail: { color: '#FFFFFFE6' },
  overdue: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.three, gap: Spacing.two },
  overdueTitle: { fontSize: 17, fontWeight: '600' },
  overdueButtons: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
  empty: { alignItems: 'center', gap: Spacing.three, paddingTop: Spacing.five, paddingHorizontal: Spacing.two },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 22, lineHeight: 28, fontWeight: '700', textAlign: 'center' },
  emptyBody: { textAlign: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
});
