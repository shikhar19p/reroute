import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { Platform } from 'react-native';
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

interface DataState {
  myBookings: Booking[];
  availableFarmhouses: Farmhouse[];
  wishlistFarmhouses: Farmhouse[];
  myFarmhouses: Farmhouse[];
  allBookingsForMyFarmhouses: Booking[];
  reviews: Review[];
  coupons: Coupon[];
  myBookingsLoading: boolean;
  availableFarmhousesLoading: boolean;
  myFarmhousesLoading: boolean;
  myFarmhousesServerConfirmed: boolean;
  allBookingsLoading: boolean;
  reviewsLoading: boolean;
  couponsLoading: boolean;
  wishlistLoading: boolean;
  myBookingsRefreshing: boolean;
  availableFarmhousesRefreshing: boolean;
  myFarmhousesRefreshing: boolean;
  allBookingsRefreshing: boolean;
  reviewsRefreshing: boolean;
  couponsRefreshing: boolean;
  wishlistRefreshing: boolean;
  myBookingsError: string | null;
  availableFarmhousesError: string | null;
  myFarmhousesError: string | null;
  allBookingsError: string | null;
  reviewsError: string | null;
  couponsError: string | null;
  wishlistError: string | null;
}

interface GlobalDataContextType extends DataState {
  refreshMyBookings: () => void;
  refreshAvailableFarmhouses: () => void;
  refreshMyFarmhouses: () => void;
  refreshAllBookings: () => void;
  refreshReviews: (farmhouseId?: string) => void;
  refreshCoupons: () => void;
  refreshWishlist: () => void;
  refreshAll: () => Promise<void>;
  getFarmhouseById: (id: string) => Farmhouse | undefined;
  getBookingById: (id: string) => Booking | undefined;
  getFarmhouseBookings: (farmhouseId: string) => Booking[];
  getFarmhouseReviews: (farmhouseId: string) => Review[];
  getCategorizedBookings: () => {
    upcoming: Booking[];
    past: Booking[];
    cancelled: Booking[];
  };
}

const GlobalDataContext = createContext<GlobalDataContextType | undefined>(undefined);

// ==================== HELPER FUNCTIONS ====================

const createDefaultFarmhouse = (id: string): Farmhouse => {
  return {
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
    amenities: {
      tv: 0,
      geyser: 0,
      bonfire: 0,
      chess: 0,
      carroms: 0,
      volleyball: 0,
      pool: false,
    },
    rules: {
      pets: false,
      quietHours: false,
      alcohol: false,
    },
    ownerId: '',
    status: 'pending',
    rating: 0,
    reviews: 0,
    bookedDates: [],
    blockedDates: [],
    createdAt: new Date().toISOString(),
    sourceType: 'old',
  };
};

