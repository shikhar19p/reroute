# Reroute - Farmhouse Booking Platform

A comprehensive, production-ready React Native mobile application for booking vacation rentals and farmhouses, built with Expo, Firebase, and modern best practices.

## 🌟 Features

### ✅ **Payment Integration**
- **Razorpay Payment Gateway** for secure transactions
- Real-time payment status tracking
- Payment history and receipts
- Automatic refund processing for cancellations

### 🔔 **Push Notifications**
- Booking confirmations and updates
- Payment success notifications
- Cancellation confirmations
- Reminder notifications (24 hours before check-in)
- Owner booking alerts

### 💰 **Cancellation & Refund System**
- Flexible cancellation policies
  - Free cancellation (7+ days before check-in)
  - Partial refund (3-7 days before check-in - 50%)
  - Non-refundable (within 3 days of check-in)
- Automatic refund calculations
- Real-time refund preview before cancellation
- Processing fee management

### 🎟️ **Coupon & Promo Codes**
- Percentage and fixed amount discounts
- First-time user coupons
- Farmhouse-specific promotions
- Usage limit tracking
- Min/max discount caps

### 🔐 **Authentication**
- Google OAuth Sign-In
- Role-based access (Customer/Owner)
- Session management with AsyncStorage
- Secure Firebase Authentication

### 🏡 **Farmhouse Management**
- Property listing with photos
- Amenities and pricing management
- KYC verification for owners
- Admin approval workflow
- Real-time availability tracking

### 📱 **User Features**
- Advanced search and filters
- Wishlist functionality
- Booking history with status tracking
- Calendar-based availability
- Map integration
- Review and ratings system

### ⚠️ **Error Handling & Monitoring**
- Sentry integration for crash reporting
- Error boundaries for graceful degradation
- Comprehensive error logging
- User-friendly error messages

### 🎨 **UI/UX**
- Modern, clean design
- Dark mode support (theme context ready)
- Smooth animations and haptic feedback
- Responsive layouts
- Premium tab bar navigation
- Skeleton loaders

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Android Studio (for Android development) or Xcode (for iOS development)
- Firebase account
- Razorpay account (for payments)
- Sentry account (for error monitoring)

## 🚀 Getting Started

### 1. Clone the Repository

