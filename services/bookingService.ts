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

// Create a new booking
export async function createBooking(bookingData: Omit<Booking, 'id' | 'createdAt'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'bookings'), {
      ...bookingData,
      createdAt: serverTimestamp(),
    });
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
      refund_status: refundStatus,
      updatedAt: serverTimestamp(),
    };
    
    if (refundDate) {
      updateData.refundDate = refundDate;
      updateData.refund_date = refundDate;
    }
    
    await updateDoc(bookingRef, updateData);
    console.log('Refund status updated:', bookingId, refundStatus);
  } catch (error) {
    console.error('Error updating refund status:', error);
    throw error;
  }
}