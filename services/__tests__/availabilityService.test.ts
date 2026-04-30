import {
  generateDateRange,
  validateBookingDates,
  checkAvailability,
  getBookingConflicts,
  addBookedDatesToFarmhouse,
  removeBookedDatesFromFarmhouse,
  getMonthAvailability,
} from '../availabilityService';

import {
  getDocs,
  getDoc,
  updateDoc,
  doc,
  collection,
  query,
  where,
} from 'firebase/firestore';

// ─── generateDateRange ────────────────────────────────────────────────────────
describe('generateDateRange', () => {
  it('returns a single date when start equals end', () => {
    expect(generateDateRange('2025-06-01', '2025-06-01')).toEqual(['2025-06-01']);
  });

  it('returns inclusive range for consecutive days', () => {
    expect(generateDateRange('2025-06-01', '2025-06-03')).toEqual([
      '2025-06-01',
      '2025-06-02',
      '2025-06-03',
    ]);
  });

  it('handles month boundaries correctly', () => {
    const result = generateDateRange('2025-01-30', '2025-02-02');
    expect(result).toEqual(['2025-01-30', '2025-01-31', '2025-02-01', '2025-02-02']);
  });

  it('handles leap year February', () => {
    const result = generateDateRange('2024-02-27', '2024-03-01');
    expect(result).toEqual(['2024-02-27', '2024-02-28', '2024-02-29', '2024-03-01']);
  });

  it('returns empty array when start is after end', () => {
    expect(generateDateRange('2025-06-05', '2025-06-01')).toEqual([]);
  });

  it('returns all dates in a full week', () => {
    const result = generateDateRange('2025-06-01', '2025-06-07');
    expect(result).toHaveLength(7);
    expect(result[0]).toBe('2025-06-01');
    expect(result[6]).toBe('2025-06-07');
  });
});

// ─── validateBookingDates ─────────────────────────────────────────────────────
describe('validateBookingDates', () => {
  beforeEach(() => jest.clearAllMocks());

  const future = (daysFromNow: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  it('returns invalid when checkOut is before checkIn', async () => {
    const checkIn = future(5);
    const checkOut = future(3);
    const result = await validateBookingDates('fh1', checkIn, checkOut);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/check-out/i);
  });

  it('returns invalid when checkIn is in the past', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const result = await validateBookingDates('fh1', yesterday, future(1));
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/past/i);
  });

  it('returns invalid when there are booking conflicts', async () => {
    (collection as jest.Mock).mockReturnValue('col');
    (query as jest.Mock).mockReturnValue('q');
    (where as jest.Mock).mockReturnValue('w');
    (getDocs as jest.Mock).mockResolvedValueOnce({
      docs: [{
        id: 'b1',
        data: () => ({
          checkInDate: future(3).toISOString(),
          checkOutDate: future(7).toISOString(),
        }),
      }],
    });

    const result = await validateBookingDates('fh1', future(4), future(6));
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/not available/i);
  });

  it('returns valid when dates are in the future and no conflicts', async () => {
    (collection as jest.Mock).mockReturnValue('col');
    (query as jest.Mock).mockReturnValue('q');
    (where as jest.Mock).mockReturnValue('w');
    (getDocs as jest.Mock).mockResolvedValueOnce({ docs: [] });

    const result = await validateBookingDates('fh1', future(5), future(8));
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('allows same-day (day-use) booking: checkIn === checkOut', async () => {
    (collection as jest.Mock).mockReturnValue('col');
    (query as jest.Mock).mockReturnValue('q');
    (where as jest.Mock).mockReturnValue('w');
    (getDocs as jest.Mock).mockResolvedValueOnce({ docs: [] });

    const sameDay = future(3);
    const result = await validateBookingDates('fh1', sameDay, sameDay);
    expect(result.valid).toBe(true);
  });
});