\`\`\`bash
git clone https://github.com/yourusername/reroute.git
cd reroute
\`\`\`

### 2. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Environment Configuration

Copy the example environment file:

\`\`\`bash
cp .env.example .env
\`\`\`

Update `.env` with your credentials:

\`\`\`env
# Firebase Configuration
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id

# Google OAuth
GOOGLE_WEB_CLIENT_ID=your_client_id.apps.googleusercontent.com

# Razorpay
RAZORPAY_KEY_ID=rzp_test_your_key
RAZORPAY_KEY_SECRET=your_secret

# Sentry
SENTRY_DSN=https://your_sentry_dsn@sentry.io/project

ENVIRONMENT=development
\`\`\`

### 4. Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication (Google Sign-In)
3. Create Firestore database
4. Set up Storage for image uploads
5. Add your app's SHA-1 certificate fingerprint for Android

**Get SHA-1 fingerprint:**

\`\`\`bash
cd android
./gradlew signingReport
\`\`\`

### 5. Firestore Security Rules

Update your Firestore security rules:

\`\`\`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Farmhouses collection
    match /farmhouses/{farmhouseId} {
      allow read: if resource.data.status == 'approved';
      allow create: if request.auth != null;
      allow update: if request.auth != null && request.auth.uid == resource.data.ownerId;
    }

    // Bookings collection
    match /bookings/{bookingId} {
      allow read, write: if request.auth != null &&
        (request.auth.uid == resource.data.userId ||
         request.auth.uid == resource.data.ownerId);
    }

    // Payments collection
    match /payments/{paymentId} {
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null;
    }

    // Notifications collection
    match /notifications/{notificationId} {
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
\`\`\`

### 6. Razorpay Setup

1. Sign up at [razorpay.com](https://razorpay.com)
2. Get API keys from Dashboard → Settings → API Keys
3. For production, complete KYC verification
4. Update `services/paymentService.ts` with your logo URL (line 61)

### 7. Run the App

\`\`\`bash
# Start Metro bundler
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
\`\`\`

## 📁 Project Structure

\`\`\`
reroute/
├── components/          # Reusable UI components
│   ├── ErrorBoundary.tsx
│   └── PremiumTabBar.tsx
├── context/            # React Context providers
│   ├── AuthContext.tsx
│   ├── ThemeContext.tsx
│   ├── WishlistContext.tsx
│   └── FarmRegistrationContext.tsx
├── screens/            # App screens
│   ├── User/          # Customer screens
│   │   ├── ExploreScreen.tsx
│   │   ├── FarmhouseDetailScreen.tsx
│   │   ├── BookingConfirmationScreen.tsx
│   │   └── tabs/
│   │       ├── BookingsScreen.tsx
│   │       ├── WishlistScreen.tsx
│   │       └── ProfileScreen.tsx
│   ├── Owner/         # Property owner screens
│   │   ├── OwnerHomeScreen.tsx
│   │   └── MyFarmhousesScreen.tsx
│   └── FarmRegistration/  # Property listing flow
├── services/          # Business logic and API calls
│   ├── paymentService.ts       # Razorpay integration
│   ├── notificationService.ts  # Push notifications
│   ├── bookingService.ts       # Booking management
│   ├── cancellationService.ts  # Cancellation & refunds
│   ├── couponService.ts        # Promo codes
│   ├── farmhouseService.ts     # Property CRUD
│   ├── reviewService.ts        # Reviews & ratings
│   └── auditService.ts         # Audit logging
├── utils/             # Utility functions
│   └── validators.ts  # Input validation
├── App.tsx            # Main app component
├── firebaseConfig.ts  # Firebase initialization
└── .env.example       # Environment variables template
\`\`\`

## 🔑 Key Services

### Payment Service (`services/paymentService.ts`)

Handles all payment-related operations:

\`\`\`typescript
import { initiatePayment, formatAmountToPaise } from './services/paymentService';

// Initiate payment
const response = await initiatePayment({
  orderId: generateOrderId(bookingId),
  amount: formatAmountToPaise(totalPrice),
  currency: 'INR',
  customerName: user.displayName,
  customerEmail: user.email,
  customerPhone: userPhone,
  description: `Booking for ${farmhouseName}`,
});
\`\`\`

### Notification Service (`services/notificationService.ts`)

Manages push notifications:

\`\`\`typescript
import {
  sendBookingConfirmationNotification,
  scheduleBookingReminder
} from './services/notificationService';

// Send instant notification
await sendBookingConfirmationNotification(userId, bookingId, farmhouseName, checkInDate);

// Schedule future notification
await scheduleBookingReminder(userId, bookingId, farmhouseName, new Date(checkInDate));
\`\`\`

### Cancellation Service (`services/cancellationService.ts`)

Handles booking cancellations with refund calculations:

\`\`\`typescript
import { previewCancellationRefund, cancelBookingWithRefund } from './services/cancellationService';

// Preview refund amount
const preview = await previewCancellationRefund(bookingId);

// Process cancellation
const result = await cancelBookingWithRefund(bookingId, userId, 'User requested');
\`\`\`

## 📊 Database Collections

### Firestore Schema

**users**
\`\`\`javascript
{
  uid: string,
  email: string,
  displayName: string,
  photoURL: string,
  role: 'customer' | 'owner',
  phone: string,
  createdAt: timestamp
}
\`\`\`

**farmhouses**
\`\`\`javascript
{
  id: string,
  name: string,
  location: string,
  city: string,
  price: number,
  weekendPrice: number,
  capacity: number,
  bedrooms: number,
  photos: string[],
  amenities: object,
  rules: object,
  ownerId: string,
  status: 'pending' | 'approved' | 'rejected',
  rating: number,
  reviews: number,
  createdAt: timestamp
}
\`\`\`

**bookings**
\`\`\`javascript
{
  id: string,
  farmhouseId: string,
  farmhouseName: string,
  userId: string,
  userName: string,
  userEmail: string,
  userPhone: string,
  checkInDate: string,
  checkOutDate: string,
  guests: number,
  totalPrice: number,
  bookingType: 'dayuse' | 'overnight',
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed',
  paymentStatus: 'pending' | 'paid' | 'refunded',
  createdAt: timestamp
}
\`\`\`

**payments**
\`\`\`javascript
{
  id: string,
  bookingId: string,
  userId: string,
  amount: number,
  currency: string,
  status: 'pending' | 'success' | 'failed' | 'refunded',
  razorpayPaymentId: string,
  razorpayOrderId: string,
  razorpaySignature: string,
  createdAt: timestamp
}
\`\`\`

**coupons**
\`\`\`javascript
{
  id: string,
  code: string,
  discountType: 'percentage' | 'fixed',
  discountValue: number,
  minBookingAmount: number,
  maxDiscountAmount: number,
  validFrom: string,
  validUntil: string,
  usageLimit: number,
  usedCount: number,
  active: boolean
}
\`\`\`

## 🛡️ Security Best Practices

1. **Never commit sensitive data**
   - Keep `.env` file out of version control
   - Use `.env.example` as template
   - Store secrets in Expo Secrets (for EAS Build)

2. **Validate all inputs**
   - Use `utils/validators.ts` for validation
   - Sanitize user inputs on backend

3. **Implement Firestore security rules**
   - User-specific read/write permissions
   - Owner verification for farmhouse operations
   - Role-based access control

4. **Payment security**
   - Verify payment signatures on backend
   - Never store payment credentials locally
   - Use HTTPS for all API calls

## 🚢 Deployment

### Using Expo EAS Build

1. Install EAS CLI:
\`\`\`bash
npm install -g eas-cli
\`\`\`

2. Configure EAS:
\`\`\`bash
eas build:configure
\`\`\`

3. Build for production:
\`\`\`bash
# Android
eas build --platform android --profile production

# iOS
eas build --platform ios --profile production
\`\`\`

4. Submit to stores:
\`\`\`bash
# Android
eas submit --platform android

# iOS
eas submit --platform ios
\`\`\`

## 📱 Testing

### Running Tests

\`\`\`bash
npm test
\`\`\`

### Manual Testing Checklist

- [ ] Google Sign-In works
- [ ] Property search and filters
- [ ] Booking flow end-to-end
- [ ] Payment gateway integration
- [ ] Push notifications received
- [ ] Cancellation with refund calculation
- [ ] Coupon code application
- [ ] Owner property management
- [ ] Error boundaries catch errors
- [ ] Offline behavior

## 🐛 Troubleshooting

### Common Issues

**1. Firebase Auth Error**
\`\`\`
Error: The SHA certificate fingerprint is not valid
\`\`\`
Solution: Add SHA-1/SHA-256 fingerprints to Firebase console

**2. Razorpay Not Opening**
\`\`\`
Error: Razorpay is not initialized
\`\`\`
Solution: Ensure RAZORPAY_KEY_ID is correctly set in `.env`

**3. Notifications Not Working**
\`\`\`
Push token not received
\`\`\`
Solution: Check Expo notification permissions and device settings

**4. Build Errors**
\`\`\`
Module not found: @sentry/react-native
\`\`\`
Solution: Run `npm install` and clear cache: `npm start -- --clear`

## 📈 Performance Optimization

- **Caching**: Farmhouse data cached for 5 minutes
- **Image Optimization**: Use CDN for images in production
- **Lazy Loading**: Components loaded on demand
- **Pagination**: Implemented for large lists
- **Debouncing**: Search queries debounced by 300ms

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, email support@reroute.app or open an issue on GitHub.

## 🙏 Acknowledgments

- Firebase for backend infrastructure
- Razorpay for payment gateway
- Expo for React Native development
- Sentry for error monitoring

---

**Built with ❤️ using React Native & Expo**
