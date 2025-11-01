/**
 * IMPROVED Global Data Context with Consolidated Loading States
 *
 * This is a refactored version of GlobalDataContext.tsx with the following improvements:
 * 1. Consolidated loading/refreshing/error states into single LoadingState per entity
 * 2. Reduced state variables from 21 to 7 (one per entity type)
 * 3. Better type safety and cleaner code
 * 4. Easier to extend with new entities
 *
 * TO MIGRATE: Replace GlobalDataContext.tsx with this file after testing
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot
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
  paymentStatus: 'pending' | 'paid' | 'refunded';
  paymentMethod?: string;
  transactionId?: string;
  createdAt: string;
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

/**
 * Consolidated loading state for each entity
 * Replaces separate loading, refreshing, and error states
 */
export interface LoadingState {
  status: 'idle' | 'loading' | 'refreshing' | 'error';
  error: string | null;
}

interface DataState {
  myBookings: Booking[];
  availableFarmhouses: Farmhouse[];
  wishlistFarmhouses: Farmhouse[];
  myFarmhouses: Farmhouse[];
  allBookingsForMyFarmhouses: Booking[];
  reviews: Review[];
  coupons: Coupon[];

  // Consolidated loading states
  myBookingsState: LoadingState;
  availableFarmhousesState: LoadingState;
  myFarmhousesState: LoadingState;
  allBookingsState: LoadingState;
  reviewsState: LoadingState;
  couponsState: LoadingState;
  wishlistState: LoadingState;
}

interface GlobalDataContextType extends DataState {
  refreshMyBookings: () => Promise<void>;
  refreshAvailableFarmhouses: () => Promise<void>;
  refreshMyFarmhouses: () => Promise<void>;
  refreshAllBookings: () => Promise<void>;
  refreshReviews: (farmhouseId?: string) => Promise<void>;
  refreshCoupons: () => Promise<void>;
  refreshWishlist: () => Promise<void>;
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

  // Helper functions to check loading states
  isLoading: (entity: keyof Pick<DataState, 'myBookingsState' | 'availableFarmhousesState' | 'myFarmhousesState' | 'allBookingsState' | 'reviewsState' | 'couponsState' | 'wishlistState'>) => boolean;
  isRefreshing: (entity: keyof Pick<DataState, 'myBookingsState' | 'availableFarmhousesState' | 'myFarmhousesState' | 'allBookingsState' | 'reviewsState' | 'couponsState' | 'wishlistState'>) => boolean;
  hasError: (entity: keyof Pick<DataState, 'myBookingsState' | 'availableFarmhousesState' | 'myFarmhousesState' | 'allBookingsState' | 'reviewsState' | 'couponsState' | 'wishlistState'>) => boolean;
  getError: (entity: keyof Pick<DataState, 'myBookingsState' | 'availableFarmhousesState' | 'myFarmhousesState' | 'allBookingsState' | 'reviewsState' | 'couponsState' | 'wishlistState'>) => string | null;
}

const GlobalDataContext = createContext<GlobalDataContextType | undefined>(undefined);

// ==================== HELPER FUNCTIONS ====================

const createDefaultLoadingState = (): LoadingState => ({
  status: 'idle',
  error: null,
});

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
      unmarriedCouples: false,
      pets: false,
      quietHours: false,
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

  if (!data) {
    console.warn(`Farmhouse document ${doc.id} has no data`);
    return createDefaultFarmhouse(doc.id);
  }

  // New structure (has basicDetails)
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
        unmarriedCouples: !data.rules?.unmarriedNotAllowed,
        pets: !data.rules?.petsNotAllowed,
        quietHours: data.rules?.quietHours || false,
      },

      ownerId: data.ownerId || '',
      status: data.status || 'pending',
      rating: 0,
      reviews: 0,
      bookedDates: Array.isArray(data.bookedDates) ? data.bookedDates : [],
      blockedDates: Array.isArray(data.blockedDates) ? data.blockedDates : [],

      coordinates: data.coordinates || undefined,
      createdAt: data.createdAt,
      approvedAt: data.approvedAt,

      contactPhone1: data.basicDetails?.contactPhone1,
      contactPhone2: data.basicDetails?.contactPhone2,

      basicDetails: data.basicDetails,
      sourceType: 'new',
    };
  }

  // Old structure
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

    rules: data.rules || {
      unmarriedCouples: false,
      pets: false,
      quietHours: false,
    },

    ownerId: data.ownerId || '',
    status: data.status || 'pending',
    rating: data.rating || 0,
    reviews: data.reviews || 0,
    bookedDates: Array.isArray(data.bookedDates) ? data.bookedDates : [],
    blockedDates: Array.isArray(data.blockedDates) ? data.blockedDates : [],

    coordinates: data.coordinates,
    createdAt: data.createdAt,
    approvedAt: data.approvedAt,

    contactPhone1: data.contactPhone1,
    contactPhone2: data.contactPhone2,

    sourceType: 'old',
  };
};

