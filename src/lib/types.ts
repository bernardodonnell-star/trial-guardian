// Core data model for Attaché. Plain TypeScript with no React Native imports,
// so the same types can be shared with the server (Supabase Edge Functions).

export type Iso = string; // ISO 8601 date-time with offset, e.g. 2026-11-25T17:40:00+01:00

export type BookingKind = 'flight' | 'hotel' | 'car' | 'rail' | 'restaurant' | 'meeting' | 'other';

export interface Contact {
  label: string; // "Reception", "Swiss help line"
  phone: string;
  hours?: string; // "24 h"
}

export interface Booking {
  id: string;
  kind: BookingKind;
  title: string; // "LX 1073 FRA to GVA"
  start: Iso;
  end?: Iso;
  place?: string; // address or terminal
  reference?: string; // booking or confirmation number
  details?: { label: string; value: string }[];
  contacts?: Contact[];
  /** Fields the itinerary reader was unsure about; never used silently. */
  needsCheck?: string[];
}

export interface Stop {
  id: string;
  city: string;
  countryCode: string; // ISO 3166-1 alpha-2
  arrive: Iso;
  depart: Iso;
  timeZone: string; // IANA, e.g. Europe/Zurich
  lat?: number;
  lon?: number;
  bookings: Booking[];
}

export interface Trip {
  id: string;
  title: string;
  passport: string; // nationality code of the passport in use, e.g. IE
  stops: Stop[];
}

// ---------- Sources and alerts ----------

/**
 * Reliability tiers, best first.
 * 1 official: governments, police, ministries, transport operators, WHO, met and civil-protection services.
 * 2 data: established data services (USGS, GDACS, flight and rail status feeds, licensed risk feeds).
 * 3 news: a maintained allow-list of established news outlets per country.
 * 0 excluded: social media, blogs, aggregators and unknown sites. Never counted.
 */
export type SourceTier = 0 | 1 | 2 | 3;

export type OutletKind =
  | 'government'
  | 'police'
  | 'transport-operator'
  | 'health-agency'
  | 'met-service'
  | 'data-service'
  | 'news-agency'
  | 'broadcaster'
  | 'national-newspaper'
  | 'regional-newspaper'
  | 'social'
  | 'unknown';

export interface Source {
  id: string; // stable key, e.g. "reuters", "fcdo", "ch-police-geneve"
  name: string; // display name
  kind: OutletKind;
  tier: SourceTier;
  countryCode?: string; // home country for national outlets and agencies
}

export interface Report {
  sourceId: string;
  url: string;
  publishedAt: Iso;
  updatedAt?: Iso;
  /** The source's own statement of whether it confirms, denies or merely reports the event. */
  stance: 'reports' | 'confirms' | 'denies';
  /** Set when the item is a re-publication of another outlet's story (e.g. "Reuters" credit line). */
  syndicatedFrom?: string; // sourceId of the original
}

export type Severity = 'info' | 'advisory' | 'warning' | 'critical';

export type Confirmation =
  | { status: 'confirmed'; by: Source[] }
  | { status: 'denied'; by: Source[] }
  | {
      status: 'unconfirmed';
      /** Independent outlets with their own reporting, latest update first. */
      outlets: { source: Source; lastUpdate: Iso; repeatedBy: Source[] }[];
      /** Official sources the app is waiting on for this place. */
      awaiting: Source[];
    };

export interface Alert {
  id: string;
  title: string;
  severity: Severity;
  confirmation: Confirmation;
  why: string; // "Your car to the UN offices at 08:15 would pass 1 km from the area."
  advice?: string;
  createdAt: Iso;
  updatedAt: Iso;
  bookingIds: string[];
}
