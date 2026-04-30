import {
  convertFarmhouseData,
  getApprovedFarmhouses,
  getFarmhouseById,
  getFarmhousesByIds,
  getFarmhousesByOwner,
  ownerHasFarmhouses,
  addBookedDatesToFarmhouse,
  removeBookedDatesFromFarmhouse,
  approveFarmhouse,
  rejectFarmhouse,
  deleteFarmhouse,
  updateFarmhouse,
} from '../farmhouseService';

import {
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  collection,
  query,
  where,
  orderBy,
} from 'firebase/firestore';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const makeFarmhouseRaw = (overrides = {}) => ({
  basicDetails: {
    name: 'green meadows',
    area: 'lonavala',
    city: 'pune',
    description: 'A lovely farmhouse',
    capacity: '20',
    bedrooms: '5',
    mapLink: 'https://maps.google.com/?ll=@18.7546,73.4063',
  },
  pricing: {
    weeklyNight: '5000',
    weekendNight: '8000',
    weeklyDay: '3000',
    weekendDay: '4500',
    occasionalDay: '6000',
    occasionalNight: '7000',
    extraGuestPrice: '400',
    customPricing: [],
  },
  amenities: {
    pool: true,
    wifi: true,
    ac: false,
    bonfire: 1,
    chess: 0,
    carroms: 2,
    tv: 3,
    geyser: 2,
  },
  rules: { petsNotAllowed: false },
  rating: 4.5,
  reviews: 10,
  photoUrls: ['img1.jpg', 'img2.jpg'],
  bookedDates: ['2025-06-01'],
  blockedDates: [],
  ownerId: 'owner123',
  status: 'approved',
  ...overrides,
});

// ─── convertFarmhouseData ────────────────────────────────────────────────────
describe('convertFarmhouseData', () => {
  it('title-cases name and location', () => {
    const fh = convertFarmhouseData('fh1', makeFarmhouseRaw());
    expect(fh.name).toBe('Green Meadows');
    expect(fh.location).toBe('Lonavala');
    expect(fh.city).toBe('Pune');
  });

  it('parses numeric prices from strings', () => {
    const fh = convertFarmhouseData('fh1', makeFarmhouseRaw());
    expect(fh.weeklyNight).toBe(5000);
    expect(fh.weekendNight).toBe(8000);
    expect(fh.weeklyDay).toBe(3000);
    expect(fh.weekendDay).toBe(4500);
    expect(fh.extraGuestPrice).toBe(400);
  });

  it('extracts coordinates from Google Maps link', () => {
    const fh = convertFarmhouseData('fh1', makeFarmhouseRaw());
    expect(fh.coordinates).toEqual({ lat: 18.7546, lng: 73.4063 });
  });

  it('returns undefined coordinates when mapLink is absent', () => {
    const raw = makeFarmhouseRaw();
    raw.basicDetails.mapLink = '';
    const fh = convertFarmhouseData('fh1', raw);
    expect(fh.coordinates).toBeUndefined();
  });

  it('returns undefined coordinates when mapLink has no @lat,lng pattern', () => {
    const raw = makeFarmhouseRaw();
    raw.basicDetails.mapLink = 'https://maps.google.com/place/Lonavala';
    const fh = convertFarmhouseData('fh1', raw);
    expect(fh.coordinates).toBeUndefined();
  });

  it('normalises bonfire/chess/carroms to 0 or 1', () => {
    const fh = convertFarmhouseData('fh1', makeFarmhouseRaw());
    expect(fh.amenities.bonfire).toBe(1);  // bonfire: 1 → 1
    expect(fh.amenities.chess).toBe(0);    // chess: 0 → 0
    expect(fh.amenities.carroms).toBe(1);  // carroms: 2 > 0 → 1
  });

  it('maps petsNotAllowed: false → pets: true', () => {
    const fh = convertFarmhouseData('fh1', makeFarmhouseRaw());
    expect(fh.rules.pets).toBe(true);
  });

  it('maps petsNotAllowed: true → pets: false', () => {
    const raw = makeFarmhouseRaw();
    raw.rules.petsNotAllowed = true;
    const fh = convertFarmhouseData('fh1', raw);
    expect(fh.rules.pets).toBe(false);
  });

  it('falls back to defaults when fields are missing', () => {
    const fh = convertFarmhouseData('fh1', {});
    expect(fh.name).toBe('Unnamed Farmhouse');
    expect(fh.location).toBe('Unknown Location');
    expect(fh.capacity).toBe(1);
    expect(fh.weeklyNight).toBe(0);
    expect(fh.photos).toEqual([]);
    expect(fh.bookedDates).toEqual([]);
    expect(fh.status).toBe('pending');
  });

  it('passes through id, ownerId, rating, reviews, photos', () => {
    const fh = convertFarmhouseData('abc123', makeFarmhouseRaw());
    expect(fh.id).toBe('abc123');
    expect(fh.ownerId).toBe('owner123');
    expect(fh.rating).toBe(4.5);
    expect(fh.reviews).toBe(10);
    expect(fh.photos).toEqual(['img1.jpg', 'img2.jpg']);
  });

  it('includes timing when present in data', () => {
    const raw = {
      ...makeFarmhouseRaw(),
      timing: {
        dayUseCheckIn: '10:00 AM',
        dayUseCheckOut: '5:00 PM',
        nightCheckIn: '2:00 PM',
        nightCheckOut: '10:00 AM',
      },
    };
    const fh = convertFarmhouseData('fh1', raw);
    expect(fh.timing).toEqual({
      dayUseCheckIn: '10:00 AM',
      dayUseCheckOut: '5:00 PM',
      nightCheckIn: '2:00 PM',
      nightCheckOut: '10:00 AM',
    });
  });

  it('returns undefined timing when absent', () => {
    const fh = convertFarmhouseData('fh1', makeFarmhouseRaw());
    expect(fh.timing).toBeUndefined();
  });

  it('maps customPricing with parseInt', () => {
    const raw = makeFarmhouseRaw();
    raw.pricing.customPricing = [
      { name: 'Birthday Package', price: '12000' },
    ];
    const fh = convertFarmhouseData('fh1', raw);
    expect(fh.customPricing).toEqual([{ label: 'Birthday Package', price: 12000 }]);
  });
});

