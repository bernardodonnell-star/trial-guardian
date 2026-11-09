import { type ReactNode } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View, type TextProps, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabInset, MaxContentWidth, Radius, Spacing, Tones, type Tone } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

export function Screen({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[
        styles.screen,
        { paddingTop: insets.top + Spacing.three + WebTabInset, paddingBottom: insets.bottom + BottomTabInset + Spacing.four },
      ]}>
      <View style={styles.inner}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
          {title}
        </Text>
        {subtitle ? <Small>{subtitle}</Small> : null}
        <View style={{ gap: Spacing.three, marginTop: Spacing.two }}>{children}</View>
      </View>
    </ScrollView>
  );
}

export function Card({ children, tone, style }: { children: ReactNode; tone?: Tone; style?: ViewStyle }) {
  const theme = useTheme();
  const bg = useToneColors(tone)?.[0] ?? theme.backgroundElement;
  return <View style={[styles.card, { backgroundColor: bg }, style]}>{children}</View>;
}

export function Heading(props: TextProps) {
  const theme = useTheme();
  return <Text {...props} style={[styles.heading, { color: theme.text }, props.style]} />;
}

export function Body(props: TextProps) {
  const theme = useTheme();
  return <Text {...props} style={[styles.body, { color: theme.text }, props.style]} />;
}

export function Small(props: TextProps) {
  const theme = useTheme();
  return <Text {...props} style={[styles.small, { color: theme.textSecondary }, props.style]} />;
}

export function Label(props: TextProps) {
  const theme = useTheme();
  return <Text {...props} style={[styles.label, { color: theme.textSecondary }, props.style]} />;
}

export function Badge({ tone, children, dashed }: { tone: Tone; children: string; dashed?: boolean }) {
  const [bg, fg] = useToneColors(tone)!;
  return (
    <View style={[styles.badge, { backgroundColor: bg }, dashed && { borderWidth: 1, borderStyle: 'dashed', borderColor: fg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{children.toUpperCase()}</Text>
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export function Button({ title, onPress, secondary }: { title: string; onPress: () => void; secondary?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: secondary ? theme.backgroundSelected : theme.accent, opacity: pressed ? 0.75 : 1 },
      ]}>
      <Text style={[styles.buttonText, { color: secondary ? theme.text : theme.onAccent }]}>{title}</Text>
    </Pressable>
  );
}

export function CallButton({ phone, label = 'Call' }: { phone: string; label?: string }) {
  return <Button secondary title={label} onPress={() => Linking.openURL(`tel:${phone.replace(/[^+\d]/g, '')}`)} />;
}

// On web the tab bar sits at the top of the page.
const WebTabInset = Platform.OS === 'web' ? 64 : 0;

function useToneColors(tone?: Tone): readonly [string, string] | undefined {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return tone ? Tones[tone][scheme] : undefined;
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: Spacing.three, alignItems: 'center' },
  inner: { width: '100%', maxWidth: MaxContentWidth },
  title: { fontSize: 34, lineHeight: 40, fontWeight: '700' },
  card: { borderRadius: Radius, padding: Spacing.three, gap: Spacing.two },
  heading: { fontSize: 17, lineHeight: 23, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 21 },
  small: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' },
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  button: {
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Platform.select({ android: 22, default: 12 }),
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  buttonText: { fontSize: 15, fontWeight: '600' },
});
