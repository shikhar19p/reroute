# First-Time Setup

Onboarding doc for a new machine / new developer after `git clone`. Covers exactly what
files you need (sent to you separately, never committed to git) and what commands to run.

Two backends exist, fully independent:

| | Prod | Staging (dev) |
| --- | --- | --- |
| Firebase project | `rustique-6b7c4` | `reroute-aventures-dev` |
| Android package | `com.rerouteaventures.app` | `com.rerouteaventures.app.dev` |

Nothing below is optional-skip the staging section only if you'll never run/deploy against
`reroute-aventures-dev`.

## 0. Prerequisites

```bash
node -v          # any recent LTS
npm -v
npm install -g firebase-tools eas-cli
```

## 1. Clone and install

```bash
git clone <repo-url>
cd reroute
npm install
```

## 2. Files you'll receive from the project owner

None of these are in git (check `.gitignore` if unsure) - they're sent to you directly
(Slack/Drive/USB, whatever channel). Copy-paste each into the exact path shown.

| File | Destination | Used for |
| --- | --- | --- |
| `.env` | project root | Prod app config (Firebase, Razorpay key ID, Google client ID) |
| `.env.staging` | project root | Same, pointed at the staging backend |
| `google-services.json` | project root **and** `android/app/google-services.json` | Prod Android/Firebase config |
| `google-services.staging.json` | project root | Staging Android/Firebase config (copy to `android/app/google-services.json` when building staging locally, see §5) |
| `google-play-key.json` | project root | Only needed if you'll run `eas submit` (Play Store service account key) |
| `functions/.env.rustique-6b7c4` | `functions/` | Prod Cloud Functions non-secret config (SMTP host/port, mailbox addresses) |
| `functions/.env.reroute-aventures-dev` | `functions/` | Same, staging |

`.env` / `.env.staging` shape (values come from the project owner, this is just the shape):

```env
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...
FIREBASE_STORAGE_BUCKET=...
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_APP_ID=...
GOOGLE_WEB_CLIENT_ID=...
RAZORPAY_KEY_ID=...
ENVIRONMENT=development   # or "production" for .env
```

Note: `ENCRYPTION_SECRET` does **not** go in these files - it's a Cloud Functions secret
only (§4), never shipped to the app. If you see it in an old `.env`, delete that line.

## 3. Firebase CLI access

```bash
firebase login
firebase projects:list        # confirm you can see rustique-6b7c4 and reroute-aventures-dev
```

If either project is missing, ask the owner to add your Google account as a member
(IAM) on that Firebase/GCP project - Secret Manager access and deploys need it.

`.firebaserc` (already in the repo) maps the short names:

```json
{
  "projects": {
    "default": "rustique-6b7c4",
    "production": "rustique-6b7c4",
    "staging": "reroute-aventures-dev"
  }
}
```

## 4. Cloud Functions secrets (Secret Manager)

These already exist in both projects - **you don't need to set them** unless you're
provisioning a brand-new environment or rotating a leaked value. Listed here for
reference/recreation:

```bash
# Prod
firebase functions:secrets:set RAZORPAY_KEY_SECRET     --project rustique-6b7c4
firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET --project rustique-6b7c4
firebase functions:secrets:set BOOKINGS_PASSWORD       --project rustique-6b7c4
firebase functions:secrets:set PAYMENTS_PASSWORD       --project rustique-6b7c4
firebase functions:secrets:set SUPPORT_PASSWORD        --project rustique-6b7c4
firebase functions:secrets:set ENCRYPTION_SECRET       --project rustique-6b7c4
firebase functions:secrets:set LEGACY_ENCRYPTION_KEY   --project rustique-6b7c4
firebase functions:secrets:set GOOGLE_MAPS_API_KEY     --project rustique-6b7c4

# Staging - repeat with --project reroute-aventures-dev
firebase functions:secrets:set RAZORPAY_KEY_SECRET     --project reroute-aventures-dev
firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET --project reroute-aventures-dev
firebase functions:secrets:set BOOKINGS_PASSWORD       --project reroute-aventures-dev
firebase functions:secrets:set PAYMENTS_PASSWORD       --project reroute-aventures-dev
firebase functions:secrets:set SUPPORT_PASSWORD        --project reroute-aventures-dev
firebase functions:secrets:set ENCRYPTION_SECRET       --project reroute-aventures-dev
firebase functions:secrets:set LEGACY_ENCRYPTION_KEY   --project reroute-aventures-dev
firebase functions:secrets:set GOOGLE_MAPS_API_KEY     --project reroute-aventures-dev
```

