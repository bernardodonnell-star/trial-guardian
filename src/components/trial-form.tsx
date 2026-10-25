import DateTimePicker from '@react-native-community/datetimepicker';
import { getLocales } from 'expo-localization';
import { useState } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Divider, Section } from '@/components/section';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { addDays, fromDateKey, startOfDay, toDateKey } from '@/lib/dates';
import type { BillingPeriod, ParsedTrial } from '@/lib/parse/types';
import { describePriceRise, findPriceRise } from '@/lib/price-watch';
import { useTrials, type PricePoint, type TrialDraft, type TrialStatus } from '@/lib/trials';
import { useTheme } from '@/hooks/use-theme';

const DONE_BAR_ID = 'trial-form-done';
const PERIODS: { value: BillingPeriod; label: string }[] = [
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
  { value: 'year', label: 'Yearly' },
];

type TrialFormProps = {
  initial: Partial<ParsedTrial> & { notes?: string; status?: TrialStatus };
  /** Set when editing, so the price check ignores the trial itself. */
  trialId?: string;
  priceHistory?: PricePoint[];
  source: TrialDraft['source'];
  /** Shown above the form after reading a shared email or screenshot. */
  banner?: string;
  submitLabel: string;
  onSubmit: (draft: TrialDraft) => Promise<void> | void;
};

