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
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { validators, validateFields } from '../utils/validators';
import { validateBookingDates } from './availabilityService';
import { logAuditEvent } from './auditService';

export interface Booking {
  id: string;
  farmhouseId: string;
  farmhouseName: string;
  userId: string;
  userEmail: string;
  userName: string;
  userPhone: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  totalPrice: number;
  bookingType: 'dayuse' | 'overnight';
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  createdAt: any;
  updatedAt?: any;
}

// Create a new booking with validation and conflict prevention
export async function createBooking(bookingData: Omit<Booking, 'id' | 'createdAt'>): Promise<string> {
  try {
    // Validate required fields
    const validations = [
      validators.futureDate(bookingData.checkInDate),
      validators.dateRange(bookingData.checkInDate, bookingData.checkOutDate),
      validators.price(bookingData.totalPrice),
      validators.capacity(bookingData.guests),
    ];

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

    // Log audit event
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

    console.log('Booking created successfully with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating booking:', error);
    throw error;
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

// Cancel booking
export async function cancelBooking(bookingId: string): Promise<void> {
  try {
    await updateBookingStatus(bookingId, 'cancelled');
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
