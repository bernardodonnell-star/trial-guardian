import { useState } from 'react';
import { TextInput } from 'react-native';

import { Body, Button, Card, Label, Screen, Small } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { allowanceState, spendMessage, type Usage } from '@/lib/allowance';

interface Turn {
  q: string;
  a: string;
}

export default function AskScreen() {
  const theme = useTheme();
  const [usage, setUsage] = useState<Usage>({ plan: 'monthly', usedThisMonth: 37, topUpRemaining: 0 });
  const [text, setText] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const state = allowanceState(usage);

  function send() {
    const q = text.trim();
    if (!q) return;
    setTurns([
      ...turns,
      {
        q,
        a: 'The assistant is not connected yet. Once the server and API key are set up, it will answer from your trip, brief and official sources, and show where each fact came from.',
      },
    ]);
    setUsage(spendMessage(usage));
    setText('');
  }

  return (
    <Screen title="Ask" subtitle="An AI assistant that knows your trip. It shows its sources and says when it is unsure.">
      <Card tone={state.warn ? 'warning' : undefined}>
        <Label>Messages</Label>
        <Body>{state.label}</Body>
        <Small>
          Each question you ask counts as one message, with its answer. Alerts, your brief, Help and guides never count.
        </Small>
      </Card>

      {turns.map((t, i) => (
        <Card key={i}>
          <Body style={{ fontWeight: '600' }}>{t.q}</Body>
          <Body>{t.a}</Body>
        </Card>
      ))}

      <Card>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Do I need a visa to change planes in Dubai?"
          placeholderTextColor={theme.textSecondary}
          multiline
          accessibilityLabel="Your question"
          style={{ color: theme.text, fontSize: 16, minHeight: 60 }}
        />
        <Button title="Ask" onPress={send} />
      </Card>
    </Screen>
  );
}
