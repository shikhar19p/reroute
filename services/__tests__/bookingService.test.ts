import {
  createBooking,
  getUserBookings,
  getUserBookingsByStatus,
  getFarmhouseBookings,
  updateBookingStatus,
  cancelBooking,
  deleteBooking,
  updatePaymentStatus,
  updateRefundStatus,
  cleanupPendingBooking,
  cleanupAbandonedBookings,
  Booking,
} from '../bookingService';

import {
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  collection,
  query,
  where,
  orderBy,
} from 'firebase/firestore';

jest.mock('../availabilityService', () => ({
  validateBookingDates: jest.fn().mockResolvedValue({ valid: true }),
  addBookedDatesToFarmhouse: jest.fn().mockResolvedValue(undefined),
  removeBookedDatesFromFarmhouse: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../auditService', () => ({
  logAuditEvent: jest.fn().mockResolvedValue(undefined),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────
const futureDate = (daysFromNow: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
};

const makeBookingData = (overrides = {}): Omit<Booking, 'id' | 'createdAt'> => ({
  farmhouseId: 'fh1',
  farmhouseName: 'Green Meadows',
  userId: 'user1',
  userEmail: 'user@test.com',
  userName: 'Test User',
  userPhone: '9876543210',
  checkInDate: futureDate(5),
  checkOutDate: futureDate(7),
  guests: 4,
  totalPrice: 10000,
  bookingType: 'overnight',
  status: 'pending',
  paymentStatus: 'pending',
  ...overrides,
});

const setupQueryMocks = () => {
  (collection as jest.Mock).mockReturnValue('col');
  (query as jest.Mock).mockReturnValue('q');
  (where as jest.Mock).mockReturnValue('w');
  (orderBy as jest.Mock).mockReturnValue('o');
};

// ─── createBooking ────────────────────────────────────────────────────────────
describe('createBooking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupQueryMocks();
  });

  it('creates a booking and returns the doc id', async () => {
    (addDoc as jest.Mock).mockResolvedValueOnce({ id: 'newBooking1' });

    const id = await createBooking(makeBookingData());
    expect(id).toBe('newBooking1');
    expect(addDoc).toHaveBeenCalledTimes(1);
  });

  it('throws validation error for past check-in date', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 3);

    await expect(
      createBooking(makeBookingData({ checkInDate: pastDate.toISOString().split('T')[0] }))
    ).rejects.toThrow('Validation failed');
  });

  it('throws validation error for negative price', async () => {
    await expect(
      createBooking(makeBookingData({ totalPrice: -100 }))
    ).rejects.toThrow('Validation failed');
  });

  it('throws validation error for zero guests', async () => {
    await expect(
      createBooking(makeBookingData({ guests: 0 }))
    ).rejects.toThrow('Validation failed');
  });

  it('throws when availability check fails', async () => {
    const { validateBookingDates } = require('../availabilityService');
    validateBookingDates.mockResolvedValueOnce({ valid: false, error: 'Dates not available' });

    await expect(createBooking(makeBookingData())).rejects.toThrow('Unable to complete booking');
  });

  it('throws user-friendly message when addDoc fails (not validation)', async () => {
    (addDoc as jest.Mock).mockRejectedValueOnce(new Error('Firestore write failed'));

    await expect(createBooking(makeBookingData())).rejects.toThrow('Unable to complete booking');
  });

  it('creates day-use booking without dateRange validation', async () => {
    (addDoc as jest.Mock).mockResolvedValueOnce({ id: 'dayuse1' });
    const sameDay = futureDate(3);

    const id = await createBooking(makeBookingData({
      bookingType: 'dayuse',
      checkInDate: sameDay,
      checkOutDate: sameDay,
    }));
    expect(id).toBe('dayuse1');
  });
});

// ─── getUserBookings ──────────────────────────────────────────────────────────
describe('getUserBookings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupQueryMocks();
  });

  it('returns mapped bookings for a user', async () => {
    (getDocs as jest.Mock).mockResolvedValueOnce({
      docs: [
        { id: 'b1', data: () => ({ userId: 'user1', status: 'confirmed' }) },
        { id: 'b2', data: () => ({ userId: 'user1', status: 'pending' }) },
      ],
    });

    const result = await getUserBookings('user1');
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('b1');
    expect(result[1].id).toBe('b2');
  });

  it('returns empty array on error', async () => {
    (getDocs as jest.Mock).mockRejectedValueOnce(new Error('firestore error'));
    const result = await getUserBookings('user1');
    expect(result).toEqual([]);
  });
});

