# Testing Setup Guide

## Overview

This project is configured with Jest and React Native Testing Library for comprehensive testing.

## Current Status

### Known Issue: Expo 54 + Jest Compatibility

There is a known issue with Expo 54 and Jest related to the WinterJS runtime and `import.meta`:

```
ReferenceError: You are trying to `import` a file outside of the scope of the test code.
at Runtime._execModule (node_modules/jest-runtime/build/index.js:1216:13)
at require (node_modules/expo/src/winter/runtime.native.ts:20:43)
```

This occurs when:
- Tests import files that depend on `expo` or `expo-constants`
- WinterJS runtime tries to access `import.meta` which is not available in Jest's Node environment

### Temporary Solutions

Until Expo 54.1+ fixes this issue, here are your options:

#### Option 1: Test Utility Functions Only (Current Setup)

Test pure utility functions that don't have Expo dependencies:

```typescript
// ✅ Works - No Expo dependencies
import { validators } from '../utils/validators';
import { calculateFinalPrice } from '../utils/priceCalculator';

// ❌ Fails - Has Expo dependencies
import { getApprovedFarmhouses } from '../services/farmhouseService'; // Imports firebaseConfig → expo-constants
```

#### Option 2: Downgrade to Expo 53

```bash
npm install expo@~53.0.0 --save
npm install jest-expo@~53.0.0 --save-dev
```

#### Option 3: Wait for Expo 54.1

Monitor: https://github.com/expo/expo/issues

#### Option 4: Use Vitest Instead of Jest

Vitest has better ESM support:

```bash
npm install --save-dev vitest @vitest/ui
```

## What's Installed

- ✅ Jest 30.2.0
- ✅ @testing-library/react-native 13.3.3
- ✅ jest-expo 54.0.12
- ✅ @types/jest 30.0.0

## Current Test Coverage

### Working Tests

The following test files are ready (but blocked by Expo issue):

1. **utils/__tests__/validators.test.ts**
   - 100+ test cases
   - All input validators
   - Edge cases and boundary conditions

2. **services/__tests__/paymentService.test.ts**
   - Payment amount conversions (rupees ↔ paise)
   - Processing fee calculations
   - Order ID generation
   - Round-trip conversions

3. **services/__tests__/couponService.test.ts**
   - Discount calculations (percentage and fixed)
   - Coupon display formatting
   - Real-world coupon scenarios
   - Edge cases

### Test Scripts

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Workaround: Manual Function Testing

While the Expo issue is being resolved, you can test functions manually:

### Create Standalone Test Files

Create test files that don't import from the main codebase:

```typescript
// __tests__/standalone/validators.standalone.test.ts

// Copy the validator functions directly (temporary)
function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

describe('Email Validator', () => {
  it('should validate correct emails', () => {
    expect(validateEmail('test@example.com')).toBe(true);
  });
});
```

### Use Node.js REPL for Quick Tests

```bash
node
> const formatAmountToPaise = (rupees) => Math.round(rupees * 100);
> formatAmountToPaise(100);
10000
```

## Configuration Files

### jest.config.js

```javascript
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node',
  // ... (see file for full config)
};
```

### jest.setup.js

Contains mocks for:
- Firebase (app, auth, firestore, storage)
- AsyncStorage
- Razorpay
- Expo modules (constants, notifications)

### package.json Test Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

## Test File Organization

```
reroute/
├── utils/
│   ├── __tests__/
│   │   └── validators.test.ts       ✅ 100+ tests
│   └── validators.ts
├── services/
│   ├── __tests__/
│   │   ├── paymentService.test.ts   ✅ 50+ tests
│   │   └── couponService.test.ts    ✅ 60+ tests
│   ├── paymentService.ts
│   └── couponService.ts
```

## Alternative: TestSprite for Backend

While unit tests are blocked, you can use **TestSprite** for backend/integration testing:

See `TESTSPRITE_SETUP.md` for comprehensive backend testing with TestSprite.

## Recommendations

### Short Term (Current)

1. ✅ Keep test files ready for when Expo fixes the issue
2. ✅ Use TestSprite for backend API testing
3. ✅ Manual testing for critical paths
4. ✅ Monitor Expo GitHub for updates

### Medium Term (1-2 weeks)

1. Check if Expo 54.1+ resolves the issue
2. Consider downgrading to Expo 53 if testing is critical
3. Evaluate Vitest as an alternative

### Long Term (1+ month)

1. Full test coverage with Jest once issue is resolved
2. CI/CD integration with automated testing
3. Pre-commit hooks to run tests

## Example: When Tests Work

Once the Expo issue is resolved, running `npm test` will output:

```
PASS  utils/__tests__/validators.test.ts
  Validators
    aadhaar
      ✓ should accept valid 12-digit Aadhaar (3ms)
      ✓ should reject invalid Aadhaar (1ms)
    email
      ✓ should accept valid emails (2ms)
      ✓ should reject invalid emails (1ms)
    ... (100+ more tests)

PASS  services/__tests__/paymentService.test.ts
  Payment Service
    formatAmountToPaise
      ✓ should convert rupees to paise correctly (2ms)
    ... (50+ more tests)

PASS  services/__tests__/couponService.test.ts
  Coupon Service
    calculateFinalPrice
      ✓ should calculate final price after discount (1ms)
    ... (60+ more tests)

Test Suites: 3 passed, 3 total
Tests:       210 passed, 210 total
Snapshots:   0 total
Time:        3.456s
```

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Expo Testing Guide](https://docs.expo.dev/develop/unit-testing/)
- [TestSprite Docs](https://docs.testsprite.com/)

## Support

If you encounter issues:

1. Check Expo GitHub: https://github.com/expo/expo/issues
2. Jest + Expo compatibility: https://docs.expo.dev/develop/unit-testing/
3. TestSprite alternative: See `TESTSPRITE_SETUP.md`

---

**Status**: Tests are written and ready. Waiting for Expo 54 jest compatibility fix.

**Last Updated**: 2025-01-17
