import React, {
  createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode,
} from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  enableNetwork,
  disableNetwork,
  limit,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { useAuth } from './authContext';
import { Farmhouse } from './types/navigation';

const CACHE_KEY_FARMHOUSES = '@reroute/cache/farmhouses';
const cacheBookingsKey = (uid: string) => `@reroute/cache/bookings/${uid}`;

async function loadCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveCache(key: string, data: any) {
  AsyncStorage.setItem(key, JSON.stringify(data)).catch(() => {});
}

// ==================== TYPES ====================

export interface Booking {
  id: string;
  farmhouseId: string;
  farmhouseName: string;
  farmhouseImage: string;
  location: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  totalPrice: number;
  originalPrice?: number;
  discountApplied?: number;
  couponCode?: string | null;
  bookingType: 'dayuse' | 'overnight';
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'draft';
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';
  paymentMethod?: string;
  transactionId?: string;
  createdAt: any;
  updatedAt?: string;
}

export interface Review {
  id: string;
  farmhouseId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
  createdAt: any;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  min_booking_amount: number;
  max_uses: number;
  current_uses: number;
}

// ==================== SLICE TYPES ====================

interface BookingsSlice {
  myBookings: Booking[];
  myBookingsLoading: boolean;
  myBookingsRefreshing: boolean;
  myBookingsError: string | null;
  refreshMyBookings: () => void;
  getCategorizedBookings: () => { upcoming: Booking[]; past: Booking[]; cancelled: Booking[] };
}

interface FarmhousesSlice {
  availableFarmhouses: Farmhouse[];
  availableFarmhousesLoading: boolean;
  availableFarmhousesRefreshing: boolean;
  availableFarmhousesError: string | null;
  myFarmhouses: Farmhouse[];
  myFarmhousesLoading: boolean;
  myFarmhousesRefreshing: boolean;
  myFarmhousesServerConfirmed: boolean;
  myFarmhousesError: string | null;
  refreshAvailableFarmhouses: () => void;
  refreshMyFarmhouses: () => void;
  getFarmhouseById: (id: string) => Farmhouse | undefined;
}

interface OwnerDataSlice {
  allBookingsForMyFarmhouses: Booking[];
  allBookingsLoading: boolean;
  allBookingsRefreshing: boolean;
  allBookingsError: string | null;
  refreshAllBookings: () => void;
  getBookingById: (id: string) => Booking | undefined;
  getFarmhouseBookings: (farmhouseId: string) => Booking[];
}

interface CouponsSlice {
  coupons: Coupon[];
  couponsLoading: boolean;
  couponsRefreshing: boolean;
  couponsError: string | null;
  refreshCoupons: () => void;
}

// Legacy combined type (kept for App.tsx backward compat)
interface GlobalDataContextType extends BookingsSlice, FarmhousesSlice, OwnerDataSlice, CouponsSlice {
  wishlistFarmhouses: Farmhouse[];
  wishlistLoading: boolean;
  wishlistRefreshing: boolean;
  wishlistError: string | null;
  reviews: Review[];
  reviewsLoading: boolean;
  reviewsRefreshing: boolean;
  reviewsError: string | null;
  refreshReviews: (farmhouseId?: string) => void;
  refreshWishlist: () => void;
  refreshAll: () => Promise<void>;
  getFarmhouseReviews: (farmhouseId: string) => Review[];
}

// ==================== CONTEXTS ====================

const BookingsCtx = createContext<BookingsSlice | undefined>(undefined);
const FarmhousesCtx = createContext<FarmhousesSlice | undefined>(undefined);
const OwnerDataCtx = createContext<OwnerDataSlice | undefined>(undefined);
const CouponsCtx = createContext<CouponsSlice | undefined>(undefined);
// Legacy context merges all slices
const GlobalDataContext = createContext<GlobalDataContextType | undefined>(undefined);

// ==================== HELPER FUNCTIONS ====================