// ─── getApprovedFarmhouses ────────────────────────────────────────────────────
describe('getApprovedFarmhouses', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns mapped farmhouses on success', async () => {
    const rawData = makeFarmhouseRaw();
    (getDocs as jest.Mock).mockResolvedValueOnce({
      docs: [{ id: 'f1', data: () => rawData }],
    });
    (collection as jest.Mock).mockReturnValue('col');
    (query as jest.Mock).mockReturnValue('q');
    (where as jest.Mock).mockReturnValue('w');
    (orderBy as jest.Mock).mockReturnValue('o');

    const result = await getApprovedFarmhouses();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('f1');
    expect(result[0].name).toBe('Green Meadows');
  });

  it('throws when getDocs fails', async () => {
    (getDocs as jest.Mock).mockRejectedValueOnce(new Error('Firestore error'));
    (collection as jest.Mock).mockReturnValue('col');
    (query as jest.Mock).mockReturnValue('q');
    (where as jest.Mock).mockReturnValue('w');
    (orderBy as jest.Mock).mockReturnValue('o');

    await expect(getApprovedFarmhouses()).rejects.toThrow('Firestore error');
  });
});

// ─── getFarmhouseById ────────────────────────────────────────────────────────
describe('getFarmhouseById', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns null for empty id', async () => {
    const result = await getFarmhouseById('');
    expect(result).toBeNull();
  });

  it('returns farmhouse when document exists', async () => {
    const rawData = makeFarmhouseRaw();
    (doc as jest.Mock).mockReturnValue('ref');
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      id: 'fh1',
      data: () => rawData,
    });

    const result = await getFarmhouseById('fh1');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('fh1');
  });

  it('returns null when document does not exist', async () => {
    (doc as jest.Mock).mockReturnValue('ref');
    (getDoc as jest.Mock).mockResolvedValueOnce({ exists: () => false });

    const result = await getFarmhouseById('missing');
    expect(result).toBeNull();
  });

  it('throws when getDoc fails', async () => {
    (doc as jest.Mock).mockReturnValue('ref');
    (getDoc as jest.Mock).mockRejectedValueOnce(new Error('network error'));

    await expect(getFarmhouseById('fh1')).rejects.toThrow('network error');
  });
});

// ─── getFarmhousesByIds ───────────────────────────────────────────────────────
describe('getFarmhousesByIds', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns empty array for empty ids', async () => {
    const result = await getFarmhousesByIds([]);
    expect(result).toEqual([]);
    expect(getDocs).not.toHaveBeenCalled();
  });

  it('returns empty array for null/undefined ids', async () => {
    const result = await getFarmhousesByIds(null as any);
    expect(result).toEqual([]);
  });

  it('fetches all ids in a single chunk when <= 30', async () => {
    const rawData = makeFarmhouseRaw();
    (collection as jest.Mock).mockReturnValue('col');
    (query as jest.Mock).mockReturnValue('q');
    (where as jest.Mock).mockReturnValue('w');
    (getDocs as jest.Mock).mockResolvedValueOnce({
      docs: [{ id: 'f1', data: () => rawData }],
    });

    const result = await getFarmhousesByIds(['f1', 'f2', 'f3']);
    expect(getDocs).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
  });

  it('splits ids into chunks of 30 when > 30', async () => {
    const ids = Array.from({ length: 35 }, (_, i) => `id${i}`);
    const rawData = makeFarmhouseRaw();
    (collection as jest.Mock).mockReturnValue('col');
    (query as jest.Mock).mockReturnValue('q');
    (where as jest.Mock).mockReturnValue('w');
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({ docs: [{ id: 'f1', data: () => rawData }] })
      .mockResolvedValueOnce({ docs: [{ id: 'f2', data: () => rawData }] });

    const result = await getFarmhousesByIds(ids);
    expect(getDocs).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
  });
});

