/**
 * App Information and Legal Links
 * Required for App Store and Google Play compliance
 */

export const APP_INFO = {
  name: 'ReRoute',
  version: '1.0.0',
  buildNumber: '1',
  
  // Company/Developer Info
  company: 'ReRoute Technologies',
  supportEmail: 'support@reroute.app',
  website: 'https://reroute.app',
  
  // Legal Links (REQUIRED for app stores)
  privacyPolicyUrl: 'https://reroute.app/privacy-policy',
  termsOfServiceUrl: 'https://reroute.app/terms-of-service',
  refundPolicyUrl: 'https://reroute.app/refund-policy',
  cookiePolicyUrl: 'https://reroute.app/cookie-policy',
  
  // Social Media
  social: {
    facebook: 'https://facebook.com/reroute',
    instagram: 'https://instagram.com/reroute',
    twitter: 'https://twitter.com/reroute',
    linkedin: 'https://linkedin.com/company/reroute',
  },
  
  // App Store Links
  appStore: {
    ios: 'https://apps.apple.com/app/reroute/id123456789',
    android: 'https://play.google.com/store/apps/details?id=com.reroute.app',
  },
  
  // Feature Flags
  features: {
    enablePayments: true,
    enableNotifications: true,
    enableAnalytics: true,
    enableCrashReporting: true,
    enableReviews: true,
    enableWishlist: true,
    enableChat: false, // Coming soon
  },
  
  // App Limits
  limits: {
    maxPhotosPerFarmhouse: 10,
    maxGuestsPerBooking: 50,
    maxPricePerNight: 100000,
    minPricePerNight: 500,
    maxBookingDaysInAdvance: 365,
    minBookingDaysInAdvance: 1,
    maxReviewLength: 1000,
    minReviewLength: 10,
  },
  
  // Contact Info
  contact: {
    phone: '+91 82803 53535',
    email: 'rustiquebyranareddy@gmail.com',
    address: 'Your Company Address Here',
  },
};

/**
 * App Store Compliance Requirements
 */
export const COMPLIANCE = {
  // Minimum iOS version
  minIOSVersion: '13.0',
  
  // Minimum Android version
  minAndroidVersion: '8.0',
  minAndroidSDK: 26,
  
  // Required permissions with justifications
  permissions: {
    camera: 'To take photos of your property for listing',
    photos: 'To upload property images from your gallery',
    location: 'To show nearby farmhouses and provide directions',
    notifications: 'To send booking confirmations and updates',
  },
  
  // Data collection disclosure
  dataCollection: {
    personalInfo: ['Name', 'Email', 'Phone Number'],
    financialInfo: ['Payment transactions'],
    locationInfo: ['Approximate location for search'],
    usageData: ['App interactions', 'Crash logs'],
  },
  
  // Age rating
  ageRating: {
    ios: '12+',
    android: 'Everyone',
  },
};

/**
 * Error Messages
 */
export const ERROR_MESSAGES = {
  network: 'Please check your internet connection and try again.',
  serverError: 'Something went wrong on our end. Please try again later.',
  unauthorized: 'You need to be logged in to perform this action.',
  notFound: 'The requested resource was not found.',
  validation: 'Please check your input and try again.',
  payment: 'Payment failed. Please try again or use a different payment method.',
  booking: 'Unable to complete booking. Please try again.',
  generic: 'Something went wrong. Please try again.',
};

/**
 * Success Messages
 */
export const SUCCESS_MESSAGES = {
  bookingCreated: 'Booking confirmed! Check your email for details.',
  paymentSuccess: 'Payment successful!',
  profileUpdated: 'Profile updated successfully.',
  reviewSubmitted: 'Thank you for your review!',
  farmhouseCreated: 'Farmhouse listing created successfully.',
  cancellationSuccess: 'Booking cancelled successfully.',
};
