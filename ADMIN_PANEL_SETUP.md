# Admin Panel Setup Guide

## Overview

The Reroute Admin Panel is a web-based React application for managing the farmhouse booking platform. It provides comprehensive tools for:

- **Farmhouse Approvals**: Review and approve/reject pending farmhouse registrations
- **Bookings Management**: View and manage all bookings with filtering
- **User Management**: View and manage customer and owner accounts
- **Coupons Management**: Create and manage discount coupons
- **Payments & Commission**: Track payments and commission
- **Analytics Dashboard**: View platform statistics and trends
- **Revenue Dashboard**: Track revenue and financial metrics
- **Review Management**: Manage user reviews and ratings
- **Communication Center**: Handle user communications

## Tech Stack

- **React 19** with TypeScript
- **Material-UI (MUI)** for UI components
- **Firebase** for backend (shared with mobile app)
- **React Router** for navigation
- **React Hook Form** with Yup validation
- **Material React Table** for data tables
- **Recharts** for analytics visualizations
- **date-fns** for date formatting

## Directory Structure

```
admin-panel/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   └── PrivateRoute.tsx        # Protected route wrapper
│   │   ├── farmhouse/
│   │   │   ├── ApprovalDialog.tsx      # Farmhouse approval modal
│   │   │   └── FarmhouseDetailModal.tsx
│   │   └── layout/
│   │       ├── Header.tsx              # Top navigation bar
│   │       ├── Sidebar.tsx             # Sidebar navigation
│   │       └── MainLayout.tsx          # Main layout wrapper
│   ├── config/
│   │   └── firebase.ts                 # Firebase configuration
│   ├── context/
│   │   └── AuthContext.tsx             # Admin authentication context
│   ├── hooks/
│   │   └── useDashboardStats.ts        # Dashboard statistics hook
│   ├── pages/
│   │   ├── auth/
│   │   │   └── Login.tsx               # Admin login page
│   │   ├── booking/
│   │   │   └── BookingsManagement.tsx  # Bookings table
│   │   ├── coupon/
│   │   │   └── CouponsManagement.tsx   # Coupons management
│   │   ├── dashboard/
│   │   │   ├── Dashboard.tsx           # Main dashboard
│   │   │   ├── AnalyticsDashboard.tsx  # Analytics charts
│   │   │   └── RevenueDashboard.tsx    # Revenue tracking
│   │   ├── farmhouse/
│   │   │   ├── FarmhouseApprovals.tsx  # Pending approvals
│   │   │   └── AllFarmhouses.tsx       # All farmhouses list
│   │   ├── payment/
│   │   │   └── PaymentsCommission.tsx  # Payments tracking
│   │   ├── user/
│   │   │   └── UsersManagement.tsx     # User management
│   │   ├── ReviewManagement.tsx        # Reviews management
│   │   └── CommunicationCenter.tsx     # Communications
│   ├── types/
│   │   └── index.ts                    # TypeScript types
│   ├── App.tsx                         # Main app component
│   └── index.tsx                       # Entry point
├── .env.example                        # Environment variables template
└── package.json
```

## Installation & Setup

### 1. Navigate to Admin Panel Directory

```bash
cd admin-panel
```

### 2. Install Dependencies

```bash
npm install
```

This will install:
- React 19 and React DOM
- Material-UI components
- Firebase SDK
- React Router v7
- React Hook Form
- Material React Table
- Recharts
- TypeScript
- And other dependencies