// ─── ownerHasFarmhouses ───────────────────────────────────────────────────────
describe('ownerHasFarmhouses', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns true when owner has farmhouses', async () => {
    (collection as jest.Mock).mockReturnValue('col');
    (query as jest.Mock).mockReturnValue('q');
    (where as jest.Mock).mockReturnValue('w');
    (getDocs as jest.Mock).mockResolvedValueOnce({ empty: false });

    const result = await ownerHasFarmhouses('owner1');
    expect(result).toBe(true);
  });

  it('returns false when owner has no farmhouses', async () => {
    (collection as jest.Mock).mockReturnValue('col');
    (query as jest.Mock).mockReturnValue('q');
    (where as jest.Mock).mockReturnValue('w');
    (getDocs as jest.Mock).mockResolvedValueOnce({ empty: true });

    const result = await ownerHasFarmhouses('owner1');
    expect(result).toBe(false);
  });

  it('returns false on error', async () => {
    (collection as jest.Mock).mockReturnValue('col');
    (query as jest.Mock).mockReturnValue('q');
    (where as jest.Mock).mockReturnValue('w');
    (getDocs as jest.Mock).mockRejectedValueOnce(new Error('network error'));

    const result = await ownerHasFarmhouses('owner1');
    expect(result).toBe(false);
  });
});

// ─── addBookedDatesToFarmhouse ────────────────────────────────────────────────
describe('addBookedDatesToFarmhouse', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does nothing for empty dates', async () => {
    await addBookedDatesToFarmhouse('fh1', []);
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('calls updateDoc with arrayUnion', async () => {
    (doc as jest.Mock).mockReturnValue('ref');
    (updateDoc as jest.Mock).mockResolvedValueOnce(undefined);

    await addBookedDatesToFarmhouse('fh1', ['2025-06-01', '2025-06-02']);
    expect(updateDoc).toHaveBeenCalledWith('ref', expect.objectContaining({
      bookedDates: expect.anything(),
    }));
  });

  it('throws on updateDoc failure', async () => {
    (doc as jest.Mock).mockReturnValue('ref');
    (updateDoc as jest.Mock).mockRejectedValueOnce(new Error('write failed'));

    await expect(addBookedDatesToFarmhouse('fh1', ['2025-06-01'])).rejects.toThrow('write failed');
  });
});

// ─── approveFarmhouse / rejectFarmhouse / deleteFarmhouse ─────────────────────
describe('approveFarmhouse', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls updateDoc with status approved', async () => {
    (doc as jest.Mock).mockReturnValue('ref');
    (updateDoc as jest.Mock).mockResolvedValueOnce(undefined);

    await approveFarmhouse('fh1');
    expect(updateDoc).toHaveBeenCalledWith('ref', expect.objectContaining({ status: 'approved' }));
  });
});

describe('rejectFarmhouse', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls updateDoc with status rejected', async () => {
    (doc as jest.Mock).mockReturnValue('ref');
    (updateDoc as jest.Mock).mockResolvedValueOnce(undefined);

    await rejectFarmhouse('fh1');
    expect(updateDoc).toHaveBeenCalledWith('ref', { status: 'rejected' });
  });
});

describe('deleteFarmhouse', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls deleteDoc', async () => {
    (doc as jest.Mock).mockReturnValue('ref');
    (deleteDoc as jest.Mock).mockResolvedValueOnce(undefined);

    await deleteFarmhouse('fh1');
    expect(deleteDoc).toHaveBeenCalledWith('ref');
  });

  it('throws on deleteDoc failure', async () => {
    (doc as jest.Mock).mockReturnValue('ref');
    (deleteDoc as jest.Mock).mockRejectedValueOnce(new Error('delete failed'));

    await expect(deleteFarmhouse('fh1')).rejects.toThrow('delete failed');
  });
});

describe('updateFarmhouse', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls updateDoc with updates and updatedAt', async () => {
    (doc as jest.Mock).mockReturnValue('ref');
    (updateDoc as jest.Mock).mockResolvedValueOnce(undefined);

    await updateFarmhouse('fh1', { status: 'approved' } as any);
    expect(updateDoc).toHaveBeenCalledWith('ref', expect.objectContaining({
      status: 'approved',
      updatedAt: expect.anything(),
    }));
  });
});
