/**
 * Well-known subscriptions that offer free trials. A match here beats a guessed name,
 * because sign-up emails often mention the brand in a logo we cannot read.
 * Longer names come first so "YouTube Premium" wins over "YouTube".
 */
const KNOWN_SERVICES = [
  'Amazon Prime Video',
  'Amazon Prime',
  'Amazon Music Unlimited',
  'Apple TV+',
  'Apple Music',
  'Apple Arcade',
  'Apple One',
  'iCloud+',
  'YouTube Premium',
  'YouTube Music',
  'YouTube TV',
  'Google One',
  'Disney+',
  'Netflix',
  'Spotify',
  'Hulu',
  'Max',
  'Paramount+',
  'Peacock',
  'Discovery+',
  'Crunchyroll',
  'DAZN',
  'BritBox',
  'Audible',
  'Kindle Unlimited',
  'Scribd',
  'Everand',
  'Deezer',
  'Tidal',
  'SiriusXM',
  'Adobe Creative Cloud',
  'Adobe Acrobat',
  'Microsoft 365',
  'Canva Pro',
  'Canva',
  'Dropbox',
  'Notion',
  'Evernote',
  'Grammarly',
  'ChatGPT Plus',
  'Claude Pro',
  'Duolingo',
  'Babbel',
  'Headspace',
  'Calm',
  'Strava',
  'Peloton',
  'Fitbit Premium',
  'MyFitnessPal',
  'Noom',
  'NordVPN',
  'ExpressVPN',
  'Surfshark',
  '1Password',
  'LastPass',
  'The New York Times',
  'The Times',
  'The Economist',
  'The Washington Post',
  'The Wall Street Journal',
  'Financial Times',
  'LinkedIn Premium',
  'Tinder',
  'Bumble',
  'Hinge',
  'Xbox Game Pass',
  'PlayStation Plus',
  'Nintendo Switch Online',
  'HelloFresh',
  'Uber One',
  'DashPass',
  'Deliveroo Plus',
  'Instacart+',
  'Walmart+',
  'Squarespace',
  'Shopify',
  'Wix',
];

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const KNOWN_PATTERNS = KNOWN_SERVICES.map((name) => ({
  name,
  // Case-sensitive (plus an all-caps form for headings) so "Calm" or "Max" do not catch
  // ordinary words like "stay calm".
  pattern: new RegExp(
    `(^|[^\\w+])(?:${escapeRegExp(name)}|${escapeRegExp(name.toUpperCase())})(?![\\w+])`
  ),
}));

/** The first well-known service named in the text, by position. */
export function findKnownService(text: string): string | null {
  let best: { name: string; index: number } | null = null;
  for (const { name, pattern } of KNOWN_PATTERNS) {
    const match = pattern.exec(text);
    if (match && (best === null || match.index < best.index)) {
      best = { name, index: match.index };
    }
  }
  return best?.name ?? null;
}
