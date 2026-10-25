/**
 * Short, offline cancellation guides for well-known services.
 *
 * Steps and links change, so keep these brief and re-check them before each release
 * (last reviewed October 2026). `keepsAccess` says whether cancelling during a trial
 * normally keeps access until the trial ends.
 */
export type CancelGuide = {
  url?: string;
  steps: string[];
  keepsAccess?: boolean;
  note?: string;
};

export const APP_STORE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';
export const GOOGLE_PLAY_SUBSCRIPTIONS_URL = 'https://play.google.com/store/account/subscriptions';
export const APPLE_REFUND_URL = 'https://reportaproblem.apple.com';

const APPLE_SERVICE: CancelGuide = {
  url: APP_STORE_SUBSCRIPTIONS_URL,
  steps: ['Open Settings, tap your name, then Subscriptions.', 'Choose the service and tap Cancel.'],
  keepsAccess: false,
  note: "Apple's own services usually end a free trial as soon as you cancel, so cancel near the end.",
};

const GUIDES: Record<string, CancelGuide> = {
  Netflix: { url: 'https://www.netflix.com/cancelplan', steps: ['Open Account.', 'Tap Cancel membership and confirm.'], keepsAccess: true },
  Spotify: {
    url: 'https://www.spotify.com/account/subscription/',
    steps: ['Sign in on the Spotify website (not the app).', 'Open Your plan, then Change plan, then Cancel Premium.'],
    keepsAccess: true,
  },
  'Disney+': { url: 'https://www.disneyplus.com/account/subscription', steps: ['Open Account, then Subscription.', 'Tap Cancel subscription.'], keepsAccess: true },
  'Amazon Prime': {
    url: 'https://www.amazon.com/gp/primecentral',
    steps: ['Open Your Account, then Prime Membership.', 'Choose Update, cancel and more, then End membership.'],
    keepsAccess: true,
    note: 'Use your own country’s Amazon site if you are outside the US.',
  },
  'Amazon Prime Video': {
    url: 'https://www.amazon.com/gp/video/settings',
    steps: ['Open Prime Video settings, then Memberships & Subscriptions.', 'Cancel the channel or membership.'],
    keepsAccess: true,
  },
  'Kindle Unlimited': {
    url: 'https://www.amazon.com/kindle-dbs/ku/ku-central',
    steps: ['Open Kindle Unlimited settings.', 'Tap Cancel Kindle Unlimited membership.'],
    keepsAccess: true,
  },
  'YouTube Premium': { url: 'https://www.youtube.com/paid_memberships', steps: ['Open Purchases and memberships.', 'Choose the membership, then Deactivate.'], keepsAccess: true },
  'YouTube Music': { url: 'https://www.youtube.com/paid_memberships', steps: ['Open Purchases and memberships.', 'Choose the membership, then Deactivate.'], keepsAccess: true },
  'Apple TV+': APPLE_SERVICE,
  'Apple Music': APPLE_SERVICE,
  'Apple Arcade': APPLE_SERVICE,
  'Apple One': APPLE_SERVICE,
  'iCloud+': APPLE_SERVICE,
  'Adobe Creative Cloud': {
    url: 'https://account.adobe.com/plans',
    steps: ['Open Plans and payment.', 'Choose Manage plan, then Cancel your plan.'],
    keepsAccess: false,
    note: 'Annual plans paid monthly can charge an early-cancellation fee after the first 14 days.',
  },
  'Adobe Acrobat': {
    url: 'https://account.adobe.com/plans',
    steps: ['Open Plans and payment.', 'Choose Manage plan, then Cancel your plan.'],
    note: 'Annual plans paid monthly can charge an early-cancellation fee after the first 14 days.',
  },
  'Microsoft 365': { url: 'https://account.microsoft.com/services', steps: ['Open Services & subscriptions.', 'Choose Manage, then Cancel subscription.'], keepsAccess: true },
  'Xbox Game Pass': { url: 'https://account.microsoft.com/services', steps: ['Open Services & subscriptions.', 'Choose Manage, then Cancel subscription.'], keepsAccess: true },
  'Google One': { url: GOOGLE_PLAY_SUBSCRIPTIONS_URL, steps: ['Open Google Play subscriptions.', 'Choose Google One, then Cancel subscription.'], keepsAccess: true },
  'LinkedIn Premium': { url: 'https://www.linkedin.com/premium/manage', steps: ['Open Premium subscription settings.', 'Tap Cancel subscription.'], keepsAccess: true },
  'Canva Pro': { url: 'https://www.canva.com/settings/billing-and-teams', steps: ['Open Settings, then Billing & plans.', 'Choose the plan, then Cancel subscription.'], keepsAccess: true },
  Canva: { url: 'https://www.canva.com/settings/billing-and-teams', steps: ['Open Settings, then Billing & plans.', 'Choose the plan, then Cancel subscription.'], keepsAccess: true },
  Dropbox: { url: 'https://www.dropbox.com/account/plan', steps: ['Open Settings, then Plan.', 'Tap Cancel plan.'], keepsAccess: true },
  Hulu: { url: 'https://secure.hulu.com/account', steps: ['Open Account.', 'Tap Cancel under Your Subscription.'], keepsAccess: true },
  'The New York Times': { url: 'https://myaccount.nytimes.com/seg/subscription', steps: ['Open Account, then Subscription overview.', 'Follow Cancel subscription (some regions need a chat or call).'] },
  'ChatGPT Plus': { steps: ['In ChatGPT open Settings, then Subscription (or Account).', 'Tap Manage, then Cancel plan.'], keepsAccess: true, note: 'If you subscribed on iPhone, cancel in App Store subscriptions instead.' },
  'Claude Pro': { steps: ['In Claude open Settings, then Billing.', 'Tap Cancel plan.'], keepsAccess: true, note: 'If you subscribed on iPhone, cancel in App Store subscriptions instead.' },
  Audible: { steps: ['On the Audible website open Account details.', 'Choose Cancel membership and follow the steps.'], note: 'Spend any unused credits first: they usually go when you cancel.' },
  Duolingo: { url: APP_STORE_SUBSCRIPTIONS_URL, steps: ['Duolingo trials on iPhone are billed by Apple.', 'Open App Store subscriptions and cancel Super Duolingo.'], keepsAccess: true },
  Headspace: { steps: ['If you joined on iPhone, cancel in App Store subscriptions.', 'Otherwise open headspace.com, Account, then Subscription and cancel.'], keepsAccess: true },
  Calm: { steps: ['If you joined on iPhone, cancel in App Store subscriptions.', 'Otherwise open calm.com, Profile, then Manage subscription and turn off auto-renew.'], keepsAccess: true },
  Strava: { steps: ['On the Strava website open Settings, then My Account.', 'Choose Manage your subscription, then Cancel.'], keepsAccess: true },
  'Paramount+': { steps: ['Open Account on the Paramount+ website.', 'Tap Cancel subscription.'], keepsAccess: true },
  Peacock: { steps: ['Open Account, then Plans & payment.', 'Choose Change plan, then Cancel plan.'], keepsAccess: true },
  Max: { steps: ['Open Settings, then Subscription.', 'Tap Manage subscription, then Cancel subscription.'], keepsAccess: true },
  NordVPN: { steps: ['Sign in to Nord Account, then Billing.', 'Open Subscriptions and cancel automatic payments.'], note: 'NordVPN offers a 30-day money-back guarantee on most plans.' },
  'PlayStation Plus': { steps: ['On the console open Settings, Users and Accounts, Account.', 'Choose Payment and Subscriptions, then Subscriptions, then Cancel.'], keepsAccess: true },
};

const GENERIC: CancelGuide = {
  steps: [
    "Look for Account, Billing, Plan or Subscription on the service's website or app.",
    'If you signed up on your iPhone, cancel in App Store subscriptions instead.',
    'Keep the confirmation email or take a screenshot as proof.',
  ],
};

/** The guide for a service, falling back to general steps (and Apple's for App Store trials). */
export function cancelGuideFor(service: string, billedByAppStore?: boolean): CancelGuide & { known: boolean } {
  if (billedByAppStore) {
    return {
      ...APPLE_SERVICE,
      keepsAccess: GUIDES[service]?.keepsAccess ?? true,
      note: GUIDES[service] === APPLE_SERVICE ? APPLE_SERVICE.note : 'Billed by Apple, so cancel at least 24 hours before it renews.',
      known: true,
    };
  }
  const exact = GUIDES[service] ?? Object.entries(GUIDES).find(([name]) => service.toLowerCase().startsWith(name.toLowerCase()))?.[1];
  return exact ? { ...exact, known: true } : { ...GENERIC, known: false };
}
