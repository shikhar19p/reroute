import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  updateDoc,
  doc,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { validators, validateFields } from '../utils/validators';
import { validateBookingDates, addBookedDatesToFarmhouse, removeBookedDatesFromFarmhouse } from './availabilityService';
import { logAuditEvent } from './auditService';

export interface Booking {
  id: string;
  farmhouseId: string;
  farmhouseName: string;
  farmhouseImage?: string;
  location?: string;
  userId: string;
  userEmail: string;
  userName: string;
  userPhone: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  totalPrice: number;
  originalPrice?: number;
  discountApplied?: number;
  couponCode?: string | null;
  bookingType: 'dayuse' | 'overnight';
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  paymentMethod?: 'UPI' | 'Credit Card' | 'Debit Card' | 'Net Banking';
  transactionId?: string;
  upiId?: string;
  cardLast4?: string;
  bankName?: string;
  cancellationDate?: string;
  refundAmount?: number;
  refundStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  refundDate?: string;
  createdAt: any;
  updatedAt?: any;
}

// Create a new booking with validation and conflict prevention
export async function createBooking(bookingData: Omit<Booking, 'id' | 'createdAt'>): Promise<string> {
  try {
    // Validate required fields
    const validations = [
      validators.futureDate(bookingData.checkInDate),
      validators.price(bookingData.totalPrice),
      validators.capacity(bookingData.guests),
    ];

    // For overnight bookings, ensure checkout is after checkin
    // For day-use bookings, they can be on the same day
    if (bookingData.bookingType === 'overnight') {
      validations.push(validators.dateRange(bookingData.checkInDate, bookingData.checkOutDate));
    }

    const errors = validateFields(validations);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    // Check for booking conflicts
    const checkInDate = new Date(bookingData.checkInDate);
    const checkOutDate = new Date(bookingData.checkOutDate);

    const availabilityCheck = await validateBookingDates(
      bookingData.farmhouseId,
      checkInDate,
      checkOutDate
    );

    if (!availabilityCheck.valid) {
      throw new Error(availabilityCheck.error || 'Dates not available');
    }

    // Create the booking
    const docRef = await addDoc(collection(db, 'bookings'), {
      ...bookingData,
      status: 'pending',
      paymentStatus: 'pending',
      createdAt: serverTimestamp(),
    });

    // Add dates to farmhouse bookedDates array
    try {
      await addBookedDatesToFarmhouse(
        bookingData.farmhouseId,
        bookingData.checkInDate,
        bookingData.checkOutDate
      );
    } catch (dateError) {
      console.error('Warning: Failed to add dates to farmhouse, but booking was created:', dateError);
      // Don't throw error here - booking is already created
    }

    // Log audit event (silently fail if permissions issue)
    try {
      await logAuditEvent(
        'booking_created',
        bookingData.userId,
        'booking',
        docRef.id,
        {
          farmhouseId: bookingData.farmhouseId,
          totalPrice: bookingData.totalPrice,
          checkIn: bookingData.checkInDate,
          checkOut: bookingData.checkOutDate,
        }
      );
    } catch (auditError) {
      // Silently ignore audit log failures - booking is still created
    }

    console.log('Booking created successfully with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Validation failed')) {
      throw error; // Re-throw validation errors as-is
    }
    // For other errors, throw a user-friendly message
    throw new Error('Unable to complete booking. Please try again.');
  }
}

// Get all bookings for a user
export async function getUserBookings(userId: string): Promise<Booking[]> {
  try {
    const q = query(
      collection(db, 'bookings'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Booking));
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    return [];
  }
}

// Get bookings by status for a user
export async function getUserBookingsByStatus(userId: string, status: Booking['status']): Promise<Booking[]> {
  try {
    const q = query(
      collection(db, 'bookings'),
      where('userId', '==', userId),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Booking));
  } catch (error) {
    console.error('Error fetching bookings by status:', error);
    return [];
  }
}

// Get all bookings for a farmhouse (for owner/admin)
export async function getFarmhouseBookings(farmhouseId: string): Promise<Booking[]> {
  try {
    const q = query(
      collection(db, 'bookings'),
      where('farmhouseId', '==', farmhouseId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Booking));
  } catch (error) {
    console.error('Error fetching farmhouse bookings:', error);
    return [];
  }
}

// Update booking status
export async function updateBookingStatus(
  bookingId: string,
  status: Booking['status']
): Promise<void> {
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingRef, {
      status,
      updatedAt: serverTimestamp()
    });
    console.log('Booking status updated:', bookingId, status);
  } catch (error) {
    console.error('Error updating booking status:', error);
    throw error;
  }
}

