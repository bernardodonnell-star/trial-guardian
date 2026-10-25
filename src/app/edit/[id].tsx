import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TrialForm } from '@/components/trial-form';
import { editTrial } from '@/lib/actions';
import { useTrial } from '@/lib/trials';
import { useTheme } from '@/hooks/use-theme';

export default function EditTrialScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const trial = useTrial(id);
  const theme = useTheme();

  if (!trial) {
    return <ThemedText themeColor="textSecondary">This trial was deleted.</ThemedText>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <TrialForm
        initial={trial}
        source={trial.source}
        submitLabel="Save changes"
        onSubmit={async ({ source: _source, ...changes }) => {
          await editTrial(trial.id, changes);
          router.back();
        }}
      />
    </View>
  );
}