### 3. Environment Configuration

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Update the `.env` file with your Firebase credentials (must match your mobile app's Firebase project):

```env
# Firebase Configuration (MUST match your mobile app)
REACT_APP_FIREBASE_API_KEY=AIzaSyDMLXQjQSSZRPUdlOeNf1afg2WPPQFSTAI
REACT_APP_FIREBASE_AUTH_DOMAIN=rustique-6b7c4.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=rustique-6b7c4
REACT_APP_FIREBASE_STORAGE_BUCKET=rustique-6b7c4.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=272634614965
REACT_APP_FIREBASE_APP_ID=1:272634614965:web:82bb8ef1772cac9c019afc

# Admin Configuration
REACT_APP_ENVIRONMENT=development
REACT_APP_ADMIN_EMAIL=admin@reroute.com
```

**Important**: The admin panel MUST use the same Firebase project as your mobile app to access the same database.

### 4. Create Admin User

Before you can log in, you need to create an admin user in Firebase:

#### Option A: Using Firebase Console (Recommended)

1. Go to Firebase Console → Authentication
2. Add a new user with email/password
3. Copy the UID of the created user
4. Go to Firestore → `users` collection
5. Create a new document with the UID as the document ID
6. Add the following fields:

```json
{
  "email": "admin@reroute.com",
  "displayName": "Admin User",
  "role": "admin",
  "permissions": {
    "approveFarmhouses": true,
    "manageBookings": true,
    "manageUsers": true,
    "manageCoupons": true,
    "viewAnalytics": true,
    "managePayments": true
  },
  "createdAt": "2025-01-17T00:00:00Z"
}
```

#### Option B: Using Admin Service (from mobile app)

You can create an admin user programmatically using the `adminService`:

```typescript
import { createAdminUser } from './services/adminService';

// Run this once (from mobile app or a script)
await createAdminUser(
  'user-uid-from-firebase-auth',
  'admin@reroute.com',
  'Admin User'
);
```

#### Option C: Using Firebase Admin SDK (Backend Script)

Create a Node.js script:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./path-to-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function createAdmin() {
  // Create auth user
  const user = await auth.createUser({
    email: 'admin@reroute.com',
    password: 'secure_password_here',
    displayName: 'Admin User',
  });

  // Create Firestore document
  await db.collection('users').doc(user.uid).set({
    email: 'admin@reroute.com',
    displayName: 'Admin User',
    role: 'admin',
    permissions: {
      approveFarmhouses: true,
      manageBookings: true,
      manageUsers: true,
      manageCoupons: true,
      viewAnalytics: true,
      managePayments: true,
    },
    createdAt: new Date().toISOString(),
  });

  console.log('Admin user created:', user.uid);
}

createAdmin();
```

### 5. Run Development Server

```bash
npm start
```

The admin panel will open at `http://localhost:3000`

### 6. Log In

1. Navigate to `http://localhost:3000/login`
2. Enter your admin credentials
3. You'll be redirected to the dashboard

**Note**: Only users with `role: 'admin'` in Firestore can log in. Regular users will be denied access.

## Features Overview

### 1. Dashboard

- **Overview Stats**: Total bookings, revenue, pending approvals, active users
- **Recent Activity**: Latest bookings and approvals
- **Charts**: Bookings trend, revenue trend
- **Quick Actions**: Navigate to key areas

### 2. Farmhouse Approvals

- View all pending farmhouse registrations
- Review farmhouse details:
  - Photos gallery
  - Basic information (name, location, capacity)
  - Pricing details
  - Amenities list
  - House rules
  - KYC documents (Aadhaar, PAN, license, bank details)
- **Actions**:
  - ✅ Approve: Sets status to 'approved', farmhouse becomes visible to users
  - ❌ Reject: Sets status to 'rejected' with reason
  - 📝 Request Changes: Ask owner to provide more information

### 3. All Farmhouses

- View all farmhouses (approved, pending, rejected)
- Filter by status
- Search by name/location
- Edit farmhouse details
- Suspend/unsuspend farmhouses
- View booking history for each farmhouse

### 4. Bookings Management

- View all bookings across the platform
- **Filters**:
  - Status: Confirmed, Cancelled, Completed
  - Payment Status: Pending, Paid, Refunded
  - Date range
- **Information displayed**:
  - Booking ID
  - Check-in/Check-out dates
  - Guest count
  - Total amount
  - Commission amount
  - Payment status
  - Booking status

### 5. User Management

- View all users (customers and owners)
- Filter by role
- View user details:
  - Profile information
  - Booking history
  - Total spent
  - Registration date
- **Actions**:
  - Suspend/activate users
  - View user activity
  - Reset passwords (via email)

### 6. Coupons Management

- View all coupons
- Create new coupons:
  - Code generation
  - Discount type (percentage or fixed amount)
  - Min booking amount
  - Max discount cap
  - Valid from/until dates
  - Usage limit
  - Applicability (all, first booking, specific farmhouses)
- Edit existing coupons
- Activate/deactivate coupons
- Track usage statistics

### 7. Payments & Commission

- View all payment transactions
- Track commission earnings
- Filter by:
  - Date range
  - Payment status
  - Farmhouse
- Export payment reports
- Commission breakdown by farmhouse

### 8. Analytics Dashboard

- **User Analytics**:
  - New users trend
  - User retention rate
  - Active users
- **Booking Analytics**:
  - Bookings per month
  - Average booking value
  - Popular destinations
  - Peak booking periods
- **Revenue Analytics**:
  - Total revenue trend
  - Commission earned
  - Revenue by farmhouse

### 9. Revenue Dashboard

- Monthly revenue chart
- Commission breakdown
- Top performing farmhouses
- Revenue by category (weekday/weekend)
- Payout pending to owners

### 10. Review Management

- View all reviews and ratings
- Filter by:
  - Rating (1-5 stars)
  - Farmhouse
  - Date
- **Actions**:
  - Approve/hide reviews
  - Respond to reviews
  - Flag inappropriate content
  - Delete spam/abusive reviews

### 11. Communication Center

- Send notifications to users
- Broadcast announcements
- View message history
- Email templates

## Firebase Security Rules

Update your Firestore security rules to allow admin access:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() {
      return request.auth != null &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if isAdmin(); // Admins can read all users
      allow write: if isAdmin(); // Admins can modify user roles/permissions
    }

    // Farmhouses collection
    match /farmhouses/{farmhouseId} {
      allow read: if resource.data.status == 'approved' || isAdmin();
      allow create: if request.auth != null;
      allow update: if (request.auth != null && request.auth.uid == resource.data.ownerId) || isAdmin();
      allow delete: if isAdmin();
    }

    // Bookings collection
    match /bookings/{bookingId} {
      allow read: if (request.auth != null &&
        (request.auth.uid == resource.data.userId ||
         request.auth.uid == resource.data.ownerId)) || isAdmin();
      allow write: if (request.auth != null &&
        request.auth.uid == resource.data.userId) || isAdmin();
    }

    // Payments collection
    match /payments/{paymentId} {
      allow read: if (request.auth != null && request.auth.uid == resource.data.userId) || isAdmin();
      allow create: if request.auth != null;
      allow update: if isAdmin();
    }

    // Coupons collection
    match /coupons/{couponId} {
      allow read: if true; // Public read for validation
      allow write: if isAdmin(); // Only admins can manage coupons
    }
  }
}
```

## Deployment

### Option 1: Firebase Hosting (Recommended)

1. Install Firebase Tools:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase Hosting in the admin-panel directory:
```bash
firebase init hosting
```

Select:
- Use existing project: Select your Firebase project
- Public directory: `build`
- Single-page app: `Yes`
- Set up automatic builds with GitHub: `No` (optional)

4. Build the app:
```bash
npm run build
```

5. Deploy:
```bash
firebase deploy --only hosting
```

Your admin panel will be available at: `https://your-project-id.web.app`

