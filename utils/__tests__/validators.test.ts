import { validators, validateFields, allValid } from '../validators';

describe('Validators', () => {
  describe('aadhaar', () => {
    it('should accept valid 12-digit Aadhaar', () => {
      expect(validators.aadhaar('123456789012').isValid).toBe(true);
      expect(validators.aadhaar('1234 5678 9012').isValid).toBe(true);
    });

    it('should reject invalid Aadhaar', () => {
      expect(validators.aadhaar('12345').isValid).toBe(false);
      expect(validators.aadhaar('12345678901').isValid).toBe(false);
      expect(validators.aadhaar('1234567890123').isValid).toBe(false);
      expect(validators.aadhaar('abcd12345678').isValid).toBe(false);
    });

    it('should return appropriate error message', () => {
      const result = validators.aadhaar('123');
      expect(result.error).toBe('Aadhaar must be exactly 12 digits');
    });
  });

  describe('pan', () => {
    it('should accept valid PAN number', () => {
      expect(validators.pan('ABCDE1234F').isValid).toBe(true);
      expect(validators.pan('abcde1234f').isValid).toBe(true); // should handle lowercase
    });

    it('should reject invalid PAN', () => {
      expect(validators.pan('ABC1234567').isValid).toBe(false);
      expect(validators.pan('ABCDEF1234').isValid).toBe(false);
      expect(validators.pan('12345ABCDE').isValid).toBe(false);
    });

    it('should return appropriate error message', () => {
      const result = validators.pan('INVALID');
      expect(result.error).toBe('PAN must be in format: AAAAA9999A');
    });
  });

  describe('phone', () => {
    it('should accept valid Indian phone numbers', () => {
      expect(validators.phone('9876543210').isValid).toBe(true);
      expect(validators.phone('8765432109').isValid).toBe(true);
      expect(validators.phone('7654321098').isValid).toBe(true);
      expect(validators.phone('6543210987').isValid).toBe(true);
      expect(validators.phone('+91 9876543210').isValid).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validators.phone('1234567890').isValid).toBe(false); // doesn't start with 6-9
      expect(validators.phone('987654321').isValid).toBe(false); // too short
      expect(validators.phone('98765432100').isValid).toBe(false); // too long
      expect(validators.phone('abcdefghij').isValid).toBe(false);
    });
  });

  describe('ifsc', () => {
    it('should accept valid IFSC codes', () => {
      expect(validators.ifsc('SBIN0001234').isValid).toBe(true);
      expect(validators.ifsc('HDFC0000123').isValid).toBe(true);
    });

    it('should reject invalid IFSC codes', () => {
      expect(validators.ifsc('SBIN1001234').isValid).toBe(false); // 5th char must be 0
      expect(validators.ifsc('SBI0001234').isValid).toBe(false); // too short
      expect(validators.ifsc('SBIN00012345').isValid).toBe(false); // too long
    });
  });

  describe('accountNumber', () => {
    it('should accept valid account numbers', () => {
      expect(validators.accountNumber('123456789').isValid).toBe(true);
      expect(validators.accountNumber('12345678901234').isValid).toBe(true);
      expect(validators.accountNumber('123456789012345678').isValid).toBe(true);
    });

    it('should reject invalid account numbers', () => {
      expect(validators.accountNumber('12345678').isValid).toBe(false); // too short
      expect(validators.accountNumber('1234567890123456789').isValid).toBe(false); // too long
    });
  });

  describe('price', () => {
    it('should accept valid prices', () => {
      expect(validators.price(100).isValid).toBe(true);
      expect(validators.price(5000).isValid).toBe(true);
      expect(validators.price(999999).isValid).toBe(true);
    });

    it('should reject invalid prices', () => {
      expect(validators.price(0).isValid).toBe(false);
      expect(validators.price(-100).isValid).toBe(false);
      expect(validators.price(1000000).isValid).toBe(false);
      expect(validators.price(1500000).isValid).toBe(false);
    });
  });

  describe('capacity', () => {
    it('should accept valid capacity', () => {
      expect(validators.capacity(1).isValid).toBe(true);
      expect(validators.capacity(50).isValid).toBe(true);
      expect(validators.capacity(100).isValid).toBe(true);
    });

    it('should reject invalid capacity', () => {
      expect(validators.capacity(0).isValid).toBe(false);
      expect(validators.capacity(-5).isValid).toBe(false);
      expect(validators.capacity(101).isValid).toBe(false);
      expect(validators.capacity(200).isValid).toBe(false);
    });
  });

  describe('email', () => {
    it('should accept valid emails', () => {
      expect(validators.email('user@example.com').isValid).toBe(true);
      expect(validators.email('test.user@domain.co.in').isValid).toBe(true);
      expect(validators.email('user123@test-domain.com').isValid).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(validators.email('invalid').isValid).toBe(false);
      expect(validators.email('user@').isValid).toBe(false);
      expect(validators.email('@domain.com').isValid).toBe(false);
      expect(validators.email('user domain@test.com').isValid).toBe(false);
    });
  });

  describe('name', () => {
    it('should accept valid names', () => {
      expect(validators.name('John Doe').isValid).toBe(true);
      expect(validators.name('Alice').isValid).toBe(true);
      expect(validators.name('Mary Jane Watson').isValid).toBe(true);
    });

    it('should reject invalid names', () => {
      expect(validators.name('A').isValid).toBe(false); // too short
      expect(validators.name('John123').isValid).toBe(false); // contains numbers
      expect(validators.name('John@Doe').isValid).toBe(false); // contains special chars
      expect(validators.name('').isValid).toBe(false);
    });
  });

  describe('rating', () => {
    it('should accept valid ratings', () => {
      expect(validators.rating(1).isValid).toBe(true);
      expect(validators.rating(3).isValid).toBe(true);
      expect(validators.rating(5).isValid).toBe(true);
    });

    it('should reject invalid ratings', () => {
      expect(validators.rating(0).isValid).toBe(false);
      expect(validators.rating(6).isValid).toBe(false);
      expect(validators.rating(-1).isValid).toBe(false);
    });
  });

  describe('futureDate', () => {
    it('should accept future dates', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(validators.futureDate(tomorrow).isValid).toBe(true);
      expect(validators.futureDate('2030-12-31').isValid).toBe(true);
    });

    it('should accept today', () => {
      const today = new Date();
      expect(validators.futureDate(today).isValid).toBe(true);
    });

    it('should reject past dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(validators.futureDate(yesterday).isValid).toBe(false);
      expect(validators.futureDate('2020-01-01').isValid).toBe(false);
    });
  });

  describe('dateRange', () => {
    it('should accept valid date ranges', () => {
      expect(validators.dateRange('2025-12-01', '2025-12-05').isValid).toBe(true);

      const checkIn = new Date('2025-12-01');
      const checkOut = new Date('2025-12-05');
      expect(validators.dateRange(checkIn, checkOut).isValid).toBe(true);
    });

    it('should reject invalid date ranges', () => {
      expect(validators.dateRange('2025-12-05', '2025-12-01').isValid).toBe(false);
      expect(validators.dateRange('2025-12-01', '2025-12-01').isValid).toBe(false);
    });
  });

  describe('url', () => {
    it('should accept valid URLs', () => {
      expect(validators.url('https://example.com').isValid).toBe(true);
      expect(validators.url('http://test.com').isValid).toBe(true);
      expect(validators.url('https://maps.google.com/123').isValid).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(validators.url('not a url').isValid).toBe(false);
      expect(validators.url('example.com').isValid).toBe(false); // missing protocol
      expect(validators.url('').isValid).toBe(false);
    });
  });

  describe('fileSize', () => {
    it('should accept files within size limit', () => {
      expect(validators.fileSize(1024 * 1024, 5).isValid).toBe(true); // 1MB file, 5MB limit
      expect(validators.fileSize(5 * 1024 * 1024, 5).isValid).toBe(true); // exactly 5MB
    });

    it('should reject files exceeding size limit', () => {
      expect(validators.fileSize(6 * 1024 * 1024, 5).isValid).toBe(false); // 6MB file, 5MB limit
      expect(validators.fileSize(10 * 1024 * 1024, 5).isValid).toBe(false);
    });
  });

  describe('imageType', () => {
    it('should accept valid image types', () => {
      expect(validators.imageType('image/jpeg').isValid).toBe(true);
      expect(validators.imageType('image/jpg').isValid).toBe(true);
      expect(validators.imageType('image/png').isValid).toBe(true);
      expect(validators.imageType('image/webp').isValid).toBe(true);
    });

    it('should reject invalid image types', () => {
      expect(validators.imageType('application/pdf').isValid).toBe(false);
      expect(validators.imageType('image/gif').isValid).toBe(false);
      expect(validators.imageType('text/plain').isValid).toBe(false);
    });
  });

  describe('documentType', () => {
    it('should accept valid document types', () => {
      expect(validators.documentType('image/jpeg').isValid).toBe(true);
      expect(validators.documentType('application/pdf').isValid).toBe(true);
    });

    it('should reject invalid document types', () => {
      expect(validators.documentType('application/msword').isValid).toBe(false);
      expect(validators.documentType('text/plain').isValid).toBe(false);
    });
  });

  describe('sanitizeText', () => {
    it('should remove < and > characters', () => {
      expect(validators.sanitizeText('Hello<script>alert()</script>')).toBe('Helloscriptalert()/script');
      expect(validators.sanitizeText('<div>Test</div>')).toBe('divTest/div');
    });

    it('should trim whitespace', () => {
      expect(validators.sanitizeText('  Hello  ')).toBe('Hello');
    });
  });

  describe('sanitizeHTML', () => {
    it('should remove all HTML tags', () => {
      expect(validators.sanitizeHTML('<p>Hello</p>')).toBe('Hello');
      expect(validators.sanitizeHTML('<div><span>Test</span></div>')).toBe('Test');
      expect(validators.sanitizeHTML('<script>alert("xss")</script>')).toBe('');
    });
  });
});