export function TrialForm({ initial, trialId, priceHistory, source, banner, submitLabel, onSubmit }: TrialFormProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const allTrials = useTrials();
  const read = (value: unknown) => value !== null && value !== undefined && value !== '';

  const [service, setService] = useState(initial.service ?? '');
  const [price, setPrice] = useState(initial.price != null ? String(initial.price) : '');
  const [currency, setCurrency] = useState(initial.currency ?? defaultCurrency());
  const [period, setPeriod] = useState<BillingPeriod | null>(initial.billingPeriod ?? 'month');
  const [chargeDate, setChargeDate] = useState<Date>(
    initial.chargeDate ? fromDateKey(initial.chargeDate) : addDays(startOfDay(new Date()), 7)
  );
  const [cancelUrl, setCancelUrl] = useState(initial.cancelUrl ?? '');
  const [notes, setNotes] = useState(initial.notes ?? '');
  const [appStore, setAppStore] = useState(initial.billedByAppStore ?? false);
  // Editing a cancelled trial keeps it cancelled; otherwise choose between a trial and a paid subscription.
  const [kind, setKind] = useState<'trial' | 'subscription'>(initial.status === 'kept' ? 'subscription' : 'trial');
  const isSubscription = kind === 'subscription';
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const missing = {
    service: banner !== undefined && !read(initial.service),
    price: banner !== undefined && !read(initial.price),
    date: banner !== undefined && !read(initial.chargeDate),
  };

  async function submit() {
    Keyboard.dismiss();
    const name = service.trim();
    if (!name) {
      setError('Add the name of the service.');
      return;
    }
    const amount = price.trim() ? parseFloat(price.replace(',', '.')) : null;
    if (amount !== null && (!isFinite(amount) || amount < 0)) {
      setError('The price should be a number, like 9.99.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSubmit({
        service: name,
        price: amount,
        currency: currency.trim().toUpperCase() || null,
        billingPeriod: period,
        chargeDate: toDateKey(chargeDate),
        cancelUrl: cancelUrl.trim() || null,
        billedByAppStore: appStore,
        notes: notes.trim(),
        source,
        status: isSubscription ? 'kept' : initial.status === 'cancelled' ? 'cancelled' : 'active',
      });
    } finally {
      setSaving(false);
    }
  }

  const amount = price.trim() ? parseFloat(price.replace(',', '.')) : null;
  const rise =
    amount !== null && isFinite(amount) && service.trim()
      ? findPriceRise(
          { id: trialId ?? '', service: service.trim(), price: amount, currency: currency.trim().toUpperCase() || null, billingPeriod: period, priceHistory },
          allTrials
        )
      : null;

  const fieldProps: Partial<TextInputProps> = {
    placeholderTextColor: theme.textSecondary,
    style: [styles.input, { color: theme.text }],
    inputAccessoryViewID: DONE_BAR_ID,
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled">
        {banner ? (
          <View style={[styles.banner, { backgroundColor: theme.successSoft }]}>
            <ThemedText type="small" style={{ color: theme.success }}>
              {banner}
            </ThemedText>
          </View>
        ) : null}

        <View style={[styles.segmentRow, styles.kindRow]}>
          {(['trial', 'subscription'] as const).map((value) => {
            const selected = kind === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setKind(value)}
                style={({ pressed }) => [
                  styles.segment,
                  { backgroundColor: selected ? theme.accent : theme.backgroundSelected, opacity: pressed ? 0.7 : 1 },
                ]}>
                <ThemedText type="smallBold" style={{ color: selected ? '#FFFFFF' : theme.text }}>
                  {value === 'trial' ? 'Free trial' : 'Paid subscription'}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <Section title={isSubscription ? 'Subscription' : 'Trial'}>
          <Field label="Service" flagged={missing.service}>
            <TextInput {...fieldProps} value={service} onChangeText={setService} placeholder="Netflix" autoCapitalize="words" returnKeyType="next" />
          </Field>
          <Divider />
          <Field label={isSubscription ? 'Next payment' : 'Charge date'} flagged={missing.date}>
            {Platform.OS === 'ios' ? (
              <DateTimePicker
                value={chargeDate}
                mode="date"
                display="compact"
                minimumDate={startOfDay(new Date())}
                onChange={(_, date) => date && setChargeDate(startOfDay(date))}
                accentColor={theme.accent}
              />
            ) : (
              <Pressable onPress={() => setShowAndroidPicker(true)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                <ThemedText style={{ color: theme.accent }}>{chargeDate.toLocaleDateString()}</ThemedText>
              </Pressable>
            )}
          </Field>
          <Divider />
          <Field label="App Store">
            <Switch value={appStore} onValueChange={setAppStore} trackColor={{ true: theme.accent }} />
          </Field>
        </Section>
        {showAndroidPicker ? (
          <DateTimePicker
            value={chargeDate}
            mode="date"
            minimumDate={startOfDay(new Date())}
            onChange={(_, date) => {
              setShowAndroidPicker(false);
              if (date) setChargeDate(startOfDay(date));
            }}
          />
        ) : null}
        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          {isSubscription
            ? 'You’ll get a reminder a few days before each renewal, so you can decide if it is still worth it.'
            : appStore
              ? 'The day the first payment is taken. Apple needs cancelling 24 hours before, so you’ll be reminded a day earlier.'
              : 'The day the first payment is taken. You’ll be reminded before it starts.'}
        </ThemedText>

        <Section title={isSubscription ? 'Price' : 'Price after the trial'}>
          <Field label="Price" flagged={missing.price}>
            <TextInput {...fieldProps} value={price} onChangeText={setPrice} placeholder="9.99" keyboardType="decimal-pad" />
          </Field>
          <Divider />
          <Field label="Currency">
            <TextInput {...fieldProps} value={currency} onChangeText={setCurrency} placeholder="GBP" autoCapitalize="characters" maxLength={3} />
          </Field>
          <Divider />
          <View style={styles.segmentRow}>
            {PERIODS.map((p) => {
              const selected = period === p.value;
              return (
                <Pressable
                  key={p.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setPeriod(selected ? null : p.value)}
                  style={({ pressed }) => [
                    styles.segment,
                    { backgroundColor: selected ? theme.accent : theme.backgroundSelected, opacity: pressed ? 0.7 : 1 },
                  ]}>
                  <ThemedText type="smallBold" style={{ color: selected ? '#FFFFFF' : theme.text }}>
                    {p.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </Section>

        {rise ? (
          <View style={[styles.banner, { backgroundColor: theme.accentSoft }]}>
            <ThemedText type="smallBold" style={{ color: theme.accent }}>
              {`Price rise: ${describePriceRise(rise)}`}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.accent }}>
              {`You paid less for ${service.trim()} before (${rise.since}). Worth checking for a cheaper plan or a loyalty offer before you pay.`}
            </ThemedText>
          </View>
        ) : null}

        <Section title="Extras" footer="A cancel link from the email makes cancelling one tap away.">
          <Field label="Cancel link">
            <TextInput {...fieldProps} value={cancelUrl} onChangeText={setCancelUrl} placeholder="https://" autoCapitalize="none" autoCorrect={false} keyboardType="url" />
          </Field>
          <Divider />
          <Field label="Notes">
            <TextInput {...fieldProps} value={notes} onChangeText={setNotes} placeholder="Optional" multiline />
          </Field>
        </Section>

        {error ? (
          <ThemedText type="small" style={[styles.hint, { color: theme.danger }]}>
            {error}
          </ThemedText>
        ) : null}
        <Button title={submitLabel} onPress={submit} loading={saving} />
      </ScrollView>

      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={DONE_BAR_ID}>
          <View style={[styles.doneBar, { backgroundColor: theme.backgroundSelected, borderColor: theme.border }]}>
            <Button title="Done" variant="plain" onPress={() => Keyboard.dismiss()} style={styles.doneButton} />
          </View>
        </InputAccessoryView>
      ) : null}
    </KeyboardAvoidingView>
  );
}

function Field({ label, flagged, children }: { label: string; flagged?: boolean; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <View style={styles.labelColumn}>
        <ThemedText style={styles.label}>{label}</ThemedText>
        {flagged ? (
          <ThemedText type="small" style={{ color: theme.accent }}>
            Not found, please check
          </ThemedText>
        ) : null}
      </View>
      <View style={styles.valueColumn}>{children}</View>
    </View>
  );
}

function defaultCurrency(): string {
  return getLocales()[0]?.currencyCode ?? 'USD';
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three },
  banner: { padding: Spacing.three, borderRadius: 14 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.three,
  },
  labelColumn: { width: 120 },
  label: { fontSize: 16 },
  valueColumn: { flex: 1, alignItems: 'flex-end' },
  input: { fontSize: 16, textAlign: 'right', width: '100%', paddingVertical: 6 },
  hint: { marginHorizontal: Spacing.three, marginTop: -Spacing.two },
  segmentRow: { flexDirection: 'row', gap: Spacing.two, padding: Spacing.three },
  kindRow: { paddingHorizontal: 0, paddingVertical: 0 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  doneBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  doneButton: { minHeight: 44 },
});
