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

### Development
```bash
# Start Expo dev server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web
npm run web
```

### Production Builds

```bash
# Development build
npm run build:dev

# Preview build (internal testing)
npm run build:preview

# Production build
npm run build:prod
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

**Android build fails**
- Ensure `google-services.json` is in project root
- Check Android SDK is properly installed

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
**Last Updated**: 2024  
**Status**: Production Ready ✅
