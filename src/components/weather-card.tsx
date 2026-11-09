import { View } from 'react-native';

import { Body, Card, Label, Row, Small } from '@/components/ui';
import { useStopWeather } from '@/hooks/use-stop-weather';
import { localDay } from '@/lib/format';
import type { Stop } from '@/lib/types';

export function WeatherCard({ stop, sample, compact }: { stop: Stop; sample: boolean; compact?: boolean }) {
  const { weather, error } = useStopWeather(stop, { sample });

  return (
    <Card>
      <Row>
        <Label>Weather · {stop.city}</Label>
        {sample ? <Small>Sample forecast</Small> : null}
      </Row>

      {error ? <Body>{error}</Body> : null}

      {weather?.kind === 'too-early' ? (
        <View style={{ gap: 4 }}>
          <Body>Daily forecast from {localDay(weather.availableFrom)}.</Body>
          {weather.typical ? (
            <Small>
              Typical for the time of year: {weather.typical.max}° by day, {weather.typical.min}° at night, {weather.typical.rainyDays}.
            </Small>
          ) : null}
        </View>
      ) : null}

      {weather?.kind === 'forecast' ? (
        <View style={{ gap: 6 }}>
          {(compact ? weather.days.slice(0, 3) : weather.days).map((d) => (
            <Row key={d.date}>
              <Body style={{ width: 92, fontWeight: '600' }}>{localDay(d.date)}</Body>
              <Body style={{ flex: 1 }}>{d.summary}</Body>
              <Body style={{ width: 70, textAlign: 'right' }}>
                {d.max}° / {d.min}°
              </Body>
            </Row>
          ))}
          {weather.notes.map((n) => (
            <Small key={n}>{n}</Small>
          ))}
          {!weather.complete ? <Small>Later days appear as they come into range (about 9 days ahead).</Small> : null}
        </View>
      ) : null}

      <Small>Forecast: MET Norway</Small>
    </Card>
  );
}
