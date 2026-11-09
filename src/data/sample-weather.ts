import type { DayForecast, Typical } from '@/lib/weather';

// SAMPLE weather for the sample trip, shown as if today were Sun 22 Nov 2026,
// so that every stop is inside or near the 9-day forecast range.
export const SAMPLE_TODAY = new Date('2026-11-22T09:00:00+01:00');

export const sampleForecast: Record<string, DayForecast[]> = {
  fra: [
    { date: '2026-11-23', min: 1, max: 6, precipMm: 0.2, windMaxKmh: 18, summary: 'Cloudy' },
    { date: '2026-11-24', min: -1, max: 5, precipMm: 0, windMaxKmh: 12, summary: 'Fog' },
    { date: '2026-11-25', min: 0, max: 7, precipMm: 2.4, windMaxKmh: 26, summary: 'Light rain' },
  ],
  gva: [
    { date: '2026-11-25', min: 2, max: 8, precipMm: 3.1, windMaxKmh: 22, summary: 'Light rain' },
    { date: '2026-11-26', min: 1, max: 6, precipMm: 0.4, windMaxKmh: 55, summary: 'Cloudy' },
    { date: '2026-11-27', min: -1, max: 5, precipMm: 0, windMaxKmh: 20, summary: 'Mostly sunny' },
  ],
  syd: [
    { date: '2026-11-28', min: 18, max: 24, precipMm: 0, windMaxKmh: 24, summary: 'Mostly sunny' },
    { date: '2026-11-29', min: 19, max: 27, precipMm: 0, windMaxKmh: 20, summary: 'Sunny' },
    { date: '2026-11-30', min: 20, max: 31, precipMm: 6.2, windMaxKmh: 30, summary: 'Thunderstorms' },
  ],
};

/** Typical weather for the time of year. SAMPLE values; in production from a climate-normals table. */
export const sampleTypical: Record<string, Typical> = {
  fra: { min: 1, max: 6, rainyDays: 'rain on about 1 day in 2' },
  gva: { min: 1, max: 7, rainyDays: 'rain on about 1 day in 3' },
  syd: { min: 18, max: 25, rainyDays: 'showers on about 1 day in 3' },
};