const createDefaultFarmhouse = (id: string): Farmhouse => ({
  id,
  name: 'Unknown Farmhouse',
  location: '',
  city: '',
  area: '',
  mapLink: '',
  bedrooms: 0,
  capacity: 0,
  description: '',
  weeklyDay: 0,
  weeklyNight: 0,
  occasionalDay: 0,
  occasionalNight: 0,
  weekendDay: 0,
  weekendNight: 0,
  customPricing: [],
  extraGuestPrice: 0,
  photos: [],
  amenities: { tv: 0, geyser: 0, bonfire: 0, chess: 0, carroms: 0, volleyball: 0, pool: false },
  rules: { pets: false, quietHours: false, alcohol: false },
  ownerId: '',
  status: 'pending',
  rating: 0,
  reviews: 0,
  bookedDates: [],
  blockedDates: [],
  createdAt: new Date().toISOString(),
  sourceType: 'old',
});

const transformFarmhouseData = (doc: any): Farmhouse => {
  const data = doc.data();
  if (!data) {
    console.warn(`Farmhouse document ${doc.id} has no data`);
    return createDefaultFarmhouse(doc.id);
  }

  if (data.basicDetails) {
    return {
      id: doc.id,
      name: data.basicDetails?.name || '',
      location: data.basicDetails?.locationText || data.basicDetails?.area || '',
      city: data.basicDetails?.city || '',
      area: data.basicDetails?.area || '',
      mapLink: data.basicDetails?.mapLink || '',
      bedrooms: parseInt(data.basicDetails?.bedrooms) || 0,
      capacity: parseInt(data.basicDetails?.capacity) || 0,
      description: data.basicDetails?.description || '',
      weeklyDay: parseInt(data.pricing?.weeklyDay) || 0,
      weeklyNight: parseInt(data.pricing?.weeklyNight) || 0,
      occasionalDay: parseInt(data.pricing?.occasionalDay) || 0,
      occasionalNight: parseInt(data.pricing?.occasionalNight) || 0,
      weekendDay: parseInt(data.pricing?.weekendDay) || 0,
      weekendNight: parseInt(data.pricing?.weekendNight) || 0,
      customPricing: Array.isArray(data.pricing?.customPricing)
        ? data.pricing.customPricing.map((cp: any) => ({ label: cp?.name || '', price: parseInt(cp?.price) || 0 }))
        : [],
      extraGuestPrice: parseInt(data.pricing?.extraGuestPrice) || 0,
      maxGuests: parseInt(data.pricing?.maxGuests || data.basicDetails?.maxGuests) || 0,
      timing: data.timing ? {
        dayUseCheckIn: data.timing.dayUseCheckIn || '9:00 AM',
        dayUseCheckOut: data.timing.dayUseCheckOut || '6:00 PM',
        nightCheckIn: data.timing.nightCheckIn || '12:00 PM',
        nightCheckOut: data.timing.nightCheckOut || '11:00 AM',
      } : undefined,
      photos: Array.isArray(data.photoUrls) ? data.photoUrls : [],
      amenities: {
        tv: data.amenities?.tv || 0,
        geyser: data.amenities?.geyser || 0,
        bonfire: data.amenities?.bonfire || 0,
        chess: data.amenities?.chess || 0,
        carroms: data.amenities?.carroms || 0,
        volleyball: data.amenities?.volleyball || 0,
        pool: data.amenities?.pool || false,
      },
      rules: {
        pets: !data.rules?.petsNotAllowed,
        quietHours: data.rules?.quietHours || false,
        alcohol: !data.rules?.alcoholNotAllowed,
        additionalRules: data.rules?.additionalRules || '',
      },
      ownerId: data.ownerId || '',
      status: data.status || 'pending',
      rating: data.averageRating || data.rating || 0,
      reviews: data.reviewCount || data.reviews || 0,
      bookedDates: Array.isArray(data.bookedDates) ? data.bookedDates : [],
      blockedDates: Array.isArray(data.blockedDates) ? data.blockedDates : [],
      bookingWindowDays: typeof data.bookingWindowDays === 'number' ? data.bookingWindowDays : undefined,
      coordinates: data.coordinates || undefined,
      createdAt: data.createdAt,
      approvedAt: data.approvedAt,
      contactPhone1: data.basicDetails?.contactPhone1,
      contactPhone2: data.basicDetails?.contactPhone2,
      propertyType: data.propertyType || data.basicDetails?.propertyType || 'farmhouse',
      basicDetails: data.basicDetails,
      sourceType: 'new',
    };
  }

  return {
    id: doc.id,
    name: data.name || '',
    location: data.location || '',
    city: data.city || '',
    area: data.area || '',
    mapLink: data.mapLink || '',
    bedrooms: data.bedrooms || 0,
    capacity: data.capacity || 0,
    description: data.description || '',
    weeklyDay: data.price || 0,
    weeklyNight: data.price || 0,
    occasionalDay: data.price || 0,
    occasionalNight: data.weekendPrice || 0,
    weekendDay: data.price || 0,
    weekendNight: data.weekendPrice || 0,
    customPricing: [],
    extraGuestPrice: parseInt(data.extraGuestPrice) || 0,
    maxGuests: parseInt(data.maxGuests) || 0,
    timing: data.timing ? {
      dayUseCheckIn: data.timing.dayUseCheckIn || '9:00 AM',
      dayUseCheckOut: data.timing.dayUseCheckOut || '6:00 PM',
      nightCheckIn: data.timing.nightCheckIn || '12:00 PM',
      nightCheckOut: data.timing.nightCheckOut || '11:00 AM',
    } : undefined,
    photos: Array.isArray(data.photos) ? data.photos : [],
    amenities: data.amenities || { tv: 0, geyser: 0, bonfire: 0, chess: 0, carroms: 0, volleyball: 0, pool: false },
    rules: data.rules ? { ...data.rules, additionalRules: data.rules.additionalRules || '' }
      : { pets: false, quietHours: false, alcohol: false, additionalRules: '' },
    ownerId: data.ownerId || '',
    status: data.status || 'pending',
    rating: data.rating || 0,
    reviews: data.reviews || 0,
    bookedDates: Array.isArray(data.bookedDates) ? data.bookedDates : [],
    blockedDates: Array.isArray(data.blockedDates) ? data.blockedDates : [],
    bookingWindowDays: typeof data.bookingWindowDays === 'number' ? data.bookingWindowDays : undefined,
    coordinates: data.coordinates,
    createdAt: data.createdAt,
    approvedAt: data.approvedAt,
    propertyType: data.propertyType || 'farmhouse',
    contactPhone1: data.contactPhone1,
    contactPhone2: data.contactPhone2,
    sourceType: 'old',
  };
};

