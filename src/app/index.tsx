import { router } from 'expo-router';

import { AlertCard } from '@/components/alert-card';
import { WeatherCard } from '@/components/weather-card';
import { Badge, Body, Button, Card, Heading, Label, Row, Screen, Small } from '@/components/ui';
import { sampleAlerts, sampleTrip } from '@/data/sample-trip';
import { localDay, localTime } from '@/lib/format';

const departure = '2026-11-25T17:40:00+01:00'; // SAMPLE: next journey

export default function TodayScreen() {
  const trip = sampleTrip;
  const first = trip.stops[0];
  const last = trip.stops[trip.stops.length - 1];
  const needsCheck = trip.stops.flatMap((s) => s.bookings.filter((b) => b.needsCheck?.length));
  const top = sampleAlerts.find((a) => a.severity === 'warning' || a.severity === 'critical');

  return (
    <Screen title={trip.title} subtitle={`${localDay(first.arrive)} to ${localDay(last.depart)} · ${trip.stops.length} stops · Irish passport`}>
      <Card tone="ok">
        <Row>
          <Heading>Next: Frankfurt to Geneva</Heading>
          <Badge tone="ok">On track</Badge>
        </Row>
        <Body>
          LX 1073 leaves Terminal 1 on {localDay(departure)} at {localTime(departure)}. Leave the hotel by 14:45.
        </Body>
        <Button title="Open the trip" onPress={() => router.navigate('/trip')} />
      </Card>

      {top ? <AlertCard alert={top} /> : null}

      <WeatherCard stop={trip.stops[1]} sample compact />

      {needsCheck.length ? (
        <Card tone="warning">
          <Label>Needs a check</Label>
          {needsCheck.map((b) => (
            <Body key={b.id}>
              {b.title}: {b.needsCheck!.join('; ')}
            </Body>
          ))}
        </Card>
      ) : null}

      <Card>
        <Label>Before you go</Label>
        <Body>Australia: eVisitor visa approved for your Irish passport.</Body>
        <Body>Dubai transit: no visa needed, same terminal.</Body>
        <Body>Offline pack downloads by itself 48 hours before each flight.</Body>
        <Small>Sample data. Readiness checks connect to the checked database in the next stage.</Small>
      </Card>
    </Screen>
  );
}