describe('Helper Functions', () => {
  describe('validateFields', () => {
    it('should return empty array when all validations pass', () => {
      const validations = [
        validators.email('test@example.com'),
        validators.phone('9876543210'),
        validators.price(5000),
      ];
      expect(validateFields(validations)).toEqual([]);
    });

    it('should return array of error messages when validations fail', () => {
      const validations = [
        validators.email('invalid'),
        validators.phone('123'),
        validators.price(-100),
      ];
      const errors = validateFields(validations);
      expect(errors).toHaveLength(3);
      expect(errors).toContain('Invalid email format');
      expect(errors).toContain('Phone number must be 10 digits starting with 6-9');
      expect(errors).toContain('Price must be between ₹1 and ₹10,00,000');
    });

    it('should return only failed validation errors', () => {
      const validations = [
        validators.email('test@example.com'), // valid
        validators.phone('123'), // invalid
        validators.price(5000), // valid
      ];
      const errors = validateFields(validations);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toBe('Phone number must be 10 digits starting with 6-9');
    });
  });

  describe('allValid', () => {
    it('should return true when all validations pass', () => {
      const validations = [
        validators.email('test@example.com'),
        validators.phone('9876543210'),
        validators.price(5000),
      ];
      expect(allValid(validations)).toBe(true);
    });

    it('should return false when any validation fails', () => {
      const validations = [
        validators.email('test@example.com'),
        validators.phone('invalid'),
        validators.price(5000),
      ];
      expect(allValid(validations)).toBe(false);
    });

    it('should return true for empty array', () => {
      expect(allValid([])).toBe(true);
    });
  });
});