// ==================== PROVIDER ====================

export function GlobalDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  // On web: defer Firebase listeners until after first idle frame to unblock LCP.
  const [ready, setReady] = useState(Platform.OS !== 'web');

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let id: any;
    if (typeof requestIdleCallback !== 'undefined') {
      id = requestIdleCallback(() => setReady(true), { timeout: 1500 });
    } else {
      id = setTimeout(() => setReady(true), 100);
    }
    return () => {
      if (typeof cancelIdleCallback !== 'undefined') cancelIdleCallback(id);
      else clearTimeout(id);
    };
  }, []);

  // bfcache fix: suspend Firebase network on pagehide, resume on pageshow.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onHide = () => { disableNetwork(db).catch(() => {}); };
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) enableNetwork(db).catch(() => {});
    };
    window.addEventListener('pagehide', onHide);
    window.addEventListener('pageshow', onShow as any);
    return () => {
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('pageshow', onShow as any);
    };
  }, []);

  // ==================== SPLIT STATE ====================

  // Bookings
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [myBookingsLoading, setMyBookingsLoading] = useState(true);
  const [myBookingsRefreshing, setMyBookingsRefreshing] = useState(false);
  const [myBookingsError, setMyBookingsError] = useState<string | null>(null);

  // Available Farmhouses
  const [availableFarmhouses, setAvailableFarmhouses] = useState<Farmhouse[]>([]);
  const [availableFarmhousesLoading, setAvailableFarmhousesLoading] = useState(true);
  const [availableFarmhousesRefreshing, setAvailableFarmhousesRefreshing] = useState(false);
  const [availableFarmhousesError, setAvailableFarmhousesError] = useState<string | null>(null);

  // My Farmhouses (owner)
  const [myFarmhouses, setMyFarmhouses] = useState<Farmhouse[]>([]);
  const [myFarmhousesLoading, setMyFarmhousesLoading] = useState(true);
  const [myFarmhousesRefreshing, setMyFarmhousesRefreshing] = useState(false);
  const [myFarmhousesServerConfirmed, setMyFarmhousesServerConfirmed] = useState(false);
  const [myFarmhousesError, setMyFarmhousesError] = useState<string | null>(null);

  // Owner bookings
  const [allBookingsForMyFarmhouses, setAllBookingsForMyFarmhouses] = useState<Booking[]>([]);
  const [allBookingsLoading, setAllBookingsLoading] = useState(false);
  const [allBookingsRefreshing, setAllBookingsRefreshing] = useState(false);
  const [allBookingsError, setAllBookingsError] = useState<string | null>(null);

  // Coupons
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(true);
  const [couponsRefreshing, setCouponsRefreshing] = useState(false);
  const [couponsError, setCouponsError] = useState<string | null>(null);

  // ==================== CACHE HYDRATION ====================

  useEffect(() => {
    loadCache<Farmhouse[]>(CACHE_KEY_FARMHOUSES).then(cached => {
      if (cached && cached.length > 0) {
        setAvailableFarmhouses(prev => prev.length === 0 ? cached : prev);
        setAvailableFarmhousesLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    loadCache<Booking[]>(cacheBookingsKey(user.uid)).then(cached => {
      if (cached && cached.length > 0) {
        setMyBookings(prev => prev.length === 0 ? cached : prev);
        setMyBookingsLoading(false);
      }
    });
  }, [user?.uid]);

  // ==================== MY BOOKINGS ====================
  useEffect(() => {
    if (!ready) return;
    if (!user?.uid || user.role !== 'customer') {
      setMyBookings([]);
      setMyBookingsLoading(false);
      return;
    }

    setMyBookingsLoading(prev => myBookings.length === 0 ? true : prev);
    setMyBookingsError(null);

    const q = query(
      collection(db, 'bookings'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[];
        saveCache(cacheBookingsKey(user.uid), bookings);
        setMyBookings(bookings);
        setMyBookingsLoading(false);
        setMyBookingsRefreshing(false);
        setMyBookingsError(null);
      },
      (error) => {
        console.error('Error fetching myBookings:', error);
        setMyBookingsLoading(false);
        setMyBookingsRefreshing(false);
        setMyBookingsError(error.message);
      }
    );

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user?.uid, user?.role]);

  // ==================== AVAILABLE FARMHOUSES ====================
  useEffect(() => {
    if (!ready) return;
    if (!user || user.role !== 'customer') {
      setAvailableFarmhouses([]);
      setAvailableFarmhousesLoading(false);
      return;
    }

    setAvailableFarmhousesLoading(prev => availableFarmhouses.length === 0 ? true : prev);
    setAvailableFarmhousesError(null);

    const q = query(
      collection(db, 'farmhouses'),
      where('status', '==', 'approved'),
      limit(200)
    );

    const timeoutId = setTimeout(() => {
      setAvailableFarmhousesLoading(prev => {
        if (!prev) return prev;
        setAvailableFarmhousesError(
          availableFarmhouses.length === 0 ? 'Unable to load farmhouses. Pull down to refresh.' : null
        );
        return false;
      });
    }, 10000);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        clearTimeout(timeoutId);
        try {
          const farmhouses = snapshot.docs.map(doc => transformFarmhouseData(doc));
          farmhouses.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
          });
          saveCache(CACHE_KEY_FARMHOUSES, farmhouses);
          setAvailableFarmhouses(farmhouses);
          setAvailableFarmhousesLoading(false);
          setAvailableFarmhousesRefreshing(false);
          setAvailableFarmhousesError(null);
        } catch (error: any) {
          console.error('Error transforming farmhouses:', error);
          setAvailableFarmhousesLoading(false);
          setAvailableFarmhousesRefreshing(false);
          setAvailableFarmhousesError(error.message);
        }
      },
      (error) => {
        clearTimeout(timeoutId);
        console.error('Error fetching availableFarmhouses:', error);
        setAvailableFarmhousesLoading(false);
        setAvailableFarmhousesRefreshing(false);
        setAvailableFarmhousesError(error.message);
      }
    );

    return () => { clearTimeout(timeoutId); unsubscribe(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user?.uid, user?.role]);

  // ==================== MY FARMHOUSES (OWNER) ====================
  useEffect(() => {
    if (!user?.uid || user.role !== 'owner') {
      setMyFarmhouses([]);
      setMyFarmhousesLoading(true);
      setMyFarmhousesServerConfirmed(false);
      return;
    }

    setMyFarmhousesLoading(true);
    setMyFarmhousesError(null);
    setMyFarmhousesServerConfirmed(false);

    const q = query(collection(db, 'farmhouses'), where('ownerId', '==', user.uid));

    const timeoutId = setTimeout(() => {
      setMyFarmhousesServerConfirmed(prev => {
        if (prev) return prev;
        setMyFarmhousesLoading(false);
        return true;
      });
    }, 10000);

    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        const fromCache = snapshot.metadata.fromCache;
        if (!fromCache) clearTimeout(timeoutId);
        try {
          const farmhouses = snapshot.docs.map(doc => transformFarmhouseData(doc));
          farmhouses.sort((a, b) => {
            const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
            const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
            return tb - ta;
          });
          setMyFarmhouses(farmhouses);
          setMyFarmhousesLoading(fromCache && farmhouses.length === 0);
          setMyFarmhousesServerConfirmed(!fromCache);
          setMyFarmhousesRefreshing(false);
          setMyFarmhousesError(null);
        } catch (error: any) {
          console.error('Error transforming myFarmhouses:', error);
          setMyFarmhousesLoading(false);
          setMyFarmhousesServerConfirmed(!fromCache);
          setMyFarmhousesRefreshing(false);
          setMyFarmhousesError(error.message);
        }
      },
      (error) => {
        clearTimeout(timeoutId);
        console.error('Error fetching myFarmhouses:', error);
        setMyFarmhousesLoading(false);
        setMyFarmhousesServerConfirmed(true);
        setMyFarmhousesRefreshing(false);
        setMyFarmhousesError(error.message);
      }
    );

    return () => { clearTimeout(timeoutId); unsubscribe(); };
  }, [user?.uid, user?.role]);

  // ==================== COUPONS ====================
  useEffect(() => {
    if (!ready) return;
    if (!user || user.role !== 'customer') {
      setCoupons([]);
      setCouponsLoading(false);
      return;
    }
    setCouponsLoading(true);
    setCouponsError(null);

    const q = query(collection(db, 'coupons'), where('is_active', '==', true));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setCoupons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Coupon[]);
        setCouponsLoading(false);
        setCouponsRefreshing(false);
        setCouponsError(null);
      },
      (error) => {
        console.error('Error fetching coupons:', error);
        setCouponsLoading(false);
        setCouponsRefreshing(false);
        setCouponsError(error.message);
      }
    );

    return () => unsubscribe();
  }, [ready, user?.uid, user?.role]);

  // ==================== OWNER BOOKINGS ====================
  useEffect(() => {
    if (!ready) return;
    if (!user?.uid || user.role !== 'owner') {
      setAllBookingsForMyFarmhouses([]);
      setAllBookingsLoading(false);
      return;
    }

    const farmhouseIds = myFarmhouses.map(f => f.id);
    if (farmhouseIds.length === 0) {
      setAllBookingsForMyFarmhouses([]);
      setAllBookingsLoading(false);
      return;
    }

    setAllBookingsLoading(true);
    setAllBookingsError(null);

    const batches: string[][] = [];
    for (let i = 0; i < farmhouseIds.length; i += 30) {
      batches.push(farmhouseIds.slice(i, i + 30));
    }

    // Use a Map keyed by batchIndex to know when ALL batches have settled at least once
    const settledBatches = new Set<number>();
    const allBookingsMap = new Map<string, Booking>();
    const unsubs: (() => void)[] = [];

    batches.forEach((batch, batchIdx) => {
      const q = query(
        collection(db, 'bookings'),
        where('farmhouseId', 'in', batch),
        orderBy('createdAt', 'desc'),
        limit(500)
      );

      const unsub = onSnapshot(
        q,
        (snapshot) => {
          snapshot.docs.forEach(doc => {
            allBookingsMap.set(doc.id, { id: doc.id, ...doc.data() } as Booking);
          });
          settledBatches.add(batchIdx);

          if (settledBatches.size >= batches.length) {
            const sorted = Array.from(allBookingsMap.values()).sort((a, b) => {
              const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
              const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
              return tb - ta;
            });
            setAllBookingsForMyFarmhouses(sorted);
            setAllBookingsLoading(false);
            setAllBookingsRefreshing(false);
            setAllBookingsError(null);
          }
        },
        (error) => {
          setAllBookingsLoading(false);
          setAllBookingsError(error.message);
        }
      );

      unsubs.push(unsub);
    });

    return () => unsubs.forEach(u => u());
  }, [ready, user?.uid, user?.role, myFarmhouses]);

  // ==================== REFRESH FUNCTIONS ====================

  const refreshMyBookings = useCallback(() => {
    setMyBookingsRefreshing(false);
  }, []);

  const refreshAvailableFarmhouses = useCallback(() => {
    setAvailableFarmhousesRefreshing(false);
  }, []);

  const refreshMyFarmhouses = useCallback(() => {
    setMyFarmhousesRefreshing(false);
  }, []);

  const refreshAllBookings = useCallback(() => {
    setAllBookingsRefreshing(false);
  }, []);

  const refreshCoupons = useCallback(() => {
    setCouponsRefreshing(false);
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshMyBookings(),
      refreshAvailableFarmhouses(),
      refreshMyFarmhouses(),
      refreshAllBookings(),
      refreshCoupons(),
    ]);
  }, [refreshMyBookings, refreshAvailableFarmhouses, refreshMyFarmhouses, refreshAllBookings, refreshCoupons]);

  // ==================== HELPERS ====================

  const getFarmhouseById = useCallback(
    (id: string) =>
      availableFarmhouses.find(f => f.id === id) || myFarmhouses.find(f => f.id === id),
    [availableFarmhouses, myFarmhouses]
  );

  const getBookingById = useCallback(
    (id: string) =>
      myBookings.find(b => b.id === id) || allBookingsForMyFarmhouses.find(b => b.id === id),
    [myBookings, allBookingsForMyFarmhouses]
  );

  const getFarmhouseBookings = useCallback(
    (farmhouseId: string) => allBookingsForMyFarmhouses.filter(b => b.farmhouseId === farmhouseId),
    [allBookingsForMyFarmhouses]
  );

  const getFarmhouseReviews = useCallback(
    (_farmhouseId: string): Review[] => [],
    []
  );

  const getCategorizedBookings = useCallback(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const upcoming: Booking[] = [];
    const past: Booking[] = [];
    const cancelled: Booking[] = [];

    myBookings.forEach(booking => {
      if (booking.status === 'cancelled') {
        cancelled.push(booking);
      } else {
        const checkOut = new Date(booking.checkOutDate);
        checkOut.setHours(23, 59, 59, 999);
        if (now > checkOut) {
          past.push(booking);
        } else {
          upcoming.push(booking);
        }
      }
    });

    return { upcoming, past, cancelled };
  }, [myBookings]);

  // ==================== MEMOIZED SLICE VALUES ====================
  // Each slice only re-renders consumers when its own data changes.

  const bookingsValue = useMemo<BookingsSlice>(() => ({
    myBookings,
    myBookingsLoading,
    myBookingsRefreshing,
    myBookingsError,
    refreshMyBookings,
    getCategorizedBookings,
  }), [myBookings, myBookingsLoading, myBookingsRefreshing, myBookingsError, refreshMyBookings, getCategorizedBookings]);

  const farmhousesValue = useMemo<FarmhousesSlice>(() => ({
    availableFarmhouses,
    availableFarmhousesLoading,
    availableFarmhousesRefreshing,
    availableFarmhousesError,
    myFarmhouses,
    myFarmhousesLoading,
    myFarmhousesRefreshing,
    myFarmhousesServerConfirmed,
    myFarmhousesError,
    refreshAvailableFarmhouses,
    refreshMyFarmhouses,
    getFarmhouseById,
  }), [
    availableFarmhouses, availableFarmhousesLoading, availableFarmhousesRefreshing, availableFarmhousesError,
    myFarmhouses, myFarmhousesLoading, myFarmhousesRefreshing, myFarmhousesServerConfirmed, myFarmhousesError,
    refreshAvailableFarmhouses, refreshMyFarmhouses, getFarmhouseById,
  ]);

  const ownerDataValue = useMemo<OwnerDataSlice>(() => ({
    allBookingsForMyFarmhouses,
    allBookingsLoading,
    allBookingsRefreshing,
    allBookingsError,
    refreshAllBookings,
    getBookingById,
    getFarmhouseBookings,
  }), [
    allBookingsForMyFarmhouses, allBookingsLoading, allBookingsRefreshing, allBookingsError,
    refreshAllBookings, getBookingById, getFarmhouseBookings,
  ]);

  const couponsValue = useMemo<CouponsSlice>(() => ({
    coupons,
    couponsLoading,
    couponsRefreshing,
    couponsError,
    refreshCoupons,
  }), [coupons, couponsLoading, couponsRefreshing, couponsError, refreshCoupons]);

  // Legacy combined value for backward compat (useGlobalData)
  const legacyValue = useMemo<GlobalDataContextType>(() => ({
    ...bookingsValue,
    ...farmhousesValue,
    ...ownerDataValue,
    ...couponsValue,
    wishlistFarmhouses: [],
    wishlistLoading: false,
    wishlistRefreshing: false,
    wishlistError: null,
    reviews: [],
    reviewsLoading: false,
    reviewsRefreshing: false,
    reviewsError: null,
    refreshReviews: () => {},
    refreshWishlist: () => {},
    refreshAll,
    getFarmhouseReviews,
  }), [bookingsValue, farmhousesValue, ownerDataValue, couponsValue, refreshAll, getFarmhouseReviews]);

  return (
    <GlobalDataContext.Provider value={legacyValue}>
      <BookingsCtx.Provider value={bookingsValue}>
        <FarmhousesCtx.Provider value={farmhousesValue}>
          <OwnerDataCtx.Provider value={ownerDataValue}>
            <CouponsCtx.Provider value={couponsValue}>
              {children}
            </CouponsCtx.Provider>
          </OwnerDataCtx.Provider>
        </FarmhousesCtx.Provider>
      </BookingsCtx.Provider>
    </GlobalDataContext.Provider>
  );
}

