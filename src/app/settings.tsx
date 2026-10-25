import Constants from 'expo-constants';
import * as LocalAuthentication from 'expo-local-authentication';
import * as WebBrowser from 'expo-web-browser';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { Divider, Section } from '@/components/section';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { replanReminders, restoreBackup, syncNow } from '@/lib/actions';
import { cloudSyncAvailable } from '@/lib/cloud';
import { exportBackup, exportCsv, pickBackup } from '@/lib/files';
import { isOnDeviceModelAvailable } from '@/modules/trial-extractor';
import { updateSettings, useSettings } from '@/lib/settings';
import { getDeletedIds, useTrials } from '@/lib/trials';
import { useTheme } from '@/hooks/use-theme';

const REMINDER_DAY_OPTIONS = [7, 3, 2, 1];
const REMINDER_HOURS = [7, 8, 9, 12, 18];

// TODO before release: replace with the hosted support and privacy pages.
const SUPPORT_URL = 'https://example.com/trial-guardian/support';
const PRIVACY_URL = 'https://example.com/trial-guardian/privacy';

export default function SettingsScreen() {
  const theme = useTheme();
  const settings = useSettings();
  const trials = useTrials();
  const modelReady = isOnDeviceModelAvailable();
  const cloudReady = cloudSyncAvailable();

  async function change(changes: Parameters<typeof updateSettings>[0]) {
    updateSettings(changes);
    await replanReminders();
  }

  async function toggleLock(value: boolean) {
    if (value) {
      const ready = (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
      if (!ready) {
        Alert.alert('Set up Face ID first', 'Turn on Face ID or a passcode in the Settings app, then try again.');
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Turn on the lock' });
      if (!result.success) return;
    }
    updateSettings({ appLock: value });
  }

  async function toggleCloud(value: boolean) {
    updateSettings({ iCloudSync: value });
    if (value) await syncNow();
  }

  async function restore() {
    try {
      const backup = await pickBackup();
      if (!backup) return;
      const added = await restoreBackup(backup);
      Alert.alert('Backup restored', added > 0 ? `Added ${added} from the backup.` : 'Everything in the backup was already here.');
    } catch (error) {
      Alert.alert('Could not restore', (error as Error).message);
    }
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
          label="Remind me every day of the final week"
          detail="For trials you really can’t afford to miss. Stops as soon as you decide."
          value={settings.persistentReminders}
          onValueChange={(value) => change({ persistentReminders: value })}
        />
        <Divider />
        <ToggleRow
          label="Check I wasn’t charged"
          detail="The day after a cancelled trial would have renewed."
          value={settings.chargeCheckReminder}
          onValueChange={(value) => change({ chargeCheckReminder: value })}
        />
        <Divider />
        <ToggleRow
          label="Before subscriptions renew"
          detail="3 days before monthly payments, a week before yearly ones."
          value={settings.renewalReminders}
          onValueChange={(value) => change({ renewalReminders: value })}
        />
        <Divider />
        <ToggleRow
          label="Lock Screen countdown"
          detail="Starts in the final 8 hours when you open the app or tap a reminder."
          value={settings.autoLiveActivity}
          onValueChange={(value) => change({ autoLiveActivity: value })}
        />
      </Section>

      <Section
        title="Sync and backup"
        footer={
          cloudReady
            ? 'iCloud sync keeps your iPhone and iPad in step through your own iCloud account. We never see it.'
            : 'Sign in to iCloud in the Settings app to sync between your devices.'
        }>
        <ToggleRow
          label="Sync with iCloud"
          value={settings.iCloudSync && cloudReady}
          onValueChange={toggleCloud}
          disabled={!cloudReady}
        />
        <Divider />
        <LinkRow label="Export as a spreadsheet (CSV)" onPress={() => exportCsv(trials)} />
        <Divider />
        <LinkRow label="Back up to a file" onPress={() => exportBackup(trials, getDeletedIds())} />
        <Divider />
        <LinkRow label="Restore from a backup" onPress={restore} />
      </Section>

      <Section title="Security">
        <ToggleRow
          label="Require Face ID"
          detail="Ask for Face ID or your passcode when Trial Guardian opens."
          value={settings.appLock}
          onValueChange={toggleLock}
        />
      </Section>

      <Section title="Privacy">
        <View style={styles.row}>
          <ThemedText style={styles.flex}>Reading method</ThemedText>
          <ThemedText themeColor="textSecondary">{modelReady ? 'Apple Intelligence' : 'Built-in rules'}</ThemedText>
        </View>
        <Divider />
        <ThemedText type="small" themeColor="textSecondary" style={styles.row}>
          {settings.iCloudSync
            ? 'Trials are stored on this iPhone and in your own iCloud account. '
            : 'Trials are stored only on this iPhone. '}
          There is no account, no tracking and no access to your email or bank.
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
  disabled,
}: {
  label: string;
  detail?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
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
      <Switch value={value} onValueChange={onValueChange} disabled={disabled} trackColor={{ true: theme.accent }} />
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
