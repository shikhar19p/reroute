# Razorpay Payment Integration Setup Guide

This guide will help you set up and deploy the complete Razorpay payment integration for your Reroute application.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Razorpay Account Setup](#razorpay-account-setup)
3. [Environment Configuration](#environment-configuration)
4. [Firebase Cloud Functions Setup](#firebase-cloud-functions-setup)
5. [Deploy to Production](#deploy-to-production)
6. [Testing the Integration](#testing-the-integration)
7. [Webhook Configuration](#webhook-configuration)
8. [Troubleshooting](#troubleshooting)
9. [Security Best Practices](#security-best-practices)

---

## 🔧 Prerequisites

Before you begin, ensure you have:

- ✅ A Razorpay account (https://razorpay.com)
- ✅ Firebase CLI installed (`npm install -g firebase-tools`)
- ✅ Node.js 18+ installed
- ✅ Access to your Firebase project console
- ✅ Your Firebase project ID (currently: `rustique-6b7c4`)

---

## 🏦 Razorpay Account Setup

### Step 1: Create a Razorpay Account

1. Visit https://razorpay.com and sign up
2. Complete your KYC verification (required for live mode)
3. Navigate to Settings → API Keys

### Step 2: Get Your API Keys

#### **Test Mode** (for development):
1. Switch to "Test Mode" in the dashboard (top-left toggle)
2. Go to Settings → API Keys → Generate Test Key
3. Copy:
   - **Key ID** (starts with `rzp_test_`)
   - **Key Secret** (keep this secure!)

#### **Live Mode** (for production):
1. Complete KYC verification
2. Switch to "Live Mode"
3. Go to Settings → API Keys → Generate Live Key
4. Copy:
   - **Key ID** (starts with `rzp_live_`)
   - **Key Secret** (keep this secure!)

⚠️ **IMPORTANT**: Never commit your secret keys to version control!

---

## 🔐 Environment Configuration

### Step 1: Configure Root Project Environment

1. Copy `.env` file in the root directory:
   ```bash
   # Already created at: .env
   ```

2. Update `.env` with your Razorpay keys:
   ```env
   # For Development (Test Mode)
   RAZORPAY_KEY_ID=rzp_test_YOUR_ACTUAL_KEY_ID
   RAZORPAY_KEY_SECRET=YOUR_ACTUAL_KEY_SECRET

   # For Production (Live Mode)
   # RAZORPAY_KEY_ID=rzp_live_YOUR_ACTUAL_KEY_ID
   # RAZORPAY_KEY_SECRET=YOUR_ACTUAL_KEY_SECRET
   ```

### Step 2: Configure Firebase Cloud Functions Environment

1. Navigate to the functions directory:
   ```bash
   cd functions
   ```

2. Create `.env` file:
   ```bash
   cp .env.example .env
   ```

3. Update `functions/.env`:
   ```env
   RAZORPAY_KEY_ID=rzp_test_YOUR_ACTUAL_KEY_ID
   RAZORPAY_KEY_SECRET=YOUR_ACTUAL_KEY_SECRET
   RAZORPAY_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET
   FIREBASE_PROJECT_ID=rustique-6b7c4
   ```

4. Set Firebase environment config (alternative to .env):
   ```bash
   firebase functions:config:set \
     razorpay.key_id="rzp_test_YOUR_ACTUAL_KEY_ID" \
     razorpay.key_secret="YOUR_ACTUAL_KEY_SECRET" \
     razorpay.webhook_secret="YOUR_WEBHOOK_SECRET"
   ```

   To view current config:
   ```bash
   firebase functions:config:get
   ```

---

## ☁️ Firebase Cloud Functions Setup

### Step 1: Install Dependencies

```bash
cd functions
npm install
```

### Step 2: Build TypeScript

```bash
npm run build
```

### Step 3: Test Locally (Optional)

```bash
# Install Firebase emulator suite
firebase init emulators

# Start emulators
firebase emulators:start
```

The functions will be available at:
- `http://localhost:5001/rustique-6b7c4/us-central1/createOrder`
- `http://localhost:5001/rustique-6b7c4/us-central1/verifyPayment`
- `http://localhost:5001/rustique-6b7c4/us-central1/processRefund`

### Step 4: Deploy to Firebase

```bash
# Login to Firebase (if not already logged in)
firebase login

# Deploy all functions
firebase deploy --only functions

# Or deploy specific function
firebase deploy --only functions:createOrder
firebase deploy --only functions:verifyPayment
firebase deploy --only functions:processRefund
firebase deploy --only functions:razorpayWebhook
```

### Step 5: Verify Deployment

After deployment, you'll see URLs like:
```
✔  functions[createOrder(us-central1)] https://us-central1-rustique-6b7c4.cloudfunctions.net/createOrder
✔  functions[verifyPayment(us-central1)] https://us-central1-rustique-6b7c4.cloudfunctions.net/verifyPayment
✔  functions[processRefund(us-central1)] https://us-central1-rustique-6b7c4.cloudfunctions.net/processRefund
✔  functions[razorpayWebhook(us-central1)] https://us-central1-rustique-6b7c4.cloudfunctions.net/razorpayWebhook
```

Copy the webhook URL for the next step.

---

## 🚀 Deploy to Production

### Step 1: Build the React Native App

```bash
# Return to root directory
cd ..

# For Android
npm run android:release

# For iOS
npm run ios --configuration=Release
```

### Step 2: Update App with Production Keys

1. Update `.env` with **Live Mode** keys:
   ```env
   RAZORPAY_KEY_ID=rzp_live_YOUR_ACTUAL_KEY_ID
   ```

2. Update `functions/.env`:
   ```env
   RAZORPAY_KEY_ID=rzp_live_YOUR_ACTUAL_KEY_ID
   RAZORPAY_KEY_SECRET=YOUR_ACTUAL_LIVE_SECRET
   ```

3. Redeploy functions:
   ```bash
   cd functions
   firebase deploy --only functions
   ```

4. Rebuild the app with production config

---

## 🧪 Testing the Integration

### Test Mode Testing (Recommended First)

1. **Test Card Details** (provided by Razorpay):
   - Card Number: `4111 1111 1111 1111`
   - CVV: Any 3 digits (e.g., `123`)
   - Expiry: Any future date (e.g., `12/25`)
   - Name: Any name

2. **Test UPI ID**:
   - UPI ID: `success@razorpay`
   - For failures: `failure@razorpay`

3. **Test Netbanking**:
   - Select any bank
   - Use test credentials provided in the test flow

### Test Payment Flow

1. Launch the app
2. Select a farmhouse
3. Choose dates and proceed to booking
4. Click "Confirm Booking"
5. Payment gateway should open
6. Use test credentials
7. Complete payment
8. Verify booking is confirmed with payment status "paid"

### Test Cancellation & Refund Flow

1. Go to "Bookings" tab
2. Select a confirmed booking
3. Click "Cancel Booking"
4. Verify refund amount is calculated based on cancellation policy
5. Confirm cancellation
6. Check Firebase console for refund record in `refunds` collection
7. Verify Razorpay dashboard shows the refund

### Monitor Firebase Logs

```bash
# View function logs
firebase functions:log

# Or in Firebase Console
# Navigate to: Functions → Logs
```

---

## 🔔 Webhook Configuration

Webhooks provide real-time payment status updates.

### Step 1: Get Webhook URL

From your Cloud Functions deployment:
```
https://us-central1-rustique-6b7c4.cloudfunctions.net/razorpayWebhook
```

### Step 2: Configure in Razorpay Dashboard

1. Go to Razorpay Dashboard → Settings → Webhooks
2. Click "Add Webhook Endpoint"
3. Enter your webhook URL
4. Select events to listen to:
   - ✅ `payment.authorized`
   - ✅ `payment.captured`
   - ✅ `payment.failed`
   - ✅ `refund.created`
   - ✅ `refund.processed`
5. Set an alert email
6. Click "Create Webhook"

### Step 3: Configure Webhook Secret

1. Copy the webhook secret from Razorpay dashboard
2. Update environment:
   ```bash
   firebase functions:config:set razorpay.webhook_secret="YOUR_WEBHOOK_SECRET"
   ```
3. Redeploy functions:
   ```bash
   firebase deploy --only functions:razorpayWebhook
   ```

### Step 4: Test Webhook

1. In Razorpay Dashboard → Webhooks, click your webhook
2. Click "Send Test Webhook"
3. Check Firebase logs for webhook processing
4. Verify events are being received and processed

---

## 🐛 Troubleshooting

### Issue: "Invalid Key ID"

**Solution**:
- Verify your Key ID starts with `rzp_test_` or `rzp_live_`
- Check that Key ID is correctly set in `.env` files
- Redeploy functions after updating keys

### Issue: Payment Verification Failed

**Solution**:
- Check Firebase function logs: `firebase functions:log`
- Verify Key Secret is correct
- Ensure Cloud Functions are deployed successfully
- Check internet connectivity

### Issue: Refund Not Processing

**Solution**:
- Verify the booking has a valid `transactionId`
- Check that the payment was actually captured in Razorpay
- Ensure sufficient time has passed (Razorpay processes refunds in batches)
- Check Firebase logs for refund errors

### Issue: Webhook Not Receiving Events

**Solution**:
- Verify webhook URL is correct and publicly accessible
- Check webhook secret is configured correctly
- Ensure webhook is active in Razorpay dashboard
- Test with "Send Test Webhook" feature
- Check Firebase function logs

### Issue: Cloud Functions Deployment Failed

**Solution**:
```bash
# Check Firebase CLI version
firebase --version

# Update Firebase CLI
npm install -g firebase-tools@latest

# Re-initialize functions
cd functions
npm install

# Build TypeScript
npm run build

# Deploy again
firebase deploy --only functions
```

### Debug Mode

Enable detailed logging:

1. In `services/paymentService.ts`, all functions already include console.log statements
2. Check Metro bundler logs for client-side errors
3. Check Firebase Console → Functions → Logs for backend errors

---

## 🔒 Security Best Practices

### ✅ DO:

1. **Protect Secrets**:
   - Never commit `.env` files to Git
   - Use Firebase environment config for production
   - Rotate keys periodically

2. **Verify Payments**:
   - Always verify payment signatures on backend (already implemented)
   - Don't trust client-side payment confirmations alone

3. **Use HTTPS**:
   - Firebase Cloud Functions automatically use HTTPS
   - Ensure your app uses secure connections

4. **Monitor Transactions**:
   - Regularly check Razorpay dashboard
   - Set up email alerts for failed payments
   - Monitor Firebase logs for errors

5. **Test Thoroughly**:
   - Test with Test Mode keys before going live
   - Test all payment scenarios (success, failure, cancellation)
   - Test refund flow end-to-end

### ❌ DON'T:

1. ❌ Don't store Key Secret in client-side code
2. ❌ Don't skip payment verification
3. ❌ Don't process refunds without validating booking ownership
4. ❌ Don't expose webhook endpoints without signature verification
5. ❌ Don't use Live Mode keys during development

### Additional Security Measures

1. **Rate Limiting**:
   - Consider implementing rate limiting on Cloud Functions
   - Prevents abuse and reduces costs

2. **Input Validation**:
   - All Cloud Functions validate input parameters
   - Ensure user authentication before processing payments

3. **Audit Logs**:
   - All payment operations are logged
   - Review logs regularly for suspicious activity

4. **Backup Keys**:
   - Keep a secure backup of your API keys
   - Store in password manager or secure vault

---

## 📊 Monitoring & Analytics

### Razorpay Dashboard

Monitor from https://dashboard.razorpay.com:
- Payment success/failure rates
- Refund status
- Settlement details
- Customer disputes

### Firebase Console

Monitor from Firebase Console:
- Function execution logs
- Error rates
- Function performance
- Database writes (bookings, payments, refunds)

### Firestore Collections

Key collections to monitor:
- `bookings` - All bookings with payment status
- `payments` - Payment records with transaction details
- `payment_orders` - Razorpay order records
- `refunds` - Refund processing records

---

## 📞 Support

### Razorpay Support
- Documentation: https://razorpay.com/docs/
- Support: https://razorpay.com/support/
- Phone: Available in Razorpay dashboard

### Firebase Support
- Documentation: https://firebase.google.com/docs
- Stack Overflow: Tag `firebase`
- Community: https://firebase.google.com/community

---

## 🎉 You're All Set!

Your Razorpay payment integration is now complete and ready for production. The system handles:

✅ Secure order creation via backend
✅ Payment processing with Razorpay checkout
✅ Signature verification for security
✅ Automatic booking confirmation
✅ Refund processing for cancellations
✅ Webhook handling for real-time updates

**Next Steps**:
1. Replace placeholder keys with your actual Razorpay keys
2. Test the complete flow in Test Mode
3. Deploy to production when ready
4. Monitor transactions and logs regularly

**Happy Coding! 🚀**
