/**
 * Application-wide constants and configuration values
 *
 * This file centralizes all magic numbers and configuration values
 * to make the application easier to maintain and configure.
 *
 * IMPORTANT: Update these values carefully as they affect business logic.
 */

// ============================================================================
// PAYMENT & FEES
// ============================================================================

export const PAYMENT_CONFIG = {
  // Platform fees as percentage (2% = 0.02)
  PLATFORM_FEE_PERCENTAGE: 0.02,

  // Fixed processing fee in INR
  PROCESSING_FEE: 50,

  // Razorpay currency
  CURRENCY: 'INR',

  // Minimum booking amount (in paise for Razorpay, INR for display)
  MIN_BOOKING_AMOUNT_PAISE: 10000, // ₹100
  MIN_BOOKING_AMOUNT_INR: 100,
} as const;

// ============================================================================
// REGISTRATION & KYC
// ============================================================================

export const REGISTRATION_CONFIG = {
  // One-time registration fee for farmhouse owners (in INR)
  FARMHOUSE_REGISTRATION_FEE: 2000,

  // Required document types for KYC
  REQUIRED_DOCUMENTS: ['aadhaar', 'pan', 'bank_details'] as const,

  // Maximum file size for documents (in bytes)
  MAX_DOCUMENT_SIZE: 5 * 1024 * 1024, // 5MB

  // Allowed document file types
  ALLOWED_DOCUMENT_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'] as const,
} as const;

// ============================================================================
// MEDIA & UPLOADS
// ============================================================================

export const MEDIA_CONFIG = {
  // Maximum image file size (in bytes)
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB

  // Allowed image file types
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as const,

  // Minimum and maximum number of farmhouse photos
  MIN_FARMHOUSE_PHOTOS: 5,
  MAX_FARMHOUSE_PHOTOS: 10,

  // Image quality for compression (0-1)
  IMAGE_COMPRESSION_QUALITY: 0.8,
} as const;

// ============================================================================
// BOOKINGS & CANCELLATION
// ============================================================================

export const BOOKING_CONFIG = {
  // Minimum advance booking time (in hours)
  MIN_ADVANCE_BOOKING_HOURS: 24,

  // Maximum advance booking time (in days)
  MAX_ADVANCE_BOOKING_DAYS: 365,

  // Auto-cancellation time for unpaid bookings (in minutes)
  PAYMENT_TIMEOUT_MINUTES: 30,
} as const;

export const CANCELLATION_CONFIG = {
  // Cancellation fee percentages based on days before check-in
  CANCELLATION_FEES: {
    MORE_THAN_7_DAYS: 0.10,     // 10% fee
    BETWEEN_3_TO_7_DAYS: 0.25,  // 25% fee
    LESS_THAN_3_DAYS: 0.50,     // 50% fee
    SAME_DAY: 1.00,             // 100% fee (no refund)
  },

  // Refund processing time (in business days)
  REFUND_PROCESSING_DAYS: 7,
} as const;

// ============================================================================
// CAPACITY & LIMITS
// ============================================================================

export const CAPACITY_CONFIG = {
  // Default min/max guest capacity
  MIN_GUEST_CAPACITY: 1,
  MAX_GUEST_CAPACITY: 100,

  // Maximum number of amenities
  MAX_AMENITIES: 50,

  // Maximum number of games
  MAX_GAMES: 20,

  // Maximum number of rules
  MAX_RULES: 20,
} as const;

// ============================================================================
// VALIDATION
// ============================================================================

export const VALIDATION_CONFIG = {
  // Name length limits
  MIN_NAME_LENGTH: 3,
  MAX_NAME_LENGTH: 100,

  // Description length limits
  MIN_DESCRIPTION_LENGTH: 50,
  MAX_DESCRIPTION_LENGTH: 2000,

  // Phone number format (India)
  PHONE_REGEX: /^[6-9]\d{9}$/,

  // PAN card format
  PAN_REGEX: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,

  // Aadhaar number format
  AADHAAR_REGEX: /^\d{12}$/,

  // IFSC code format
  IFSC_REGEX: /^[A-Z]{4}0[A-Z0-9]{6}$/,
} as const;

// ============================================================================
// PAGINATION & PERFORMANCE
// ============================================================================

