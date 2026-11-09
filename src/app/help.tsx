import { View } from 'react-native';

import { Body, CallButton, Card, Label, Row, Screen, Small } from '@/components/ui';
import { emergency, sampleTrip } from '@/data/sample-trip';

// No AI on this screen. Every number comes from the checked database and works offline.
export default function HelpScreen() {
  const stop = sampleTrip.stops[1]; // SAMPLE: assume the traveller is in Geneva
  const numbers = emergency[stop.countryCode] ?? [];
  return (
    <Screen title="Help" subtitle={`${stop.city} · works without a connection`}>
      <Card tone="critical">
        <Label>Emergency</Label>
        {numbers.map((n) => (
          <Row key={n.phone}>
            <View style={{ flex: 1 }}>
              <Body style={{ fontWeight: '600' }}>{n.label}</Body>
              <Small>
                {n.phone}
                {n.note ? ` · ${n.note}` : ''}
              </Small>
            </View>
            <CallButton phone={n.phone} />
          </Row>
        ))}
      </Card>
      <Card>
        <Label>Step-by-step guides</Label>
        <Body>Lost or stolen passport · Medical problem · Crime · Arrest or detention · Earthquake · Storm or flood · Civil unrest · Leaving quickly</Body>
        <Small>Guides follow fixed templates based on official consular guidance. Coming in the next stage.</Small>
      </Card>
      <Small>Sample numbers: every number is verified against official sources before release.</Small>
    </Screen>
  );
}