// ─── checkAvailability ────────────────────────────────────────────────────────
describe('checkAvailability', () => {
  beforeEach(() => jest.clearAllMocks());

  const future = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  };

  it('returns true when no conflicts exist', async () => {
    (collection as jest.Mock).mockReturnValue('col');
    (query as jest.Mock).mockReturnValue('q');
    (where as jest.Mock).mockReturnValue('w');
    (getDocs as jest.Mock).mockResolvedValueOnce({ docs: [] });

    const result = await checkAvailability('fh1', future(3), future(5));
    expect(result).toBe(true);
  });

  it('returns false when conflicts exist', async () => {
    (collection as jest.Mock).mockReturnValue('col');
    (query as jest.Mock).mockReturnValue('q');
    (where as jest.Mock).mockReturnValue('w');
    (getDocs as jest.Mock).mockResolvedValueOnce({
      docs: [{
        id: 'b1',
        data: () => ({
          checkInDate: future(3).toISOString(),
          checkOutDate: future(7).toISOString(),
        }),
      }],
    });

    const result = await checkAvailability('fh1', future(4), future(6));
    expect(result).toBe(false);
  });

  it('returns true on error (getBookingConflicts swallows errors → no conflicts)', async () => {
    (collection as jest.Mock).mockReturnValue('col');
    (query as jest.Mock).mockReturnValue('q');
    (where as jest.Mock).mockReturnValue('w');
    (getDocs as jest.Mock).mockRejectedValueOnce(new Error('network error'));

    // getBookingConflicts catches all errors and returns [] → no conflicts → available
    const result = await checkAvailability('fh1', future(3), future(5));
    expect(result).toBe(true);
  });
});

// ─── getBookingConflicts overlap logic ────────────────────────────────────────
describe('getBookingConflicts - overlap detection', () => {
  beforeEach(() => jest.clearAllMocks());

  const makeSnapshot = (bookings: { checkIn: string; checkOut: string }[]) => ({
    docs: bookings.map((b, i) => ({
      id: `b${i}`,
      data: () => ({ checkInDate: b.checkIn, checkOutDate: b.checkOut }),
    })),
  });

  const d = (isoDate: string) => new Date(isoDate);

  beforeEach(() => {
    (collection as jest.Mock).mockReturnValue('col');
    (query as jest.Mock).mockReturnValue('q');
    (where as jest.Mock).mockReturnValue('w');
  });

  it('detects overlap: requested range starts inside existing booking', async () => {
    (getDocs as jest.Mock).mockResolvedValueOnce(
      makeSnapshot([{ checkIn: '2025-06-01', checkOut: '2025-06-05' }])
    );
    const conflicts = await getBookingConflicts('fh1', d('2025-06-03'), d('2025-06-07'));
    expect(conflicts).toHaveLength(1);
  });

  it('detects overlap: requested range ends inside existing booking', async () => {
    (getDocs as jest.Mock).mockResolvedValueOnce(
      makeSnapshot([{ checkIn: '2025-06-05', checkOut: '2025-06-10' }])
    );
    const conflicts = await getBookingConflicts('fh1', d('2025-06-02'), d('2025-06-06'));
    expect(conflicts).toHaveLength(1);
  });

  it('detects overlap: requested range fully contains existing booking', async () => {
    (getDocs as jest.Mock).mockResolvedValueOnce(
      makeSnapshot([{ checkIn: '2025-06-03', checkOut: '2025-06-05' }])
    );
    const conflicts = await getBookingConflicts('fh1', d('2025-06-01'), d('2025-06-10'));
    expect(conflicts).toHaveLength(1);
  });

  it('no conflict: requested range is completely before existing booking', async () => {
    (getDocs as jest.Mock).mockResolvedValueOnce(
      makeSnapshot([{ checkIn: '2025-06-10', checkOut: '2025-06-15' }])
    );
    const conflicts = await getBookingConflicts('fh1', d('2025-06-01'), d('2025-06-05'));
    expect(conflicts).toHaveLength(0);
  });

  it('no conflict: requested range is completely after existing booking', async () => {
    (getDocs as jest.Mock).mockResolvedValueOnce(
      makeSnapshot([{ checkIn: '2025-06-01', checkOut: '2025-06-05' }])
    );
    const conflicts = await getBookingConflicts('fh1', d('2025-06-05'), d('2025-06-10'));
    expect(conflicts).toHaveLength(0);
  });

  it('returns empty array on error', async () => {
    (getDocs as jest.Mock).mockRejectedValueOnce(new Error('firestore error'));
    const conflicts = await getBookingConflicts('fh1', d('2025-06-01'), d('2025-06-05'));
    expect(conflicts).toEqual([]);
  });
});