// ─── getUserBookingsByStatus ──────────────────────────────────────────────────
describe('getUserBookingsByStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupQueryMocks();
  });

  it('filters by status', async () => {
    (getDocs as jest.Mock).mockResolvedValueOnce({
      docs: [{ id: 'b1', data: () => ({ userId: 'user1', status: 'confirmed' }) }],
    });

    const result = await getUserBookingsByStatus('user1', 'confirmed');
    expect(result).toHaveLength(1);
    expect(where).toHaveBeenCalledWith('status', '==', 'confirmed');
  });

  it('returns empty array on error', async () => {
    (getDocs as jest.Mock).mockRejectedValueOnce(new Error('error'));
    const result = await getUserBookingsByStatus('user1', 'pending');
    expect(result).toEqual([]);
  });
});

// ─── updateBookingStatus ──────────────────────────────────────────────────────
describe('updateBookingStatus', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls updateDoc with the new status', async () => {
    (doc as jest.Mock).mockReturnValue('ref');
    (updateDoc as jest.Mock).mockResolvedValueOnce(undefined);

    await updateBookingStatus('b1', 'confirmed');
    expect(updateDoc).toHaveBeenCalledWith('ref', expect.objectContaining({ status: 'confirmed' }));
  });

  it('throws on updateDoc failure', async () => {
    (doc as jest.Mock).mockReturnValue('ref');
    (updateDoc as jest.Mock).mockRejectedValueOnce(new Error('write failed'));

    await expect(updateBookingStatus('b1', 'confirmed')).rejects.toThrow('write failed');
  });
});

// ─── cancelBooking ────────────────────────────────────────────────────────────
describe('cancelBooking', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws when booking not found', async () => {
    (doc as jest.Mock).mockReturnValue('ref');
    (getDoc as jest.Mock).mockResolvedValueOnce({ exists: () => false });

    await expect(cancelBooking('b1')).rejects.toThrow('Booking not found');
  });

  it('calls updateBookingStatus with cancelled and removes dates', async () => {
    (doc as jest.Mock).mockReturnValue('ref');
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      id: 'b1',
      data: () => ({
        farmhouseId: 'fh1',
        checkInDate: futureDate(3),
        checkOutDate: futureDate(5),
      }),
    });
    (updateDoc as jest.Mock).mockResolvedValue(undefined);

    await cancelBooking('b1');
    expect(updateDoc).toHaveBeenCalledWith('ref', expect.objectContaining({ status: 'cancelled' }));
    const { removeBookedDatesFromFarmhouse } = require('../availabilityService');
    expect(removeBookedDatesFromFarmhouse).toHaveBeenCalledWith('fh1', expect.any(String), expect.any(String));
  });
});

// ─── deleteBooking ────────────────────────────────────────────────────────────
describe('deleteBooking', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls deleteDoc', async () => {
    (doc as jest.Mock).mockReturnValue('ref');
    (deleteDoc as jest.Mock).mockResolvedValueOnce(undefined);

    await deleteBooking('b1');
    expect(deleteDoc).toHaveBeenCalledWith('ref');
  });

  it('throws on failure', async () => {
    (doc as jest.Mock).mockReturnValue('ref');
    (deleteDoc as jest.Mock).mockRejectedValueOnce(new Error('delete failed'));

    await expect(deleteBooking('b1')).rejects.toThrow('delete failed');
  });
});

// ─── updatePaymentStatus ──────────────────────────────────────────────────────
describe('updatePaymentStatus', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls updateDoc with paymentStatus', async () => {
    (doc as jest.Mock).mockReturnValue('ref');
    (updateDoc as jest.Mock).mockResolvedValueOnce(undefined);

    await updatePaymentStatus('b1', 'paid');
    expect(updateDoc).toHaveBeenCalledWith('ref', expect.objectContaining({ paymentStatus: 'paid' }));
  });
});

// ─── updateRefundStatus ───────────────────────────────────────────────────────
describe('updateRefundStatus', () => {
  beforeEach(() => jest.clearAllMocks());

  it('writes both refundStatus and refund_status fields', async () => {
    (doc as jest.Mock).mockReturnValue('ref');
    (updateDoc as jest.Mock).mockResolvedValueOnce(undefined);

    await updateRefundStatus('b1', 'completed');
    expect(updateDoc).toHaveBeenCalledWith('ref', expect.objectContaining({
      refundStatus: 'completed',
      refund_status: 'completed',
    }));
  });

  it('includes refundDate and refund_date when provided', async () => {
    (doc as jest.Mock).mockReturnValue('ref');
    (updateDoc as jest.Mock).mockResolvedValueOnce(undefined);

    await updateRefundStatus('b1', 'completed', '2025-06-10');
    expect(updateDoc).toHaveBeenCalledWith('ref', expect.objectContaining({
      refundDate: '2025-06-10',
      refund_date: '2025-06-10',
    }));
  });
});