export const PAGINATION_CONFIG = {
  // Default page size for listings
  DEFAULT_PAGE_SIZE: 20,

  // Maximum items to load at once
  MAX_PAGE_SIZE: 100,

  // Number of items to prefetch
  PREFETCH_THRESHOLD: 5,
} as const;

// ============================================================================
// REVIEWS & RATINGS
// ============================================================================

export const REVIEW_CONFIG = {
  // Minimum review length
  MIN_REVIEW_LENGTH: 10,

  // Maximum review length
  MAX_REVIEW_LENGTH: 1000,

  // Rating scale
  MIN_RATING: 1,
  MAX_RATING: 5,

  // Time window for leaving review after checkout (in days)
  REVIEW_WINDOW_DAYS: 30,
} as const;

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export const NOTIFICATION_CONFIG = {
  // Notification types
  TYPES: {
    BOOKING_CONFIRMED: 'booking_confirmed',
    BOOKING_CANCELLED: 'booking_cancelled',
    PAYMENT_SUCCESS: 'payment_success',
    PAYMENT_FAILED: 'payment_failed',
    REVIEW_RECEIVED: 'review_received',
    FARMHOUSE_APPROVED: 'farmhouse_approved',
    FARMHOUSE_REJECTED: 'farmhouse_rejected',
  },

  // Push notification settings
  ENABLE_PUSH: true,
  ENABLE_EMAIL: true,
} as const;

// ============================================================================
// SESSION & CACHE
// ============================================================================

export const SESSION_CONFIG = {
  // Session timeout (in milliseconds)
  SESSION_TIMEOUT_MS: 24 * 60 * 60 * 1000, // 24 hours

  // Session storage key
  SESSION_KEY: '@reroute_session',

  // Cache timeout for farmhouse data (in milliseconds)
  CACHE_TIMEOUT_MS: 5 * 60 * 1000, // 5 minutes
} as const;

// ============================================================================
// FIRESTORE COLLECTION NAMES
// ============================================================================

export const COLLECTIONS = {
  USERS: 'users',
  FARMHOUSES: 'farmhouses',
  BOOKINGS: 'bookings',
  PAYMENTS: 'payments',
  REVIEWS: 'reviews',
  AUDIT_LOGS: 'audit_logs',
  COUPONS: 'coupons',
  FAVORITES: 'favorites',
  APPROVAL_HISTORY: 'approval_history',
  ADMIN_NOTES: 'admin_notes',
  COMMUNICATIONS: 'communications',
} as const;

// ============================================================================
// APP METADATA
// ============================================================================

export const APP_CONFIG = {
  NAME: 'ReRoute',
  VERSION: '1.0.0',
  SUPPORT_EMAIL: 'support@reroute.app',
  SUPPORT_PHONE: '+91-XXXXXXXXXX', // Update with actual support number
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate platform fee for a given amount
 */
export function calculatePlatformFee(amount: number): number {
  return Math.round(amount * PAYMENT_CONFIG.PLATFORM_FEE_PERCENTAGE);
}

/**
 * Calculate total payment including fees
 */
export function calculateTotalPayment(baseAmount: number): number {
  const platformFee = calculatePlatformFee(baseAmount);
  return baseAmount + platformFee + PAYMENT_CONFIG.PROCESSING_FEE;
}

/**
 * Calculate cancellation fee based on days before check-in
 */
export function calculateCancellationFee(amount: number, daysBeforeCheckIn: number): number {
  let feePercentage: number;

  if (daysBeforeCheckIn > 7) {
    feePercentage = CANCELLATION_CONFIG.CANCELLATION_FEES.MORE_THAN_7_DAYS;
  } else if (daysBeforeCheckIn >= 3) {
    feePercentage = CANCELLATION_CONFIG.CANCELLATION_FEES.BETWEEN_3_TO_7_DAYS;
  } else if (daysBeforeCheckIn >= 1) {
    feePercentage = CANCELLATION_CONFIG.CANCELLATION_FEES.LESS_THAN_3_DAYS;
  } else {
    feePercentage = CANCELLATION_CONFIG.CANCELLATION_FEES.SAME_DAY;
  }

  return Math.round(amount * feePercentage);
}
