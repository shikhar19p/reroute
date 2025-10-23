# 🚀 Future Improvements Implementation Guide

This document provides step-by-step instructions for implementing industry-standard improvements to take the app to the next level.

---

## 📑 Table of Contents

1. [Redux Toolkit for Complex State Management](#1-redux-toolkit-for-complex-state-management)
2. [E2E Testing with Detox](#2-e2e-testing-with-detox)
3. [Sentry for Error Tracking](#3-sentry-for-error-tracking)
4. [CI/CD Pipeline](#4-cicd-pipeline)
5. [Performance Monitoring](#5-performance-monitoring)
6. [Code Coverage Reports](#6-code-coverage-reports)

---

## 1. Redux Toolkit for Complex State Management

### 📊 When to Use Redux Toolkit

**Current State:** GlobalDataContext (726 lines) works well for now.

**Add Redux When:**
- Context file exceeds 1000 lines
- More than 5 contexts are being used
- Complex state interactions across 10+ screens
- Need time-travel debugging
- Team size grows beyond 5 developers

### 🔧 Implementation Steps

#### Step 1: Install Dependencies

```bash
npm install @reduxjs/toolkit react-redux
npm install --save-dev @types/react-redux
```

#### Step 2: Create Store Structure

```bash
mkdir -p store/slices
touch store/index.ts
touch store/slices/authSlice.ts
touch store/slices/farmhousesSlice.ts
touch store/slices/bookingsSlice.ts
```

#### Step 3: Create Auth Slice

**File:** `store/slices/authSlice.ts`

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  user: any | null;
  role: 'customer' | 'owner' | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  role: null,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<any>) => {
      state.user = action.payload;
      state.loading = false;
    },
    setRole: (state, action: PayloadAction<'customer' | 'owner'>) => {
      state.role = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.role = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const { setUser, setRole, logout, setLoading, setError } = authSlice.actions;
export default authSlice.reducer;
```

#### Step 4: Create Farmhouses Slice with Async Thunks

**File:** `store/slices/farmhousesSlice.ts`

```typescript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getApprovedFarmhouses } from '../../services/farmhouseService';
import { Farmhouse } from '../../types/navigation';

interface FarmhousesState {
  items: Farmhouse[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;
}

const initialState: FarmhousesState = {
  items: [],
  loading: false,
  error: null,
  lastFetch: null,
};

// Async thunk for fetching farmhouses
export const fetchFarmhouses = createAsyncThunk(
  'farmhouses/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const farmhouses = await getApprovedFarmhouses();
      return farmhouses;
    } catch (error) {
      return rejectWithValue('Failed to fetch farmhouses');
    }
  }
);

const farmhousesSlice = createSlice({
  name: 'farmhouses',
  initialState,
  reducers: {
    clearFarmhouses: (state) => {
      state.items = [];
      state.lastFetch = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFarmhouses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFarmhouses.fulfilled, (state, action) => {
        state.items = action.payload;
        state.loading = false;
        state.lastFetch = Date.now();
      })
      .addCase(fetchFarmhouses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearFarmhouses } = farmhousesSlice.actions;
export default farmhousesSlice.reducer;
```

#### Step 5: Configure Store

**File:** `store/index.ts`

```typescript
import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import authReducer from './slices/authSlice';
import farmhousesReducer from './slices/farmhousesSlice';
import bookingsReducer from './slices/bookingsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    farmhouses: farmhousesReducer,
    bookings: bookingsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore Firebase Timestamp objects
        ignoredActions: ['auth/setUser'],
        ignoredPaths: ['auth.user.metadata'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

#### Step 6: Wrap App with Provider

**File:** `App.tsx`

```typescript
import { Provider } from 'react-redux';
import { store } from './store';

export default function App() {
  return (
    <Provider store={store}>
      {/* Rest of your app */}
    </Provider>
  );
}
```

#### Step 7: Use in Components

```typescript
import { useAppDispatch, useAppSelector } from '../store';
import { fetchFarmhouses } from '../store/slices/farmhousesSlice';

export default function ExploreScreen() {
  const dispatch = useAppDispatch();
  const { items, loading } = useAppSelector((state) => state.farmhouses);

  useEffect(() => {
    dispatch(fetchFarmhouses());
  }, [dispatch]);

  return (
    // Your UI
  );
}
```

### 📊 Redux DevTools

Install Redux DevTools for debugging:

```bash
npm install --save-dev @redux-devtools/extension
```

**Benefits:**
- Time-travel debugging
- Action replay
- State inspection
- Performance monitoring

---

## 2. E2E Testing with Detox

### 🧪 Why Detox?

- Industry standard for React Native E2E testing
- Tests real user workflows
- Catches integration bugs
- Automated on CI/CD

### 🔧 Implementation Steps

#### Step 1: Install Detox

```bash
npm install --save-dev detox
npm install -g detox-cli
```

#### Step 2: Initialize Detox

```bash
detox init
```

This creates:
- `.detoxrc.js` - Configuration file
- `e2e/` - Test directory

#### Step 3: Configure Detox

**File:** `.detoxrc.js`

```javascript
module.exports = {
  testRunner: {
    args: {
      '$0': 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    'ios.release': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Release-iphonesimulator/reroute.app',
      build: 'xcodebuild -workspace ios/reroute.xcworkspace -scheme reroute -configuration Release -sdk iphonesimulator -derivedDataPath ios/build',
    },
    'android.release': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk',
      build: 'cd android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release && cd ..',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 14',
      },
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_5_API_31',
      },
    },
  },
  configurations: {
    'ios.sim.release': {
      device: 'simulator',
      app: 'ios.release',
    },
    'android.emu.release': {
      device: 'emulator',
      app: 'android.release',
    },
  },
};
```

#### Step 4: Create Test Files

**File:** `e2e/login.test.js`

```javascript
describe('Login Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show role selection screen', async () => {
    await expect(element(by.text('Select Your Role'))).toBeVisible();
  });

  it('should navigate to customer login when customer is selected', async () => {
    await element(by.id('customer-role-button')).tap();
    await expect(element(by.text('Sign in with Google'))).toBeVisible();
  });

  it('should successfully login with Google', async () => {
    await element(by.id('customer-role-button')).tap();
    await element(by.id('google-signin-button')).tap();
    // Mock Google Sign-In in test environment
    await expect(element(by.id('explore-screen'))).toBeVisible();
  });
});
```

**File:** `e2e/booking.test.js`

```javascript
describe('Booking Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
    // Login first
    await element(by.id('customer-role-button')).tap();
    await element(by.id('google-signin-button')).tap();
    await waitFor(element(by.id('explore-screen'))).toBeVisible().withTimeout(5000);
  });

  it('should browse farmhouses', async () => {
    await expect(element(by.id('farmhouse-list'))).toBeVisible();
  });

  it('should view farmhouse details', async () => {
    await element(by.id('farmhouse-card-0')).tap();
    await expect(element(by.id('farmhouse-detail-screen'))).toBeVisible();
  });

  it('should select dates and make booking', async () => {
    // Select dates
    await element(by.id('select-dates-button')).tap();
    await element(by.text('25')).tap(); // Check-in
    await element(by.text('27')).tap(); // Check-out
    await element(by.id('confirm-dates-button')).tap();

    // Proceed to booking
    await element(by.id('book-now-button')).tap();
    await expect(element(by.id('booking-confirmation-screen'))).toBeVisible();

    // Confirm booking
    await element(by.id('confirm-booking-button')).tap();
    await waitFor(element(by.text('Booking Confirmed'))).toBeVisible().withTimeout(5000);
  });
});
```

**File:** `e2e/search-filter.test.js`

```javascript
describe('Search and Filter', () => {
  beforeAll(async () => {
    await device.launchApp();
    await element(by.id('customer-role-button')).tap();
    await element(by.id('google-signin-button')).tap();
  });

  it('should search for farmhouses by name', async () => {
    await element(by.id('search-input')).typeText('Villa');
    await expect(element(by.id('farmhouse-list'))).toBeVisible();
  });

  it('should filter by price range', async () => {
    await element(by.id('filter-button')).tap();
    await element(by.id('min-price-input')).typeText('5000');
    await element(by.id('max-price-input')).typeText('10000');
    await element(by.id('apply-filter-button')).tap();
    await expect(element(by.id('farmhouse-list'))).toBeVisible();
  });

  it('should sort by price', async () => {
    await element(by.id('sort-button')).tap();
    await element(by.text('Price: Low to High')).tap();
    await expect(element(by.id('farmhouse-list'))).toBeVisible();
  });
});
```

#### Step 5: Add Test IDs to Components

```typescript
// ExploreScreen.tsx
<View testID="explore-screen">
  <TextInput testID="search-input" />
  <TouchableOpacity testID="filter-button" />
  <FlatList testID="farmhouse-list" />
</View>

// FarmhouseCard.tsx
<TouchableOpacity testID={`farmhouse-card-${index}`}>
  {/* Card content */}
</TouchableOpacity>
```

#### Step 6: Run Tests

```bash
# Build the app
detox build --configuration android.emu.release

# Run tests
detox test --configuration android.emu.release

# Run specific test
detox test e2e/booking.test.js --configuration android.emu.release
```

#### Step 7: Add to package.json

```json
{
  "scripts": {
    "e2e:build:android": "detox build --configuration android.emu.release",
    "e2e:test:android": "detox test --configuration android.emu.release",
    "e2e:build:ios": "detox build --configuration ios.sim.release",
    "e2e:test:ios": "detox test --configuration ios.sim.release"
  }
}
```

---

## 3. Sentry for Error Tracking

### 🐛 Why Sentry?

- Real-time error tracking
- Crash reporting
- Performance monitoring
- User feedback
- Release tracking

### 🔧 Implementation Steps

#### Step 1: Install Sentry

```bash
npm install --save @sentry/react-native
npx @sentry/wizard -i reactNative -p ios android
```

#### Step 2: Configure Sentry

**File:** `sentry.config.ts`

```typescript
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

export const initSentry = () => {
  Sentry.init({
    dsn: Constants.expoConfig?.extra?.sentryDsn,

    // Set environment
    environment: __DEV__ ? 'development' : 'production',

    // Enable tracing
    tracesSampleRate: 1.0,

    // Enable profiling
    profilesSampleRate: 1.0,

    // Ignore common errors
    ignoreErrors: [
      'Network request failed',
      'cancelled',
      'Firebase: Error',
    ],

    // Release tracking
    release: Constants.expoConfig?.version,
    dist: Constants.expoConfig?.extra?.buildNumber,

    // User context
    beforeSend(event, hint) {
      // Don't send errors in development
      if (__DEV__) {
        console.log('Sentry Event:', event);
        return null;
      }
      return event;
    },

    // Integrations
    integrations: [
      new Sentry.ReactNativeTracing({
        routingInstrumentation: new Sentry.ReactNavigationInstrumentation(),
      }),
    ],
  });
};
```

#### Step 3: Initialize in App

**File:** `App.tsx`

```typescript
import { initSentry } from './sentry.config';
import * as Sentry from '@sentry/react-native';

// Initialize Sentry
initSentry();

// Wrap App component
export default Sentry.wrap(App);
```

#### Step 4: Set User Context

**File:** `authContext.tsx`

```typescript
import * as Sentry from '@sentry/react-native';

const login = async (user: any) => {
  // Set user in Sentry
  Sentry.setUser({
    id: user.uid,
    email: user.email,
    username: user.displayName,
  });

  // Set custom context
  Sentry.setContext('user_role', {
    role: userRole,
  });
};

const logout = async () => {
  // Clear user in Sentry
  Sentry.setUser(null);
};
```

#### Step 5: Track Custom Events

```typescript
// Track booking creation
const handleBooking = async () => {
  try {
    const bookingId = await createBooking(bookingData);

    // Track successful booking
    Sentry.addBreadcrumb({
      category: 'booking',
      message: 'Booking created successfully',
      level: 'info',
      data: {
        bookingId,
        farmhouseId: bookingData.farmhouseId,
        totalPrice: bookingData.totalPrice,
      },
    });
  } catch (error) {
    // Capture error with context
    Sentry.captureException(error, {
      tags: {
        action: 'create_booking',
        farmhouseId: bookingData.farmhouseId,
      },
      extra: {
        bookingData,
      },
    });
  }
};
```

#### Step 6: Performance Monitoring

```typescript
import * as Sentry from '@sentry/react-native';

const fetchFarmhouses = async () => {
  // Start transaction
  const transaction = Sentry.startTransaction({
    name: 'Fetch Farmhouses',
    op: 'http.client',
  });

  try {
    const farmhouses = await getApprovedFarmhouses();

    // Mark as successful
    transaction.setStatus('ok');
    return farmhouses;
  } catch (error) {
    // Mark as failed
    transaction.setStatus('internal_error');
    throw error;
  } finally {
    // Finish transaction
    transaction.finish();
  }
};
```

#### Step 7: Add Sentry DSN to Environment

**File:** `app.config.js`

```javascript
export default {
  extra: {
    sentryDsn: process.env.SENTRY_DSN,
    buildNumber: '1',
  },
};
```

**File:** `.env`

```
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

#### Step 8: Test Sentry

```typescript
// Add a test button in development
{__DEV__ && (
  <TouchableOpacity onPress={() => {
    throw new Error('Test Sentry Error');
  }}>
    <Text>Test Sentry</Text>
  </TouchableOpacity>
)}
```

---

## 4. CI/CD Pipeline

### 🔄 Why CI/CD?

- Automated testing
- Consistent builds
- Fast deployment
- Quality assurance
- Release automation

### 🔧 Implementation with GitHub Actions

#### Step 1: Create Workflow File

**File:** `.github/workflows/ci.yml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  # Job 1: Linting and Type Checking
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Run TypeScript
        run: npx tsc --noEmit

  # Job 2: Unit Tests
  test:
    name: Unit Tests
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test -- --coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ./coverage/coverage-final.json

  # Job 3: Build Android
  build-android:
    name: Build Android
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Install dependencies
        run: npm ci

      - name: Build Android APK
        run: |
          cd android
          ./gradlew assembleRelease

      - name: Upload APK
        uses: actions/upload-artifact@v3
        with:
          name: app-release
          path: android/app/build/outputs/apk/release/app-release.apk

  # Job 4: E2E Tests
  e2e-test:
    name: E2E Tests
    runs-on: macos-latest
    needs: build-android
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Detox CLI
        run: npm install -g detox-cli

      - name: Build Detox
        run: detox build --configuration ios.sim.release

      - name: Run Detox Tests
        run: detox test --configuration ios.sim.release --record-logs all

      - name: Upload Test Results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: detox-artifacts
          path: artifacts/

  # Job 5: Deploy to Firebase (on main branch)
  deploy:
    name: Deploy to Firebase
    runs-on: ubuntu-latest
    needs: [build-android, e2e-test]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install Firebase CLI
        run: npm install -g firebase-tools

      - name: Deploy Firestore Rules
        run: firebase deploy --only firestore:rules
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}

      - name: Deploy Functions
        run: firebase deploy --only functions
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

#### Step 2: Add Secrets to GitHub

1. Go to your repository Settings
2. Navigate to Secrets and Variables > Actions
3. Add these secrets:
   - `FIREBASE_TOKEN` - Run `firebase login:ci` locally
   - `CODECOV_TOKEN` - Get from codecov.io
   - `SENTRY_AUTH_TOKEN` - Get from Sentry

#### Step 3: Create Pull Request Workflow

**File:** `.github/workflows/pr-checks.yml`

```yaml
name: PR Checks

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  pr-check:
    name: PR Quality Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Check for console.log
        run: |
          if grep -r "console.log" --include="*.tsx" --include="*.ts" --exclude-dir=node_modules .; then
            echo "Found console.log statements. Please remove them."
            exit 1
          fi

      - name: Check file size
        run: |
          find . -name "*.tsx" -o -name "*.ts" | while read file; do
            lines=$(wc -l < "$file")
            if [ $lines -gt 500 ]; then
              echo "$file has $lines lines (limit: 500)"
              exit 1
            fi
          done

      - name: Run tests
        run: npm test

      - name: Comment PR
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '✅ All checks passed! Ready for review.'
            })
```

#### Step 4: Add Status Badge to README

```markdown
# Reroute App

![CI/CD](https://github.com/yourusername/reroute/workflows/CI%2FCD%20Pipeline/badge.svg)
![Coverage](https://codecov.io/gh/yourusername/reroute/branch/main/graph/badge.svg)
```

---

## 5. Performance Monitoring

### 📊 Why Performance Monitoring?

- Track app speed
- Identify bottlenecks
- Monitor crashes
- User experience metrics

### 🔧 Implementation Steps

#### Step 1: Install Firebase Performance

```bash
npm install @react-native-firebase/perf
```

#### Step 2: Configure Performance Monitoring

**File:** `utils/performance.ts`

```typescript
import perf from '@react-native-firebase/perf';

export class PerformanceMonitor {
  // Track screen load time
  static async trackScreenLoad(screenName: string, callback: () => Promise<void>) {
    const trace = await perf().startTrace(`screen_${screenName}_load`);

    try {
      await callback();
      trace.putMetric('success', 1);
    } catch (error) {
      trace.putMetric('success', 0);
      throw error;
    } finally {
      await trace.stop();
    }
  }

  // Track API calls
  static async trackApiCall(apiName: string, callback: () => Promise<any>) {
    const trace = await perf().startTrace(`api_${apiName}`);
    const startTime = Date.now();

    try {
      const result = await callback();
      const duration = Date.now() - startTime;

      trace.putMetric('duration_ms', duration);
      trace.putMetric('success', 1);

      return result;
    } catch (error) {
      trace.putMetric('success', 0);
      throw error;
    } finally {
      await trace.stop();
    }
  }

  // Track custom metric
  static async trackCustomMetric(
    metricName: string,
    value: number,
    attributes?: Record<string, string>
  ) {
    const trace = await perf().startTrace(metricName);
    trace.putMetric('value', value);

    if (attributes) {
      Object.entries(attributes).forEach(([key, val]) => {
        trace.putAttribute(key, val);
      });
    }

    await trace.stop();
  }
}
```

#### Step 3: Use in Components

```typescript
import { PerformanceMonitor } from '../utils/performance';

export default function ExploreScreen() {
  useEffect(() => {
    PerformanceMonitor.trackScreenLoad('Explore', async () => {
      await loadFarmhouses();
    });
  }, []);

  const loadFarmhouses = async () => {
    await PerformanceMonitor.trackApiCall('fetch_farmhouses', async () => {
      const farmhouses = await getApprovedFarmhouses();
      setFarmhouses(farmhouses);
    });
  };
}
```

#### Step 4: Track Navigation Performance

```typescript
import { PerformanceMonitor } from './utils/performance';

const App = () => {
  const navigationRef = useNavigationContainerRef();

  return (
    <NavigationContainer
      ref={navigationRef}
      onStateChange={() => {
        const currentRoute = navigationRef.getCurrentRoute();
        if (currentRoute) {
          PerformanceMonitor.trackCustomMetric(
            'navigation',
            1,
            { screen: currentRoute.name }
          );
        }
      }}
    >
      {/* Navigation */}
    </NavigationContainer>
  );
};
```

#### Step 5: Monitor App Start Time

```typescript
import perf from '@react-native-firebase/perf';

// Start trace when app initializes
const appStartTrace = perf().newTrace('app_start');
appStartTrace.start();

export default function App() {
  useEffect(() => {
    // Stop trace when app is ready
    const stopTrace = async () => {
      await appStartTrace.stop();
    };

    stopTrace();
  }, []);
}
```

#### Step 6: Custom Performance Hooks

**File:** `hooks/usePerformance.ts`

```typescript
import { useEffect } from 'react';
import { PerformanceMonitor } from '../utils/performance';

export function useScreenPerformance(screenName: string) {
  useEffect(() => {
    const startTime = Date.now();

    return () => {
      const duration = Date.now() - startTime;
      PerformanceMonitor.trackCustomMetric(
        `screen_time_${screenName}`,
        duration
      );
    };
  }, [screenName]);
}

export function useApiPerformance<T>(
  apiCall: () => Promise<T>,
  apiName: string
) {
  return async () => {
    return await PerformanceMonitor.trackApiCall(apiName, apiCall);
  };
}
```

---

## 6. Code Coverage Reports

### 📈 Why Code Coverage?

- Ensure quality
- Find untested code
- Track improvement
- Team accountability

### 🔧 Implementation Steps

#### Step 1: Install Dependencies

```bash
npm install --save-dev @testing-library/react-native @testing-library/jest-native
npm install --save-dev jest-coverage-badges
```

#### Step 2: Configure Jest

**File:** `jest.config.js`

```javascript
module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-vector-icons)/)',
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'screens/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'services/**/*.{ts,tsx}',
    'utils/**/*.{ts,tsx}',
    '!**/*.test.{ts,tsx}',
    '!**/node_modules/**',
    '!**/coverage/**',
  ],
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary',
  ],
};
```

#### Step 3: Create Test Setup

**File:** `jest.setup.js`

```javascript
import '@testing-library/jest-native/extend-expect';

// Mock Firebase
jest.mock('@react-native-firebase/app', () => ({
  firebase: {
    apps: [],
  },
}));

jest.mock('@react-native-firebase/auth', () => ({
  auth: () => ({
    currentUser: null,
    signInWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
  }),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));
```

#### Step 4: Write Unit Tests

**File:** `services/__tests__/bookingService.test.ts`

```typescript
import { createBooking, getUserBookings } from '../bookingService';
import { db } from '../../firebaseConfig';

jest.mock('../../firebaseConfig');

describe('Booking Service', () => {
  describe('createBooking', () => {
    it('should create a booking successfully', async () => {
      const bookingData = {
        farmhouseId: 'test-id',
        userId: 'user-123',
        totalPrice: 5000,
        guests: 4,
        checkInDate: '2025-12-01',
        checkOutDate: '2025-12-03',
        bookingType: 'overnight' as const,
      };

      const mockBookingId = 'booking-123';
      (db.collection as jest.Mock).mockReturnValue({
        add: jest.fn().mockResolvedValue({ id: mockBookingId }),
      });

      const result = await createBooking(bookingData);
      expect(result).toBe(mockBookingId);
    });

    it('should throw error for invalid price', async () => {
      const bookingData = {
        farmhouseId: 'test-id',
        userId: 'user-123',
        totalPrice: 0, // Invalid
        guests: 4,
        checkInDate: '2025-12-01',
        checkOutDate: '2025-12-03',
        bookingType: 'overnight' as const,
      };

      await expect(createBooking(bookingData)).rejects.toThrow();
    });
  });
});
```

**File:** `components/__tests__/BookingCard.test.tsx`

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import BookingCard from '../BookingCard';

describe('BookingCard', () => {
  const mockBooking = {
    id: '1',
    farmhouseName: 'Test Farmhouse',
    checkInDate: '2025-12-01',
    checkOutDate: '2025-12-03',
    totalPrice: 5000,
    status: 'confirmed',
    paymentStatus: 'paid',
    guests: 4,
    bookingType: 'overnight',
  };

  it('should render booking details correctly', () => {
    const { getByText } = render(
      <BookingCard booking={mockBooking} onPress={jest.fn()} />
    );

    expect(getByText('Test Farmhouse')).toBeTruthy();
    expect(getByText('₹5000')).toBeTruthy();
  });

  it('should call onPress when card is pressed', () => {
    const onPressMock = jest.fn();
    const { getByTestId } = render(
      <BookingCard booking={mockBooking} onPress={onPressMock} />
    );

    fireEvent.press(getByTestId('booking-card'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });
});
```

#### Step 5: Run Coverage

```bash
npm test -- --coverage
```

#### Step 6: Generate Coverage Badges

**File:** `scripts/generate-badges.js`

```javascript
const { execSync } = require('child_process');
const fs = require('fs');

// Run tests with coverage
execSync('npm test -- --coverage --coverageReporters=json-summary', {
  stdio: 'inherit',
});

// Read coverage summary
const coverage = JSON.parse(
  fs.readFileSync('./coverage/coverage-summary.json', 'utf8')
);

const { total } = coverage;

// Generate badges
const badges = {
  coverage: `![Coverage](https://img.shields.io/badge/coverage-${total.lines.pct}%25-${
    total.lines.pct >= 80 ? 'green' : total.lines.pct >= 60 ? 'yellow' : 'red'
  })`,
  branches: `![Branches](https://img.shields.io/badge/branches-${total.branches.pct}%25-${
    total.branches.pct >= 70 ? 'green' : total.branches.pct >= 50 ? 'yellow' : 'red'
  })`,
  functions: `![Functions](https://img.shields.io/badge/functions-${total.functions.pct}%25-${
    total.functions.pct >= 70 ? 'green' : total.functions.pct >= 50 ? 'yellow' : 'red'
  })`,
};

console.log('\nCoverage Badges:\n');
console.log(badges.coverage);
console.log(badges.branches);
console.log(badges.functions);
```

#### Step 7: Add to package.json

```json
{
  "scripts": {
    "test": "jest",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch",
    "test:badges": "node scripts/generate-badges.js",
    "test:ci": "jest --ci --coverage --maxWorkers=2"
  }
}
```

#### Step 8: Integrate with Codecov

**File:** `.github/workflows/ci.yml` (add this step)

```yaml
- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    token: ${{ secrets.CODECOV_TOKEN }}
    files: ./coverage/coverage-final.json
    flags: unittests
    name: codecov-umbrella
```

---

## 📚 Summary Checklist

### Redux Toolkit
- [ ] Install @reduxjs/toolkit
- [ ] Create store structure
- [ ] Create slices for auth, farmhouses, bookings
- [ ] Configure store with middleware
- [ ] Wrap App with Provider
- [ ] Use typed hooks (useAppDispatch, useAppSelector)
- [ ] Add Redux DevTools

### Detox E2E Testing
- [ ] Install Detox
- [ ] Configure .detoxrc.js
- [ ] Add testIDs to components
- [ ] Write login flow tests
- [ ] Write booking flow tests
- [ ] Write search/filter tests
- [ ] Run on CI/CD

### Sentry Error Tracking
- [ ] Install @sentry/react-native
- [ ] Configure Sentry with DSN
- [ ] Set user context
- [ ] Track custom events
- [ ] Add breadcrumbs
- [ ] Monitor performance
- [ ] Test error capture

### CI/CD Pipeline
- [ ] Create GitHub Actions workflows
- [ ] Add lint job
- [ ] Add test job
- [ ] Add build job
- [ ] Add E2E test job
- [ ] Add deployment job
- [ ] Add PR checks
- [ ] Configure secrets

### Performance Monitoring
- [ ] Install Firebase Performance
- [ ] Create PerformanceMonitor utility
- [ ] Track screen loads
- [ ] Track API calls
- [ ] Track custom metrics
- [ ] Monitor navigation
- [ ] Track app start time

### Code Coverage
- [ ] Configure Jest
- [ ] Write unit tests
- [ ] Write component tests
- [ ] Set coverage thresholds (70%)
- [ ] Generate coverage reports
- [ ] Add badges
- [ ] Integrate with Codecov

---

## 🎯 Implementation Priority

**Phase 1 (Week 1-2):** Critical
1. ✅ Sentry Error Tracking
2. ✅ Basic CI/CD Pipeline
3. ✅ Code Coverage Setup

**Phase 2 (Week 3-4):** Important
4. ✅ Performance Monitoring
5. ✅ E2E Testing with Detox

**Phase 3 (Month 2):** Enhancement
6. ✅ Redux Toolkit (only if needed)

---

**Last Updated:** 2025-10-23
**Maintainer:** Development Team
**Status:** Ready for Implementation
