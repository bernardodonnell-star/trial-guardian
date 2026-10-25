import { router } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ImportFlow, type ImportJob } from '@/components/import-flow';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Opened when someone shares an email, link or screenshot to the app. */
export default function ImportScreen() {
  const theme = useTheme();
  const { shareIntent, resetShareIntent } = useShareIntentContext();

  const job = useMemo<ImportJob | null>(() => {
    const image = shareIntent.files?.find((f) => f.mimeType?.startsWith('image/'));
    if (image) return { kind: 'image', uri: image.path };
    const text = [shareIntent.meta?.title, shareIntent.text].filter(Boolean).join('\n');
    if (text.trim()) return { kind: 'text', text };
    return null;
  }, [shareIntent]);

  if (!job) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ThemedText style={styles.title}>Nothing to read</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
          Share the text of a sign-up email, or a screenshot of the trial offer.
        </ThemedText>
        <Button title="Add it by hand" onPress={() => router.replace('/add')} />
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <ImportFlow job={job} onDone={resetShareIntent} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.three },
  title: { fontSize: 20, fontWeight: '700' },
  text: { textAlign: 'center' },
});
