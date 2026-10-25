import { StyleSheet, View, type ViewProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SectionProps = ViewProps & { title?: string; footer?: string };

/** A grouped card in the style of iOS Settings. */
export function Section({ title, footer, children, style, ...rest }: SectionProps) {
  const theme = useTheme();
  return (
    <View style={styles.wrapper}>
      {title ? (
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.title}>
          {title.toUpperCase()}
        </ThemedText>
      ) : null}
      <View
        style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }, style]}
        {...rest}>
        {children}
      </View>
      {footer ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
          {footer}
        </ThemedText>
      ) : null}
    </View>
  );
}

export function Divider() {
  const theme = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.border }]} />;
}

const styles = StyleSheet.create({
  wrapper: { gap: Spacing.two },
  title: { marginLeft: Spacing.three, fontSize: 12, letterSpacing: 0.5 },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  footer: { marginHorizontal: Spacing.three },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: Spacing.three },
});
