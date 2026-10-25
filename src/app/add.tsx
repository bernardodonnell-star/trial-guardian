import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ImportFlow, type ImportJob } from '@/components/import-flow';
import { Divider, Section } from '@/components/section';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function AddScreen() {
  const theme = useTheme();
  const [job, setJob] = useState<ImportJob | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (job) {
    return (
      <View style={[styles.flex, { backgroundColor: theme.background }]}>
        <ImportFlow job={job} />
      </View>
    );
  }

  async function pasteText() {
    const text = await Clipboard.getStringAsync();
    if (!text.trim()) {
      setMessage('Nothing is copied yet. Copy the text of the sign-up email first, then try again.');
      return;
    }
    setJob({ kind: 'text', text });
  }

  async function pickScreenshot() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (!result.canceled && result.assets[0]) setJob({ kind: 'image', uri: result.assets[0].uri });
  }

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <ThemedText themeColor="textSecondary" style={styles.intro}>
        The quickest way is the share sheet: in Mail or Photos tap Share, then Trial Guardian. You can also:
      </ThemedText>
      <Section>
        <Option icon="doc.on.clipboard" title="Paste copied text" detail="From a sign-up email or confirmation page" onPress={pasteText} />
        <Divider />
        <Option icon="photo" title="Choose a screenshot" detail="Of the trial offer or the App Store receipt" onPress={pickScreenshot} />
        <Divider />
        <Option icon="square.and.pencil" title="Type it in" detail="Service, price and charge date" onPress={() => setJob({ kind: 'manual' })} />
      </Section>
      {message ? (
        <ThemedText type="small" style={[styles.intro, { color: theme.accent }]}>
          {message}
        </ThemedText>
      ) : null}
      <ThemedText type="small" themeColor="textSecondary" style={styles.intro}>
        Everything is read on your iPhone. Trial Guardian has no account and never sees your inbox.
      </ThemedText>
    </ScrollView>
  );
}

function Option({
  icon,
  title,
  detail,
  onPress,
}: {
  icon: SymbolViewProps['name'];
  title: string;
  detail: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.option, { backgroundColor: pressed ? theme.backgroundSelected : 'transparent' }]}>
      <View style={[styles.optionIcon, { backgroundColor: theme.accentSoft }]}>
        <SymbolView name={icon} tintColor={theme.accent} size={20} fallback={null} />
      </View>
      <View style={styles.flex}>
        <ThemedText style={styles.optionTitle}>{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {detail}
        </ThemedText>
      </View>
      <SymbolView name="chevron.right" tintColor={theme.textSecondary} size={14} fallback={null} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three },
  intro: { marginHorizontal: Spacing.one },
  option: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three },
  optionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { fontSize: 16, fontWeight: '600' },
});
