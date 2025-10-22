# Reroute Backend API Reference

Complete documentation of all backend services and Firebase operations for the Reroute farmhouse booking platform.

## Table of Contents

1. [Firebase Configuration](#firebase-configuration)
2. [Booking Service](#booking-service)
3. [Farmhouse Service](#farmhouse-service)
4. [Payment Service](#payment-service)
5. [Coupon Service](#coupon-service)
6. [Cancellation Service](#cancellation-service)
7. [User Service](#user-service)
8. [Review Service](#review-service)
9. [Notification Service](#notification-service)
10. [Availability Service](#availability-service)
11. [Audit Service](#audit-service)
12. [Validators](#validators)

---

## Firebase Configuration

**File**: `firebaseConfig.ts`

### Setup
```typescript
// Firebase Collections
- users/          // User profiles and authentication
- farmhouses/     // Property listings
- bookings/       // Booking records
- payments/       // Payment transactions
- coupons/        // Discount coupons
- couponUsage/    // Coupon usage tracking
- notifications/  // Push notifications
- reviews/        // Farmhouse reviews
- audit/          // Audit logs
```

### Environment Variables
```env
FIREBASE_API_KEY
FIREBASE_AUTH_DOMAIN
FIREBASE_PROJECT_ID
FIREBASE_STORAGE_BUCKET
FIREBASE_MESSAGING_SENDER_ID
FIREBASE_APP_ID
```

---

## Booking Service

**File**: `services/bookingService.ts`

### Data Model
```typescript
interface Booking {
  id: string;
  farmhouseId: string;
  farmhouseName: string;
  userId: string;
  userEmail: string;
  userName: string;
  userPhone: string;
  checkInDate: string;        // ISO format
  checkOutDate: string;       // ISO format
  guests: number;
  totalPrice: number;
  bookingType: 'dayuse' | 'overnight';
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

### Functions

#### `createBooking(bookingData)`
Creates a new booking with validation and conflict detection.

**Parameters**:
```typescript
bookingData: Omit<Booking, 'id' | 'createdAt'>
```

**Validations**:
- Check-in date must be in the future
- Check-out must be after check-in
- Price must be positive
- Capacity must be >= 1
- No date conflicts with existing bookings

**Returns**: `Promise<string>` - Booking ID

**Errors**:
- "Validation failed: {errors}"
- "Dates not available"

**Side Effects**:
- Creates audit log entry
- Sets initial status to 'pending'

**Location**: Line 38

---

#### `getUserBookings(userId)`
Retrieves all bookings for a specific user.

**Parameters**:
- `userId: string`

**Returns**: `Promise<Booking[]>`

**Sorting**: Newest first (createdAt DESC)

**Location**: Line 98

---

#### `getUserBookingsByStatus(userId, status)`
Filters user bookings by status.

**Parameters**:
- `userId: string`
- `status: 'pending' | 'confirmed' | 'cancelled' | 'completed'`

**Returns**: `Promise<Booking[]>`

**Location**: Line 117

---

#### `getFarmhouseBookings(farmhouseId)`
Gets all bookings for a specific farmhouse (for owners).

**Parameters**:
- `farmhouseId: string`

**Returns**: `Promise<Booking[]>`

**Location**: Line 137

---

#### `updateBookingStatus(bookingId, status)`
Updates a booking's status.

**Parameters**:
- `bookingId: string`
- `status: Booking['status']`

**Returns**: `Promise<void>`

**Side Effects**:
- Updates `updatedAt` timestamp

**Location**: Line 156

---

#### `cancelBooking(bookingId)`
Cancels a booking (shorthand for updateBookingStatus).

**Parameters**:
- `bookingId: string`

**Returns**: `Promise<void>`

**Location**: Line 174

---

#### `updatePaymentStatus(bookingId, paymentStatus)`
Updates payment status for a booking.

**Parameters**:
- `bookingId: string`
- `paymentStatus: 'pending' | 'paid' | 'refunded'`

**Returns**: `Promise<void>`

**Location**: Line 195

---

## Farmhouse Service

**File**: `services/farmhouseService.ts`

### Data Model
```typescript
interface Farmhouse {
  id: string;
  name: string;
  location: string;
  city: string;
  area: string;
  mapLink: string;
  bedrooms: number;
  capacity: number;
  description: string;
  price: number;              // Weekday price
  weekendPrice: number;
  customPricing?: Array<{ label: string; price: number }>;
  photos: string[];           // Photo URLs
  amenities: {
    tv: number;
    geyser: number;
    bonfire: number;
    chess: number;
    carroms: number;
    volleyball: number;
    pool: boolean;
  };
  rules: {
    unmarriedCouples: boolean;
    pets: boolean;
    quietHours: boolean;
  };
  kyc: {
    aadhaarFront: string;
    aadhaarBack: string;
    panCard: string;
    labourLicense: string;
    bankAccountHolder: string;
    bankAccountNumber: string;
    ifscCode: string;
    branch: string;
  };
  ownerId: string;
  ownerEmail: string;
  status: 'pending' | 'approved' | 'rejected';
  rating?: number;
  reviews?: number;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  createdAt: Timestamp;
  approvedAt?: Timestamp;
}
```

### Functions

#### `saveFarmRegistration(farmData)`
Registers a new farmhouse (pending approval).

**Parameters**:
```typescript
farmData: Omit<Farmhouse, 'id' | 'createdAt' | 'status'>
```

**Returns**: `Promise<string>` - Farmhouse ID

**Side Effects**:
- Sets status to 'pending'
- Clears farmhouse cache
- Initializes rating: 0, reviews: 0

**Location**: Line 76

---

#### `getApprovedFarmhouses(forceRefresh?)`
Retrieves all approved farmhouses with caching.

**Parameters**:
- `forceRefresh?: boolean` (default: false)

**Returns**: `Promise<Farmhouse[]>`

**Cache**: 5 minutes

**Fallback**: Returns mock data if none found

**Location**: Line 201

---

#### `getFarmhouseById(id, forceRefresh?)`
Gets a single farmhouse by ID with caching.

**Parameters**:
- `id: string`
- `forceRefresh?: boolean`

**Returns**: `Promise<Farmhouse | null>`

**Cache**: 5 minutes

**Location**: Line 280

---

#### `approveFarmhouse(farmId)`
Admin function to approve a farmhouse.

**Parameters**:
- `farmId: string`

**Returns**: `Promise<void>`

**Side Effects**:
- Updates status to 'approved'
- Sets `approvedAt` timestamp
- Clears cache

**Location**: Line 350

---

#### `rejectFarmhouse(farmId)`
Admin function to reject a farmhouse.

**Parameters**:
- `farmId: string`

**Returns**: `Promise<void>`

**Side Effects**:
- Sets status to 'rejected'
- Clears cache

**Location**: Line 367

---

#### `getFarmhousesByOwner(ownerId)`
Gets all farmhouses owned by a specific user.

**Parameters**:
- `ownerId: string`

**Returns**: `Promise<Farmhouse[]>`

**Includes**: All statuses (pending, approved, rejected)

**Location**: Line 414

---

#### `updateFarmhouse(farmId, updates)`
Updates farmhouse details.

**Parameters**:
- `farmId: string`
- `updates: Partial<Farmhouse>`

**Returns**: `Promise<void>`

**Side Effects**:
- Adds `updatedAt` timestamp
- Clears cache

**Location**: Line 397

---

#### `clearFarmhousesCache()`
Manually clears farmhouse cache.

**Returns**: `void`

**Location**: Line 194

---

## Payment Service

**File**: `services/paymentService.ts`

### Data Models

```typescript
interface PaymentDetails {
  orderId: string;
  amount: number;           // in paise (₹1 = 100 paise)
  currency: string;         // 'INR'
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  description: string;
  bookingId?: string;
}

interface PaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface PaymentRecord {
  id: string;
  bookingId: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  paymentMethod: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
  errorMessage?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

### Functions

#### `initiatePayment(paymentDetails)`
Opens Razorpay checkout for payment.

**Parameters**: `PaymentDetails`

**Returns**: `Promise<PaymentResponse>`

**Errors**:
- "Payment was cancelled by user" (code: PAYMENT_CANCELLED)
- "Payment failed. Please try again."

**Note**: Native module - works on mobile only

**Location**: Line 48

---

#### `savePaymentRecord(bookingId, userId, amount, currency, paymentResponse?)`
Saves payment record to Firestore.

**Parameters**:
- `bookingId: string`
- `userId: string`
- `amount: number`
- `currency: string`
- `paymentResponse?: PaymentResponse`

**Returns**: `Promise<string>` - Payment ID

**Location**: Line 90

---

#### `updatePaymentStatus(paymentId, status, errorMessage?)`
Updates payment status.

**Parameters**:
- `paymentId: string`
- `status: 'pending' | 'success' | 'failed' | 'refunded'`
- `errorMessage?: string`

**Returns**: `Promise<void>`

**Location**: Line 123

---

#### `formatAmountToPaise(rupees)`
Converts rupees to paise for Razorpay.

**Parameters**: `rupees: number`

**Returns**: `number` (rounded)

**Example**: 150.50 → 15050

**Location**: Line 204

---

#### `formatAmountToRupees(paise)`
Converts paise back to rupees.

**Parameters**: `paise: number`

**Returns**: `number`

**Example**: 15050 → 150.50

**Location**: Line 211

---

#### `calculateProcessingFee(amount)`
Calculates 2% + ₹3 processing fee.

**Parameters**: `amount: number`

**Returns**: `number` (rounded)

**Formula**: `(amount * 0.02) + 3`

**Location**: Line 194

---

#### `generateOrderId(bookingId)`
Generates temporary order ID.

**Parameters**: `bookingId: string`

**Returns**: `string`

**Format**: `order_{bookingId}_{timestamp}`

**Note**: Production should use Razorpay Orders API

**Location**: Line 219

---

## Coupon Service

**File**: `services/couponService.ts`

### Data Models

```typescript
interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;    // % or ₹ amount
  minBookingAmount: number;
  maxDiscountAmount?: number;
  validFrom: string;        // ISO date
  validUntil: string;       // ISO date
  usageLimit: number;
  usedCount: number;
  applicableFor: 'all' | 'first_booking' | 'specific_farmhouses';
  farmhouseIds?: string[];
  active: boolean;
  description?: string;
  createdAt: Timestamp;
}

interface CouponUsage {
  userId: string;
  couponId: string;
  bookingId: string;
  discountAmount: number;
  usedAt: Timestamp;
}
```

### Functions

#### `validateCoupon(code, bookingAmount, userId, farmhouseId?)`
Validates coupon code and calculates discount.

**Parameters**:
- `code: string`
- `bookingAmount: number`
- `userId: string`
- `farmhouseId?: string`

**Returns**:
```typescript
{
  valid: boolean;
  discount: number;
  message: string;
  coupon?: Coupon;
}
```

**Validation Checks**:
1. Coupon exists
2. Is active
3. Valid date range
4. Usage limit not exceeded
5. Minimum amount met
6. User hasn't used it before
7. Farmhouse-specific applicability
8. First booking requirement

**Discount Calculation**:
- Percentage: `(amount * value / 100)` capped at maxDiscountAmount
- Fixed: Direct value subtraction

**Location**: Line 33

---

#### `recordCouponUsage(couponId, userId, bookingId, discountAmount)`
Records coupon usage and increments count.

**Parameters**:
- `couponId: string`
- `userId: string`
- `bookingId: string`
- `discountAmount: number`

**Returns**: `Promise<void>`

**Side Effects**:
- Creates couponUsage document
- Increments coupon's usedCount

**Location**: Line 149

---

#### `getActiveCoupons()`
Gets all currently active coupons.

**Returns**: `Promise<Coupon[]>`

**Filters**:
- active == true
- validUntil > now

**Location**: Line 186

---

#### `createCoupon(couponData)`
Admin function to create new coupon.

**Parameters**:
```typescript
couponData: Omit<Coupon, 'id' | 'usedCount' | 'createdAt'>
```

**Returns**: `Promise<string>` - Coupon ID

**Side Effects**:
- Converts code to uppercase
- Initializes usedCount to 0

**Location**: Line 209

---

## Cancellation Service

**File**: `services/cancellationService.ts`

### Functions

#### `previewCancellationRefund(bookingId)`
Calculates refund amount based on cancellation policy.

**Parameters**: `bookingId: string`

**Returns**:
```typescript
{
  refundAmount: number;
  refundPercentage: number;
  policyType: 'free' | 'partial' | 'non-refundable';
  daysUntilCheckIn: number;
  processingFee: number;
}
```

**Policy**:
- ≥7 days: 100% refund (free cancellation)
- 3-6 days: 50% refund (partial)
- <3 days: 0% refund (non-refundable)

---

#### `cancelBookingWithRefund(bookingId, userId, reason)`
Processes cancellation and refund.

**Parameters**:
- `bookingId: string`
- `userId: string`
- `reason: string`

**Returns**:
```typescript
{
  success: boolean;
  refundAmount: number;
  message: string;
}
```

**Side Effects**:
- Updates booking status to 'cancelled'
- Updates payment status to 'refunded'
- Creates refund record
- Sends notification

---

## User Service

**File**: `services/userService.ts`

### Functions

#### `switchUserRole(userId, newRole)`
Switches user between customer and owner roles.

**Parameters**:
- `userId: string`
- `newRole: 'customer' | 'owner'`

**Returns**: `Promise<void>`

**Side Effects**:
- Updates role in Firestore
- Stores previous role
- Updates session
- Creates audit log

**Location**: Line 9

---

#### `getUserRole(userId)`
Gets user's current role.

**Parameters**: `userId: string`

**Returns**: `Promise<'customer' | 'owner' | null>`

**Location**: Line 56

---

## Validators

**File**: `utils/validators.ts`

### Validation Functions

#### `email(value)`
Validates email format.

**Returns**: `string | null` (error message or null if valid)

---

#### `phone(value)`
Validates phone number (10 digits).

**Returns**: `string | null`

---

#### `futureDate(date)`
Ensures date is in the future.

**Returns**: `string | null`

---

#### `dateRange(checkIn, checkOut)`
Validates check-out is after check-in.

**Returns**: `string | null`

---

#### `price(amount)`
Ensures price is positive.

**Returns**: `string | null`

---

#### `capacity(guests)`
Validates guest count >= 1.

**Returns**: `string | null`

---

#### `validateFields(validations)`
Runs multiple validations and collects errors.

**Parameters**: `validations: (string | null)[]`

**Returns**: `string[]` (array of error messages)

---

## Common Patterns

### Error Handling
```typescript
try {
  // Operation
} catch (error) {
  console.error('Error description:', error);
  throw error; // or return default value
}
```

### Timestamps
All documents use Firebase `serverTimestamp()`:
```typescript
{
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
}
```

### Queries
Common query pattern:
```typescript
const q = query(
  collection(db, 'collectionName'),
  where('field', '==', value),
  orderBy('createdAt', 'desc')
);
const snapshot = await getDocs(q);
```

### Caching
Services use simple timestamp-based caching:
```typescript
if (cache && (now - cache.timestamp < CACHE_DURATION)) {
  return cache.data;
}
```

---

## Firebase Security Considerations

### Important Notes

1. **Client-Side Limitations**: Current implementation has business logic on the client
2. **Production Recommendations**:
   - Move critical logic to Cloud Functions
   - Implement proper Firestore Security Rules
   - Verify payment signatures server-side
   - Use Firebase Admin SDK for privileged operations

### Recommended Firestore Rules

See README.md (lines 147-182) for complete security rules.

Key principles:
- Users can only read/write their own data
- Bookings visible to user and farmhouse owner
- Only approved farmhouses visible to public
- Admin operations require authentication

---

## Testing Checklist

✅ **Unit Tests**
- Validators
- Utility functions (amount conversion, fee calculation)

✅ **Integration Tests**
- Booking creation flow
- Coupon validation logic
- Refund calculation

✅ **E2E Tests** (with TestSprite)
- Complete booking journey
- Payment flow
- Cancellation process
- Owner registration and approval

---

## API Response Codes

Since this is Firebase/Firestore, errors come from Firebase:

Common Firebase errors:
- `permission-denied`: Security rules blocked operation
- `not-found`: Document doesn't exist
- `already-exists`: Duplicate document
- `failed-precondition`: Query constraint violated

Handle with try-catch and provide user-friendly messages.

---

## Performance Tips

1. **Use Caching**: Farmhouses cached for 5 minutes
2. **Limit Queries**: Use pagination for large lists
3. **Index Fields**: Create Firestore indexes for common queries
4. **Batch Operations**: Use batch writes when updating multiple docs
5. **Optimize Images**: Compress before uploading to Storage

---

**Last Updated**: 2025-01-15
**Version**: 1.0.0
