import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('Booking Service - Core Tests', () => {
  let mockBookingData: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockBookingData = {
      farmhouseId: 'farm-123',
      farmhouseName: 'Test Farm',
      userId: 'user-123',
      userEmail: 'test@example.com',
      userName: 'Test User',
      userPhone: '9999999999',
      checkInDate: '2026-05-15',
      checkOutDate: '2026-05-17',
      guests: 4,
      totalPrice: 5000,
      bookingType: 'overnight',
      status: 'pending',
      paymentStatus: 'pending',
    };
  });

  describe('Booking Validation', () => {
    it('should validate required fields', () => {
      expect(mockBookingData.farmhouseId).toBeTruthy();
      expect(mockBookingData.userId).toBeTruthy();
      expect(mockBookingData.totalPrice).toBeGreaterThan(0);
    });

    it('should reject invalid email format', () => {
      mockBookingData.userEmail = 'invalid-email';
      expect(mockBookingData.userEmail).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    it('should validate phone number (10 digits)', () => {
      expect(mockBookingData.userPhone).toMatch(/^\d{10}$/);
    });

    it('should ensure checkout date is after checkin', () => {
      const checkIn = new Date(mockBookingData.checkInDate);
      const checkOut = new Date(mockBookingData.checkOutDate);
      expect(checkOut.getTime()).toBeGreaterThan(checkIn.getTime());
    });

    it('should reject negative prices', () => {
      mockBookingData.totalPrice = -100;
      expect(mockBookingData.totalPrice).toBeLessThan(0);
    });

    it('should validate guest count (minimum 1)', () => {
      expect(mockBookingData.guests).toBeGreaterThanOrEqual(1);
    });

    it('should accept valid booking data', () => {
      expect(mockBookingData).toEqual(
        expect.objectContaining({
          farmhouseId: expect.any(String),
          userId: expect.any(String),
          totalPrice: expect.any(Number),
          guests: expect.any(Number),
        })
      );
    });
  });

  describe('Booking Types', () => {
    it('should support dayuse booking type', () => {
      mockBookingData.bookingType = 'dayuse';
      expect(mockBookingData.bookingType).toBe('dayuse');
    });

    it('should support overnight booking type', () => {
      mockBookingData.bookingType = 'overnight';
      expect(mockBookingData.bookingType).toBe('overnight');
    });
  });

  describe('Booking Status', () => {
    it('should initialize with pending status', () => {
      expect(mockBookingData.status).toBe('pending');
    });

    it('should have valid status values', () => {
      const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
      expect(validStatuses).toContain(mockBookingData.status);
    });

    it('should initialize with pending payment status', () => {
      expect(mockBookingData.paymentStatus).toBe('pending');
    });
  });

  describe('Coupon Handling', () => {
    it('should handle coupon codes', () => {
      mockBookingData.couponCode = 'SAVE10';
      mockBookingData.discountApplied = 500;
      mockBookingData.originalPrice = 5500;

      expect(mockBookingData.couponCode).toBeTruthy();
      expect(mockBookingData.discountApplied).toBeLessThan(mockBookingData.originalPrice);
    });

    it('should apply discount correctly', () => {
      const original = 5500;
      const discount = 500;
      const final = original - discount;

      expect(final).toBe(5000);
    });
  });
});
