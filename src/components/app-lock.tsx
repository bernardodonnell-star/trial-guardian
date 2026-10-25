import * as LocalAuthentication from 'expo-local-authentication';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { getSettings, useSettings } from '@/lib/settings';
import { useTheme } from '@/hooks/use-theme';

/**
 * Covers the app until Face ID (or the passcode) succeeds, when the lock is on. It locks again
 * whenever the app goes to the background, and also hides the content in the app switcher.
 */
export function AppLock({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const { appLock } = useSettings();
  const [locked, setLocked] = useState(() => getSettings().appLock);
  const [hidden, setHidden] = useState(false);
  const authenticating = useRef(false);

  const unlock = useCallback(async () => {
    if (authenticating.current) return;
    authenticating.current = true;
    try {
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock Trial Guardian' });
      if (result.success) setLocked(false);
    } finally {
      authenticating.current = false;
    }
  }, []);

  useEffect(() => {
    if (locked && appLock) unlock();
  }, [locked, appLock, unlock]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (!getSettings().appLock) return;
      // The Face ID sheet itself makes the app inactive, so only hide (not lock) on inactive.
      if (state === 'background') setLocked(true);
      if (!authenticating.current) setHidden(state !== 'active');
    });
    return () => subscription.remove();
  }, []);

  const covered = appLock && (locked || hidden);
  return (
    <View style={styles.flex}>
      {children}
      {covered ? (
        <View style={[StyleSheet.absoluteFill, styles.cover, { backgroundColor: theme.background }]}>
          <SymbolView name="lock.fill" tintColor={theme.accent} size={44} fallback={null} />
          <ThemedText style={styles.title}>Trial Guardian is locked</ThemedText>
          {locked ? <Button title="Unlock" onPress={unlock} /> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  cover: { alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  title: { fontSize: 20, fontWeight: '700' },
});
