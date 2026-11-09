// Weather for each city on a trip.
//
// Source: MET Norway Locationforecast 2.0 (api.met.no). Free, global, about 9 days ahead,
// and commercial use is allowed with attribution and an identifying User-Agent.
// Beyond the forecast range the app shows typical weather for the time of year instead.

export interface DayForecast {
  date: string; // YYYY-MM-DD, local to the city
  min: number; // °C
  max: number; // °C
  precipMm: number;
  windMaxKmh: number;
  summary: string; // plain words, e.g. "Light rain"
}

export interface Typical {
  min: number;
  max: number;
  rainyDays: string; // e.g. "rain on about 1 day in 3"
}

export type StopWeather =
  | { kind: 'forecast'; days: DayForecast[]; notes: string[]; complete: boolean }
  | { kind: 'too-early'; availableFrom: string; typical?: Typical };

/** How far ahead the forecast reaches. */
export const FORECAST_DAYS = 9;

// ---------- Parsing MET Norway compact JSON ----------

interface MetEntry {
  time: string;
  data: {
    instant: { details: { air_temperature?: number; wind_speed?: number } };
    next_1_hours?: { summary: { symbol_code: string }; details?: { precipitation_amount?: number } };
    next_6_hours?: { summary: { symbol_code: string }; details?: { precipitation_amount?: number } };
  };
}

export interface MetResponse {
  properties: { timeseries: MetEntry[] };
}

export function dailyFromMetNo(res: MetResponse, timeZone: string): DayForecast[] {
  const series = res.properties.timeseries;
  const byDay = new Map<string, { temps: number[]; precip: number; wind: number; symbols: string[] }>();

  series.forEach((e, i) => {
    const at = new Date(e.time);
    const date = localDate(at, timeZone);
    const hour = localHour(at, timeZone);
    const d = byDay.get(date) ?? { temps: [], precip: 0, wind: 0, symbols: [] };
    const t = e.data.instant.details.air_temperature;
    if (t !== undefined) d.temps.push(t);
    d.wind = Math.max(d.wind, e.data.instant.details.wind_speed ?? 0);

    // Hourly steps carry next_1_hours; later 6-hourly steps only next_6_hours.
    // Use whichever matches the gap to the next step, so rain is never counted twice.
    const next = series[i + 1];
    const gapH = next ? (Date.parse(next.time) - at.getTime()) / 3_600_000 : 1;
    const block = gapH >= 6 ? e.data.next_6_hours : (e.data.next_1_hours ?? e.data.next_6_hours);
    if (block) {
      if (gapH >= 6 || e.data.next_1_hours) d.precip += block.details?.precipitation_amount ?? 0;
      if (hour >= 6 && hour < 21) d.symbols.push(block.summary.symbol_code);
    }
    byDay.set(date, d);
  });

  return [...byDay.entries()]
    .filter(([, d]) => d.temps.length >= 3) // skip a partial last day
    .map(([date, d]) => ({
      date,
      min: Math.round(Math.min(...d.temps)),
      max: Math.round(Math.max(...d.temps)),
      precipMm: Math.round(d.precip * 10) / 10,
      windMaxKmh: Math.round(d.wind * 3.6),
      summary: describe(worstSymbol(d.symbols)),
    }));
}

// ---------- Fitting the forecast to a stop ----------

export function weatherForStop(
  stop: { arrive: string; depart: string; timeZone: string },
  days: DayForecast[] | undefined,
  today: Date,
  typical?: Typical,
): StopWeather {
  const from = localDate(new Date(stop.arrive), stop.timeZone);
  const to = localDate(new Date(stop.depart), stop.timeZone);
  const horizon = localDate(new Date(today.getTime() + (FORECAST_DAYS - 1) * 86_400_000), stop.timeZone);

  if (from > horizon || !days) {
    const availableFrom = localDate(new Date(Date.parse(stop.arrive) - (FORECAST_DAYS - 1) * 86_400_000), stop.timeZone);
    return { kind: 'too-early', availableFrom, typical };
  }
  const inStay = days.filter((d) => d.date >= from && d.date <= to);
  return { kind: 'forecast', days: inStay, notes: notesFor(inStay), complete: to <= horizon };
}

export function notesFor(days: DayForecast[]): string[] {
  const notes: string[] = [];
  const wet = days.filter((d) => d.precipMm >= 1).length;
  if (wet) notes.push(`Rain on ${wet} of ${days.length} days: pack an umbrella`);
  if (days.some((d) => d.min <= 0)) notes.push('Below freezing at night: warm coat and gloves');
  if (days.some((d) => d.max >= 35)) notes.push('Very hot: drink water, avoid midday sun');
  if (days.some((d) => d.windMaxKmh >= 50)) notes.push('Strong wind on some days: flights and ferries may be delayed');
  if (/snow|sleet/i.test(days.map((d) => d.summary).join(' '))) notes.push('Snow or sleet possible: allow extra travel time');
  return notes;
}

// ---------- Symbols ----------

const SEVERITY: [RegExp, number, string][] = [
  [/thunder/, 9, 'Thunderstorms'],
  [/heavysnow|heavysleet/, 8, 'Heavy snow'],
  [/snow/, 7, 'Snow'],
  [/sleet/, 7, 'Sleet'],
  [/heavyrain/, 6, 'Heavy rain'],
  [/lightrain/, 4, 'Light rain'],
  [/rain/, 5, 'Rain'],
  [/fog/, 3, 'Fog'],
  [/cloudy/, 2, 'Cloudy'],
  [/partlycloudy/, 1, 'Partly cloudy'],
  [/fair/, 0, 'Mostly sunny'],
  [/clearsky/, 0, 'Sunny'],
];

function rank(symbol: string): number {
  if (/partlycloudy/.test(symbol)) return 1;
  return SEVERITY.find(([re]) => re.test(symbol))?.[1] ?? 0;
}

function worstSymbol(symbols: string[]): string {
  if (symbols.length === 0) return 'cloudy';
  return symbols.reduce((a, b) => (rank(b) > rank(a) ? b : a));
}

export function describe(symbol: string): string {
  const s = symbol.replace(/_(day|night|polartwilight)$/, '');
  if (/partlycloudy/.test(s)) return 'Partly cloudy';
  const showers = /showers/.test(s);
  const hit = SEVERITY.find(([re]) => re.test(s));
  const text = hit?.[2] ?? 'Cloudy';
  return showers && !/Thunder/.test(text) ? `${text} showers`.replace('Rain showers', 'Showers') : text;
}

// ---------- Time zone helpers ----------

export function localDate(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

function localHour(d: Date, timeZone: string): number {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hourCycle: 'h23' }).format(d));
}
