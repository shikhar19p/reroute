import {
  calculateFinalPrice,
  formatCouponDisplay,
  Coupon,
} from '../couponService';

describe('Coupon Service - Utility Functions', () => {
  describe('calculateFinalPrice', () => {
    it('should calculate final price after discount', () => {
      expect(calculateFinalPrice(10000, 1000)).toBe(9000);
      expect(calculateFinalPrice(5000, 500)).toBe(4500);
      expect(calculateFinalPrice(15000, 2000)).toBe(13000);
    });

    it('should handle zero discount', () => {
      expect(calculateFinalPrice(10000, 0)).toBe(10000);
    });

    it('should not go below zero', () => {
      expect(calculateFinalPrice(10000, 15000)).toBe(0);
      expect(calculateFinalPrice(1000, 2000)).toBe(0);
    });

    it('should handle exact match discount', () => {
      expect(calculateFinalPrice(10000, 10000)).toBe(0);
    });

    it('should handle decimal values', () => {
      expect(calculateFinalPrice(10050.50, 1000.25)).toBe(9050.25);
    });

    it('should handle small amounts', () => {
      expect(calculateFinalPrice(100, 10)).toBe(90);
      expect(calculateFinalPrice(50, 5)).toBe(45);
    });
  });

  describe('formatCouponDisplay', () => {
    it('should format percentage coupons without max discount', () => {
      const coupon: Partial<Coupon> = {
        discountType: 'percentage',
        discountValue: 10,
      };

      expect(formatCouponDisplay(coupon as Coupon)).toBe('10% OFF');
    });

    it('should format percentage coupons with max discount', () => {
      const coupon: Partial<Coupon> = {
        discountType: 'percentage',
        discountValue: 20,
        maxDiscountAmount: 1000,
      };

      expect(formatCouponDisplay(coupon as Coupon)).toBe('20% OFF (max ₹1000)');
    });

    it('should format fixed amount coupons', () => {
      const coupon: Partial<Coupon> = {
        discountType: 'fixed',
        discountValue: 500,
      };

      expect(formatCouponDisplay(coupon as Coupon)).toBe('₹500 OFF');
    });

    it('should handle various percentage values', () => {
      const coupons = [
        { discountType: 'percentage' as const, discountValue: 5 },
        { discountType: 'percentage' as const, discountValue: 15 },
        { discountType: 'percentage' as const, discountValue: 25 },
        { discountType: 'percentage' as const, discountValue: 50 },
      ];

      expect(formatCouponDisplay(coupons[0] as Coupon)).toBe('5% OFF');
      expect(formatCouponDisplay(coupons[1] as Coupon)).toBe('15% OFF');
      expect(formatCouponDisplay(coupons[2] as Coupon)).toBe('25% OFF');
      expect(formatCouponDisplay(coupons[3] as Coupon)).toBe('50% OFF');
    });

    it('should handle various fixed amount values', () => {
      const coupons = [
        { discountType: 'fixed' as const, discountValue: 100 },
        { discountType: 'fixed' as const, discountValue: 500 },
        { discountType: 'fixed' as const, discountValue: 1000 },
        { discountType: 'fixed' as const, discountValue: 5000 },
      ];

      expect(formatCouponDisplay(coupons[0] as Coupon)).toBe('₹100 OFF');
      expect(formatCouponDisplay(coupons[1] as Coupon)).toBe('₹500 OFF');
      expect(formatCouponDisplay(coupons[2] as Coupon)).toBe('₹1000 OFF');
      expect(formatCouponDisplay(coupons[3] as Coupon)).toBe('₹5000 OFF');
    });
  });
});

