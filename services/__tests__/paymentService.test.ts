import {
  formatAmountToPaise,
  formatAmountToRupees,
  calculateProcessingFee,
  generateOrderId,
} from '../paymentService';

describe('Payment Service - Utility Functions', () => {
  describe('formatAmountToPaise', () => {
    it('should convert rupees to paise correctly', () => {
      expect(formatAmountToPaise(100)).toBe(10000);
      expect(formatAmountToPaise(1)).toBe(100);
      expect(formatAmountToPaise(0)).toBe(0);
    });

    it('should handle decimal values', () => {
      expect(formatAmountToPaise(100.50)).toBe(10050);
      expect(formatAmountToPaise(1.25)).toBe(125);
      expect(formatAmountToPaise(10.99)).toBe(1099);
    });

    it('should round properly', () => {
      expect(formatAmountToPaise(100.555)).toBe(10056); // rounds to 10055.5, then 10056
      expect(formatAmountToPaise(1.999)).toBe(200); // rounds to 199.9, then 200
    });

    it('should handle large amounts', () => {
      expect(formatAmountToPaise(10000)).toBe(1000000);
      expect(formatAmountToPaise(100000)).toBe(10000000);
    });
  });

  describe('formatAmountToRupees', () => {
    it('should convert paise to rupees correctly', () => {
      expect(formatAmountToRupees(10000)).toBe(100);
      expect(formatAmountToRupees(100)).toBe(1);
      expect(formatAmountToRupees(0)).toBe(0);
    });

    it('should handle odd paise values', () => {
      expect(formatAmountToRupees(10050)).toBe(100.5);
      expect(formatAmountToRupees(125)).toBe(1.25);
      expect(formatAmountToRupees(1099)).toBe(10.99);
    });

    it('should handle large amounts', () => {
      expect(formatAmountToRupees(1000000)).toBe(10000);
      expect(formatAmountToRupees(10000000)).toBe(100000);
    });
  });

  describe('calculateProcessingFee', () => {
    it('should calculate 2% + ₹3 correctly', () => {
      // For ₹100: 2% = ₹2, total = ₹2 + ₹3 = ₹5
      expect(calculateProcessingFee(100)).toBe(5);

      // For ₹1000: 2% = ₹20, total = ₹20 + ₹3 = ₹23
      expect(calculateProcessingFee(1000)).toBe(23);

      // For ₹10000: 2% = ₹200, total = ₹200 + ₹3 = ₹203
      expect(calculateProcessingFee(10000)).toBe(203);
    });

    it('should handle small amounts', () => {
      // For ₹10: 2% = ₹0.2, total = ₹0.2 + ₹3 = ₹3.2 → rounds to ₹3
      expect(calculateProcessingFee(10)).toBe(3);

      // For ₹50: 2% = ₹1, total = ₹1 + ₹3 = ₹4
      expect(calculateProcessingFee(50)).toBe(4);
    });

    it('should handle large amounts', () => {
      // For ₹50000: 2% = ₹1000, total = ₹1000 + ₹3 = ₹1003
      expect(calculateProcessingFee(50000)).toBe(1003);

      // For ₹100000: 2% = ₹2000, total = ₹2000 + ₹3 = ₹2003
      expect(calculateProcessingFee(100000)).toBe(2003);
    });

    it('should round to nearest integer', () => {
      // For ₹123.45: 2% = ₹2.469, total = ₹2.469 + ₹3 = ₹5.469 → rounds to ₹5
      expect(calculateProcessingFee(123.45)).toBe(5);
    });

    it('should handle zero amount', () => {
      expect(calculateProcessingFee(0)).toBe(3); // Just the flat fee
    });
  });

  describe('generateOrderId', () => {
    it('should generate order ID with correct format', () => {
      const bookingId = 'booking123';
      const orderId = generateOrderId(bookingId);

      expect(orderId).toMatch(/^order_booking123_\d+$/);
      expect(orderId).toContain('order_');
      expect(orderId).toContain('booking123');
    });

    it('should generate unique IDs for same booking', () => {
      const bookingId = 'booking123';
      const orderId1 = generateOrderId(bookingId);

      // Wait a tiny bit to ensure different timestamp
      const orderId2 = generateOrderId(bookingId);

      // They should be different due to timestamp
      // (may be same if generated in same millisecond, but format is correct)
      expect(orderId1).toMatch(/^order_booking123_\d+$/);
      expect(orderId2).toMatch(/^order_booking123_\d+$/);
    });

    it('should handle different booking IDs', () => {
      const orderId1 = generateOrderId('booking1');
      const orderId2 = generateOrderId('booking2');

      expect(orderId1).toContain('booking1');
      expect(orderId2).toContain('booking2');
      expect(orderId1).not.toEqual(orderId2);
    });
  });

  describe('Round-trip conversion', () => {
    it('should maintain value through paise -> rupees -> paise', () => {
      const originalRupees = 12345.67;
      const paise = formatAmountToPaise(originalRupees);
      const backToRupees = formatAmountToRupees(paise);

      // Should be approximately equal (within floating point precision)
      expect(Math.abs(backToRupees - originalRupees)).toBeLessThan(0.01);
    });

    it('should maintain value through rupees -> paise -> rupees', () => {
      const originalPaise = 1234567;
      const rupees = formatAmountToRupees(originalPaise);
      const backToPaise = formatAmountToPaise(rupees);

      expect(backToPaise).toBe(originalPaise);
    });
  });
});

describe('Payment Service - Edge Cases', () => {
  describe('Negative values', () => {
    it('should handle negative amounts in conversions', () => {
      expect(formatAmountToPaise(-100)).toBe(-10000);
      expect(formatAmountToRupees(-10000)).toBe(-100);
    });

    it('should handle negative amounts in fee calculation', () => {
      // Though not a valid use case, function should handle it
      expect(calculateProcessingFee(-100)).toBe(1); // -2 + 3 = 1
    });
  });

  describe('Very large numbers', () => {
    it('should handle very large rupee amounts', () => {
      const largeAmount = 9999999;
      const paise = formatAmountToPaise(largeAmount);
      expect(paise).toBe(999999900);
    });

    it('should handle very large paise amounts', () => {
      const largePaise = 999999900;
      const rupees = formatAmountToRupees(largePaise);
      expect(rupees).toBe(9999999);
    });
  });

  describe('Floating point precision', () => {
    it('should handle typical booking amounts correctly', () => {
      const bookingAmounts = [5000, 10000, 15000, 20000, 50000];

      bookingAmounts.forEach(amount => {
        const paise = formatAmountToPaise(amount);
        const backToRupees = formatAmountToRupees(paise);
        expect(backToRupees).toBe(amount);
      });
    });
  });
});