// ─── cleanupPendingBooking ────────────────────────────────────────────────────
describe('cleanupPendingBooking', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns true when booking does not exist', async () => {
    (doc as jest.Mock).mockReturnValue('ref');
    (getDoc as jest.Mock).mockResolvedValueOnce({ exists: () => false });

    const result = await cleanupPendingBooking('b1');
    expect(result).toBe(true);
  });

  it('cancels and returns true for pending booking with pending payment', async () => {
    (doc as jest.Mock).mockReturnValue('ref');
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      id: 'b1',
      data: () => ({
        status: 'pending',
        paymentStatus: 'pending',
        farmhouseId: 'fh1',
        checkInDate: futureDate(3),
        checkOutDate: futureDate(5),
      }),
    });
    (updateDoc as jest.Mock).mockResolvedValueOnce(undefined);

    const result = await cleanupPendingBooking('b1');
    expect(result).toBe(true);
    expect(updateDoc).toHaveBeenCalledWith('ref', expect.objectContaining({
      status: 'cancelled',
      paymentStatus: 'failed',
    }));
  });

  it('cancels and returns true for pending booking with failed payment', async () => {
    (doc as jest.Mock).mockReturnValue('ref');
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      id: 'b1',
      data: () => ({
        status: 'pending',
        paymentStatus: 'failed',
        farmhouseId: 'fh1',
        checkInDate: futureDate(3),
        checkOutDate: futureDate(5),
      }),
    });
    (updateDoc as jest.Mock).mockResolvedValueOnce(undefined);

    const result = await cleanupPendingBooking('b1');
    expect(result).toBe(true);
  });

  it('returns false for confirmed booking (should not be cleaned up)', async () => {
    (doc as jest.Mock).mockReturnValue('ref');
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      id: 'b1',
      data: () => ({ status: 'confirmed', paymentStatus: 'paid' }),
    });

    const result = await cleanupPendingBooking('b1');
    expect(result).toBe(false);
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('returns false on error', async () => {
    (doc as jest.Mock).mockReturnValue('ref');
    (getDoc as jest.Mock).mockRejectedValueOnce(new Error('network error'));

    const result = await cleanupPendingBooking('b1');
    expect(result).toBe(false);
  });
});

// ─── cleanupAbandonedBookings ─────────────────────────────────────────────────
describe('cleanupAbandonedBookings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupQueryMocks();
  });

  it('returns 0 for empty userId', async () => {
    const result = await cleanupAbandonedBookings('');
    expect(result).toBe(0);
    expect(getDocs).not.toHaveBeenCalled();
  });

  it('cleans up old pending bookings and returns count', async () => {
    const oldDate = new Date();
    oldDate.setMinutes(oldDate.getMinutes() - 10); // 10 minutes old

    (getDocs as jest.Mock).mockResolvedValueOnce({
      docs: [{
        id: 'b1',
        data: () => ({
          status: 'pending',
          paymentStatus: 'pending',
          farmhouseId: 'fh1',
          checkInDate: futureDate(3),
          checkOutDate: futureDate(5),
          createdAt: { toDate: () => oldDate },
        }),
      }],
    });
    (doc as jest.Mock).mockReturnValue('ref');
    (updateDoc as jest.Mock).mockResolvedValue(undefined);

    const result = await cleanupAbandonedBookings('user1', 2);
    expect(result).toBe(1);
  });

  it('skips recent bookings (within maxAgeMinutes)', async () => {
    const recentDate = new Date(); // just now

    (getDocs as jest.Mock).mockResolvedValueOnce({
      docs: [{
        id: 'b1',
        data: () => ({
          status: 'pending',
          paymentStatus: 'pending',
          createdAt: { toDate: () => recentDate },
        }),
      }],
    });

    const result = await cleanupAbandonedBookings('user1', 2);
    expect(result).toBe(0);
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('returns 0 on error', async () => {
    (getDocs as jest.Mock).mockRejectedValueOnce(new Error('error'));
    const result = await cleanupAbandonedBookings('user1');
    expect(result).toBe(0);
  });
});