// Cancel booking and remove dates from farmhouse
export async function cancelBooking(bookingId: string): Promise<void> {
  try {
    // Get booking details first
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingSnap = await getDoc(bookingRef);
    
    if (!bookingSnap.exists()) {
      throw new Error('Booking not found');
    }
    
    // Cast the data to Booking type
    const bookingData = {
      id: bookingSnap.id,
      ...bookingSnap.data()
    } as Booking;
    
    const farmhouseId = bookingData.farmhouseId;
    const checkInDate = bookingData.checkInDate;
    const checkOutDate = bookingData.checkOutDate;
    
    // Update booking status
    await updateBookingStatus(bookingId, 'cancelled');
    
    // Remove dates from farmhouse bookedDates array
    if (farmhouseId && checkInDate && checkOutDate) {
      try {
        await removeBookedDatesFromFarmhouse(farmhouseId, checkInDate, checkOutDate);
      } catch (dateError) {
        console.error('Warning: Failed to remove dates from farmhouse:', dateError);
        // Don't throw - booking is already cancelled
      }
    }
    
    console.log('Booking cancelled and dates removed from farmhouse');
  } catch (error) {
    console.error('Error cancelling booking:', error);
    throw error;
  }
}

// Delete booking (admin only)
export async function deleteBooking(bookingId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'bookings', bookingId));
    console.log('Booking deleted:', bookingId);
  } catch (error) {
    console.error('Error deleting booking:', error);
    throw error;
  }
}

// Update payment status
export async function updatePaymentStatus(
  bookingId: string,
  paymentStatus: Booking['paymentStatus']
): Promise<void> {
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingRef, {
      paymentStatus,
      updatedAt: serverTimestamp()
    });
    console.log('Payment status updated:', bookingId, paymentStatus);
  } catch (error) {
    console.error('Error updating payment status:', error);
    throw error;
  }
}

// Update refund status
export async function updateRefundStatus(
  bookingId: string,
  refundStatus: 'pending' | 'processing' | 'completed' | 'failed',
  refundDate?: string
): Promise<void> {
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    const updateData: any = {
      refundStatus,
      updatedAt: serverTimestamp(),
    };

    if (refundDate) {
      updateData.refundDate = refundDate;
    }

    await updateDoc(bookingRef, updateData);
    console.log('Refund status updated:', bookingId, refundStatus);
  } catch (error) {
    console.error('Error updating refund status:', error);
    throw error;
  }
}

/**
 * Cleanup abandoned pending bookings for a specific user (older than specified minutes)
 * Returns the number of bookings cleaned up
 */
export async function cleanupAbandonedBookings(
  userId: string,
  maxAgeMinutes: number = 2
): Promise<number> {
  try {
    if (!userId) {
      console.log('⚠️ No userId provided for cleanup, skipping');
      return 0;
    }

    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - maxAgeMinutes);

    // Query for user's pending bookings only
    const q = query(
      collection(db, 'bookings'),
      where('userId', '==', userId),
      where('status', '==', 'pending'),
      where('paymentStatus', '==', 'pending')
    );

    const snapshot = await getDocs(q);
    let cleanedCount = 0;

    for (const bookingDoc of snapshot.docs) {
      const booking = { id: bookingDoc.id, ...bookingDoc.data() } as Booking;

      // Check if booking is older than cutoff time
      const createdAt = booking.createdAt?.toDate?.() || new Date(0);

      if (createdAt < cutoffTime) {
        console.log(`🧹 Cleaning up abandoned booking ${booking.id} created at ${createdAt}`);

        // Remove dates from farmhouse
        if (booking.farmhouseId && booking.checkInDate && booking.checkOutDate) {
          try {
            await removeBookedDatesFromFarmhouse(
              booking.farmhouseId,
              booking.checkInDate,
              booking.checkOutDate
            );
          } catch (dateError) {
            console.error('Warning: Failed to remove dates during cleanup:', dateError);
          }
        }

        // Delete the booking document
        await deleteDoc(doc(db, 'bookings', booking.id));
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`✅ Cleaned up ${cleanedCount} abandoned booking(s) for user ${userId}`);
    }

    return cleanedCount;
  } catch (error) {
    console.error('❌ Error cleaning up abandoned bookings:', error);
    return 0;
  }
}

/**
 * Cleanup a specific booking if it's still pending
 * Used when user cancels payment or navigates away
 */
export async function cleanupPendingBooking(bookingId: string): Promise<boolean> {
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingSnap = await getDoc(bookingRef);

    if (!bookingSnap.exists()) {
      console.log('Booking not found, already cleaned up');
      return true;
    }

    const booking = { id: bookingSnap.id, ...bookingSnap.data() } as Booking;

    // Only cleanup if still pending
    if (booking.status === 'pending' && booking.paymentStatus === 'pending') {
      console.log(`Cleaning up pending booking ${bookingId}`);

      // Remove dates from farmhouse first
      if (booking.farmhouseId && booking.checkInDate && booking.checkOutDate) {
        try {
          await removeBookedDatesFromFarmhouse(
            booking.farmhouseId,
            booking.checkInDate,
            booking.checkOutDate
          );
        } catch (dateError) {
          console.error('Warning: Failed to remove dates during cleanup:', dateError);
        }
      }

      // Update booking status to cancelled instead of deleting
      // (avoids Firestore delete permission issues)
      await updateDoc(bookingRef, {
        status: 'cancelled',
        paymentStatus: 'failed',
        cancelReason: 'Payment not completed',
        cancelledAt: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      });
      console.log('Pending booking cleaned up successfully');
      return true;
    } else {
      console.log('Booking is no longer pending, skipping cleanup');
      return false;
    }
  } catch (error) {
    console.error('Error cleaning up pending booking:', error);
    return false;
  }
}