import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Booking } from './bookingService';
import { processRefund } from './paymentService';
import { sendCancellationNotification } from './notificationService';
import { logAuditEvent } from './auditService';
import { removeBookedDatesFromFarmhouse } from './availabilityService';

export interface CancellationPolicy {
  freeCancellationDays: number; // Days before check-in for free cancellation
  partialRefundDays: number; // Days before check-in for partial refund
  partialRefundPercentage: number; // Percentage refunded for partial refund
  processingFee: number; // Fixed processing fee for cancellations
}

// Default cancellation policy (can be customized per farmhouse)
export const DEFAULT_CANCELLATION_POLICY: CancellationPolicy = {
  freeCancellationDays: 7, // Free cancellation if cancelled 7+ days before
  partialRefundDays: 3, // 50% refund if cancelled 3-7 days before
  partialRefundPercentage: 50,
  processingFee: 50, // ₹50 processing fee
};

export interface CancellationResult {
  success: boolean;
  refundAmount: number;
  refundPercentage: number;
  processingFee: number;
  message: string;
}

/**
 * Calculate refund amount based on cancellation policy
 */
export function calculateRefundAmount(
  totalAmount: number,
  checkInDate: string,
  policy: CancellationPolicy = DEFAULT_CANCELLATION_POLICY
): {
  refundAmount: number;
  refundPercentage: number;
  processingFee: number;
  reason: string;
} {
  const now = new Date();
  const checkIn = new Date(checkInDate);
  const daysUntilCheckIn = Math.ceil((checkIn.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Cancellation after check-in date - no refund
  if (daysUntilCheckIn < 0) {
    return {
      refundAmount: 0,
      refundPercentage: 0,
      processingFee: 0,
      reason: 'Cancellation after check-in date. No refund applicable.',
    };
  }

  // Free cancellation window
  if (daysUntilCheckIn >= policy.freeCancellationDays) {
    const refundAmount = totalAmount - policy.processingFee;
    return {
      refundAmount: Math.max(0, refundAmount),
      refundPercentage: 100,
      processingFee: policy.processingFee,
      reason: `Free cancellation (${daysUntilCheckIn} days before check-in)`,
    };
  }

  // Partial refund window
  if (daysUntilCheckIn >= policy.partialRefundDays) {
    const refundBeforeFee = (totalAmount * policy.partialRefundPercentage) / 100;
    const refundAmount = refundBeforeFee - policy.processingFee;
    return {
      refundAmount: Math.max(0, refundAmount),
      refundPercentage: policy.partialRefundPercentage,
      processingFee: policy.processingFee,
      reason: `Partial refund (${policy.partialRefundPercentage}% refund - cancelled ${daysUntilCheckIn} days before check-in)`,
    };
  }

  // Within non-refundable window
  return {
    refundAmount: 0,
    refundPercentage: 0,
    processingFee: 0,
    reason: `Non-refundable (cancelled ${daysUntilCheckIn} days before check-in)`,
  };
}

/**
 * Cancel booking with refund calculation
 */
export async function cancelBookingWithRefund(
  bookingId: string,
  userId: string,
  reason?: string
): Promise<CancellationResult> {
  try {
    // Get booking details
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingSnap = await getDoc(bookingRef);

    if (!bookingSnap.exists()) {
      throw new Error('Booking not found');
    }

    const booking = { id: bookingSnap.id, ...bookingSnap.data() } as Booking;

    // Verify user owns this booking
    if (booking.userId !== userId) {
      throw new Error('Unauthorized: You can only cancel your own bookings');
    }

    // Check if already cancelled
    if (booking.status === 'cancelled') {
      throw new Error('Booking is already cancelled');
    }

    // Calculate refund
    const refundCalc = calculateRefundAmount(
      booking.totalPrice,
      booking.checkInDate
    );

    // Update booking status
    await updateDoc(bookingRef, {
      status: 'cancelled',
      cancellationReason: reason || 'User requested cancellation',
      cancelledAt: serverTimestamp(),
      refundAmount: refundCalc.refundAmount,
      refundPercentage: refundCalc.refundPercentage,
      processingFee: refundCalc.processingFee,
      updatedAt: serverTimestamp(),
    });

    // Remove dates from farmhouse bookedDates array
    if (booking.farmhouseId && booking.checkInDate && booking.checkOutDate) {
      try {
        await removeBookedDatesFromFarmhouse(
          booking.farmhouseId,
          booking.checkInDate,
          booking.checkOutDate
        );
      } catch (dateError) {
        console.error('Warning: Failed to remove dates from farmhouse:', dateError);
        // Don't throw - booking is already cancelled
      }
    }

    // Process refund if applicable
    if (refundCalc.refundAmount > 0 && booking.paymentStatus === 'paid') {
      // Note: In production, this should trigger a backend function to process actual refund
      // For now, we'll just update the payment status
      // await processRefund(paymentId, razorpayPaymentId, refundCalc.refundAmount);
      console.log(`💰 Refund of ₹${refundCalc.refundAmount} will be processed`);
    }

    // Send cancellation notification
    await sendCancellationNotification(
      userId,
      bookingId,
      booking.farmhouseName,
      refundCalc.refundAmount
    );

    // Log audit event
    await logAuditEvent(
      'booking_cancelled',
      userId,
      'booking',
      bookingId,
      {
        refundAmount: refundCalc.refundAmount,
        refundPercentage: refundCalc.refundPercentage,
        reason: reason || 'User requested cancellation',
      }
    );

    console.log('✅ Booking cancelled successfully:', bookingId);

    return {
      success: true,
      refundAmount: refundCalc.refundAmount,
      refundPercentage: refundCalc.refundPercentage,
      processingFee: refundCalc.processingFee,
      message: refundCalc.reason,
    };
  } catch (error: any) {
    console.error('❌ Error cancelling booking:', error);
    throw error;
  }
}

/**
 * Get cancellation policy description for display
 */
export function getCancellationPolicyDescription(
  policy: CancellationPolicy = DEFAULT_CANCELLATION_POLICY
): string {
  return `
Cancellation Policy:

• Free Cancellation: Cancel ${policy.freeCancellationDays}+ days before check-in for full refund (minus ₹${policy.processingFee} processing fee)

• Partial Refund: Cancel ${policy.partialRefundDays}-${policy.freeCancellationDays - 1} days before check-in for ${policy.partialRefundPercentage}% refund (minus ₹${policy.processingFee} processing fee)

• Non-Refundable: Cancellations within ${policy.partialRefundDays} days of check-in are non-refundable

• Refunds are processed within 5-7 business days
  `.trim();
}

/**
 * Preview cancellation refund before confirming
 */
export async function previewCancellationRefund(
  bookingId: string
): Promise<{
  refundAmount: number;
  refundPercentage: number;
  processingFee: number;
  policyDescription: string;
}> {
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingSnap = await getDoc(bookingRef);

    if (!bookingSnap.exists()) {
      throw new Error('Booking not found');
    }

    const booking = bookingSnap.data() as Booking;

    const refundCalc = calculateRefundAmount(
      booking.totalPrice,
      booking.checkInDate
    );

    return {
      refundAmount: refundCalc.refundAmount,
      refundPercentage: refundCalc.refundPercentage,
      processingFee: refundCalc.processingFee,
      policyDescription: refundCalc.reason,
    };
  } catch (error) {
    console.error('Error previewing cancellation:', error);
    throw error;
  }
}

/**
 * Check if booking can be modified (dates, guests, etc.)
 * Typically allowed within 24-48 hours before check-in
 */
export function canModifyBooking(checkInDate: string): boolean {
  const now = new Date();
  const checkIn = new Date(checkInDate);
  const hoursUntilCheckIn = (checkIn.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Allow modifications if check-in is more than 48 hours away
  return hoursUntilCheckIn > 48;
}

/**
 * Get cancellation statistics for analytics
 */
export interface CancellationStats {
  totalCancellations: number;
  freeRefunds: number;
  partialRefunds: number;
  noRefunds: number;
  totalRefundAmount: number;
}