import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { Divider, Section } from '@/components/section';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { replanReminders } from '@/lib/actions';
import { isOnDeviceModelAvailable } from '@/modules/trial-extractor';
import { updateSettings, useSettings } from '@/lib/settings';
import { useTheme } from '@/hooks/use-theme';

const REMINDER_DAY_OPTIONS = [7, 3, 2, 1];
const REMINDER_HOURS = [7, 8, 9, 12, 18];

// TODO before release: replace with the hosted support and privacy pages.
const SUPPORT_URL = 'https://example.com/trial-guardian/support';
const PRIVACY_URL = 'https://example.com/trial-guardian/privacy';

export default function SettingsScreen() {
  const theme = useTheme();
  const settings = useSettings();
  const modelReady = isOnDeviceModelAvailable();

  async function change(changes: Parameters<typeof updateSettings>[0]) {
    updateSettings(changes);
    await replanReminders();
  }

  function toggleDay(day: number) {
    const has = settings.reminderDays.includes(day);
    const next = has ? settings.reminderDays.filter((d) => d !== day) : [...settings.reminderDays, day];
    change({ reminderDays: next });
  }

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Section title="Morning reminders" footer="Days before the charge day. 1 day means the last day you can cancel.">
        <View style={styles.chips}>
          {REMINDER_DAY_OPTIONS.map((day) => {
            const selected = settings.reminderDays.includes(day);
            return (
              <Chip key={day} label={day === 1 ? 'Last day' : `${day} days`} selected={selected} onPress={() => toggleDay(day)} />
            );
          })}
        </View>
        <Divider />
        <View style={styles.chips}>
          {REMINDER_HOURS.map((hour) => (
            <Chip
              key={hour}
              label={new Date(2026, 0, 1, hour).toLocaleTimeString(undefined, { hour: 'numeric' })}
              selected={settings.reminderHour === hour}
              onPress={() => change({ reminderHour: hour })}
            />
          ))}
        </View>
      </Section>

      <Section>
        <ToggleRow
          label="Evening nudge on the last day"
          value={settings.lastEveningReminder}
          onValueChange={(value) => change({ lastEveningReminder: value })}
        />
        <Divider />
        <ToggleRow
          label="Lock Screen countdown"
          detail="Starts in the final 8 hours when you open the app or tap a reminder."
          value={settings.autoLiveActivity}
          onValueChange={(value) => change({ autoLiveActivity: value })}
        />
      </Section>

      <Section title="Privacy">
        <View style={styles.row}>
          <ThemedText style={styles.flex}>Reading method</ThemedText>
          <ThemedText themeColor="textSecondary">{modelReady ? 'Apple Intelligence' : 'Built-in rules'}</ThemedText>
        </View>
        <Divider />
        <ThemedText type="small" themeColor="textSecondary" style={styles.row}>
          Trials are stored only on this iPhone. There is no account, no tracking and no access to your email
          or bank. Delete the app and everything is gone.
        </ThemedText>
      </Section>

      <Section title="About">
        <LinkRow label="Support" onPress={() => WebBrowser.openBrowserAsync(SUPPORT_URL)} />
        <Divider />
        <LinkRow label="Privacy policy" onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)} />
        <Divider />
        <LinkRow label="Notification settings" onPress={() => Linking.openSettings()} />
      </Section>

      <ThemedText type="small" themeColor="textSecondary" style={styles.version}>
        Trial Guardian {Constants.expoConfig?.version ?? ''}
      </ThemedText>
    </ScrollView>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: selected ? theme.accent : theme.backgroundSelected, opacity: pressed ? 0.7 : 1 },
      ]}>
      <ThemedText type="smallBold" style={{ color: selected ? '#FFFFFF' : theme.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function ToggleRow({
  label,
  detail,
  value,
  onValueChange,
}: {
  label: string;
  detail?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <ThemedText>{label}</ThemedText>
        {detail ? (
          <ThemedText type="small" themeColor="textSecondary">
            {detail}
          </ThemedText>
        ) : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: theme.accent }} />
    </View>
  );
}

function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? theme.backgroundSelected : 'transparent' }]}>
      <ThemedText style={[styles.flex, { color: theme.accent }]}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.four, paddingBottom: Spacing.six },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, padding: Spacing.three },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, minHeight: 52 },
  version: { textAlign: 'center' },
});
