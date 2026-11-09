# Attaché

A trip-aware readiness and safety companion for professional travellers. One Expo app for iPhone and Android, with a Supabase backend in the EU.

This is **stage 1**: the app shell and core screens run on sample data (Frankfurt → Geneva → Dubai → Sydney), the alert-labelling rules are implemented and tested, and the server has its database schema, a feed scanner and an assistant function.

## What is here

| Path | What it is |
|---|---|
| `src/app/` | Screens (Expo Router): Today, Trip (expandable bookings with references and call buttons), Alerts, Ask, Help |
| `src/lib/confirmation.ts` | How an alert is labelled. Confirmed only on an official source; news-only reports are Unconfirmed, "accuracy not yet known", with each independent outlet listed; syndicated copies count once; social media never counts |
| `src/lib/sources.ts` | Source tiers: 1 official, 2 data services, 3 news allow-list, 0 excluded |
| `src/lib/allowance.ts` | Assistant message allowance (150 a month, 500 Super-user, €4.99 top-up of 200) |
| `src/data/sample-trip.ts` | Sample itinerary and alerts |
| `supabase/migrations/` | Database schema with row-level security |
| `supabase/functions/scanner` | Polls official, data and news feeds every 15 minutes |
| `supabase/functions/ask` | The assistant, with the allowance enforced on the server |
| `docs/CONNECTIONS.md` | Accounts and API keys to set up, in order |

## Run it

```bash
npm install
npx expo start        # then press i (iOS simulator), a (Android) or w (web)
npm test              # rule tests
npm run typecheck
npx expo lint
```

## Next stages

1. Connect Supabase sign-in and replace sample data with the user's trips.
2. Booking import: forwarding address, share sheet and scan.
3. Scanner stage 2: match reports to trips, triage, draft alerts, checker model, push notifications.
4. Brief, health and yellow fever, area ratings, arrival guides and route checks.
5. Offline pack, step-by-step guides, circle.
6. Subscriptions with RevenueCat, then TestFlight and Play internal testing.
