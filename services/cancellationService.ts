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
  freeCancellationDays: 1, // 50% refund if cancelled 1+ days before
  partialRefundDays: 1, // No refund if cancelled within 24 hours
  partialRefundPercentage: 50,
  processingFee: 0, // No processing fee
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
  isOwnerCancellation: boolean = false,
  policy: CancellationPolicy = DEFAULT_CANCELLATION_POLICY
): {
  refundAmount: number;
  refundPercentage: number;
  processingFee: number;
  reason: string;
} {
  // If owner cancels, always give 100% refund
  if (isOwnerCancellation) {
    return {
      refundAmount: totalAmount,
      refundPercentage: 100,
      processingFee: 0,
      reason: 'Full refund - Cancelled by property owner',
    };
  }

  const now = new Date();
  const checkIn = new Date(checkInDate);
  const hoursUntilCheckIn = (checkIn.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Cancellation after check-in date - no refund
  if (hoursUntilCheckIn < 0) {
    return {
      refundAmount: 0,
      refundPercentage: 0,
      processingFee: 0,
      reason: 'Cancellation after check-in date. No refund applicable.',
    };
  }

  // Within 24 hours of check-in - no refund
  if (hoursUntilCheckIn < 24) {
    return {
      refundAmount: 0,
      refundPercentage: 0,
      processingFee: 0,
      reason: `No refund - Cancellation within 24 hours of check-in (${Math.floor(hoursUntilCheckIn)} hours remaining)`,
    };
  }

  // More than 24 hours before check-in - 50% refund
  const refundAmount = (totalAmount * 50) / 100;
  return {
    refundAmount: refundAmount,
    refundPercentage: 50,
    processingFee: 0,
    reason: `50% refund - Cancelled ${Math.floor(hoursUntilCheckIn)} hours before check-in`,
  };
}

/**
 * Cancel booking with refund calculation
 */
export async function cancelBookingWithRefund(
  bookingId: string,
  userId: string,
  reason?: string,
  isOwnerCancellation: boolean = false
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
      booking.checkInDate,
      isOwnerCancellation
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
      try {
        // Process refund via Razorpay Cloud Function
        if (booking.transactionId) {
          console.log(`💰 Processing refund of ₹${refundCalc.refundAmount} via Razorpay...`);

          const refundResult = await processRefund(
            booking.transactionId, // Razorpay payment ID
            refundCalc.refundAmount, // Refund amount in rupees
            bookingId,
            reason || 'Booking cancellation'
          );

          console.log('✅ Refund processed successfully:', refundResult.refundId);

          // Update booking with refund details
          await updateDoc(bookingRef, {
            refundStatus: refundResult.status === 'processed' ? 'completed' : 'processing',
            refundDate: serverTimestamp(),
          });
        } else {
          console.warn('⚠️ No transaction ID found for booking, skipping refund processing');
          // Update refund status to manual review
          await updateDoc(bookingRef, {
            refundStatus: 'pending',
            refundNote: 'Manual refund processing required - no transaction ID',
          });
        }
      } catch (refundError: any) {
        console.error('❌ Error processing refund:', refundError);
        // Update booking with refund error
        await updateDoc(bookingRef, {
          refundStatus: 'failed',
          refundError: refundError.message || 'Refund processing failed',
        });
        // Don't throw - booking is already cancelled, refund can be processed manually
      }
    } else if (refundCalc.refundAmount > 0) {
      console.log(`ℹ️ Refund applicable (₹${refundCalc.refundAmount}) but payment not completed`);
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

• Cancel more than 24 hours before check-in: 50% refund

• Cancel within 24 hours of check-in: No refund

• Owner cancellation: 100% refund (full amount returned)

• Refunds are processed within 5-7 business days to your original payment method
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