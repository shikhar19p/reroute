import { z } from 'zod';

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\d{10}$/, 'Phone number must be 10 digits');

const optionalPhoneSchema = z.union([z.literal(''), phoneSchema]).optional();

const positiveIntegerString = z
  .string()
  .trim()
  .regex(/^[1-9]\d*$/, 'Must be a positive integer');

export const basicSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  contactPhone1: phoneSchema,
  contactPhone2: optionalPhoneSchema,
  city: z.string().trim().min(1, 'City is required'),
  area: z.string().trim().min(1, 'Area is required'),
  locationText: z.string().trim().min(1, 'Location description is required'),
  mapLink: z
    .string()
    .trim()
    .optional()
    .refine((value) => {
      if (!value) {
        return true;
      }
      try {
        new URL(value);
        return true;
      } catch (error) {
        return false;
      }
    }, 'Must be a valid URL'),
  bedrooms: positiveIntegerString,
  capacity: positiveIntegerString,
  description: z.string().trim().min(1, 'Description is required'),
});

export const pricesSchema = z.object({
  weeklyDay: positiveIntegerString,
  weeklyNight: positiveIntegerString,
  occasionalDay: positiveIntegerString,
  occasionalNight: positiveIntegerString,
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

const aadhaarFileSchema = z
  .object({
    uri: z.string().trim().min(1),
  })
  .passthrough()
  .nullable();

const aadhaarNumberSchema = z
  .string()
  .trim()
  .regex(/^\d{12}$/, 'Aadhaar number must be 12 digits');

const ifscSchema = z
  .string()
  .trim()
  .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format (e.g., ABCD0123456)');

const panNumberSchema = z
  .string()
  .trim()
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format (e.g., ABCDE1234F)');

const accountNumberSchema = z
  .string()
  .trim()
  .regex(/^\d{9,18}$/, 'Account number must be 9-18 digits');

export const kycSchema = z.object({
  person1: z.object({
    name: z.string().trim().min(1, 'Person 1 name is required'),
    phone: phoneSchema,
    aadhaarNumber: aadhaarNumberSchema,
    aadhaarFront: aadhaarFileSchema,
    aadhaarBack: aadhaarFileSchema,
  }),
  person2: z.object({
    name: z.string().trim().optional(),
    phone: optionalPhoneSchema,
    aadhaarNumber: z.string().optional(),
    aadhaarFront: aadhaarFileSchema,
    aadhaarBack: aadhaarFileSchema,
  }),
  panNumber: panNumberSchema,
  companyPAN: z.any().nullable(),
  labourDoc: z.any().nullable(),
  bankDetails: z.object({
    accountHolderName: z.string().trim().min(1, 'Account holder name is required'),
    accountNumber: accountNumberSchema,
    ifscCode: ifscSchema,
    branchName: z.string().trim().min(1, 'Branch name is required'),
  }),
  agreedToTerms: z.boolean().refine((value) => value, 'You must agree to the terms'),
});
