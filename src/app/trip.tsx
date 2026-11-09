import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Body, CallButton, Card, Heading, Label, Row, Screen, Small } from '@/components/ui';
import { WeatherCard } from '@/components/weather-card';
import { sampleTrip } from '@/data/sample-trip';
import { localDateTime, localDay } from '@/lib/format';
import type { Booking } from '@/lib/types';

const KIND_LABEL: Record<Booking['kind'], string> = {
  flight: 'Flight',
  hotel: 'Stay',
  car: 'Car',
  rail: 'Train',
  restaurant: 'Restaurant',
  meeting: 'Meeting',
  other: 'Booking',
};

export default function TripScreen() {
  return (
    <Screen title="Itinerary" subtitle="Tap a booking for references and phone numbers">
      {sampleTrip.stops.map((stop) => (
        <View key={stop.id} style={{ gap: 8 }}>
          <Label>
            {stop.city} · {localDay(stop.arrive)} to {localDay(stop.depart)}
          </Label>
          <WeatherCard stop={stop} sample />
          {stop.bookings.map((b) => (
            <BookingCard key={b.id} booking={b} />
          ))}
        </View>
      ))}
    </Screen>
  );
}

function BookingCard({ booking: b }: { booking: Booking }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)}>
        <Row>
          <View style={{ flex: 1 }}>
            <Small>{KIND_LABEL[b.kind]}</Small>
            <Heading>{b.title}</Heading>
            <Small>{localDateTime(b.start)}</Small>
          </View>
          <Small>{open ? 'Hide' : 'Details'}</Small>
        </Row>
      </Pressable>
      {open ? (
        <View style={{ gap: 6 }}>
          {b.reference ? <Detail label="Reference" value={b.reference} /> : null}
          {b.place ? <Detail label="Where" value={b.place} /> : null}
          {b.end ? <Detail label="Until" value={localDateTime(b.end)} /> : null}
          {b.details?.map((d) => <Detail key={d.label} label={d.label} value={d.value} />)}
          {b.contacts?.map((c) => (
            <Row key={c.phone}>
              <View style={{ flex: 1 }}>
                <Body>{c.label}</Body>
                <Small>
                  {c.phone}
                  {c.hours ? ` · ${c.hours}` : ''}
                </Small>
              </View>
              <CallButton phone={c.phone} />
            </Row>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <Row style={{ alignItems: 'flex-start' }}>
      <Small style={{ width: 96 }}>{label}</Small>
      <Body style={{ flex: 1 }}>{value}</Body>
    </Row>
  );
}
