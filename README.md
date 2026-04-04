# ReRoute - Premium Farmhouse Booking Platform

A professional React Native application for booking farmhouses and vacation properties, built with Expo and Firebase.

## 🚀 Features

### For Customers
- **Browse & Search**: Discover farmhouses with advanced filters
- **Smart Booking**: Real-time availability checking and instant booking
- **Secure Payments**: Integrated Razorpay payment gateway
- **Reviews & Ratings**: Read and write authentic reviews
- **Wishlist**: Save favorite properties
- **Booking Management**: Track bookings, view history, cancel bookings
- **Push Notifications**: Real-time booking updates

### For Property Owners
- **Property Listing**: Easy multi-step property registration
- **Booking Management**: Accept/reject bookings, manage availability
- **Calendar Management**: Block dates, set custom pricing
- **Analytics Dashboard**: Track earnings and bookings
- **KYC Verification**: Secure identity verification

### For Admins
- **Admin Panel**: Web-based dashboard for management
- **Property Approvals**: Review and approve listings
- **User Management**: Manage users and roles
- **Revenue Tracking**: Monitor payments and commissions
- **Analytics**: Comprehensive business insights

## 🛠️ Tech Stack

- **Frontend**: React Native (Expo SDK 54)
- **Backend**: Firebase (Firestore, Auth, Storage, Functions)
- **Payment**: Razorpay
- **State Management**: React Context API
- **Navigation**: React Navigation v7
- **UI Components**: Custom components with Lucide icons
- **Notifications**: Expo Notifications
- **Error Tracking**: Sentry

## 📋 Prerequisites

- Node.js 18+ and npm/yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Studio (for emulators)
- Firebase account
- Razorpay account (for payments)

## 🔧 Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd reroute
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
- Firebase configuration (from Firebase Console)
- Razorpay keys (from Razorpay Dashboard)
- Google OAuth client ID
- Encryption secret (generate with: `openssl rand -base64 32`)
- Sentry DSN (optional, for error tracking)

4. **Setup Firebase**
- Create a Firebase project at https://console.firebase.google.com/
- Enable Authentication (Email/Password and Google Sign-In)
- Create Firestore database
- Enable Storage
- Deploy security rules:
  ```bash
  firebase deploy --only firestore:rules
  firebase deploy --only storage:rules
  ```

5. **Configure Google Services**
- Download `google-services.json` (Android) from Firebase Console
- Place it in the project root
- For iOS, download `GoogleService-Info.plist` and configure accordingly

## 🚀 Running the App

### Option A — Expo Go (quick preview, no native modules)
```bash
npx expo start --android   # opens in Expo Go on Android emulator
npx expo start --ios       # opens in Expo Go on iOS simulator
```
> ⚠️ Google Sign-In and Razorpay payments will NOT work in Expo Go.
> You'll see a friendly message instead of a crash. Use Option B for full functionality.

---

### Option B — Development Build (full native modules, recommended)

This is a proper native build that includes Google Sign-In, Razorpay, and all other native modules.

**Step 1 — Install EAS CLI (one time)**
```bash
npm install -g eas-cli
eas login   # login with your Expo account: shikahr_19
```

**Step 2 — Build the dev APK in the cloud**
```bash
eas build --platform android --profile development
```
> Free tier takes ~15–30 min. Paid tier is instant.
> Track progress at: https://expo.dev/accounts/shikahr_19/projects/reroute

**Step 3 — Install the APK on your emulator**
```bash
# Download the APK from the build page, then:
adb install path/to/downloaded-app.apk
```
Or open the build URL on your emulator browser and tap Install.

**Step 4 — Start Metro pointing to the dev client**
```bash
npx expo start --dev-client
```
The "ReRoute (Dev)" app on your emulator will connect to Metro with all native modules working.

---

### EAS Build Profiles

| Profile | Command | Output | Purpose |
|---------|---------|--------|---------|
| `development` | `eas build --profile development` | APK | Dev with hot reload + native modules |
| `preview` | `eas build --profile preview` | APK | Internal testing |
| `production` | `eas build --profile production` | AAB | Google Play submission |

```bash
# Development build (with dev client)
eas build --platform android --profile development

# Preview build (internal testing APK)
eas build --platform android --profile preview

# Production build (AAB for Play Store)
eas build --platform android --profile production
```

### Web
```bash
npx expo start --web
```

## 📱 App Store Deployment

### iOS (App Store)
1. Configure `app.json` with your bundle identifier
2. Set up App Store Connect account
3. Build with EAS: `eas build --platform ios --profile production`
4. Submit: `eas submit --platform ios`

### Android (Google Play)
1. Generate upload keystore
2. Configure `eas.json` with service account key
3. Build: `eas build --platform android --profile production`
4. Submit: `eas submit --platform android`

## 🔒 Security

### Environment Variables
- **Never commit** `.env` file to version control
- Use strong encryption keys (minimum 32 characters)
- Rotate API keys regularly
- Use separate Firebase projects for dev/staging/production

### Data Privacy
- GDPR compliant data export/deletion
- Encrypted sensitive data (bank details, KYC documents)
- Secure payment processing via Razorpay
- User consent for data collection

