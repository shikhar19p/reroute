# TestSprite Test Scenarios for Reroute Backend

This document outlines comprehensive test scenarios for TestSprite to validate your farmhouse booking platform's backend functionality.

## Test Scenario Categories

1. [Authentication & User Management](#1-authentication--user-management)
2. [Farmhouse Browse & Search](#2-farmhouse-browse--search)
3. [Booking Management](#3-booking-management)
4. [Payment Processing](#4-payment-processing)
5. [Coupon & Discount System](#5-coupon--discount-system)
6. [Cancellation & Refunds](#6-cancellation--refunds)
7. [Owner Operations](#7-owner-operations)
8. [Data Validation & Security](#8-data-validation--security)
9. [Error Handling](#9-error-handling)

---

## 1. Authentication & User Management

### Scenario 1.1: User Sign-In
**Test**: Verify Google OAuth sign-in flow
- User can sign in with Google
- User profile is created in Firestore
- Session is properly stored
- Default role is set to 'customer'

**Expected Outcome**:
- User document created in `users` collection
- Session persisted in AsyncStorage
- User redirected to explore screen

### Scenario 1.2: Role Switching
**Test**: Switch user role between customer and owner
- User can switch from customer to owner role
- Role change is persisted in Firestore
- Session is updated with new role
- Audit log is created for role switch

**Expected Outcome**:
- User role updated in database
- Previous role stored in `previousRole` field
- Audit event logged with old and new roles

**Service**: `userService.ts:switchUserRole()`

---

## 2. Farmhouse Browse & Search

### Scenario 2.1: Load Approved Farmhouses
**Test**: Retrieve all approved farmhouses
- Only approved farmhouses are returned
- Farmhouses ordered by creation date (newest first)
- Mock data returned if no farmhouses exist
- Cache works properly (5-minute duration)

**Expected Outcome**:
- Query filters by `status == 'approved'`
- Results include all required fields
- No pending/rejected farmhouses in results

**Service**: `farmhouseService.ts:getApprovedFarmhouses()`

### Scenario 2.2: View Farmhouse Details
**Test**: Load individual farmhouse details
- Farmhouse retrieved by ID
- All details properly formatted
- Photos array populated
- Amenities and rules accessible

**Expected Outcome**:
- Complete farmhouse object returned
- Data normalized for both old and new formats
- Cached for 5 minutes

**Service**: `farmhouseService.ts:getFarmhouseById()`

### Scenario 2.3: Cache Invalidation
**Test**: Verify cache clearing works
- Cache cleared when farmhouse added
- Cache cleared when farmhouse updated
- Fresh data fetched after cache clear

**Expected Outcome**:
- Cache timestamp reset
- New query executed to Firebase

---

## 3. Booking Management

### Scenario 3.1: Create Valid Booking
**Test**: Create a booking with valid data
- Input Data:
  - Check-in: 7 days from now
  - Check-out: 9 days from now
  - Guests: 10
  - Total Price: 15000
- Validation passes
- No date conflicts
- Booking created successfully

**Expected Outcome**:
- Booking document created
- Status: 'pending'
- Payment status: 'pending'
- Audit event logged

**Service**: `bookingService.ts:createBooking()`

### Scenario 3.2: Reject Past Check-In Date
**Test**: Attempt booking with past check-in date
- Check-in date: yesterday
- Validation should fail

**Expected Outcome**:
- Error thrown: "Check-in date must be in the future"
- No booking created

**Validation**: `validators.ts:futureDate()`

### Scenario 3.3: Reject Invalid Date Range
**Test**: Check-out before check-in
- Check-in: 2025-12-01
- Check-out: 2025-11-30

**Expected Outcome**:
- Error: "Check-out must be after check-in"
- No booking created

**Validation**: `validators.ts:dateRange()`

### Scenario 3.4: Booking Conflict Detection
**Test**: Attempt overlapping bookings
1. Create booking for Farm A: Dec 1-3
2. Attempt second booking for Farm A: Dec 2-4

**Expected Outcome**:
- First booking succeeds
- Second booking fails with "Dates not available"

**Service**: `availabilityService.ts:validateBookingDates()`

### Scenario 3.5: Retrieve User Bookings
**Test**: Get all bookings for a user
- User has multiple bookings
- Results ordered by creation date (newest first)

**Expected Outcome**:
- All user bookings returned
- Ordered by `createdAt` descending

**Service**: `bookingService.ts:getUserBookings()`

### Scenario 3.6: Filter Bookings by Status
**Test**: Get only confirmed bookings
- User has bookings in multiple states
- Filter by status: 'confirmed'

**Expected Outcome**:
- Only confirmed bookings returned
- Other statuses excluded

**Service**: `bookingService.ts:getUserBookingsByStatus()`

### Scenario 3.7: Update Booking Status
**Test**: Change booking from pending to confirmed
- Initial status: pending
- Update to: confirmed

**Expected Outcome**:
- Status updated in Firestore
- `updatedAt` timestamp added

**Service**: `bookingService.ts:updateBookingStatus()`

---

## 4. Payment Processing

### Scenario 4.1: Save Payment Record
**Test**: Record successful payment
- Booking ID provided
- User ID provided
- Amount: 15000 INR
- Payment response from Razorpay

**Expected Outcome**:
- Payment document created
- Status: 'success'
- All Razorpay IDs stored

**Service**: `paymentService.ts:savePaymentRecord()`

### Scenario 4.2: Amount Conversion
**Test**: Convert rupees to paise
- Input: ₹150.50
- Expected: 15050 paise

**Expected Outcome**:
- Correct conversion to smallest currency unit

**Service**: `paymentService.ts:formatAmountToPaise()`

### Scenario 4.3: Processing Fee Calculation
**Test**: Calculate 2% + ₹3 fee
- Amount: ₹10000
- Expected fee: ₹203 (200 + 3)

**Expected Outcome**:
- Correct fee calculated

**Service**: `paymentService.ts:calculateProcessingFee()`

### Scenario 4.4: Payment Status Update
**Test**: Update payment from pending to success
- Initial: pending
- Update to: success

**Expected Outcome**:
- Status updated
- Timestamp added

**Service**: `paymentService.ts:updatePaymentStatus()`

---

## 5. Coupon & Discount System

### Scenario 5.1: Apply Valid Percentage Coupon
**Test**: Apply 10% discount coupon
- Coupon: SAVE10 (10% off)
- Booking amount: ₹10000
- Min amount: ₹5000
- Max discount: ₹2000

**Expected Outcome**:
- Discount: ₹1000 (10% of 10000, within max cap)
- Valid: true
- Message: "Coupon applied! You save ₹1000"

**Service**: `couponService.ts:validateCoupon()`

### Scenario 5.2: Apply Fixed Amount Coupon
**Test**: Apply flat ₹500 discount
- Coupon: FLAT500 (₹500 off)
- Booking amount: ₹8000

**Expected Outcome**:
- Discount: ₹500
- Final price: ₹7500

**Service**: `couponService.ts:validateCoupon()`

### Scenario 5.3: Reject Expired Coupon
**Test**: Use expired coupon
- Coupon valid until: 2025-01-01
- Current date: 2025-06-01

**Expected Outcome**:
- Valid: false
- Message: "This coupon has expired"

### Scenario 5.4: Reject Below Minimum Amount
**Test**: Booking amount too low
- Coupon min amount: ₹10000
- Booking amount: ₹8000

**Expected Outcome**:
- Valid: false
- Message: "Minimum booking amount of ₹10000 required"

### Scenario 5.5: Reject Duplicate Coupon Usage
**Test**: User tries to use same coupon twice
1. User applies FIRST100 successfully
2. User tries FIRST100 again

**Expected Outcome**:
- First usage: success
- Second usage: "You have already used this coupon"

### Scenario 5.6: First Booking Coupon Validation
**Test**: FIRSTTIME coupon for new users only
- Coupon: applicableFor = 'first_booking'
- User already has bookings

**Expected Outcome**:
- Valid: false
- Message: "This coupon is only for first-time bookings"

### Scenario 5.7: Farmhouse-Specific Coupon
**Test**: Coupon valid only for specific farmhouses
- Coupon: applicable for farmhouses [A, B]
- User booking farmhouse C

**Expected Outcome**:
- Valid: false
- Message: "This coupon is not applicable for this farmhouse"

### Scenario 5.8: Max Discount Cap
**Test**: Percentage coupon with max cap
- Coupon: 20% off, max ₹1000
- Booking: ₹10000

**Expected Outcome**:
- Calculated: ₹2000 (20%)
- Applied: ₹1000 (capped)

### Scenario 5.9: Usage Limit Exceeded
**Test**: Coupon reached usage limit
- Usage limit: 100
- Used count: 100
- New user tries to apply

**Expected Outcome**:
- Valid: false
- Message: "This coupon has reached its usage limit"

### Scenario 5.10: Record Coupon Usage
**Test**: Track coupon usage
- Apply valid coupon
- Create booking
- Record usage

**Expected Outcome**:
- CouponUsage document created
- Coupon `usedCount` incremented

**Service**: `couponService.ts:recordCouponUsage()`

---

## 6. Cancellation & Refunds

### Scenario 6.1: Free Cancellation (7+ Days)
**Test**: Cancel 10 days before check-in
- Booking amount: ₹10000
- Days until check-in: 10

**Expected Outcome**:
- Refund: 100% (₹10000)
- Processing fee: ₹0
- Message: Free cancellation

**Service**: `cancellationService.ts:previewCancellationRefund()`

### Scenario 6.2: Partial Refund (3-7 Days)
**Test**: Cancel 5 days before check-in
- Booking amount: ₹10000
- Days until check-in: 5

**Expected Outcome**:
- Refund: 50% (₹5000)
- Policy: Partial refund

**Service**: `cancellationService.ts:previewCancellationRefund()`

### Scenario 6.3: No Refund (< 3 Days)
**Test**: Cancel 2 days before check-in
- Booking amount: ₹10000
- Days until check-in: 2

**Expected Outcome**:
- Refund: ₹0
- Message: Non-refundable

### Scenario 6.4: Process Cancellation
**Test**: Complete cancellation workflow
1. Preview refund
2. Confirm cancellation
3. Update booking status
4. Update payment status

**Expected Outcome**:
- Booking status: 'cancelled'
- Payment status: 'refunded'
- Refund record created

**Service**: `cancellationService.ts:cancelBookingWithRefund()`

---

## 7. Owner Operations

### Scenario 7.1: Register New Farmhouse
**Test**: Owner submits farmhouse for approval
- All required fields provided
- KYC documents uploaded
- Status set to 'pending'

**Expected Outcome**:
- Farmhouse document created
- Status: 'pending'
- Awaiting admin approval

**Service**: `farmhouseService.ts:saveFarmRegistration()`

### Scenario 7.2: Get Owner's Farmhouses
**Test**: Retrieve all farmhouses by owner
- Owner has 3 farmhouses
- Various statuses (pending, approved, rejected)

**Expected Outcome**:
- All 3 farmhouses returned
- Ordered by creation date

**Service**: `farmhouseService.ts:getFarmhousesByOwner()`

### Scenario 7.3: View Farmhouse Bookings
**Test**: Owner views bookings for their property
- Farmhouse has 5 bookings
- Various statuses

**Expected Outcome**:
- All 5 bookings returned
- Includes user details

**Service**: `bookingService.ts:getFarmhouseBookings()`

### Scenario 7.4: Admin Approve Farmhouse
**Test**: Admin approves pending farmhouse
- Status: pending → approved
- Approval timestamp added

**Expected Outcome**:
- Status updated to 'approved'
- `approvedAt` timestamp set
- Cache cleared

**Service**: `farmhouseService.ts:approveFarmhouse()`

### Scenario 7.5: Admin Reject Farmhouse
**Test**: Admin rejects farmhouse
- Status: pending → rejected

**Expected Outcome**:
- Status: 'rejected'
- Not visible in user browse

**Service**: `farmhouseService.ts:rejectFarmhouse()`

---

## 8. Data Validation & Security

### Scenario 8.1: Invalid Email Format
**Test**: User registration with invalid email
- Email: "notanemail"

**Expected Outcome**:
- Validation error
- User not created

**Validator**: `validators.ts:email()`

### Scenario 8.2: Invalid Phone Number
**Test**: Invalid phone format
- Phone: "123"

**Expected Outcome**:
- Validation fails
- Proper error message

**Validator**: `validators.ts:phone()`

### Scenario 8.3: Negative Price
**Test**: Booking with negative price
- Total price: -5000

**Expected Outcome**:
- Validation error
- Booking rejected

**Validator**: `validators.ts:price()`

### Scenario 8.4: Capacity Exceeds Limit
**Test**: Booking for 0 guests or negative guests
- Guests: 0

**Expected Outcome**:
- Validation error

**Validator**: `validators.ts:capacity()`

### Scenario 8.5: Invalid Booking Type
**Test**: Booking type not 'dayuse' or 'overnight'
- Booking type: 'weekly'

**Expected Outcome**:
- Rejected
- Only allowed values accepted

---

## 9. Error Handling

### Scenario 9.1: Network Failure
**Test**: Firebase connection error
- Simulate offline mode
- Attempt to fetch farmhouses

**Expected Outcome**:
- Graceful error handling
- Mock data returned (for testing)
- User-friendly error message

### Scenario 9.2: Document Not Found
**Test**: Retrieve non-existent farmhouse
- ID: 'invalid-id-12345'

**Expected Outcome**:
- Returns null
- No exception thrown

**Service**: `farmhouseService.ts:getFarmhouseById()`

### Scenario 9.3: Booking Creation Failure
**Test**: Firebase write error during booking
- Simulate permission denied

**Expected Outcome**:
- Error caught and logged
- User notified
- No partial data created

### Scenario 9.4: Payment Recording Failure
**Test**: Payment succeeds but record save fails
- Razorpay payment success
- Firestore write fails

**Expected Outcome**:
- Error logged
- Retry mechanism or manual reconciliation flag

---

## Priority Test Matrix

### Critical (Must Pass)
- ✅ User authentication
- ✅ Create booking with validation
- ✅ Date conflict detection
- ✅ Payment record creation
- ✅ Coupon validation (basic)
- ✅ Free cancellation refund

### High Priority
- ⚠️ Role switching
- ⚠️ Load approved farmhouses
- ⚠️ Partial refund calculation
- ⚠️ Coupon usage tracking
- ⚠️ Owner farmhouse management

### Medium Priority
- 📋 Cache functionality
- 📋 Complex coupon rules (farmhouse-specific, first booking)
- 📋 Audit logging
- 📋 Booking status updates

### Low Priority
- 📝 Processing fee calculation
- 📝 Amount format conversion
- 📝 Error message formatting

---

## Running Tests with TestSprite

### Natural Language Prompts for TestSprite:

1. **Full Test Suite**:
```
Test all booking scenarios including valid bookings, date conflicts,
and validation errors. Verify that bookings cannot be created with
past dates or overlapping date ranges.
```

2. **Coupon Testing**:
```
Test the coupon system comprehensively. Verify percentage and fixed
discounts, minimum amount requirements, usage limits, expiration dates,
and first-time user restrictions.
```

3. **Cancellation Flow**:
```
Test the cancellation and refund system. Verify different refund
percentages based on days until check-in: 100% for 7+ days, 50% for
3-7 days, and 0% for less than 3 days.
```

4. **Owner Operations**:
```
Test farmhouse registration flow, admin approval process, and owner's
ability to view bookings for their properties.
```

5. **Security & Validation**:
```
Test all input validations including email, phone, price, capacity,
and date validations. Ensure invalid data is properly rejected.
```

---

## Success Criteria

A test passes if:
- ✅ Expected data is created/retrieved correctly
- ✅ Validation rules work as specified
- ✅ Error messages are clear and helpful
- ✅ No data corruption occurs
- ✅ Security rules are enforced
- ✅ Audit logs are created where required

## Test Data Requirements

Create sample data before testing:
- 3-5 approved farmhouses
- 2-3 test users (customer role)
- 1-2 test owners
- 5-10 active coupons with different rules
- Sample bookings in various states

---

**Estimated Test Duration**: 15-20 minutes (full suite with TestSprite)
