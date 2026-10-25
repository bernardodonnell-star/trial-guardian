# Trial Guardian

An iPhone app that makes sure you cancel free trials before you pay. Share a sign-up email or a screenshot to the app, it reads the service, price and charge date on the device, and it reminds you before the first charge with notifications, a Lock Screen countdown and a widget.

No account, no inbox or bank access, no servers (optional sync uses the person's own iCloud). Sold as a one-time purchase.

## How it works

| Piece | Where |
| --- | --- |
| Share sheet import (text, links, screenshots) | `expo-share-intent`, `src/app/+native-intent.ts`, `src/app/import.tsx` |
| On-device reading with Apple Intelligence (iOS 26+) | local Expo module `modules/trial-extractor` (Foundation Models guided generation) |
| Rule-based reader, used everywhere and to fill gaps | `src/lib/parse/heuristic.ts` (tested in `src/lib/parse/__tests__`) |
| Screenshot text recognition | `expo-text-extractor` (Apple Vision on iOS) |
| Storage (on device only) | `expo-sqlite/kv-store`, `src/lib/trials.ts` |
| Reminders | local notifications, `src/lib/reminders.ts` |
| Lock Screen / Dynamic Island countdown | `expo-widgets` Live Activity, `src/widgets/trial-countdown.tsx` |
| Home Screen and Lock Screen widget (with an "I cancelled it" button) | `expo-widgets`, `src/widgets/upcoming-trials.tsx` |
| Reminder buttons (I cancelled it, Keep it, Remind me tonight) and daily final-week mode | `src/lib/reminders.ts`, handled in `src/app/_layout.tsx` |
| Cancel guides and the "cancel now, keep access" tip | `src/lib/cancel-guides.ts` |
| Proof photos and the next-day charge check | `src/lib/files.ts`, `src/app/trial/[id].tsx` |
| Kept subscriptions: totals and renewal reminders | `src/lib/trials.ts` (`subscriptionTotals`, `nextPaymentOf`) |
| Import a screenshot of Settings › Subscriptions | `src/lib/parse/subscription-list.ts` |
| Price rise warnings | `src/lib/price-watch.ts` |
| iCloud sync (key-value store), CSV export, JSON backup and restore | `modules/trial-system`, `src/lib/cloud.ts`, `src/lib/merge.ts`, `src/lib/export.ts` |
| Add to Calendar (system sheet, no permission on iOS 17+) | `expo-calendar`, `src/lib/calendar.ts` |
| Siri and Shortcuts ("Trials ending soon", "Add a free trial") | `plugins/ios/TrialIntents.swift`, added to the app target by `plugins/with-trial-system.js` |
| Face ID lock | `expo-local-authentication`, `src/components/app-lock.tsx` |

Widget buttons run inside the widget, not the app, so a tap is recorded in the widget's timeline and applied the next time the app opens (`readWidgetTicks` in `src/lib/glance.ts`). The app writes a small snapshot of upcoming trials to the App Group for the Siri intents.

A trial's deadline is the start of its charge day, or a day earlier for trials billed through the App Store, because Apple renews unless you cancel more than 24 hours before. Default reminders: 9am three days before, 9am on the last day, and 6pm on the last evening. iOS limits a Live Activity to eight hours, so the countdown starts in the final eight hours when the app is opened (for example from the last-evening reminder). The widget covers the days before that.

## Develop

```bash
npm install
npm test            # parser, reminder, merge, export and price tests
npm run typecheck
npm run lint
```

The app uses native modules (share extension, widgets, Foundation Models), so it needs a development build rather than Expo Go:

```bash
npx eas-cli@latest build --profile development --platform ios
npx expo start --dev-client
```

## Before the first TestFlight build

- Run `eas init` to link an EAS project, then check the `owner` it writes to `app.json`.
- Two app extensions are generated (the share extension and the widget). Both need the App Group `group.com.bernardodonnell.trialguardian`; EAS creates the identifiers when it sets up credentials.
- Fill the `TODO-...` values in `eas.json` and `store.config.json`.
- Host `docs/site` (support page and privacy policy), then put the URLs in `store.config.json` and `src/app/settings.tsx`.
- Set the price as a paid app in App Store Connect (one-time purchase, no in-app purchases).
- The app uses iCloud (key-value storage) and an App Group. EAS turns these capabilities on for the App ID when it reads the entitlements; check them in the Apple Developer portal if a build fails to sign.
- Re-check the cancel guides in `src/lib/cancel-guides.ts`: services change their menus often.
- Run the device checklist from the shipping playbook: forms with the keyboard open, share sheet from Mail, Photos and Safari, reminders firing and their buttons, the widget in each size and its button, the Live Activity, a Subscriptions screenshot import, iCloud sync between two devices, Siri ("Which trials end soon in Trial Guardian?"), Add to Calendar and the Face ID lock.
