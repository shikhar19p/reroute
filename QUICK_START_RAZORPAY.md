# 🚀 Quick Start Guide - Razorpay Integration

**For the impatient developer who just wants to get it working!**

---

## ⏱️ 5-Minute Setup

### Step 1: Get Razorpay Keys (2 minutes)

1. Go to https://razorpay.com and sign up
2. Navigate to: **Settings** → **API Keys** → **Generate Test Key**
3. Copy your:
   - **Key ID** (starts with `rzp_test_`)
   - **Key Secret** (the long string)

### Step 2: Configure Environment (1 minute)

Open `.env` file and replace:

```env
RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID_HERE
RAZORPAY_KEY_SECRET=YOUR_KEY_SECRET_HERE
```

Open `functions/.env` and replace:

```env
RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID_HERE
RAZORPAY_KEY_SECRET=YOUR_KEY_SECRET_HERE
RAZORPAY_WEBHOOK_SECRET=whsec_any_random_string_for_now
```

### Step 3: Deploy Cloud Functions (2 minutes)

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Install function dependencies
cd functions
npm install

# Deploy functions
firebase deploy --only functions

# Go back to root
cd ..
```

That's it! 🎉

---

## 🧪 Test Payment Right Away

### Launch App:
```bash
npm start
```

### Test Payment Flow:

1. Select any farmhouse
2. Choose dates and guests
3. Click "Confirm Booking"
4. Payment gateway opens
5. Use test card: `4111 1111 1111 1111`, CVV: `123`, Expiry: `12/25`
6. Payment succeeds ✅
7. Booking confirmed! 🎉

### Test Refund Flow:

1. Go to "Bookings" tab
2. Cancel a booking
3. Refund processes automatically based on cancellation policy
4. Check Razorpay dashboard for refund

---

## 🔍 Verify Everything Works

### Check Firebase Console:
- Navigate to **Firestore Database**
- Check collections:
  - ✅ `bookings` - Status should be "confirmed", paymentStatus "paid"
  - ✅ `payments` - Payment record saved
  - ✅ `payment_orders` - Order created

### Check Razorpay Dashboard:
- Navigate to **Transactions** → **Payments**
- You should see your test payment
- Status: **Captured** ✅

---

## 🚨 Common Issues

### "Firebase functions not found"
```bash
cd functions
firebase deploy --only functions
```

### "Invalid Key ID"
- Check `.env` file has correct `RAZORPAY_KEY_ID`
- Restart app after changing `.env`

### "Payment failed"
- Use test card: `4111 1111 1111 1111`
- Check internet connection
- Check Firebase function logs: `firebase functions:log`

---

## 📚 Need More Details?

See the complete guide: [RAZORPAY_SETUP.md](./RAZORPAY_SETUP.md)

---

## 🎯 Production Checklist

Before going live:

- [ ] Complete Razorpay KYC
- [ ] Generate **Live Mode** keys (starts with `rzp_live_`)
- [ ] Update `.env` with live keys
- [ ] Update `functions/.env` with live keys
- [ ] Redeploy functions: `firebase deploy --only functions`
- [ ] Configure webhook in Razorpay dashboard
- [ ] Test with small real transaction
- [ ] Monitor logs for 24 hours
- [ ] 🚀 Launch!

---

**Happy Coding! 🚀**