describe('Coupon Service - Discount Calculations', () => {
  describe('Percentage discount scenarios', () => {
    it('should calculate 10% discount correctly', () => {
      const originalPrice = 10000;
      const discountPercent = 10;
      const discount = (originalPrice * discountPercent) / 100; // 1000

      const finalPrice = calculateFinalPrice(originalPrice, discount);
      expect(finalPrice).toBe(9000);
    });

    it('should calculate 20% discount correctly', () => {
      const originalPrice = 5000;
      const discountPercent = 20;
      const discount = (originalPrice * discountPercent) / 100; // 1000

      const finalPrice = calculateFinalPrice(originalPrice, discount);
      expect(finalPrice).toBe(4000);
    });

    it('should cap discount at max amount', () => {
      const originalPrice = 20000;
      const discountPercent = 20;
      const calculatedDiscount = (originalPrice * discountPercent) / 100; // 4000
      const maxDiscount = 2000;
      const appliedDiscount = Math.min(calculatedDiscount, maxDiscount); // 2000

      const finalPrice = calculateFinalPrice(originalPrice, appliedDiscount);
      expect(finalPrice).toBe(18000);
    });
  });

  describe('Fixed discount scenarios', () => {
    it('should apply flat ₹500 discount', () => {
      const originalPrice = 8000;
      const discount = 500;

      const finalPrice = calculateFinalPrice(originalPrice, discount);
      expect(finalPrice).toBe(7500);
    });

    it('should apply flat ₹1000 discount', () => {
      const originalPrice = 15000;
      const discount = 1000;

      const finalPrice = calculateFinalPrice(originalPrice, discount);
      expect(finalPrice).toBe(14000);
    });

    it('should not apply discount if exceeds price', () => {
      const originalPrice = 500;
      const discount = 1000;

      const finalPrice = calculateFinalPrice(originalPrice, discount);
      expect(finalPrice).toBe(0);
    });
  });

  describe('Real-world coupon scenarios', () => {
    it('FIRST100 - ₹100 off on first booking', () => {
      const bookingAmount = 5000;
      const discount = 100;
      expect(calculateFinalPrice(bookingAmount, discount)).toBe(4900);
    });

    it('SAVE10 - 10% off with max ₹1000', () => {
      // Case 1: Discount within cap
      let bookingAmount = 5000;
      let calculatedDiscount = bookingAmount * 0.1; // 500
      expect(calculateFinalPrice(bookingAmount, calculatedDiscount)).toBe(4500);

      // Case 2: Discount exceeds cap
      bookingAmount = 15000;
      calculatedDiscount = bookingAmount * 0.1; // 1500
      const cappedDiscount = Math.min(calculatedDiscount, 1000);
      expect(calculateFinalPrice(bookingAmount, cappedDiscount)).toBe(14000);
    });

    it('WEEKEND20 - 20% off weekend bookings', () => {
      const weekendPrice = 12000;
      const discount = weekendPrice * 0.2; // 2400
      expect(calculateFinalPrice(weekendPrice, discount)).toBe(9600);
    });

    it('FLAT500 - Flat ₹500 off', () => {
      const bookingAmount = 8000;
      const discount = 500;
      expect(calculateFinalPrice(bookingAmount, discount)).toBe(7500);
    });
  });
});

describe('Coupon Service - Edge Cases', () => {
  describe('Boundary conditions', () => {
    it('should handle minimum booking amount with discount', () => {
      expect(calculateFinalPrice(1, 0.5)).toBe(0.5);
      expect(calculateFinalPrice(10, 1)).toBe(9);
    });

    it('should handle very large booking amounts', () => {
      const largeAmount = 999999;
      const discount = 99999;
      expect(calculateFinalPrice(largeAmount, discount)).toBe(900000);
    });

    it('should handle discount equal to booking amount', () => {
      expect(calculateFinalPrice(5000, 5000)).toBe(0);
      expect(calculateFinalPrice(10000, 10000)).toBe(0);
    });
  });

  describe('Decimal precision', () => {
    it('should handle decimal discount amounts', () => {
      expect(calculateFinalPrice(10000, 999.99)).toBe(9000.01);
      expect(calculateFinalPrice(5000, 1234.56)).toBe(3765.44);
    });

    it('should handle decimal booking amounts', () => {
      expect(calculateFinalPrice(10000.50, 1000.25)).toBe(9000.25);
      expect(calculateFinalPrice(5555.55, 555.55)).toBe(5000);
    });
  });

  describe('Coupon display formatting', () => {
    it('should handle 100% discount display', () => {
      const coupon: Partial<Coupon> = {
        discountType: 'percentage',
        discountValue: 100,
      };
      expect(formatCouponDisplay(coupon as Coupon)).toBe('100% OFF');
    });

    it('should handle very large fixed discounts', () => {
      const coupon: Partial<Coupon> = {
        discountType: 'fixed',
        discountValue: 50000,
      };
      expect(formatCouponDisplay(coupon as Coupon)).toBe('₹50000 OFF');
    });

    it('should handle small percentage with large max cap', () => {
      const coupon: Partial<Coupon> = {
        discountType: 'percentage',
        discountValue: 5,
        maxDiscountAmount: 10000,
      };
      expect(formatCouponDisplay(coupon as Coupon)).toBe('5% OFF (max ₹10000)');
    });
  });
});
