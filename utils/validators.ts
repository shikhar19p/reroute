/**
 * Data Validation Utilities
 * Provides comprehensive validation for user inputs, PII, and business logic
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validators = {
  /**
   * Validate Indian Aadhaar number (12 digits)
   */
  aadhaar: (num: string): ValidationResult => {
    const cleaned = num.replace(/\s/g, '');
    const isValid = /^\d{12}$/.test(cleaned);
    return {
      isValid,
      error: isValid ? undefined : 'Aadhaar must be exactly 12 digits',
    };
  },

  /**
   * Validate Indian PAN number (AAAAA9999A format)
   */
  pan: (num: string): ValidationResult => {
    const cleaned = num.toUpperCase().trim();
    const isValid = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleaned);
    return {
      isValid,
      error: isValid ? undefined : 'PAN must be in format: AAAAA9999A',
    };
  },

  /**
   * Validate Indian phone number (10 digits starting with 6-9)
   */
  phone: (num: string): ValidationResult => {
    const cleaned = num.replace(/\D/g, '');
    const isValid = /^[6-9]\d{9}$/.test(cleaned);
    return {
      isValid,
      error: isValid ? undefined : 'Phone number must be 10 digits starting with 6-9',
    };
  },

  /**
   * Validate IFSC code (AAAA0999999 format)
   */
  ifsc: (code: string): ValidationResult => {
    const cleaned = code.toUpperCase().trim();
    const isValid = /^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleaned);
    return {
      isValid,
      error: isValid ? undefined : 'IFSC code must be in format: AAAA0999999',
    };
  },

  /**
   * Validate bank account number (9-18 digits)
   */
  accountNumber: (num: string): ValidationResult => {
    const cleaned = num.replace(/\D/g, '');
    const isValid = /^\d{9,18}$/.test(cleaned);
    return {
      isValid,
      error: isValid ? undefined : 'Account number must be 9-18 digits',
    };
  },

  /**
   * Validate price (positive number, less than 1 million)
   */
  price: (price: number): ValidationResult => {
    const isValid = price > 0 && price < 1000000;
    return {
      isValid,
      error: isValid ? undefined : 'Price must be between ₹1 and ₹10,00,000',
    };
  },

  /**
   * Validate capacity (1-100 people)
   */
  capacity: (capacity: number): ValidationResult => {
    const isValid = capacity > 0 && capacity <= 100;
    return {
      isValid,
      error: isValid ? undefined : 'Capacity must be between 1 and 100',
    };
  },

  /**
   * Validate email format
   */
  email: (email: string): ValidationResult => {
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    return {
      isValid,
      error: isValid ? undefined : 'Invalid email format',
    };
  },

  /**
   * Validate name (2-100 characters, letters and spaces only)
   */
  name: (name: string): ValidationResult => {
    const cleaned = name.trim();
    const isValid = cleaned.length >= 2 && cleaned.length <= 100 && /^[a-zA-Z\s]+$/.test(cleaned);
    return {
      isValid,
      error: isValid ? undefined : 'Name must be 2-100 characters, letters only',
    };
  },

  /**
   * Validate rating (1-5)
   */
  rating: (rating: number): ValidationResult => {
    const isValid = rating >= 1 && rating <= 5;
    return {
      isValid,
      error: isValid ? undefined : 'Rating must be between 1 and 5',
    };
  },

  /**
   * Validate date is not in the past
   */
  futureDate: (date: string | Date): ValidationResult => {
    const checkDate = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isValid = checkDate >= today;
    return {
      isValid,
      error: isValid ? undefined : 'Date cannot be in the past',
    };
  },

  /**
   * Validate date range (checkOut must be after checkIn)
   */
  dateRange: (checkIn: string | Date, checkOut: string | Date): ValidationResult => {
    const checkInDate = typeof checkIn === 'string' ? new Date(checkIn) : checkIn;
    const checkOutDate = typeof checkOut === 'string' ? new Date(checkOut) : checkOut;
    const isValid = checkOutDate > checkInDate;
    return {
      isValid,
      error: isValid ? undefined : 'Check-out date must be after check-in date',
    };
  },

  /**
   * Sanitize text to prevent XSS attacks
   * Removes < > characters and trims whitespace
   */
  sanitizeText: (text: string): string => {
    return text.replace(/[<>]/g, '').trim();
  },

  /**
   * Sanitize HTML to prevent XSS
   * Removes all HTML tags
   */
  sanitizeHTML: (html: string): string => {
    return html.replace(/<[^>]*>/g, '').trim();
  },

  /**
   * Validate URL format
   */
  url: (url: string): ValidationResult => {
    try {
      new URL(url);
      return { isValid: true };
    } catch {
      return {
        isValid: false,
        error: 'Invalid URL format',
      };
    }
  },

  /**
   * Validate file size
   */
  fileSize: (sizeInBytes: number, maxSizeInMB: number): ValidationResult => {
    const maxBytes = maxSizeInMB * 1024 * 1024;
    const isValid = sizeInBytes <= maxBytes;
    return {
      isValid,
      error: isValid ? undefined : `File size must be less than ${maxSizeInMB}MB`,
    };
  },

  /**
   * Validate image file type
   */
  imageType: (mimeType: string): ValidationResult => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const isValid = validTypes.includes(mimeType.toLowerCase());
    return {
      isValid,
      error: isValid ? undefined : 'File must be JPEG, PNG, or WebP image',
    };
  },

  /**
   * Validate document file type
   */
  documentType: (mimeType: string): ValidationResult => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    const isValid = validTypes.includes(mimeType.toLowerCase());
    return {
      isValid,
      error: isValid ? undefined : 'File must be JPEG, PNG, WebP, or PDF',
    };
  },
};

/**
 * Validate multiple fields at once
 * Returns array of error messages
 */
export function validateFields(validations: ValidationResult[]): string[] {
  return validations
    .filter(v => !v.isValid)
    .map(v => v.error!)
    .filter(Boolean);
}

/**
 * Check if all validations pass
 */
export function allValid(validations: ValidationResult[]): boolean {
  return validations.every(v => v.isValid);
}
