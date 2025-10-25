/**
 * Availability Calendar Service
 * Manages farmhouse availability and booking conflicts
 */

import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

export interface DateRange {
  checkIn: Date;
  checkOut: Date;
}

export interface AvailabilityStatus {
  date: string;
  available: boolean;
  bookingType?: 'dayuse' | 'overnight';
}

/**
 * Check if a farmhouse is available for given dates
 */
export async function checkAvailability(
  farmhouseId: string,
  checkInDate: Date,
  checkOutDate: Date
): Promise<boolean> {
  try {
    const conflicts = await getBookingConflicts(farmhouseId, checkInDate, checkOutDate);
    return conflicts.length === 0;
  } catch (error) {
    console.error('Error checking availability:', error);
    return false;
  }
}

/**
 * Get all booking conflicts for a date range
 */
export async function getBookingConflicts(
  farmhouseId: string,
  checkInDate: Date,
  checkOutDate: Date
): Promise<any[]> {
  try {
    // Query for confirmed and pending bookings
    const q = query(
      collection(db, 'bookings'),
      where('farmhouseId', '==', farmhouseId),
      where('status', 'in', ['pending', 'confirmed'])
    );

    const snapshot = await getDocs(q);

    // Filter bookings that overlap with the requested dates
    const conflicts = snapshot.docs.filter(doc => {
      const booking = doc.data();
      const bookingCheckIn = new Date(booking.checkInDate);
      const bookingCheckOut = new Date(booking.checkOutDate);

      // Check for overlap
      return (
        (checkInDate >= bookingCheckIn && checkInDate < bookingCheckOut) ||
        (checkOutDate > bookingCheckIn && checkOutDate <= bookingCheckOut) ||
        (checkInDate <= bookingCheckIn && checkOutDate >= bookingCheckOut)
      );
    });

    return conflicts.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    // Silently return empty array on error - non-critical for user experience
    return [];
  }
}

/**
 * Get availability calendar for a farmhouse for a given month
 */
