import type { OutletKind, Source, SourceTier } from './types.ts';

// Starter source registry. In production this lives in the database and the
// news allow-list is reviewed quarterly; it is kept as data, never left to the model.

const TIER_BY_KIND: Record<OutletKind, SourceTier> = {
  government: 1,
  police: 1,
  'transport-operator': 1,
  'health-agency': 1,
  'met-service': 1,
  'data-service': 2,
  'news-agency': 3,
  broadcaster: 3,
  'national-newspaper': 3,
  'regional-newspaper': 3,
  social: 0,
  unknown: 0,
};

export function tierFor(kind: OutletKind): SourceTier {
  return TIER_BY_KIND[kind];
}

function src(id: string, name: string, kind: OutletKind, countryCode?: string): Source {
  return { id, name, kind, tier: tierFor(kind), countryCode };
}

export const SOURCES: Source[] = [
  // Tier 1: official
  src('fcdo', 'FCDO travel advice', 'government', 'GB'),
  src('dfa-ie', 'DFA Ireland', 'government', 'IE'),
  src('smartraveller', 'Smartraveller', 'government', 'AU'),
  src('us-state', 'US State Department', 'government', 'US'),
  src('ca-travel', 'Travel.gc.ca', 'government', 'CA'),
  src('fr-mfa', 'France Diplomatie', 'government', 'FR'),
  src('who', 'WHO', 'health-agency'),
  src('ecdc', 'ECDC', 'health-agency'),
  src('cdc', 'CDC', 'health-agency', 'US'),
  src('ke-police', 'National Police Service (Kenya)', 'police', 'KE'),
  src('ke-interior', 'Ministry of Interior (Kenya)', 'government', 'KE'),
  src('ch-police-ge', 'Police cantonale de Genève', 'police', 'CH'),
  src('fraport', 'Frankfurt Airport (Fraport)', 'transport-operator', 'DE'),
  src('db', 'Deutsche Bahn', 'transport-operator', 'DE'),
  src('meteoswiss', 'MeteoSwiss', 'met-service', 'CH'),
  src('bom', 'Bureau of Meteorology', 'met-service', 'AU'),
  // Tier 2: data services
  src('usgs', 'USGS earthquakes', 'data-service'),
  src('gdacs', 'GDACS', 'data-service'),
  // Tier 3: established news (allow-list)
  src('reuters', 'Reuters', 'news-agency'),
  src('ap', 'Associated Press', 'news-agency'),
  src('afp', 'AFP', 'news-agency'),
  src('bbc', 'BBC News', 'broadcaster', 'GB'),
  src('dw', 'DW', 'broadcaster', 'DE'),
  src('srf', 'SRF', 'broadcaster', 'CH'),
  src('abc-au', 'ABC News (Australia)', 'broadcaster', 'AU'),
  src('nation-ke', 'Nation (Kenya)', 'national-newspaper', 'KE'),
  src('standard-ke', 'The Standard (Kenya)', 'national-newspaper', 'KE'),
];

export const SOURCE_MAP = new Map(SOURCES.map((s) => [s.id, s]));

export const OUTLET_KIND_LABEL: Record<OutletKind, string> = {
  government: 'Government',
  police: 'Police',
  'transport-operator': 'Transport operator',
  'health-agency': 'Health agency',
  'met-service': 'Weather service',
  'data-service': 'Data service',
  'news-agency': 'International news agency',
  broadcaster: 'Broadcaster',
  'national-newspaper': 'National newspaper',
  'regional-newspaper': 'Regional newspaper',
  social: 'Social media',
  unknown: 'Unknown site',
};
