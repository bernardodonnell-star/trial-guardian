# Trial Guardian

An iPhone app that makes sure you cancel free trials before you pay. Share a sign-up email or a screenshot to the app, it reads the service, price and charge date on the device, and it reminds you before the first charge with notifications, a Lock Screen countdown and a widget.

No account, no inbox or bank access, no servers. Sold as a one-time purchase.

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
| Home Screen and Lock Screen widget | `expo-widgets`, `src/widgets/upcoming-trials.tsx` |

A trial's deadline is the start of its charge day, or a day earlier for trials billed through the App Store, because Apple renews unless you cancel more than 24 hours before. Default reminders: 9am three days before, 9am on the last day, and 6pm on the last evening. iOS limits a Live Activity to eight hours, so the countdown starts in the final eight hours when the app is opened (for example from the last-evening reminder). The widget covers the days before that.

## Develop

```bash
npm install
npm test            # parser and reminder tests
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
- Run the device checklist from the shipping playbook: forms with the keyboard open, share sheet from Mail, Photos and Safari, reminders firing, the widget in each size, and the Live Activity.
