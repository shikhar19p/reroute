# TestSprite Setup Guide for Reroute Backend Testing

This guide will help you set up TestSprite to test your Firebase backend for the Reroute farmhouse booking application.

## Overview

TestSprite is an AI-powered autonomous testing platform that can test your backend APIs and business logic. Since your app uses Firebase/Firestore as the backend, we'll configure TestSprite to test the Firebase operations through your app's web interface.

## Prerequisites

1. **TestSprite Account**: Sign up at [testsprite.com](https://testsprite.com) (free community version available)
2. **Running Application**: Your app needs to be running and accessible via web
3. **Firebase Project**: Your Firebase project should be properly configured

## Step 1: Run Your App in Web Mode

Since TestSprite tests web applications, you need to run your Expo app in web mode:

```bash
npm run web
```

This will start your app at `http://localhost:19006` (or similar).

For TestSprite to access it, you'll need to either:
- **Option A**: Deploy to a publicly accessible URL (Vercel, Netlify, Firebase Hosting)
- **Option B**: Use a tunneling service like ngrok to expose localhost

### Using ngrok (for local testing)

```bash
# Install ngrok
npm install -g ngrok

# Expose your local web app
ngrok http 19006
```

Copy the HTTPS URL provided by ngrok (e.g., `https://abc123.ngrok.io`).

## Step 2: Sign Up for TestSprite

1. Go to [testsprite.com](https://testsprite.com)
2. Sign up for a free account
3. Navigate to the dashboard
4. Get your API key from Settings

## Step 3: Configure TestSprite for Your Project

### In the TestSprite Web Portal:

1. **Create a New Test Project**
   - Project Name: `Reroute Backend Testing`
   - Application URL: Your app URL (ngrok URL or deployed URL)
   - Description: `Testing Firebase backend for farmhouse booking platform`

2. **Configure Test Scope**
   - Focus Areas: Backend API, Database Operations, Business Logic
   - Test Types: Functional Testing, Error Handling, Security Testing

## Step 4: Define Test Scenarios

Use the companion file `TESTSPRITE_SCENARIOS.md` to understand what to test.

### Key Areas to Test:

1. **Authentication**
   - User sign-in flow
   - Role switching (customer/owner)
   - Session management

2. **Farmhouse Management**
   - Browse approved farmhouses
   - View farmhouse details
   - Owner farmhouse CRUD operations

3. **Booking Flow**
   - Create booking with validation
   - Check availability
   - View booking history
   - Cancel bookings

4. **Payment Integration**
   - Payment initiation
   - Payment status tracking
   - Refund processing

5. **Coupon System**
   - Apply coupon codes
   - Validate coupon rules
   - Track coupon usage

## Step 5: Running Tests with TestSprite

### Via Web Portal:

1. Log in to TestSprite dashboard
2. Select your project
3. Click "Start Test"
4. TestSprite will autonomously:
   - Explore your application
   - Generate test cases
   - Execute tests
   - Report results

### Via Natural Language Instructions:

TestSprite accepts plain language instructions. Examples:

```
Test the booking flow from selecting a farmhouse to completing payment
```

```
Verify that expired coupons are properly rejected
```

```
Test that users cannot book overlapping dates for the same farmhouse
```

## Step 6: Monitor Test Results

TestSprite provides:
- Comprehensive test reports
- Execution logs
- Identified issues and bugs
- Performance metrics
- Security findings

Review the reports in the TestSprite dashboard after tests complete (typically 10-20 minutes).

## Important Considerations

### Firebase Security Rules

Since TestSprite will be testing your backend, ensure your Firestore security rules are properly configured:

- Test with a dedicated test Firebase project (recommended)
- Or use Firebase emulator suite for local testing
- Never test against production database

### Test Data Management

TestSprite will create test data during testing. Consider:

1. **Using Firebase Emulator** (Recommended):
```bash
npm install -g firebase-tools
firebase emulators:start
```

2. **Creating a Test Firebase Project**:
- Clone your Firebase configuration
- Use test project credentials
- Isolate test data from production

### Environment Variables

Create a test environment configuration:

```env
# .env.test
FIREBASE_PROJECT_ID=your-test-project-id
FIREBASE_API_KEY=your-test-api-key
# ... other Firebase config
```

## Advanced: Testing Specific Backend Functions

If you want to test specific Firebase functions directly (without UI), you can:

1. Create a REST API wrapper around your Firebase operations
2. Deploy as Cloud Functions
3. Point TestSprite to those endpoints

Example Cloud Function structure:
```javascript
// functions/index.js
exports.testBooking = functions.https.onRequest(async (req, res) => {
  // Call your booking service
  const result = await createBooking(req.body);
  res.json(result);
});
```

## Limitations

TestSprite is designed for web applications. For your React Native app:

- **What TestSprite CAN test**:
  - Expo web version
  - Firebase backend operations
  - API endpoints
  - Business logic validation

- **What TestSprite CANNOT test**:
  - Native mobile UI (iOS/Android)
  - Native modules (camera, biometrics, etc.)
  - Mobile-specific gestures
  - Device-specific features

For comprehensive native mobile testing, consider:
- **Maestro**: YAML-based mobile testing
- **Detox**: React Native E2E testing
- **Appium**: Cross-platform mobile testing

## Next Steps

1. Review `TESTSPRITE_SCENARIOS.md` for detailed test scenarios
2. Review `BACKEND_API_REFERENCE.md` for API documentation
3. Set up your test environment
4. Run your first test suite with TestSprite
5. Review and fix any identified issues

## Support

- TestSprite Documentation: [docs.testsprite.com](https://docs.testsprite.com)
- TestSprite Support: contact@testsprite.com
- Firebase Emulator Guide: [firebase.google.com/docs/emulator-suite](https://firebase.google.com/docs/emulator-suite)

## Tips for Best Results

1. **Start Small**: Begin with one flow (e.g., browsing farmhouses)
2. **Use Clear Test Descriptions**: Help TestSprite understand what to test
3. **Review Logs**: Check what TestSprite is doing in real-time
4. **Iterate**: Refine test scenarios based on initial results
5. **Use Test Data**: Have sample farmhouses and users ready
