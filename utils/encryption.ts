/**
 * Encryption Utilities for PII Data
 * IMPORTANT: This provides hashing for verification only
 * For production, consider using a proper encryption library with key management
 */

import * as Crypto from 'expo-crypto';
import CryptoJS from 'crypto-js';
import Constants from 'expo-constants';

// Fix CryptoJS random number generation for React Native
// CryptoJS expects crypto.getRandomValues which may not be available
if (typeof global !== 'undefined' && !global.crypto) {
  (global as any).crypto = {
    getRandomValues: (array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    },
  };
} else if (typeof global !== 'undefined' && global.crypto && !global.crypto.getRandomValues) {
  (global.crypto as any).getRandomValues = (array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  };
}

/**
 * Hash sensitive data using SHA-256
 * Used for storing sensitive information like Aadhaar/PAN for verification
 * Note: This is one-way hashing - data cannot be recovered
 */
export async function hashSensitiveData(data: string): Promise<string> {
  if (!data) {
    throw new Error('Data to hash cannot be empty');
  }

  try {
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      data.trim()
    );
    return hash;
  } catch (error) {
    console.error('Error hashing data:', error);
    throw new Error('Failed to hash sensitive data');
  }
}

/**
 * Mask sensitive data for display purposes
 * e.g., "123456789012" becomes "XXXX XXXX 9012"
 */
export function maskAadhaar(aadhaar: string): string {
  const cleaned = aadhaar.replace(/\s/g, '');
  if (cleaned.length !== 12) {
    return 'Invalid Aadhaar';
  }
  return `XXXX XXXX ${cleaned.slice(-4)}`;
}

/**
 * Mask PAN card for display
 * e.g., "ABCDE1234F" becomes "XXX XX 1234 X"
 */
export function maskPAN(pan: string): string {
  const cleaned = pan.toUpperCase().trim();
  if (cleaned.length !== 10) {
    return 'Invalid PAN';
  }
  return `XXX XX ${cleaned.slice(5, 9)} X`;
}

/**
 * Mask account number for display
 * Shows only last 4 digits
 */
export function maskAccountNumber(accountNumber: string): string {
  const cleaned = accountNumber.replace(/\D/g, '');
  if (cleaned.length < 4) {
    return 'Invalid Account';
  }
  return `XXXX XXXX ${cleaned.slice(-4)}`;
}

/**
 * Mask phone number for display
 * e.g., "9876543210" becomes "XXX XXX 3210"
 */
export function maskPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length !== 10) {
    return 'Invalid Phone';
  }
  return `XXX XXX ${cleaned.slice(-4)}`;
}

/**
 * Mask email for display
 * e.g., "user@example.com" becomes "u***@example.com"
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) {
    return 'Invalid Email';
  }
  const maskedLocal = local.length > 1 ? `${local[0]}***` : '***';
  return `${maskedLocal}@${domain}`;
}

/**
 * Generate a random salt for additional security
 */
export async function generateSalt(): Promise<string> {
  const randomBytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hash with salt for extra security
 */
export async function hashWithSalt(data: string, salt: string): Promise<string> {
  const salted = `${data}${salt}`;
  return await hashSensitiveData(salted);
}

/**
 * Verify hashed data against plain text
 * Used for checking if entered data matches stored hash
 */
export async function verifyHash(plainText: string, hash: string): Promise<boolean> {
  try {
    const newHash = await hashSensitiveData(plainText);
    return newHash === hash;
  } catch (error) {
    console.error('Error verifying hash:', error);
    return false;
  }
}

/**
 * Sanitize PII data before storage
 * Removes extra spaces, converts to uppercase where needed
 */
export function sanitizePII(data: string, type: 'aadhaar' | 'pan' | 'phone' | 'ifsc' | 'account'): string {
  let cleaned = data.trim();

  switch (type) {
    case 'aadhaar':
      return cleaned.replace(/\s/g, '');
    case 'pan':
    case 'ifsc':
      return cleaned.toUpperCase().replace(/\s/g, '');
    case 'phone':
      return cleaned.replace(/\D/g, '');
    case 'account':
      return cleaned.replace(/\D/g, '');
    default:
      return cleaned;
  }
}

// ==================== AES ENCRYPTION (For Bank Details) ====================

/**
 * Encryption secret key - MUST be stored in environment variables
 * CRITICAL: Never commit encryption keys to version control!
 * Generate using: openssl rand -base64 32
 */
const ENCRYPTION_SECRET = Constants.expoConfig?.extra?.encryptionSecret ||
  process.env.ENCRYPTION_SECRET;

if (!ENCRYPTION_SECRET || ENCRYPTION_SECRET.length < 32) {
  console.error('❌ CRITICAL: ENCRYPTION_SECRET not configured or too weak!');
  console.error('Set ENCRYPTION_SECRET in .env with minimum 32 characters');
  throw new Error('Encryption not configured. Cannot proceed with sensitive data operations.');
}

/**
 * Derive encryption key from user ID for user-specific encryption
 */
function deriveKey(userId: string): string {
  return CryptoJS.SHA256(userId + ENCRYPTION_SECRET).toString();
}

/**
 * Encrypt sensitive data (bank account numbers, IFSC codes)
 * Uses AES-256 encryption with user-specific keys
 */
export function encryptSensitiveData(plainText: string, userId: string): string {
  if (!plainText) {
    throw new Error('Data to encrypt cannot be empty');
  }

  if (!userId) {
    throw new Error('User ID is required for encryption');
  }

  try {
    const key = deriveKey(userId);
    const encrypted = CryptoJS.AES.encrypt(plainText, key).toString();
    return `enc_v1_${encrypted}`; // Version prefix for future migrations
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt sensitive data');
  }
}

/**
 * Decrypt sensitive data
 * Returns the original plain text
 */
export function decryptSensitiveData(encryptedText: string, userId: string): string {
  if (!encryptedText) {
    throw new Error('Encrypted data cannot be empty');
  }

  if (!userId) {
    throw new Error('User ID is required for decryption');
  }

  try {
    // Remove version prefix
    const encrypted = encryptedText.replace(/^enc_v\d+_/, '');
    const key = deriveKey(userId);
    const decrypted = CryptoJS.AES.decrypt(encrypted, key);
    const plainText = decrypted.toString(CryptoJS.enc.Utf8);

    if (!plainText) {
      throw new Error('Decryption failed - invalid key or corrupted data');
    }

    return plainText;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt sensitive data');
  }
}

/**
 * Check if data is encrypted
 */
export function isEncrypted(data: string): boolean {
  return data?.startsWith('enc_v') || false;
}
