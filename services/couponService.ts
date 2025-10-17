import { collection, addDoc, getDocs, query, where, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number; // percentage (e.g., 10 for 10%) or fixed amount (e.g., 500 for ₹500)
  minBookingAmount: number;
  maxDiscountAmount?: number; // For percentage discounts
  validFrom: string;
  validUntil: string;
  usageLimit: number;
  usedCount: number;
  applicableFor: 'all' | 'first_booking' | 'specific_farmhouses';
  farmhouseIds?: string[]; // If applicableFor is 'specific_farmhouses'
  active: boolean;
  description?: string;
  createdAt: any;
}

export interface CouponUsage {
  userId: string;
  couponId: string;
  bookingId: string;
  discountAmount: number;
  usedAt: any;
}

/**
 * Validate and apply coupon code
 */
export async function validateCoupon(
  code: string,
  bookingAmount: number,
  userId: string,
  farmhouseId?: string
): Promise<{
  valid: boolean;
  discount: number;
  message: string;
  coupon?: Coupon;
}> {
  try {
    // Find coupon by code
    const q = query(collection(db, 'coupons'), where('code', '==', code.toUpperCase()));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return { valid: false, discount: 0, message: 'Invalid coupon code' };
    }

    const couponDoc = snapshot.docs[0];
    const coupon = { id: couponDoc.id, ...couponDoc.data() } as Coupon;

    // Check if coupon is active
    if (!coupon.active) {
      return { valid: false, discount: 0, message: 'This coupon is no longer active' };
    }

    // Check validity dates
    const now = new Date();
    const validFrom = new Date(coupon.validFrom);
    const validUntil = new Date(coupon.validUntil);

    if (now < validFrom) {
      return { valid: false, discount: 0, message: 'This coupon is not yet valid' };
    }

    if (now > validUntil) {
      return { valid: false, discount: 0, message: 'This coupon has expired' };
    }

    // Check usage limit
    if (coupon.usedCount >= coupon.usageLimit) {
      return { valid: false, discount: 0, message: 'This coupon has reached its usage limit' };
    }

    // Check minimum booking amount
    if (bookingAmount < coupon.minBookingAmount) {
      return {
        valid: false,
        discount: 0,
        message: `Minimum booking amount of ₹${coupon.minBookingAmount} required`,
      };
    }

    // Check if user has already used this coupon
    const usageQuery = query(
      collection(db, 'couponUsage'),
      where('userId', '==', userId),
      where('couponId', '==', coupon.id)
    );
    const usageSnapshot = await getDocs(usageQuery);

    if (!usageSnapshot.empty) {
      return { valid: false, discount: 0, message: 'You have already used this coupon' };
    }

    // Check if applicable for specific farmhouses
    if (coupon.applicableFor === 'specific_farmhouses' && farmhouseId) {
      if (!coupon.farmhouseIds || !coupon.farmhouseIds.includes(farmhouseId)) {
        return { valid: false, discount: 0, message: 'This coupon is not applicable for this farmhouse' };
      }
    }

    // Check first booking requirement
    if (coupon.applicableFor === 'first_booking') {
      const bookingsQuery = query(collection(db, 'bookings'), where('userId', '==', userId));
      const bookingsSnapshot = await getDocs(bookingsQuery);

      if (!bookingsSnapshot.empty) {
        return { valid: false, discount: 0, message: 'This coupon is only for first-time bookings' };
      }
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = (bookingAmount * coupon.discountValue) / 100;

      // Apply max discount cap if exists
      if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
        discount = coupon.maxDiscountAmount;
      }
    } else {
      // Fixed amount discount
      discount = coupon.discountValue;
    }

    // Ensure discount doesn't exceed booking amount
    discount = Math.min(discount, bookingAmount);

    return {
      valid: true,
      discount: Math.round(discount),
      message: `Coupon applied! You save ₹${Math.round(discount)}`,
      coupon,
    };
  } catch (error) {
    console.error('Error validating coupon:', error);
    return { valid: false, discount: 0, message: 'Error validating coupon' };
  }
}

/**
 * Record coupon usage
 */
export async function recordCouponUsage(
  couponId: string,
  userId: string,
  bookingId: string,
  discountAmount: number
): Promise<void> {
  try {
    // Record usage
    await addDoc(collection(db, 'couponUsage'), {
      couponId,
      userId,
      bookingId,
      discountAmount,
      usedAt: serverTimestamp(),
    });

    // Increment usage count
    const couponRef = doc(db, 'coupons', couponId);
    const couponSnap = await getDoc(couponRef);

    if (couponSnap.exists()) {
      const currentCount = couponSnap.data().usedCount || 0;
      await updateDoc(couponRef, {
        usedCount: currentCount + 1,
      });
    }

    console.log('✅ Coupon usage recorded');
  } catch (error) {
    console.error('Error recording coupon usage:', error);
    throw error;
  }
}

/**
 * Get all active coupons
 */
export async function getActiveCoupons(): Promise<Coupon[]> {
  try {
    const now = new Date().toISOString();
    const q = query(
      collection(db, 'coupons'),
      where('active', '==', true),
      where('validUntil', '>', now)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Coupon));
  } catch (error) {
    console.error('Error fetching coupons:', error);
    return [];
  }
}

/**
 * Create a new coupon (Admin function)
 */
export async function createCoupon(couponData: Omit<Coupon, 'id' | 'usedCount' | 'createdAt'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'coupons'), {
      ...couponData,
      code: couponData.code.toUpperCase(),
      usedCount: 0,
      createdAt: serverTimestamp(),
    });

    console.log('✅ Coupon created:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating coupon:', error);
    throw error;
  }
}

/**
 * Calculate final price after coupon discount
 */
export function calculateFinalPrice(originalPrice: number, discount: number): number {
  return Math.max(0, originalPrice - discount);
}

/**
 * Format coupon for display
 */
export function formatCouponDisplay(coupon: Coupon): string {
  if (coupon.discountType === 'percentage') {
    const maxDiscount = coupon.maxDiscountAmount
      ? ` (max ₹${coupon.maxDiscountAmount})`
      : '';
    return `${coupon.discountValue}% OFF${maxDiscount}`;
  } else {
    return `₹${coupon.discountValue} OFF`;
  }
}
