# Admin Panel - Quick Start Guide

## Prerequisites

- Node.js (v14 or higher)
- Firebase project (same as mobile app)
- Admin account in Firebase

## Setup Steps

### 1. Install Dependencies

```bash
cd admin-panel
npm install
```

### 2. Configure Environment

The `.env` file has been created with Firebase credentials from your mobile app.

**Verify the configuration:**
- Check that all Firebase credentials are correct
- Ensure `REACT_APP_FIREBASE_PROJECT_ID` matches your project

### 3. Create Admin User

You need to create an admin user in Firebase before logging in:

#### Option A: Using Firebase Console (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `rustique-6b7c4`
3. Go to **Authentication** → **Users** → **Add user**
4. Create user with:
   - Email: `admin@reroute.com`
   - Password: (your secure password)
5. Copy the **UID** of the created user
6. Go to **Firestore Database** → **users** collection
7. Create a new document with ID = UID from step 5
8. Add these fields:

```json
{
  "email": "admin@reroute.com",
  "name": "Admin User",
  "role": "admin",
  "is_active": true,
  "created_at": (current timestamp),
  "permissions": {
    "approveFarmhouses": true,
    "manageBookings": true,
    "manageUsers": true,
    "manageCoupons": true,
    "viewAnalytics": true,
    "managePayments": true
  }
}
```

#### Option B: Using Node.js Script

Create a file `scripts/createAdmin.js`:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./path-to-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function createAdmin() {
  try {
    // Create auth user
    const user = await auth.createUser({
      email: 'admin@reroute.com',
      password: 'YourSecurePassword123!',
      displayName: 'Admin User',
    });

    console.log('✅ Auth user created with UID:', user.uid);

    // Create Firestore document
    await db.collection('users').doc(user.uid).set({
      email: 'admin@reroute.com',
      name: 'Admin User',
      role: 'admin',
      is_active: true,
      created_at: new Date().toISOString(),
      permissions: {
        approveFarmhouses: true,
        manageBookings: true,
        manageUsers: true,
        manageCoupons: true,
        viewAnalytics: true,
        managePayments: true,
      }
    });

    console.log('✅ Admin user document created in Firestore');
    console.log('\n🎉 Admin user created successfully!');
    console.log('Email: admin@reroute.com');
    console.log('UID:', user.uid);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    process.exit(1);
  }
}

createAdmin();
```

Run it:
```bash
node scripts/createAdmin.js
```

### 4. Start the Admin Panel

```bash
npm start
```

The admin panel will open at: `http://localhost:3000`

### 5. Login

1. Navigate to `http://localhost:3000/login`
2. Enter your admin credentials:
   - Email: `admin@reroute.com`
   - Password: (the password you set)
3. Click "Sign In"

## Features Available

After logging in, you'll have access to:

- ✅ **Dashboard** - Overview statistics
- ✅ **Farmhouse Approvals** - Review pending farmhouses
- ✅ **All Farmhouses** - Manage all properties
- ✅ **Bookings** - View all bookings
- ✅ **Users** - Manage users
- ✅ **Coupons** - Create/manage discount codes
- ✅ **Payments** - Track payments and commissions
- ✅ **Revenue** - Financial dashboard
- ✅ **Analytics** - Platform analytics
- ✅ **Reviews** - Manage reviews
- ✅ **Communications** - Send notifications

## Troubleshooting

### Issue: Can't log in

**Solution:**
1. Verify the user has `role: 'admin'` in Firestore
2. Check Firebase Auth is enabled
3. Check browser console for errors
4. Verify `.env` file has correct credentials

### Issue: Permission denied errors

**Solution:**
1. Update Firestore security rules (see ADMIN_PANEL_SETUP.md)
2. Ensure admin user has proper permissions object
3. Check Firebase project settings

### Issue: Data not loading

**Solution:**
1. Check Firebase configuration is correct
2. Verify internet connection
3. Check Firestore has data in collections
4. Check browser console for errors

## Deployment

### Firebase Hosting

```bash
npm run build
firebase deploy --only hosting
```

### Vercel

```bash
vercel
```

### Netlify

```bash
netlify deploy --prod --dir=build
```

## Security Notes

1. ⚠️ Never commit `.env` file to version control
2. ⚠️ Use strong passwords for admin accounts
3. ⚠️ Limit admin accounts to trusted team members
4. ⚠️ Enable 2FA on Firebase accounts
5. ⚠️ Regularly review admin activity logs

## Support

For detailed documentation, see:
- `ADMIN_PANEL_SETUP.md` - Complete setup guide
- `README.md` - Main project documentation

---

**Built with ❤️ using React & Firebase**