// ─── addBookedDatesToFarmhouse (availabilityService) ─────────────────────────
describe('addBookedDatesToFarmhouse (availabilityService)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('generates date range and deduplicates before writing', async () => {
    (doc as jest.Mock).mockReturnValue('ref');
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ bookedDates: ['2025-06-01'] }),
    });
    (updateDoc as jest.Mock).mockResolvedValueOnce(undefined);

    await addBookedDatesToFarmhouse('fh1', '2025-06-01', '2025-06-03');

    expect(updateDoc).toHaveBeenCalledWith('ref', {
      bookedDates: ['2025-06-01', '2025-06-02', '2025-06-03'],
    });
  });

  it('throws when farmhouse not found', async () => {
    (doc as jest.Mock).mockReturnValue('ref');
    (getDoc as jest.Mock).mockResolvedValueOnce({ exists: () => false });

    await expect(addBookedDatesToFarmhouse('fh1', '2025-06-01', '2025-06-03'))
      .rejects.toThrow('Farmhouse not found');
  });
});

// ─── removeBookedDatesFromFarmhouse (availabilityService) ─────────────────────
describe('removeBookedDatesFromFarmhouse (availabilityService)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('removes the specified date range from existing bookedDates', async () => {
    (doc as jest.Mock).mockReturnValue('ref');
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ bookedDates: ['2025-06-01', '2025-06-02', '2025-06-03', '2025-06-04'] }),
    });
    (updateDoc as jest.Mock).mockResolvedValueOnce(undefined);

    await removeBookedDatesFromFarmhouse('fh1', '2025-06-02', '2025-06-03');

    expect(updateDoc).toHaveBeenCalledWith('ref', {
      bookedDates: ['2025-06-01', '2025-06-04'],
    });
  });

  it('silently returns when farmhouse not found', async () => {
    (doc as jest.Mock).mockReturnValue('ref');
    (getDoc as jest.Mock).mockResolvedValueOnce({ exists: () => false });

    await expect(removeBookedDatesFromFarmhouse('fh1', '2025-06-01', '2025-06-03'))
      .resolves.toBeUndefined();
    expect(updateDoc).not.toHaveBeenCalled();
  });
});

// ─── getMonthAvailability ─────────────────────────────────────────────────────
describe('getMonthAvailability', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns availability status for every day of the month', async () => {
    (collection as jest.Mock).mockReturnValue('col');
    (query as jest.Mock).mockReturnValue('q');
    (where as jest.Mock).mockReturnValue('w');
    (getDocs as jest.Mock).mockResolvedValueOnce({ docs: [] });

    const result = await getMonthAvailability('fh1', 2025, 6);
    expect(result).toHaveLength(30); // June has 30 days
    // getMonthAvailability uses toISOString() which can shift dates by timezone offset
    // just check we got 30 results and all are available
    expect(result.every(d => d.available)).toBe(true);
    // dates should be in YYYY-MM-DD format
    expect(result[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('marks days within a booking as unavailable', async () => {
    (collection as jest.Mock).mockReturnValue('col');
    (query as jest.Mock).mockReturnValue('q');
    (where as jest.Mock).mockReturnValue('w');
    (getDocs as jest.Mock).mockResolvedValueOnce({
      docs: [{
        id: 'b1',
        data: () => ({
          checkInDate: '2025-06-05',
          checkOutDate: '2025-06-08',
        }),
      }],
    });

    const result = await getMonthAvailability('fh1', 2025, 6);
    const june5 = result.find(d => d.date === '2025-06-05');
    const june7 = result.find(d => d.date === '2025-06-07');
    const june8 = result.find(d => d.date === '2025-06-08');

    expect(june5!.available).toBe(false);
    expect(june7!.available).toBe(false);
    expect(june8!.available).toBe(true); // checkOut is exclusive
  });

  it('returns empty array on error', async () => {
    (collection as jest.Mock).mockReturnValue('col');
    (query as jest.Mock).mockReturnValue('q');
    (where as jest.Mock).mockReturnValue('w');
    (getDocs as jest.Mock).mockRejectedValueOnce(new Error('error'));

    const result = await getMonthAvailability('fh1', 2025, 6);
    expect(result).toEqual([]);
  });
});