// ==================== HOOKS ====================

export function useGlobalData() {
  const context = useContext(GlobalDataContext);
  if (!context) throw new Error('useGlobalData must be used within a GlobalDataProvider');
  return context;
}

export function useMyBookings() {
  const ctx = useContext(BookingsCtx);
  if (!ctx) throw new Error('useMyBookings must be used within a GlobalDataProvider');
  const categorized = useMemo(() => ctx.getCategorizedBookings(), [ctx.getCategorizedBookings]);
  return {
    data: ctx.myBookings,
    loading: ctx.myBookingsLoading,
    error: ctx.myBookingsError,
    refreshing: ctx.myBookingsRefreshing,
    refresh: ctx.refreshMyBookings,
    categorized,
  };
}

export function useAvailableFarmhouses() {
  const ctx = useContext(FarmhousesCtx);
  if (!ctx) throw new Error('useAvailableFarmhouses must be used within a GlobalDataProvider');
  return {
    data: ctx.availableFarmhouses,
    loading: ctx.availableFarmhousesLoading,
    error: ctx.availableFarmhousesError,
    refreshing: ctx.availableFarmhousesRefreshing,
    refresh: ctx.refreshAvailableFarmhouses,
  };
}

export function useMyFarmhouses() {
  const ctx = useContext(FarmhousesCtx);
  if (!ctx) throw new Error('useMyFarmhouses must be used within a GlobalDataProvider');
  return {
    data: ctx.myFarmhouses,
    loading: ctx.myFarmhousesLoading,
    serverConfirmed: ctx.myFarmhousesServerConfirmed,
    error: ctx.myFarmhousesError,
    refreshing: ctx.myFarmhousesRefreshing,
    refresh: ctx.refreshMyFarmhouses,
  };
}

export function useCoupons() {
  const ctx = useContext(CouponsCtx);
  if (!ctx) throw new Error('useCoupons must be used within a GlobalDataProvider');
  return {
    data: ctx.coupons,
    loading: ctx.couponsLoading,
    error: ctx.couponsError,
    refreshing: ctx.couponsRefreshing,
    refresh: ctx.refreshCoupons,
  };
}

export function useOwnerBookings(farmhouseId?: string) {
  const ctx = useContext(OwnerDataCtx);
  if (!ctx) throw new Error('useOwnerBookings must be used within a GlobalDataProvider');
  const data = useMemo(
    () => farmhouseId ? ctx.getFarmhouseBookings(farmhouseId) : ctx.allBookingsForMyFarmhouses,
    [farmhouseId, ctx.allBookingsForMyFarmhouses, ctx.getFarmhouseBookings]
  );
  return {
    data,
    loading: ctx.allBookingsLoading,
    error: ctx.allBookingsError,
    refreshing: ctx.allBookingsRefreshing,
    refresh: ctx.refreshAllBookings,
  };
}