### Option 2: Vercel

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

Follow the prompts and your admin panel will be deployed.

### Option 3: Netlify

1. Build the app:
```bash
npm run build
```

2. Drag the `build` folder to Netlify's web interface

Or use Netlify CLI:
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=build
```

## Environment Variables for Production

When deploying, set environment variables in your hosting platform:

**Firebase Hosting**: Create `firebase.json`:
```json
{
  "hosting": {
    "public": "build",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{
      "source": "**",
      "destination": "/index.html"
    }]
  }
}
```

**Vercel**: Create `vercel.json` or add environment variables in dashboard

**Netlify**: Add environment variables in Netlify dashboard → Site settings → Build & deploy → Environment

## Security Best Practices

1. **Strong Admin Passwords**: Use strong, unique passwords for admin accounts

2. **Limited Admin Accounts**: Only create admin accounts for trusted team members

3. **Audit Logging**: All admin actions are logged using `auditService.ts`

4. **Firestore Security Rules**: Ensure rules properly restrict admin-only operations

5. **HTTPS Only**: Always use HTTPS for admin panel (automatic with Firebase/Vercel/Netlify)

6. **Regular Security Audits**: Review admin activity logs regularly

7. **2FA (Future)**: Consider implementing two-factor authentication

## Troubleshooting

### Issue: Can't log in

**Solution**:
- Verify user has `role: 'admin'` in Firestore
- Check Firebase Auth credentials
- Check browser console for errors
- Verify Firebase config matches mobile app

### Issue: Permission denied errors

**Solution**:
- Update Firestore security rules to allow admin access
- Verify user role is correctly set
- Check Firebase console for rule errors

### Issue: Data not loading

**Solution**:
- Check Firebase config is correct
- Verify internet connection
- Check browser console for errors
- Ensure Firebase project has data

### Issue: Build fails

**Solution**:
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear build cache
rm -rf build
npm run build
```

## Development Tips

1. **Hot Reload**: Changes are automatically reflected when running `npm start`

2. **TypeScript**: The app is fully typed. Add types in `src/types/index.ts`

3. **Material-UI Customization**: Update theme in `src/App.tsx`

4. **Adding New Pages**:
   - Create component in `src/pages/`
   - Add route in `src/App.tsx`
   - Add navigation link in `src/components/layout/Sidebar.tsx`

5. **State Management**: Uses React Context for auth, consider adding Redux/Zustand for complex state

## Support & Maintenance

- **Admin Dashboard URL**: Will be provided after deployment
- **Default Admin Email**: As configured in Firebase
- **Support Contact**: support@reroute.com

## Future Enhancements

- [ ] Real-time notifications
- [ ] Advanced analytics with charts
- [ ] Bulk operations (approve multiple farmhouses)
- [ ] Email templates customization
- [ ] SMS notifications integration
- [ ] Export reports (PDF, Excel)
- [ ] Role-based permissions (super admin, moderator)
- [ ] Dark mode toggle
- [ ] Multi-language support

---

**Built with ❤️ using React, Material-UI & Firebase**

**Last Updated**: 2025-01-17
