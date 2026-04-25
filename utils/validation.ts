import { z } from 'zod';

const phoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit phone number starting with 6-9');

const optionalPhoneSchema = z.union([z.literal(''), phoneSchema]).optional();

const positiveIntegerString = z
  .string()
  .trim()
  .regex(/^[1-9]\d*$/, 'Please enter a valid number (must be greater than 0)');

export const basicSchema = z.object({
  name: z.string().trim().min(1, 'Property name is required').regex(/^[a-zA-Z0-9\s\-']+$/, "Property name can contain letters, numbers, spaces, hyphens, and apostrophes"),
  contactPhone1: phoneSchema,
  contactPhone2: optionalPhoneSchema,
  city: z.string().trim().min(1, 'City is required'),
  area: z.string().trim().min(1, 'Area/locality is required'),
  locationText: z.string().trim().min(1, 'Address/landmark is required'),
  mapLink: z
    .string()
    .trim()
    .min(1, 'Google Maps link is required')
    .refine((value) => {
      try {
        new URL(value);
        return true;
      } catch (error) {
        return false;
      }
    }, 'Please enter a valid URL'),
  bedrooms: positiveIntegerString,
  capacity: positiveIntegerString,
  description: z.string().trim().min(1, 'Description is required'),
});

export const pricesSchema = z.object({
  weeklyDay: positiveIntegerString,
  weeklyNight: positiveIntegerString,
  weekendDay: positiveIntegerString,
  weekendNight: positiveIntegerString,
  customPricing: z.array(z.object({
    name: z.string().optional(),
    price: z.string().optional(),
  })).optional(),
});

const photoItemSchema = z.object({
  uri: z.string().min(1, 'Photo URI is required'),
  width: z.number().positive('Width must be positive'),
  height: z.number().positive('Height must be positive'),
  size: z.number().nonnegative('Size must be non-negative'),
});

export const photosSchema = z
  .array(photoItemSchema)
  .max(10, 'You can upload up to 10 photos');

const idProofFileSchema = z
  .object({
    uri: z.string().trim().min(1),
  })
  .passthrough()
  .nullable();

const panCardSchema = z
  .string()
  .trim()
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Please enter a valid PAN card (e.g., ABCDE1234F)');

const idProofTypeSchema = z.enum(['driving_license', 'passport', 'voter_id']);

const idProofNumberSchema = z
  .string()
  .trim()
  .min(5, 'ID proof number must be at least 5 characters');

const ifscSchema = z
  .string()
  .trim()
  .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Please enter a valid IFSC code (e.g., SBIN0001234)');

const panNumberSchema = z
  .string()
  .trim()
  .regex(/^[A-Z0-9]{9,18}$/, 'Please enter a valid PAN number (9-18 alphanumeric characters)');

const accountNumberSchema = z
  .string()
  .trim()
  .regex(/^\d{9,18}$/, 'Please enter a valid account number (9-18 digits)');

export const kycSchema = z.object({
  person1: z.object({
    name: z.string().trim().min(1, 'Name is required').regex(/^[a-zA-Z\s]+$/, 'Name must contain only alphabets'),
    phone: phoneSchema,
    panCard: panCardSchema,
    idProofType: idProofTypeSchema,
    idProofNumber: idProofNumberSchema,
    idProofFront: idProofFileSchema.refine((val) => val !== null, 'ID proof front photo is required'),
    idProofBack: idProofFileSchema.refine((val) => val !== null, 'ID proof back photo is required'),
  }),
  person2: z.object({
    name: z.string().trim().min(1, 'Name is required').regex(/^[a-zA-Z\s]+$/, 'Name must contain only alphabets'),
    phone: phoneSchema,
    panCard: panCardSchema,
    idProofType: idProofTypeSchema,
    idProofNumber: idProofNumberSchema,
    idProofFront: idProofFileSchema.refine((val) => val !== null, 'ID proof front photo is required'),
    idProofBack: idProofFileSchema.refine((val) => val !== null, 'ID proof back photo is required'),
  }),
  panNumber: panNumberSchema,
  companyPAN: z.any().refine((val) => val !== null, 'Company PAN document is required'),
  labourDoc: z.any().refine((val) => val !== null, 'Labour license document is required'),
  bankDetails: z.object({
    accountHolderName: z.string().trim().min(1, 'Account holder name is required').regex(/^[a-zA-Z\s]+$/, 'Account holder name must contain only alphabets'),
    accountNumber: accountNumberSchema,
    ifscCode: ifscSchema,
    branchName: z.string().trim().min(1, 'Branch name is required').regex(/^[a-zA-Z\s]+$/, 'Branch name must contain only alphabets'),
  }),
  agreedToTerms: z.boolean().refine((value) => value, 'You must agree to the terms'),
});