// ==================== PROVIDER ====================

export function GlobalDataProvider({ children }: { children: ReactNode }) {
  const { user, role } = useAuth();

  // Data states
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [availableFarmhouses, setAvailableFarmhouses] = useState<Farmhouse[]>([]);
  const [wishlistFarmhouses, setWishlistFarmhouses] = useState<Farmhouse[]>([]);
  const [myFarmhouses, setMyFarmhouses] = useState<Farmhouse[]>([]);
  const [allBookingsForMyFarmhouses, setAllBookingsForMyFarmhouses] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  // Consolidated loading states
  const [myBookingsState, setMyBookingsState] = useState<LoadingState>(createDefaultLoadingState());
  const [availableFarmhousesState, setAvailableFarmhousesState] = useState<LoadingState>(createDefaultLoadingState());
  const [myFarmhousesState, setMyFarmhousesState] = useState<LoadingState>(createDefaultLoadingState());
  const [allBookingsState, setAllBookingsState] = useState<LoadingState>(createDefaultLoadingState());
  const [reviewsState, setReviewsState] = useState<LoadingState>(createDefaultLoadingState());
  const [couponsState, setCouponsState] = useState<LoadingState>(createDefaultLoadingState());
  const [wishlistState, setWishlistState] = useState<LoadingState>(createDefaultLoadingState());

  // Setup real-time listeners
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribers: (() => void)[] = [];

    // My Bookings Listener (for customers)
    if (role === 'customer') {
      setMyBookingsState({ status: 'loading', error: null });
      const q = query(
        collection(db, 'bookings'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const bookingsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Booking[];
          setMyBookings(bookingsData);
          setMyBookingsState({ status: 'idle', error: null });
        },
        (error) => {
          console.error('Error fetching my bookings:', error);
          setMyBookingsState({ status: 'error', error: error.message });
        }
      );
      unsubscribers.push(unsubscribe);
    }

    // Available Farmhouses Listener
    setAvailableFarmhousesState({ status: 'loading', error: null });
    const farmhousesQuery = query(
      collection(db, 'farmhouses'),
      where('status', '==', 'approved')
    );

    const unsubscribeFarmhouses = onSnapshot(
      farmhousesQuery,
      (snapshot) => {
        const farmhousesData = snapshot.docs.map(transformFarmhouseData);
        setAvailableFarmhouses(farmhousesData);
        setAvailableFarmhousesState({ status: 'idle', error: null });
      },
      (error) => {
        console.error('Error fetching farmhouses:', error);
        setAvailableFarmhousesState({ status: 'error', error: error.message });
      }
    );
    unsubscribers.push(unsubscribeFarmhouses);

    // My Farmhouses Listener (for owners)
    if (role === 'owner') {
      setMyFarmhousesState({ status: 'loading', error: null });
      const myFarmhousesQuery = query(
        collection(db, 'farmhouses'),
        where('ownerId', '==', user.uid)
      );

      const unsubscribeMyFarmhouses = onSnapshot(
        myFarmhousesQuery,
        (snapshot) => {
          const farmhousesData = snapshot.docs.map(transformFarmhouseData);
          setMyFarmhouses(farmhousesData);
          setMyFarmhousesState({ status: 'idle', error: null });
        },
        (error) => {
          console.error('Error fetching my farmhouses:', error);
          setMyFarmhousesState({ status: 'error', error: error.message });
        }
      );
      unsubscribers.push(unsubscribeMyFarmhouses);

      // All Bookings for My Farmhouses
      const myFarmhouseIds = myFarmhouses.map(f => f.id);
      if (myFarmhouseIds.length > 0) {
        setAllBookingsState({ status: 'loading', error: null });
        const allBookingsQuery = query(
          collection(db, 'bookings'),
          where('farmhouseId', 'in', myFarmhouseIds.slice(0, 10))
        );

        const unsubscribeAllBookings = onSnapshot(
          allBookingsQuery,
          (snapshot) => {
            const bookingsData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as Booking[];
            setAllBookingsForMyFarmhouses(bookingsData);
            setAllBookingsState({ status: 'idle', error: null });
          },
          (error) => {
            console.error('Error fetching all bookings:', error);
            setAllBookingsState({ status: 'error', error: error.message });
          }
        );
        unsubscribers.push(unsubscribeAllBookings);
      }
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [user?.uid, role, myFarmhouses.map(f => f.id).join(',')]);

  // Refresh functions
  const refreshMyBookings = useCallback(async () => {
    setMyBookingsState({ status: 'refreshing', error: null });
    // Refresh logic handled by onSnapshot listeners
    await new Promise(resolve => setTimeout(resolve, 500));
    setMyBookingsState({ status: 'idle', error: null });
  }, []);

  const refreshAvailableFarmhouses = useCallback(async () => {
    setAvailableFarmhousesState({ status: 'refreshing', error: null });
    await new Promise(resolve => setTimeout(resolve, 500));
    setAvailableFarmhousesState({ status: 'idle', error: null });
  }, []);

  const refreshMyFarmhouses = useCallback(async () => {
    setMyFarmhousesState({ status: 'refreshing', error: null });
    await new Promise(resolve => setTimeout(resolve, 500));
    setMyFarmhousesState({ status: 'idle', error: null });
  }, []);

  const refreshAllBookings = useCallback(async () => {
    setAllBookingsState({ status: 'refreshing', error: null });
    await new Promise(resolve => setTimeout(resolve, 500));
    setAllBookingsState({ status: 'idle', error: null });
  }, []);

  const refreshReviews = useCallback(async (farmhouseId?: string) => {
    setReviewsState({ status: 'refreshing', error: null });
    await new Promise(resolve => setTimeout(resolve, 500));
    setReviewsState({ status: 'idle', error: null });
  }, []);

  const refreshCoupons = useCallback(async () => {
    setCouponsState({ status: 'refreshing', error: null });
    await new Promise(resolve => setTimeout(resolve, 500));
    setCouponsState({ status: 'idle', error: null });
  }, []);

  const refreshWishlist = useCallback(async () => {
    setWishlistState({ status: 'refreshing', error: null });
    await new Promise(resolve => setTimeout(resolve, 500));
    setWishlistState({ status: 'idle', error: null });
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshMyBookings(),
      refreshAvailableFarmhouses(),
      refreshMyFarmhouses(),
      refreshAllBookings(),
      refreshReviews(),
      refreshCoupons(),
      refreshWishlist(),
    ]);
  }, [refreshMyBookings, refreshAvailableFarmhouses, refreshMyFarmhouses, refreshAllBookings, refreshReviews, refreshCoupons, refreshWishlist]);

  // Helper functions
  const getFarmhouseById = useCallback((id: string) => {
    return availableFarmhouses.find(f => f.id === id) || myFarmhouses.find(f => f.id === id);
  }, [availableFarmhouses, myFarmhouses]);

  const getBookingById = useCallback((id: string) => {
    return myBookings.find(b => b.id === id) || allBookingsForMyFarmhouses.find(b => b.id === id);
  }, [myBookings, allBookingsForMyFarmhouses]);

  const getFarmhouseBookings = useCallback((farmhouseId: string) => {
    return allBookingsForMyFarmhouses.filter(b => b.farmhouseId === farmhouseId);
  }, [allBookingsForMyFarmhouses]);

  const getFarmhouseReviews = useCallback((farmhouseId: string) => {
    return reviews.filter(r => r.farmhouseId === farmhouseId);
  }, [reviews]);

  const getCategorizedBookings = useCallback(() => {
    const now = new Date();
    const upcoming: Booking[] = [];
    const past: Booking[] = [];
    const cancelled: Booking[] = [];

    myBookings.forEach(booking => {
      if (booking.status === 'cancelled') {
        cancelled.push(booking);
      } else if (new Date(booking.checkInDate) > now) {
        upcoming.push(booking);
      } else {
        past.push(booking);
      }
    });

    return { upcoming, past, cancelled };
  }, [myBookings]);

  // Helper functions for checking states
  const isLoading = useCallback((entity: keyof Pick<DataState, 'myBookingsState' | 'availableFarmhousesState' | 'myFarmhousesState' | 'allBookingsState' | 'reviewsState' | 'couponsState' | 'wishlistState'>) => {
    const stateMap = { myBookingsState, availableFarmhousesState, myFarmhousesState, allBookingsState, reviewsState, couponsState, wishlistState };
    return stateMap[entity].status === 'loading';
  }, [myBookingsState, availableFarmhousesState, myFarmhousesState, allBookingsState, reviewsState, couponsState, wishlistState]);

  const isRefreshing = useCallback((entity: keyof Pick<DataState, 'myBookingsState' | 'availableFarmhousesState' | 'myFarmhousesState' | 'allBookingsState' | 'reviewsState' | 'couponsState' | 'wishlistState'>) => {
    const stateMap = { myBookingsState, availableFarmhousesState, myFarmhousesState, allBookingsState, reviewsState, couponsState, wishlistState };
    return stateMap[entity].status === 'refreshing';
  }, [myBookingsState, availableFarmhousesState, myFarmhousesState, allBookingsState, reviewsState, couponsState, wishlistState]);

  const hasError = useCallback((entity: keyof Pick<DataState, 'myBookingsState' | 'availableFarmhousesState' | 'myFarmhousesState' | 'allBookingsState' | 'reviewsState' | 'couponsState' | 'wishlistState'>) => {
    const stateMap = { myBookingsState, availableFarmhousesState, myFarmhousesState, allBookingsState, reviewsState, couponsState, wishlistState };
    return stateMap[entity].status === 'error';
  }, [myBookingsState, availableFarmhousesState, myFarmhousesState, allBookingsState, reviewsState, couponsState, wishlistState]);

  const getError = useCallback((entity: keyof Pick<DataState, 'myBookingsState' | 'availableFarmhousesState' | 'myFarmhousesState' | 'allBookingsState' | 'reviewsState' | 'couponsState' | 'wishlistState'>) => {
    const stateMap = { myBookingsState, availableFarmhousesState, myFarmhousesState, allBookingsState, reviewsState, couponsState, wishlistState };
    return stateMap[entity].error;
  }, [myBookingsState, availableFarmhousesState, myFarmhousesState, allBookingsState, reviewsState, couponsState, wishlistState]);

  const value: GlobalDataContextType = {
    myBookings,
    availableFarmhouses,
    wishlistFarmhouses,
    myFarmhouses,
    allBookingsForMyFarmhouses,
    reviews,
    coupons,
    myBookingsState,
    availableFarmhousesState,
    myFarmhousesState,
    allBookingsState,
    reviewsState,
    couponsState,
    wishlistState,
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
    isLoading,
    isRefreshing,
    hasError,
    getError,
  };

  return (
    <GlobalDataContext.Provider value={value}>
      {children}
    </GlobalDataContext.Provider>
  );
}

export function useGlobalData() {
  const context = useContext(GlobalDataContext);
  if (context === undefined) {
    throw new Error('useGlobalData must be used within a GlobalDataProvider');
  }
  return context;
}
