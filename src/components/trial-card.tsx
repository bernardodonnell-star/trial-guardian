import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { daysBetween } from '@/lib/dates';
import { deadlineOf, formatPrice, nextPaymentOf, type Trial } from '@/lib/trials';
import { useTheme } from '@/hooks/use-theme';

/** "Last day", "3 days left" and so on, counting today as a day you can still cancel. */
export function daysLeftLabel(trial: Trial, now: Date = new Date()): string {
  const deadline = deadlineOf(trial);
  if (deadline <= now) return 'Charge day passed';
  const days = daysBetween(now, deadline);
  if (days <= 1) return 'Last day';
  return `${days} days left`;
}

export function formatDeadline(trial: Trial): string {
  return deadlineOf(trial).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function shortDate(date: Date): string {
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** The second line of a card: what happens next for this trial or subscription. */
function detailLine(trial: Trial, now: Date): string {
  const price = formatPrice(trial);
  if (trial.status === 'active') return `${price ? `${price} · ` : ''}Cancel before ${formatDeadline(trial)}`;
  if (trial.status === 'kept') return `${price ? `${price} · ` : ''}Renews ${shortDate(nextPaymentOf(trial, now))}`;
  return deadlineOf(trial) > now ? `Access until ${shortDate(deadlineOf(trial))}` : (price ?? formatDeadline(trial));
}

export function TrialCard({ trial, now }: { trial: Trial; now: Date }) {
  const theme = useTheme();
  const days = daysBetween(now, deadlineOf(trial));
  const urgent = trial.status === 'active' && days <= 1;

  const badge =
    trial.status === 'cancelled'
      ? { text: 'Cancelled', color: theme.success, background: theme.successSoft }
      : trial.status === 'kept'
        ? { text: 'Paying', color: theme.textSecondary, background: theme.backgroundSelected }
        : {
            text: daysLeftLabel(trial, now),
            color: urgent ? '#FFFFFF' : theme.accent,
            background: urgent ? theme.accent : theme.accentSoft,
          };

  return (
    <Link href={`/trial/${trial.id}`} asChild>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
        ]}>
        <View style={styles.text}>
          <ThemedText style={styles.service} numberOfLines={1}>
            {trial.service}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {detailLine(trial, now)}
          </ThemedText>
        </View>
        <View style={[styles.badge, { backgroundColor: badge.background }]}>
          <ThemedText type="smallBold" style={{ color: badge.color }}>
            {badge.text}
          </ThemedText>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: { flex: 1, gap: 2 },
  service: { fontSize: 17, fontWeight: '600' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
});
