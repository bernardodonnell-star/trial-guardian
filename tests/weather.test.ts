/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { dailyFromMetNo, describe, notesFor, weatherForStop, type MetResponse } from '../src/lib/weather.ts';

// Synthetic MET Norway response for Geneva: hourly for 48 h, then 6-hourly.
function fixture(): MetResponse {
  const ts: MetResponse['properties']['timeseries'] = [];
  const start = Date.parse('2026-11-25T00:00:00Z');
  for (let h = 0; h < 48; h++) {
    const t = new Date(start + h * 3_600_000);
    const localHour = (t.getUTCHours() + 1) % 24;
    ts.push({
      time: t.toISOString(),
      data: {
        instant: { details: { air_temperature: 2 + 6 * Math.sin(((localHour - 8) / 24) * Math.PI * 2) * 0.5 + 3, wind_speed: 4 } },
        next_1_hours: { summary: { symbol_code: h >= 24 && h < 30 ? 'lightrain' : 'partlycloudy_day' }, details: { precipitation_amount: h >= 24 && h < 30 ? 0.5 : 0 } },
        next_6_hours: { summary: { symbol_code: 'cloudy' }, details: { precipitation_amount: 9 } }, // must not be added
      },
    });
  }
  for (let h = 48; h < 96; h += 6) {
    ts.push({
      time: new Date(start + h * 3_600_000).toISOString(),
      data: {
        instant: { details: { air_temperature: -1 + (h % 24) / 6, wind_speed: 15 } },
        next_6_hours: { summary: { symbol_code: 'snowshowers_day' }, details: { precipitation_amount: 1.5 } },
      },
    });
  }
  return { properties: { timeseries: ts } };
}

test('groups by local day and does not double count rain', () => {
  const days = dailyFromMetNo(fixture(), 'Europe/Zurich');
  const thu = days.find((d) => d.date === '2026-11-26')!;
  assert.equal(thu.precipMm, 3); // six hours of 0.5 mm, not the 6-hour totals
  assert.equal(thu.summary, 'Light rain');
  const wed = days.find((d) => d.date === '2026-11-25')!;
  assert.equal(wed.precipMm, 0);
  assert.equal(wed.summary, 'Partly cloudy');
});

test('6-hourly steps are summed once each and wind is converted to km/h', () => {
  const days = dailyFromMetNo(fixture(), 'Europe/Zurich');
  const sat = days.find((d) => d.date === '2026-11-28')!;
  assert.equal(sat.summary, 'Snow showers');
  assert.equal(sat.windMaxKmh, 54);
  assert.ok(sat.precipMm > 0 && sat.precipMm <= 6);
});

test('plain words for symbol codes', () => {
  assert.equal(describe('clearsky_day'), 'Sunny');
  assert.equal(describe('rainshowers_night'), 'Showers');
  assert.equal(describe('heavyrainandthunder'), 'Thunderstorms');
  assert.equal(describe('fog'), 'Fog');
});

const geneva = { arrive: '2026-11-25T18:55:00+01:00', depart: '2026-11-27T14:30:00+01:00', timeZone: 'Europe/Zurich' };

test('too early: says when the forecast will appear and shows typical weather', () => {
  const w = weatherForStop(geneva, undefined, new Date('2026-11-09T12:00:00Z'), { min: 1, max: 7, rainyDays: 'about 1 day in 3' });
  assert.equal(w.kind, 'too-early');
  if (w.kind !== 'too-early') return;
  assert.equal(w.availableFrom, '2026-11-17');
  assert.equal(w.typical?.max, 7);
});

test('within range: only the days of the stay, with notes', () => {
  const days = dailyFromMetNo(fixture(), 'Europe/Zurich');
  const w = weatherForStop(geneva, days, new Date('2026-11-24T12:00:00Z'));
  assert.equal(w.kind, 'forecast');
  if (w.kind !== 'forecast') return;
  assert.deepEqual(w.days.map((d) => d.date), ['2026-11-25', '2026-11-26', '2026-11-27']);
  assert.equal(w.complete, true);
  assert.match(w.notes.join(' | '), /Rain on 2 of 3 days/);
});

test('notes flag freezing, heat and wind', () => {
  const n = notesFor([
    { date: '2026-01-01', min: -3, max: 2, precipMm: 0, windMaxKmh: 60, summary: 'Snow' },
    { date: '2026-01-02', min: 25, max: 36, precipMm: 0, windMaxKmh: 10, summary: 'Sunny' },
  ]).join(' | ');
  assert.match(n, /Below freezing/);
  assert.match(n, /Very hot/);
  assert.match(n, /Strong wind/);
  assert.match(n, /Snow or sleet/);
});
