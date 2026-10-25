import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type ButtonProps = Omit<PressableProps, 'children'> & {
  title: string;
  variant?: 'primary' | 'secondary' | 'destructive' | 'plain';
  loading?: boolean;
};

export function Button({ title, variant = 'primary', loading, disabled, style, ...rest }: ButtonProps) {
  const theme = useTheme();
  const background = {
    primary: theme.accent,
    secondary: theme.backgroundSelected,
    destructive: 'transparent',
    plain: 'transparent',
  }[variant];
  const color = {
    primary: '#FFFFFF',
    secondary: theme.text,
    destructive: theme.danger,
    plain: theme.accent,
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={(state) => [
        styles.base,
        { backgroundColor: background, opacity: disabled ? 0.45 : state.pressed ? 0.7 : 1 },
        state.pressed && styles.pressed,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text style={[styles.title, { color }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
});