export async function getMonthAvailability(
  farmhouseId: string,
  year: number,
  month: number
): Promise<AvailabilityStatus[]> {
  try {
    // Get first and last day of the month
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    // Get all bookings for this month
    const q = query(
      collection(db, 'bookings'),
      where('farmhouseId', '==', farmhouseId),
      where('status', 'in', ['pending', 'confirmed'])
    );

    const snapshot = await getDocs(q);
    const bookings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Generate availability for each day
    const availability: AvailabilityStatus[] = [];
    const currentDate = new Date(firstDay);

    while (currentDate <= lastDay) {
      const dateString = currentDate.toISOString().split('T')[0];

      // Check if this date has any bookings
      const hasBooking = bookings.some(booking => {
        const checkIn = new Date(booking.checkInDate);
        const checkOut = new Date(booking.checkOutDate);
        return currentDate >= checkIn && currentDate < checkOut;
      });

      availability.push({
        date: dateString,
        available: !hasBooking,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return availability;
  } catch (error) {
    console.error('Error getting month availability:', error);
    return [];
  }
}

/**
 * Get blocked dates for a farmhouse (dates with existing bookings)
 */
export async function getBlockedDates(
  farmhouseId: string,
  startDate: Date,
  endDate: Date
): Promise<string[]> {
  try {
    const conflicts = await getBookingConflicts(farmhouseId, startDate, endDate);

    const blockedDates = new Set<string>();

    conflicts.forEach(booking => {
      const checkIn = new Date(booking.checkInDate);
      const checkOut = new Date(booking.checkOutDate);
      const currentDate = new Date(checkIn);

      while (currentDate < checkOut) {
        blockedDates.add(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    return Array.from(blockedDates);
  } catch (error) {
    console.error('Error getting blocked dates:', error);
    return [];
  }
}

/**
 * Get available date ranges for next N days
 */
export async function getAvailableDateRanges(
  farmhouseId: string,
  days: number = 90
): Promise<DateRange[]> {
  try {
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + days);

    const blockedDates = await getBlockedDates(farmhouseId, today, endDate);
    const blockedSet = new Set(blockedDates);

    const availableRanges: DateRange[] = [];
    let rangeStart: Date | null = null;

    const currentDate = new Date(today);

    while (currentDate <= endDate) {
      const dateString = currentDate.toISOString().split('T')[0];
      const isAvailable = !blockedSet.has(dateString);

      if (isAvailable) {
        if (!rangeStart) {
          rangeStart = new Date(currentDate);
        }
      } else {
        if (rangeStart) {
          availableRanges.push({
            checkIn: rangeStart,
            checkOut: new Date(currentDate)
          });
          rangeStart = null;
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Close last range if still open
    if (rangeStart) {
      availableRanges.push({
        checkIn: rangeStart,
        checkOut: new Date(currentDate)
      });
    }

    return availableRanges;
  } catch (error) {
    console.error('Error getting available date ranges:', error);
    return [];
  }
}

/**
 * Validate booking dates (no conflicts, valid date range)
 */
export async function validateBookingDates(
  farmhouseId: string,
  checkInDate: Date,
  checkOutDate: Date
): Promise<{ valid: boolean; error?: string }> {
  // Check if dates are valid - allow same day for day-use bookings
  if (checkOutDate < checkInDate) {
    return {
      valid: false,
      error: 'Check-out date must be on or after check-in date'
    };
  }

  // Check if check-in is not in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (checkInDate < today) {
    return {
      valid: false,
      error: 'Check-in date cannot be in the past'
    };
  }

  // Check for conflicts
  const conflicts = await getBookingConflicts(farmhouseId, checkInDate, checkOutDate);

  if (conflicts.length > 0) {
    return {
      valid: false,
      error: 'Selected dates are not available. Please choose different dates.'
    };
  }

  return { valid: true };
}

/**
 * Get next available date for a farmhouse
 */
export async function getNextAvailableDate(farmhouseId: string): Promise<Date | null> {
  try {
    const ranges = await getAvailableDateRanges(farmhouseId, 180); // Check next 6 months

    if (ranges.length === 0) {
      return null;
    }

    return ranges[0].checkIn;
  } catch (error) {
    console.error('Error getting next available date:', error);
    return null;
  }
}

/**
 * Generate array of dates between start and end (inclusive)
 */
export function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const dateStr = date.toISOString().split('T')[0];
    dates.push(dateStr);
  }
  
  return dates;
}

/**
 * Add dates to farmhouse bookedDates array
 * Used when creating a new booking
 */
export async function addBookedDatesToFarmhouse(
  farmhouseId: string,
  checkInDate: string,
  checkOutDate: string
): Promise<void> {
  try {
    const farmhouseRef = doc(db, 'farmhouses', farmhouseId);
    const farmhouseSnap = await getDoc(farmhouseRef);
    
    if (!farmhouseSnap.exists()) {
      throw new Error('Farmhouse not found');
    }
    
    // Cast to avoid TypeScript errors
    const farmhouseData = farmhouseSnap.data() as {
      bookedDates?: string[];
      [key: string]: any;
    };
    const bookedDates = farmhouseData.bookedDates || [];
    
    // Generate all dates to be booked
    const datesToAdd = generateDateRange(checkInDate, checkOutDate);
    
    // Combine and remove duplicates
    const updatedBookedDates = Array.from(
      new Set([...bookedDates, ...datesToAdd])
    ).sort();
    
    await updateDoc(farmhouseRef, {
      bookedDates: updatedBookedDates
    });
    
    console.log(`✅ Added ${datesToAdd.length} dates to farmhouse ${farmhouseId}`);
  } catch (error) {
    console.error('Error adding booked dates to farmhouse:', error);
    throw error;
  }
}

/**
 * Remove dates from farmhouse bookedDates array
 * Used when cancelling a booking
 */
export async function removeBookedDatesFromFarmhouse(
  farmhouseId: string,
  checkInDate: string,
  checkOutDate: string
): Promise<void> {
  try {
    const farmhouseRef = doc(db, 'farmhouses', farmhouseId);
    const farmhouseSnap = await getDoc(farmhouseRef);
    
    if (!farmhouseSnap.exists()) {
      console.warn(`Farmhouse ${farmhouseId} not found, skipping date removal`);
      return;
    }
    
    // Cast to avoid TypeScript errors
    const farmhouseData = farmhouseSnap.data() as {
      bookedDates?: string[];
      [key: string]: any;
    };
    const bookedDates = farmhouseData.bookedDates || [];
    
    // Generate all dates to be removed
    const datesToRemove = generateDateRange(checkInDate, checkOutDate);
    
    // Filter out the dates to remove
    const updatedBookedDates = bookedDates.filter(
      (date: string) => !datesToRemove.includes(date)
    );
    
    await updateDoc(farmhouseRef, {
      bookedDates: updatedBookedDates
    });
    
    console.log(`✅ Removed ${datesToRemove.length} dates from farmhouse ${farmhouseId}`);
  } catch (error) {
    console.error('Error removing booked dates from farmhouse:', error);
    throw error;
  }
}

/**
 * Check if dates exist in farmhouse bookedDates
 */
export async function checkDatesInFarmhouse(
  farmhouseId: string,
  checkInDate: string,
  checkOutDate: string
): Promise<{ exists: boolean; conflictingDates: string[] }> {
  try {
    const farmhouseRef = doc(db, 'farmhouses', farmhouseId);
    const farmhouseSnap = await getDoc(farmhouseRef);
    
    if (!farmhouseSnap.exists()) {
      return { exists: false, conflictingDates: [] };
    }
    
    // Cast to avoid TypeScript errors
    const farmhouseData = farmhouseSnap.data() as {
      bookedDates?: string[];
      blockedDates?: string[];
      [key: string]: any;
    };
    const bookedDates = farmhouseData.bookedDates || [];
    const blockedDates = farmhouseData.blockedDates || [];
    const unavailableDates = [...bookedDates, ...blockedDates];
    
    // Generate requested dates
    const requestedDates = generateDateRange(checkInDate, checkOutDate);
    
    // Find conflicting dates
    const conflictingDates = requestedDates.filter(date => 
      unavailableDates.includes(date)
    );
    
    return {
      exists: conflictingDates.length > 0,
      conflictingDates
    };
  } catch (error) {
    console.error('Error checking dates in farmhouse:', error);
    return { exists: false, conflictingDates: [] };
  }
}