### Security Rules
- Firestore security rules enforce data access control
- Storage rules validate file types and sizes
- Rate limiting on sensitive operations
- Input sanitization and validation

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- validators.test.ts
```

## 📊 Monitoring

### Error Tracking (Sentry)
- Automatic crash reporting
- Performance monitoring
- User feedback collection

### Analytics
- Firebase Analytics integration
- Custom event tracking
- User behavior insights

## 🏗️ Project Structure

```
reroute/
├── assets/              # Images, fonts, icons
├── components/          # Reusable UI components
├── constants/           # App constants and configuration
├── context/            # React Context providers
├── screens/            # Screen components
│   ├── User/          # Customer-facing screens
│   ├── Owner/         # Property owner screens
│   └── FarmRegistration/ # Property listing flow
├── services/           # API and business logic
├── utils/             # Utility functions
├── types/             # TypeScript type definitions
├── admin-panel/       # Web admin dashboard
└── functions/         # Firebase Cloud Functions
```

## 🔑 Key Files

- `App.tsx` - Main app entry point
- `firebaseConfig.ts` - Firebase initialization
- `app.config.js` - Expo configuration
- `eas.json` - EAS Build configuration
- `firestore.rules` - Firestore security rules
- `storage.rules` - Storage security rules

## 📝 Scripts

- `npm start` - Start development server
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS
- `npm run web` - Run on web
- `npm run build:prod` - Production build
- `npm test` - Run tests

## ⚡ Quick Start for New Developers

```bash
# 1. Clone and install
git clone <repository-url>
cd reroute
npm install

# 2. Set up environment
cp .env.example .env   # fill in your Firebase + Razorpay keys

# 3. Start on Android emulator
npx expo start --android

# 4. Start on iOS simulator (Mac only)
npx expo start --ios
```

---

## 📦 Package Name & google-services.json

- **Android package name**: `com.rerouteaventures.app`
- The `android/` folder is **gitignored** (Expo auto-generates it on each prebuild)
- `google-services.json` must be placed at: `android/app/google-services.json`
- It is force-tracked in git via `git add -f` — do NOT remove it from the commit
- Download the latest version from: Firebase Console → Project Settings → Your Apps → Android → Download google-services.json

---

## 🔑 Environment Variables (.env template)

```env
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=1:xxx:android:xxx
GOOGLE_WEB_CLIENT_ID=xxx.apps.googleusercontent.com
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=your_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@reroute.app
ADMIN_EMAIL=admin@reroute.app
EAS_PROJECT_ID=your_eas_project_id
ENCRYPTION_SECRET=your_32_char_secret
ENVIRONMENT=development
```

---

## 💳 Payment Flow

```
User taps "Confirm Booking"
        ↓
Booking created  →  status: pending / paymentStatus: pending
        ↓
Razorpay order created (15s timeout)
        ↓
User completes Razorpay checkout  ← 10-minute window
        ↓
Payment verified server-side (10s timeout)
        ↓
├── Success  →  status: confirmed / paymentStatus: paid  →  Email sent
├── Parsing error  →  booking kept pending  →  "Check status" warning shown
└── Cancel/Fail  →  booking cleaned up  →  Dates unblocked

Background cleanup: every 5 min, auto-cancels bookings pending > 30 min
```

**Pending payment banner**: If a payment is interrupted, a yellow banner appears
on the Bookings tab showing the remaining time (up to 10 minutes). Tap it to view booking details.

---

## 🐛 Troubleshooting

### Common Issues

**Metro bundler cache issues**
```bash
npx expo start --clear
```

**iOS build fails**
```bash
cd ios && pod install && cd ..
```

**Android build fails — `Unable to establish loopback connection` (Windows)**

This is a known Windows + Gradle + JDK 17/21 bug with WEPoll/Unix Domain Sockets.

Fix — add to `android/gradle.properties`:
```properties
org.gradle.daemon=false
```

Then run:
```bash
cd android
./gradlew --stop
./gradlew app:assembleDebug --no-daemon
```

If still failing, nuke Gradle cache:
```bash
rm -rf ~/.gradle/daemon
rm -rf ~/.gradle/caches
```

**RNGoogleSignin not found error**

This means you're running in Expo Go. Google Sign-In requires a **native build**:
```bash
npx expo run:android
```
Expo Go does not support custom native modules.

**Firebase connection issues**
- Verify `.env` file has correct credentials
- Check Firebase project is active
- Ensure billing is enabled for Cloud Functions

## 📄 License

Proprietary - All rights reserved

## 🤝 Support

For support, email support@reroute.app or create an issue in the repository.

## 🔗 Links

- [Privacy Policy](https://reroute.app/privacy-policy)
- [Terms of Service](https://reroute.app/terms-of-service)
- [Refund Policy](https://reroute.app/refund-policy)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)

## 📈 Roadmap

- [ ] In-app chat between owners and customers
- [ ] Advanced search filters (amenities, price range)
- [ ] Multi-language support
- [ ] Dark mode enhancements
- [ ] Social media integration
- [ ] Referral program
- [ ] Loyalty rewards
- [ ] Virtual property tours

## 👥 Contributors

- Development Team - ReRoute Technologies

---

**Version**: 1.0.0
**Last Updated**: April 2026
**Status**: Production Ready ✅