`GOOGLE_MAPS_API_KEY` powers `geocodeAddress` (functions/src/index.ts) — text-to-coordinates
resolution for the Explore screen's location filter and nearest-to-farthest sort. Needs the
**Geocoding API** enabled on the GCP project backing Firebase, billing enabled, and the key
should be unrestricted (or IP-restricted to Cloud Functions' egress) since it's called
server-side only, never shipped in the app.

Each prompts for the value on stdin (paste it, hit enter) and stores it encrypted in
Google Secret Manager - it never touches disk or git. To check what's already set:

```bash
firebase functions:secrets:access RAZORPAY_KEY_SECRET --project rustique-6b7c4
```

`BOOKINGS_PASSWORD` / `PAYMENTS_PASSWORD` / `SUPPORT_PASSWORD` are the SMTP app
passwords for the three Zoho mailboxes (`bookings@`, `payments@`,
`support@rerouteaventures.org`) - the mailbox addresses themselves are non-secret and
live in `functions/.env.<project-id>` (§2), not Secret Manager.

`functions/.env.<project-id>` shape:

```env
SMTP_HOST=smtppro.zoho.in
SMTP_PORT=465
BOOKINGS_EMAIL=bookings@rerouteaventures.org
PAYMENTS_EMAIL=payments@rerouteaventures.org
SUPPORT_EMAIL=support@rerouteaventures.org
ADMIN_EMAIL=...
RAZORPAY_KEY_ID=...        # publishable, not a secret - same value as the app's .env
```

## 5. Run it locally

```bash
# Prod backend
npm run web              # web
npm start                # Expo Go / dev client
npm run android           # native Android (auto-copies google-services.json into android/app/)

# Staging backend
npm run web:staging
npm run start:staging
npm run android:staging   # copy google-services.staging.json -> android/app/google-services.json FIRST, manually
```

`npx expo start` (Expo Go) works for UI only - Google Sign-In needs a native dev build
(`npx expo run:android` / `npm run android`).

## 6. Deploying Cloud Functions / rules

```bash
npm run deploy:staging   # functions + firestore rules/indexes + storage -> reroute-aventures-dev
npm run deploy:prod      # same -> rustique-6b7c4
```

Deploys auto-load `functions/.env.<project-id>` for the non-secret vars and inject the
Secret Manager values for whichever secrets each function declares - nothing else to
configure.

## 7. EAS cloud builds (optional - only if you'll run `eas build`)

Cloud builds never see your local `.env*` files. Each profile needs its own copy of the
same variables in EAS's store:

```bash
eas login
eas env:list development            # see what's already set
eas env:create <profile> --name FIREBASE_API_KEY --value <value> --visibility plaintext --non-interactive --force
# repeat per key (FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID, FIREBASE_STORAGE_BUCKET,
# FIREBASE_MESSAGING_SENDER_ID, FIREBASE_APP_ID, GOOGLE_WEB_CLIENT_ID, RAZORPAY_KEY_ID)
# and per profile (development, preview, production)

eas env:create development --name GOOGLE_SERVICES_FILE --value ./google-services.staging.json --type file --non-interactive --force
```

Only `development` is wired to the staging backend; `preview`/`production` need the
prod values. There is no code fallback anymore (removed - see `firebaseConfig.ts` /
`app.config.js`) - a profile with no vars set will fail to build/init Firebase, loudly,
rather than silently talking to the wrong project.

## 8. Sanity check

```bash
firebase use staging && firebase use production   # both should resolve without error
npm run android                                     # app boots, Google Sign-In works
```

See `README.md` for build troubleshooting (SHA1/keystore issues, Gradle errors, etc.) -
this doc only covers getting secrets and config in place.
