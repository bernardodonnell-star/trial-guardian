import { useEffect, useMemo, useState } from 'react';

import { SAMPLE_TODAY, sampleForecast, sampleTypical } from '@/data/sample-weather';
import type { Stop } from '@/lib/types';
import { dailyFromMetNo, weatherForStop, type DayForecast, type MetResponse, type StopWeather } from '@/lib/weather';

// MET Norway asks every client to identify itself. Replace the contact before release.
// At scale this call moves behind our own Supabase cache, as MET Norway's terms require.
const USER_AGENT = 'Attache/0.1 (support@attache.example)';
const TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, { at: number; days: DayForecast[] }>();

async function fetchForecast(stop: Stop): Promise<DayForecast[]> {
  const lat = stop.lat!.toFixed(2);
  const lon = stop.lon!.toFixed(2);
  const key = `${lat},${lon}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.days;
  const res = await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!res.ok) throw new Error(`MET Norway ${res.status}`);
  const days = dailyFromMetNo((await res.json()) as MetResponse, stop.timeZone);
  cache.set(key, { at: Date.now(), days });
  return days;
}

export interface StopWeatherState {
  weather?: StopWeather;
  error?: string;
}

/** Forecast for one stop. The sample trip uses sample weather; real trips fetch live. */
export function useStopWeather(stop: Stop, opts: { sample: boolean }): StopWeatherState {
  // What can be known without a network call: sample data, or "too early" for a far-off stop.
  const initial = useMemo<StopWeather | undefined>(() => {
    if (opts.sample) return weatherForStop(stop, sampleForecast[stop.id], SAMPLE_TODAY, sampleTypical[stop.id]);
    const w = weatherForStop(stop, undefined, new Date());
    return w.kind === 'too-early' ? w : undefined;
  }, [stop, opts.sample]);

  const [live, setLive] = useState<StopWeatherState>({});
  const needsFetch = !initial && stop.lat !== undefined && stop.lon !== undefined;

  useEffect(() => {
    if (!needsFetch) return;
    let active = true;
    fetchForecast(stop)
      .then((days) => active && setLive({ weather: weatherForStop(stop, days, new Date()) }))
      .catch(() => active && setLive({ error: 'Forecast unavailable right now. Try again when online.' }));
    return () => {
      active = false;
    };
  }, [stop, needsFetch]);

  return initial ? { weather: initial } : live;
}