const transformFarmhouseData = (doc: any): Farmhouse => {
  const data = doc.data();
  
  // Safety checks for undefined values
  if (!data) {
    console.warn(`Farmhouse document ${doc.id} has no data`);
    return createDefaultFarmhouse(doc.id);
  }
  
  // Check if this is the new structure (has basicDetails)
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
      
      // Pricing from new structure - with safety checks
      weeklyDay: parseInt(data.pricing?.weeklyDay) || 0,
      weeklyNight: parseInt(data.pricing?.weeklyNight) || 0,
      occasionalDay: parseInt(data.pricing?.occasionalDay) || 0,
      occasionalNight: parseInt(data.pricing?.occasionalNight) || 0,
      weekendDay: parseInt(data.pricing?.weekendDay) || 0,
      weekendNight: parseInt(data.pricing?.weekendNight) || 0,
      
      customPricing: Array.isArray(data.pricing?.customPricing) 
        ? data.pricing.customPricing.map((cp: any) => ({
            label: cp?.name || '',
            price: parseInt(cp?.price) || 0
          }))
        : [],
      
      extraGuestPrice: 0,
      
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

  // Old structure (flat fields)
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
    
    // Pricing from old structure
    weeklyDay: data.price || 0,
    weeklyNight: data.price || 0,
    occasionalDay: data.price || 0,
    occasionalNight: data.weekendPrice || 0,
    weekendDay: data.price || 0,
    weekendNight: data.weekendPrice || 0,
    
    customPricing: [],
    extraGuestPrice: 0,
    
    photos: Array.isArray(data.photos) ? data.photos : [],
    
    amenities: data.amenities || {
      tv: 0,
      geyser: 0,
      bonfire: 0,
      chess: 0,
      carroms: 0,
      volleyball: 0,
      pool: false,
    },
    
    rules: data.rules ? {
      ...data.rules,
      additionalRules: data.rules.additionalRules || '',
    } : {
      pets: false,
      quietHours: false,
      alcohol: false,
      additionalRules: '',
    },
    
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
  // On native: start immediately (no paint blocking concern).
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

  // bfcache fix: Firebase WebSocket connections block back/forward cache.
  // Suspend network on pagehide, resume on pageshow.
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

  const [state, setState] = useState<DataState>({
    myBookings: [],
    availableFarmhouses: [],
    wishlistFarmhouses: [],
    myFarmhouses: [],
    allBookingsForMyFarmhouses: [],
    reviews: [],
    coupons: [],
    myBookingsLoading: true,
    availableFarmhousesLoading: true,
    myFarmhousesLoading: true,
    myFarmhousesServerConfirmed: false,
    allBookingsLoading: false,
    reviewsLoading: false,
    couponsLoading: true,
    wishlistLoading: false,
    myBookingsRefreshing: false,
    availableFarmhousesRefreshing: false,
    myFarmhousesRefreshing: false,
    allBookingsRefreshing: false,
    reviewsRefreshing: false,
    couponsRefreshing: false,
    wishlistRefreshing: false,
    myBookingsError: null,
    availableFarmhousesError: null,
    myFarmhousesError: null,
    allBookingsError: null,
    reviewsError: null,
    couponsError: null,
    wishlistError: null,
  });

  // refreshTriggers only needed for manual force-reconnect; onSnapshot handles live updates automatically
  const [refreshTriggers] = useState({
    myBookings: 0,
    availableFarmhouses: 0,
    myFarmhouses: 0,
    allBookings: 0,
    reviews: 0,
    coupons: 0,
    wishlist: 0,
  });

  // ==================== MY BOOKINGS ====================
  useEffect(() => {
    if (!ready) return;
    if (!user?.uid || user.role !== 'customer') {
      setState(prev => ({ ...prev, myBookings: [], myBookingsLoading: false }));
      return;
    }

    setState(prev => ({ ...prev, myBookingsLoading: true, myBookingsError: null }));

    const q = query(
      collection(db, 'bookings'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const bookings = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Booking[];

        setState(prev => ({
          ...prev,
          myBookings: bookings,
          myBookingsLoading: false,
          myBookingsRefreshing: false,
          myBookingsError: null,
        }));
      },
      (error) => {
        console.error('Error fetching myBookings:', error);
        setState(prev => ({
          ...prev,
          myBookingsLoading: false,
          myBookingsRefreshing: false,
          myBookingsError: error.message,
        }));
      }
    );

    return () => unsubscribe();
  }, [ready, user?.uid, user?.role, refreshTriggers.myBookings]);

  // ==================== AVAILABLE FARMHOUSES ====================
  useEffect(() => {
    if (!ready) return;
    if (!user || user.role !== 'customer') {
      setState(prev => ({ ...prev, availableFarmhouses: [], availableFarmhousesLoading: false }));
      return;
    }
    setState(prev => ({
      ...prev,
      availableFarmhousesLoading: true,
      availableFarmhousesError: null
    }));

    const q = query(
      collection(db, 'farmhouses'),
      where('status', '==', 'approved')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        try {
          let farmhouses = snapshot.docs.map(doc => transformFarmhouseData(doc));

          // Sort client-side by createdAt descending
          farmhouses.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
          });

          setState(prev => ({
            ...prev,
            availableFarmhouses: farmhouses,
            availableFarmhousesLoading: false,
            availableFarmhousesRefreshing: false,
            availableFarmhousesError: null,
          }));
        } catch (error: any) {
          console.error('Error transforming farmhouses:', error);
          setState(prev => ({
            ...prev,
            availableFarmhousesLoading: false,
            availableFarmhousesRefreshing: false,
            availableFarmhousesError: error.message,
          }));
        }
      },
      (error) => {
        console.error('Error fetching availableFarmhouses:', error);
        setState(prev => ({
          ...prev,
          availableFarmhousesLoading: false,
          availableFarmhousesRefreshing: false,
          availableFarmhousesError: error.message,
        }));
      }
    );

    return () => unsubscribe();
  }, [ready, user?.uid, user?.role, refreshTriggers.availableFarmhouses]);

  // ==================== MY FARMHOUSES (OWNER) ====================
  useEffect(() => {
    if (!user?.uid || user.role !== 'owner') {
      // Keep loading:true so OwnerNavigator never sees an empty+ready state during role transition
      setState(prev => ({ ...prev, myFarmhouses: [], myFarmhousesLoading: true, myFarmhousesServerConfirmed: false }));
      return;
    }

    setState(prev => ({ ...prev, myFarmhousesLoading: true, myFarmhousesError: null, myFarmhousesServerConfirmed: false }));

    const q = query(
      collection(db, 'farmhouses'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        const fromCache = snapshot.metadata.fromCache;
        try {
          const farmhouses = snapshot.docs.map(doc => transformFarmhouseData(doc));
          farmhouses.sort((a, b) => {
            const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
            const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
            return tb - ta;
          });

          setState(prev => ({
            ...prev,
            myFarmhouses: farmhouses,
            // Still "loading" if only cache data so far and list is empty — wait for server
            myFarmhousesLoading: fromCache && farmhouses.length === 0,
            myFarmhousesServerConfirmed: !fromCache,
            myFarmhousesRefreshing: false,
            myFarmhousesError: null,
          }));
        } catch (error: any) {
          console.error('Error transforming myFarmhouses:', error);
          setState(prev => ({
            ...prev,
            myFarmhousesLoading: false,
            myFarmhousesServerConfirmed: !fromCache,
            myFarmhousesRefreshing: false,
            myFarmhousesError: error.message,
          }));
        }
      },
      (error) => {
        console.error('Error fetching myFarmhouses:', error);
        setState(prev => ({
          ...prev,
          myFarmhousesLoading: false,
          myFarmhousesServerConfirmed: true,
          myFarmhousesRefreshing: false,
          myFarmhousesError: error.message,
        }));
      }
    );

    return () => unsubscribe();
  }, [user?.uid, user?.role, refreshTriggers.myFarmhouses]);

  // ==================== COUPONS ====================
  useEffect(() => {
    if (!ready) return;
    if (!user || user.role !== 'customer') {
      setState(prev => ({ ...prev, coupons: [], couponsLoading: false }));
      return;
    }
    setState(prev => ({ ...prev, couponsLoading: true, couponsError: null }));

    const q = query(
      collection(db, 'coupons'),
      where('is_active', '==', true)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const coupons = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Coupon[];

        setState(prev => ({
          ...prev,
          coupons,
          couponsLoading: false,
          couponsRefreshing: false,
          couponsError: null,
        }));
      },
      (error) => {
        console.error('Error fetching coupons:', error);
        setState(prev => ({
          ...prev,
          couponsLoading: false,
          couponsRefreshing: false,
          couponsError: error.message,
        }));
      }
    );

    return () => unsubscribe();
  }, [ready, user?.uid, user?.role, refreshTriggers.coupons]);

  // ==================== OWNER BOOKINGS ====================
  useEffect(() => {
    if (!ready) return;
    if (!user?.uid || user.role !== 'owner') {
      setState(prev => ({ ...prev, allBookingsForMyFarmhouses: [], allBookingsLoading: false }));
      return;
    }

    const farmhouseIds = state.myFarmhouses.map(f => f.id);
    if (farmhouseIds.length === 0) {
      setState(prev => ({ ...prev, allBookingsForMyFarmhouses: [], allBookingsLoading: false }));
      return;
    }

    setState(prev => ({ ...prev, allBookingsLoading: true, allBookingsError: null }));

    // Firestore 'in' supports up to 30 values; batch if needed
    const batches = [];
    for (let i = 0; i < farmhouseIds.length; i += 30) {
      batches.push(farmhouseIds.slice(i, i + 30));
    }

    const allBookingsMap = new Map<string, Booking>();
    const unsubs: (() => void)[] = [];
    let settledCount = 0;

    batches.forEach(batch => {
      const q = query(
        collection(db, 'bookings'),
        where('farmhouseId', 'in', batch),
        orderBy('createdAt', 'desc'),
        limit(500)
      );

      const unsub = onSnapshot(q, (snapshot) => {
        snapshot.docs.forEach(doc => {
          allBookingsMap.set(doc.id, { id: doc.id, ...doc.data() } as Booking);
        });
        settledCount++;
        if (settledCount >= batches.length) {
          const sorted = Array.from(allBookingsMap.values()).sort((a, b) => {
            const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
            const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
            return tb - ta;
          });
          setState(prev => ({
            ...prev,
            allBookingsForMyFarmhouses: sorted,
            allBookingsLoading: false,
            allBookingsRefreshing: false,
            allBookingsError: null,
          }));
        }
      }, (error) => {
        setState(prev => ({ ...prev, allBookingsLoading: false, allBookingsError: error.message }));
      });

      unsubs.push(unsub);
    });

    return () => unsubs.forEach(u => u());
  }, [ready, user?.uid, user?.role, state.myFarmhouses]);

  // ==================== REFRESH FUNCTIONS ====================

  // onSnapshot listeners are live — "refresh" just clears the refreshing flag.
  // Data propagates automatically; no need to tear down and recreate listeners.
  const refreshMyBookings = useCallback(() => {
    setState(prev => ({ ...prev, myBookingsRefreshing: false }));
  }, []);

  const refreshAvailableFarmhouses = useCallback(() => {
    setState(prev => ({ ...prev, availableFarmhousesRefreshing: false }));
  }, []);

  const refreshMyFarmhouses = useCallback(() => {
    setState(prev => ({ ...prev, myFarmhousesRefreshing: false }));
  }, []);

  const refreshAllBookings = useCallback(() => {
    setState(prev => ({ ...prev, allBookingsRefreshing: false }));
  }, []);

  const refreshReviews = useCallback((_farmhouseId?: string) => {
    setState(prev => ({ ...prev, reviewsRefreshing: false }));
  }, []);

  const refreshCoupons = useCallback(() => {
    setState(prev => ({ ...prev, couponsRefreshing: false }));
  }, []);

  const refreshWishlist = useCallback(() => {
    setState(prev => ({ ...prev, wishlistRefreshing: false }));
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
    (id: string) => {
      return state.availableFarmhouses.find(f => f.id === id) || 
             state.myFarmhouses.find(f => f.id === id);
    },
    [state.availableFarmhouses, state.myFarmhouses]
  );

  const getBookingById = useCallback(
    (id: string) => {
      return state.myBookings.find(b => b.id === id) ||
             state.allBookingsForMyFarmhouses.find(b => b.id === id);
    },
    [state.myBookings, state.allBookingsForMyFarmhouses]
  );

  const getFarmhouseBookings = useCallback(
    (farmhouseId: string) => {
      return state.allBookingsForMyFarmhouses.filter(b => b.farmhouseId === farmhouseId);
    },
    [state.allBookingsForMyFarmhouses]
  );

  const getFarmhouseReviews = useCallback(
    (farmhouseId: string) => {
      return state.reviews.filter(r => r.farmhouseId === farmhouseId);
    },
    [state.reviews]
  );

  const getCategorizedBookings = useCallback(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const upcoming: Booking[] = [];
    const past: Booking[] = [];
    const cancelled: Booking[] = [];

    state.myBookings.forEach(booking => {
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
  }, [state.myBookings]);

  const value: GlobalDataContextType = {
    ...state,
    refreshMyBookings,
    refreshAvailableFarmhouses,
    refreshMyFarmhouses,
    refreshAllBookings,
    refreshReviews,
    refreshCoupons,
    refreshWishlist,
    refreshAll,
    getFarmhouseById,
    getBookingById,
    getFarmhouseBookings,
    getFarmhouseReviews,
    getCategorizedBookings,
  };

  return (
    <GlobalDataContext.Provider value={value}>
      {children}
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
  const { myBookings, myBookingsLoading, myBookingsError, myBookingsRefreshing, refreshMyBookings, getCategorizedBookings } = useGlobalData();
  const categorized = useMemo(() => getCategorizedBookings(), [getCategorizedBookings]);
  return {
    data: myBookings,
    loading: myBookingsLoading,
    error: myBookingsError,
    refreshing: myBookingsRefreshing,
    refresh: refreshMyBookings,
    categorized,
  };
}

export function useAvailableFarmhouses() {
  const { availableFarmhouses, availableFarmhousesLoading, availableFarmhousesError, availableFarmhousesRefreshing, refreshAvailableFarmhouses } = useGlobalData();
  return {
    data: availableFarmhouses,
    loading: availableFarmhousesLoading,
    error: availableFarmhousesError,
    refreshing: availableFarmhousesRefreshing,
    refresh: refreshAvailableFarmhouses,
  };
}

export function useMyFarmhouses() {
  const { myFarmhouses, myFarmhousesLoading, myFarmhousesError, myFarmhousesRefreshing, myFarmhousesServerConfirmed, refreshMyFarmhouses } = useGlobalData();
  return {
    data: myFarmhouses,
    loading: myFarmhousesLoading,
    serverConfirmed: myFarmhousesServerConfirmed,
    error: myFarmhousesError,
    refreshing: myFarmhousesRefreshing,
    refresh: refreshMyFarmhouses,
  };
}

export function useCoupons() {
  const { coupons, couponsLoading, couponsError, couponsRefreshing, refreshCoupons } = useGlobalData();
  return {
    data: coupons,
    loading: couponsLoading,
    error: couponsError,
    refreshing: couponsRefreshing,
    refresh: refreshCoupons,
  };
}

export function useOwnerBookings(farmhouseId?: string) {
  const { allBookingsForMyFarmhouses, allBookingsLoading, allBookingsError, allBookingsRefreshing, refreshAllBookings, getFarmhouseBookings } = useGlobalData();
  const data = useMemo(
    () => farmhouseId ? getFarmhouseBookings(farmhouseId) : allBookingsForMyFarmhouses,
    [farmhouseId, allBookingsForMyFarmhouses, getFarmhouseBookings]
  );
  return {
    data,
    loading: allBookingsLoading,
    error: allBookingsError,
    refreshing: allBookingsRefreshing,
    refresh: refreshAllBookings,
  };
}