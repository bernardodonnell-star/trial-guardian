# Accounts, connections and API keys

What Bernard needs to set up for Attaché, in the order it is needed. Prices are approximate, in euros, and should be checked at sign-up.

**Never paste a key or password into chat, email or the code.** Each key goes straight into the place named in the "Where the key goes" column. The app itself never holds a secret: every key stays on the server (Supabase) or in Expo's build service (EAS).

## Stage 1: needed now to run the app and the server

| # | Account | What it is for | Cost | Where the key goes |
|---|---|---|---|---|
| 1 | **GitHub repository `attache`** | Holds the code | Free | Add it to this Claude project |
| 2 | **Expo account** (expo.dev) | Builds the iPhone and Android apps in the cloud, sends push notifications, ships updates | Free to start; about €18 a month later | Nothing to paste. Invite the developer to the Expo organisation |
| 3 | **Supabase project** (supabase.com), region **EU Central (Frankfurt)** | Database, sign-in, file storage and the server functions (scanner, assistant) | Free to start; about €23 a month (Pro) before launch | Supabase gives the project URL and an "anon" key. Both are public by design and go in the app's `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` |
| 4 | **Anthropic API key** (console.anthropic.com) | The AI models: Sonnet 5.5 writes briefs, alerts and answers; Haiku 5.5 triages and checks | Pay as you go; set a monthly spending limit (for example €100) in the console | Supabase → Project Settings → Edge Functions → Secrets, as `ANTHROPIC_API_KEY` |

With these four, the app runs on sample data and the scanner starts collecting official feeds.

## Stage 2: needed before testing on real phones

| # | Account | What it is for | Cost | Where the key goes |
|---|---|---|---|---|
| 5 | **Apple Developer Program**, ideally as an organisation (needs a D-U-N-S number) | TestFlight, the App Store, iPhone push notifications | €99 a year | Sign in to EAS once; EAS creates and stores the signing certificates and push key |
| 6 | **Google Play Console** | Internal testing and the Play Store | About €23, one-off | A Google service account JSON key, uploaded to EAS for automatic submission |
| 7 | **Firebase project** (Google) | Android push notifications (FCM) | Free | The FCM service account key, uploaded to EAS credentials |
| 8 | **Domain name**, e.g. attache.travel or similar | Booking-forwarding address (trips@…), support pages, privacy policy | About €15 to €40 a year | DNS records pointed at the email service below |
| 9 | **Inbound email service** in the EU, e.g. Postmark or Mailgun EU | Reads forwarded booking confirmations | Free to about €15 a month | Webhook secret in Supabase secrets |

## Stage 3: needed before charging money

| # | Account | What it is for | Cost | Where the key goes |
|---|---|---|---|---|
| 10 | **RevenueCat** | Manages the €14.99, €99 and Super-user subscriptions and top-ups across App Store and Google Play | Free until about €2,300 a month of revenue, then 1% | Public SDK keys in the app config; webhook secret in Supabase secrets |
| 11 | **App Store Connect and Play Console tax and banking** | Paying out subscription revenue | Free | Entered directly in each console |
| 12 | **Sentry** (EU region) | Crash and error reports | Free to start | DSN in the app config (public by design) |

## Data sources

Most official sources need **no account**: FCDO, US State Department, Smartraveller, DFA Ireland, Travel.gc.ca, France Diplomatie, WHO, ECDC, CDC, USGS and GDACS publish open feeds. They are listed in `supabase/seed.sql`.

**Weather** comes from MET Norway (api.met.no): free, global, about 9 days ahead, commercial use allowed. No account or key is needed, but MET Norway requires a real contact email in each request and asks larger apps to cache forecasts on their own server. Before release, replace `support@attache.example` in `src/hooks/use-stop-weather.ts` with a real support address, and move the call behind a Supabase cache. Typical weather beyond the forecast range needs a climate-normals table; its source should be chosen after a licence check (several free sources are non-commercial only).

These need an agreement or a paid licence, and can wait until after the pilot:

| Source | What it adds | Notes |
|---|---|---|
| **Maps**: MapTiler (EU) or Protomaps | Offline maps and route checks | Free tier to start; API key in the app config with domain and bundle restrictions |
| **News agencies** (Reuters, AP, AFP) | Licensed feeds for tier 3 news | Public headlines can be linked, but storing and showing their text at scale needs a licence. Start with publishers' public RSS and links only |
| **ACLED** | Conflict and protest data for area ratings | Commercial use needs a paid licence and forbids AI training on the data |
| **Riskline or Crisis24** | Analyst-checked risk ratings and threat zones | Optional; paid; adds a second, human-checked source without Attaché employing reviewers |
| **Flight status** (e.g. AeroDataBox, Cirium) | Schedule changes before the airline emails | Optional; Wallet passes already show live status |

## Running the server

1. Install the Supabase CLI and log in.
2. `supabase link --project-ref <your project ref>`
3. `supabase db push` applies `supabase/migrations`. Then run `supabase/seed.sql` in the SQL editor.
4. Add `ANTHROPIC_API_KEY` under Edge Functions → Secrets.
5. `supabase functions deploy scanner` and `supabase functions deploy ask`.
6. Schedule the scanner every 15 minutes: Database → Cron → new job calling the `scanner` function with the service role key.
