import {
  calculateRefundAmount,
  getCancellationPolicyDescription,
  DEFAULT_CANCELLATION_POLICY,
  cancelBookingWithRefund,
} from '../cancellationService';

import {
  getDoc,
  updateDoc,
  doc,
} from 'firebase/firestore';

jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() => jest.fn().mockResolvedValue({})),
}));

jest.mock('../paymentService', () => ({
  processRefund: jest.fn().mockResolvedValue({ refundId: 'ref_123' }),
}));

jest.mock('../notificationService', () => ({
  sendCancellationNotification: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../auditService', () => ({
  logAuditEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../availabilityService', () => ({
  removeBookedDatesFromFarmhouse: jest.fn().mockResolvedValue(undefined),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────
const hoursFromNow = (hours: number): string => {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d.toISOString();
};

// ─── calculateRefundAmount ────────────────────────────────────────────────────
describe('calculateRefundAmount', () => {
  describe('owner cancellation', () => {
    it('always returns 100% refund regardless of timing', () => {
      const result = calculateRefundAmount(10000, hoursFromNow(1), true);
      expect(result.refundAmount).toBe(10000);
      expect(result.refundPercentage).toBe(100);
      expect(result.processingFee).toBe(0);
      expect(result.reason).toMatch(/owner/i);
    });

    it('returns 100% refund even after check-in when owner cancels', () => {
      const result = calculateRefundAmount(5000, hoursFromNow(-2), true);
      expect(result.refundAmount).toBe(5000);
      expect(result.refundPercentage).toBe(100);
    });
  });

  describe('after check-in (no refund)', () => {
    it('returns 0 refund when check-in was 1 hour ago', () => {
      const result = calculateRefundAmount(10000, hoursFromNow(-1));
      expect(result.refundAmount).toBe(0);
      expect(result.refundPercentage).toBe(0);
      expect(result.processingFee).toBe(0);
      expect(result.reason).toMatch(/after check-in/i);
    });

    it('returns 0 refund when check-in was 24 hours ago', () => {
      const result = calculateRefundAmount(8000, hoursFromNow(-24));
      expect(result.refundAmount).toBe(0);
      expect(result.refundPercentage).toBe(0);
    });
  });

  describe('within 24 hours of check-in (50% refund)', () => {
    it('returns 50% refund when 12 hours remain', () => {
      const result = calculateRefundAmount(10000, hoursFromNow(12));
      expect(result.refundAmount).toBe(5000);
      expect(result.refundPercentage).toBe(50);
      expect(result.reason).toMatch(/50%/);
    });

    it('returns 50% refund when 1 hour remains', () => {
      const result = calculateRefundAmount(8000, hoursFromNow(1));
      expect(result.refundAmount).toBe(4000);
      expect(result.refundPercentage).toBe(50);
    });

    it('handles odd amounts correctly (50% of 9999)', () => {
      const result = calculateRefundAmount(9999, hoursFromNow(10));
      expect(result.refundAmount).toBe(4999.5);
    });
  });

  describe('more than 24 hours before check-in (100% refund)', () => {
    it('returns 100% refund when 48 hours remain', () => {
      const result = calculateRefundAmount(10000, hoursFromNow(48));
      expect(result.refundAmount).toBe(10000);
      expect(result.refundPercentage).toBe(100);
      expect(result.processingFee).toBe(0);
      expect(result.reason).toMatch(/100%/);
    });

    it('returns 100% refund when 7 days remain', () => {
      const result = calculateRefundAmount(15000, hoursFromNow(168));
      expect(result.refundAmount).toBe(15000);
      expect(result.refundPercentage).toBe(100);
    });
  });

  describe('edge cases', () => {
    it('handles zero total amount', () => {
      const result = calculateRefundAmount(0, hoursFromNow(48));
      expect(result.refundAmount).toBe(0);
      expect(result.refundPercentage).toBe(100);
    });

    it('uses default policy when none provided', () => {
      const result = calculateRefundAmount(10000, hoursFromNow(48));
      expect(result).toBeDefined();
      expect(result.refundAmount).toBeGreaterThanOrEqual(0);
    });
  });
});

// ─── getCancellationPolicyDescription ────────────────────────────────────────
describe('getCancellationPolicyDescription', () => {
  it('returns a non-empty string', () => {
    const desc = getCancellationPolicyDescription();
    expect(typeof desc).toBe('string');
    expect(desc.length).toBeGreaterThan(0);
  });

  it('mentions 24 hours threshold', () => {
    const desc = getCancellationPolicyDescription();
    expect(desc).toMatch(/24 hours/i);
  });

  it('mentions 100% refund', () => {
    const desc = getCancellationPolicyDescription();
    expect(desc).toMatch(/100%/);
  });

  it('mentions 50% refund', () => {
    const desc = getCancellationPolicyDescription();
    expect(desc).toMatch(/50%/);
  });

  it('mentions owner cancellation', () => {
    const desc = getCancellationPolicyDescription();
    expect(desc).toMatch(/owner/i);
  });

  it('accepts a custom policy without throwing', () => {
    const customPolicy = { ...DEFAULT_CANCELLATION_POLICY, freeCancellationDays: 3 };
    expect(() => getCancellationPolicyDescription(customPolicy)).not.toThrow();
  });
});

// ─── cancelBookingWithRefund ──────────────────────────────────────────────────
describe('cancelBookingWithRefund', () => {
  beforeEach(() => jest.clearAllMocks());

  const makeBookingSnap = (overrides = {}) => ({
    exists: () => true,
    id: 'booking1',
    data: () => ({
      userId: 'user1',
      farmhouseId: 'fh1',
      farmhouseName: 'Green Meadows',
      checkInDate: hoursFromNow(48),
      checkOutDate: hoursFromNow(72),
      totalPrice: 10000,
      status: 'confirmed',
      paymentStatus: 'paid',
      transactionId: 'pay_abc123',
      ...overrides,
    }),
  });

  it('throws when booking not found', async () => {
    (doc as jest.Mock).mockReturnValue('ref');
    (getDoc as jest.Mock).mockResolvedValueOnce({ exists: () => false });

    await expect(cancelBookingWithRefund('booking1', 'user1')).rejects.toThrow('Booking not found');
  });

  it('throws when user is not the booking owner', async () => {
    (doc as jest.Mock).mockReturnValue('ref');
    (getDoc as jest.Mock).mockResolvedValueOnce(makeBookingSnap({ userId: 'otherUser' }));

    await expect(cancelBookingWithRefund('booking1', 'user1')).rejects.toThrow('Unauthorized');
  });

  it('throws when booking is already cancelled', async () => {
    (doc as jest.Mock).mockReturnValue('ref');
    (getDoc as jest.Mock).mockResolvedValueOnce(makeBookingSnap({ status: 'cancelled' }));

    await expect(cancelBookingWithRefund('booking1', 'user1')).rejects.toThrow('already cancelled');
  });

  it('successfully cancels with 100% refund when > 24h before check-in', async () => {
    (doc as jest.Mock).mockReturnValue('ref');
    (getDoc as jest.Mock).mockResolvedValueOnce(makeBookingSnap());
    (updateDoc as jest.Mock).mockResolvedValue(undefined);

    const result = await cancelBookingWithRefund('booking1', 'user1', 'changed plans');
    expect(result.success).toBe(true);
    expect(result.refundAmount).toBe(10000);
    expect(result.refundPercentage).toBe(100);
    expect(updateDoc).toHaveBeenCalledWith('ref', expect.objectContaining({ status: 'cancelled' }));
  });

  it('successfully cancels with 50% refund when < 24h before check-in', async () => {
    (doc as jest.Mock).mockReturnValue('ref');
    (getDoc as jest.Mock).mockResolvedValueOnce(makeBookingSnap({ checkInDate: hoursFromNow(5) }));
    (updateDoc as jest.Mock).mockResolvedValue(undefined);

    const result = await cancelBookingWithRefund('booking1', 'user1');
    expect(result.success).toBe(true);
    expect(result.refundAmount).toBe(5000);
    expect(result.refundPercentage).toBe(50);
  });

  it('owner cancellation bypasses userId check and gives 100% refund', async () => {
    (doc as jest.Mock).mockReturnValue('ref');
    (getDoc as jest.Mock).mockResolvedValueOnce(makeBookingSnap({ userId: 'actualOwner' }));
    (updateDoc as jest.Mock).mockResolvedValue(undefined);

    const result = await cancelBookingWithRefund('booking1', 'ownerId', 'overbooking', true);
    expect(result.success).toBe(true);
    expect(result.refundAmount).toBe(10000);
    expect(result.refundPercentage).toBe(100);
  });

  it('skips refund processing when paymentStatus is not paid', async () => {
    const { processRefund } = require('../paymentService');
    (doc as jest.Mock).mockReturnValue('ref');
    (getDoc as jest.Mock).mockResolvedValueOnce(
      makeBookingSnap({ paymentStatus: 'pending' })
    );
    (updateDoc as jest.Mock).mockResolvedValue(undefined);

    await cancelBookingWithRefund('booking1', 'user1');
    expect(processRefund).not.toHaveBeenCalled();
  });
});
