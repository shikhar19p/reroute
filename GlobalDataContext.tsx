import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  DocumentData,
  Unsubscribe,
  limit
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { useAuth } from './authContext';

// ==================== TYPES ====================
export interface Farmhouse {
  id: string;
  name: string;
  location: string;
  city: string;
  area: string;
  description: string;
  photos: string[];
  capacity: number;
  bedrooms: number;
  weeklyDay: number;
  weeklyNight: number;
  weekendDay: number;
  weekendNight: number;
  rating: number;
  reviews: number;
  status: 'pending' | 'approved' | 'rejected';
  ownerId: string;
  amenities: any;
  rules: any;
  coordinates?: { latitude: number; longitude: number };
  mapLink?: string;
  contactPhone1?: string;
  contactPhone2?: string;
  customPricing?: Array<{ label: string; price: number }>;
  blockedDates?: string[];
  bookedDates?: string[];
  createdAt: string;
  updatedAt?: string;
}

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

interface DataState {
  // Customer data
  myBookings: Booking[];
  availableFarmhouses: Farmhouse[];
  wishlistFarmhouses: Farmhouse[];
  
  // Owner data
  myFarmhouses: Farmhouse[];
  allBookingsForMyFarmhouses: Booking[];
  
  // Shared data
  reviews: Review[];
  coupons: Coupon[];
  
  // Loading states
  myBookingsLoading: boolean;
  availableFarmhousesLoading: boolean;
  myFarmhousesLoading: boolean;
  allBookingsLoading: boolean;
  reviewsLoading: boolean;
  couponsLoading: boolean;
  wishlistLoading: boolean;
  
  // Refreshing states
  myBookingsRefreshing: boolean;
  availableFarmhousesRefreshing: boolean;
  myFarmhousesRefreshing: boolean;
  allBookingsRefreshing: boolean;
  reviewsRefreshing: boolean;
  couponsRefreshing: boolean;
  wishlistRefreshing: boolean;
  
  // Error states
  myBookingsError: string | null;
  availableFarmhousesError: string | null;
  myFarmhousesError: string | null;
  allBookingsError: string | null;
  reviewsError: string | null;
  couponsError: string | null;
  wishlistError: string | null;
}

interface GlobalDataContextType extends DataState {
  // Refresh functions
  refreshMyBookings: () => Promise<void>;
  refreshAvailableFarmhouses: () => Promise<void>;
  refreshMyFarmhouses: () => Promise<void>;
  refreshAllBookings: () => Promise<void>;
  refreshReviews: (farmhouseId?: string) => Promise<void>;
  refreshCoupons: () => Promise<void>;
  refreshWishlist: () => Promise<void>;
  refreshAll: () => Promise<void>;
  
  // Helper functions
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

// ==================== PROVIDER ====================
export function GlobalDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
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
    allBookingsLoading: true,
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

  const [refreshTriggers, setRefreshTriggers] = useState({
    myBookings: 0,
    availableFarmhouses: 0,
    myFarmhouses: 0,
    allBookings: 0,
    reviews: 0,
    coupons: 0,
    wishlist: 0,
  });

  // ==================== LISTENERS ====================
  
  // My Bookings (Customer)
  useEffect(() => {
    if (!user?.uid) {
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
  }, [user?.uid, refreshTriggers.myBookings]);

  // Available Farmhouses (All Customers)
  useEffect(() => {
    setState(prev => ({ ...prev, availableFarmhousesLoading: true, availableFarmhousesError: null }));

    const q = query(
      collection(db, 'farmhouses'),
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const farmhouses = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Farmhouse[];

        setState(prev => ({
          ...prev,
          availableFarmhouses: farmhouses,
          availableFarmhousesLoading: false,
          availableFarmhousesRefreshing: false,
          availableFarmhousesError: null,
        }));
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
  }, [refreshTriggers.availableFarmhouses]);

  // My Farmhouses (Owner)
  useEffect(() => {
    if (!user?.uid || user.role !== 'owner') {
      setState(prev => ({ ...prev, myFarmhouses: [], myFarmhousesLoading: false }));
      return;
    }

    setState(prev => ({ ...prev, myFarmhousesLoading: true, myFarmhousesError: null }));

    const q = query(
      collection(db, 'farmhouses'),
      where('ownerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const farmhouses = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Farmhouse[];

        setState(prev => ({
          ...prev,
          myFarmhouses: farmhouses,
          myFarmhousesLoading: false,
          myFarmhousesRefreshing: false,
          myFarmhousesError: null,
        }));
      },
      (error) => {
        console.error('Error fetching myFarmhouses:', error);
        setState(prev => ({
          ...prev,
          myFarmhousesLoading: false,
          myFarmhousesRefreshing: false,
          myFarmhousesError: error.message,
        }));
      }
    );

    return () => unsubscribe();
  }, [user?.uid, user?.role, refreshTriggers.myFarmhouses]);

  // All Bookings for My Farmhouses (Owner)
  useEffect(() => {
    if (!user?.uid || user.role !== 'owner' || state.myFarmhouses.length === 0) {
      setState(prev => ({ ...prev, allBookingsForMyFarmhouses: [], allBookingsLoading: false }));
      return;
    }

    setState(prev => ({ ...prev, allBookingsLoading: true, allBookingsError: null }));

    const farmhouseIds = state.myFarmhouses.map(f => f.id);
    
    const q = query(
      collection(db, 'bookings'),
      where('farmhouseId', 'in', farmhouseIds.slice(0, 10)), // Firestore 'in' limit is 10
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
          allBookingsForMyFarmhouses: bookings,
          allBookingsLoading: false,
          allBookingsRefreshing: false,
          allBookingsError: null,
        }));
      },
      (error) => {
        console.error('Error fetching allBookings:', error);
        setState(prev => ({
          ...prev,
          allBookingsLoading: false,
          allBookingsRefreshing: false,
          allBookingsError: error.message,
        }));
      }
    );

    return () => unsubscribe();
  }, [user?.uid, user?.role, state.myFarmhouses.length, refreshTriggers.allBookings]);

  // Active Coupons
  useEffect(() => {
    setState(prev => ({ ...prev, couponsLoading: true, couponsError: null }));

    const q = query(
      collection(db, 'coupons'),
      where('is_active', '==', true),
      orderBy('valid_until', 'desc')
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
  }, [refreshTriggers.coupons]);

  // ==================== REFRESH FUNCTIONS ====================
  
  const refreshMyBookings = useCallback(async () => {
    setState(prev => ({ ...prev, myBookingsRefreshing: true }));
    await new Promise(resolve => setTimeout(resolve, 500));
    setRefreshTriggers(prev => ({ ...prev, myBookings: prev.myBookings + 1 }));
  }, []);

  const refreshAvailableFarmhouses = useCallback(async () => {
    setState(prev => ({ ...prev, availableFarmhousesRefreshing: true }));
    await new Promise(resolve => setTimeout(resolve, 500));
    setRefreshTriggers(prev => ({ ...prev, availableFarmhouses: prev.availableFarmhouses + 1 }));
  }, []);

  const refreshMyFarmhouses = useCallback(async () => {
    setState(prev => ({ ...prev, myFarmhousesRefreshing: true }));
    await new Promise(resolve => setTimeout(resolve, 500));
    setRefreshTriggers(prev => ({ ...prev, myFarmhouses: prev.myFarmhouses + 1 }));
  }, []);

  const refreshAllBookings = useCallback(async () => {
    setState(prev => ({ ...prev, allBookingsRefreshing: true }));
    await new Promise(resolve => setTimeout(resolve, 500));
    setRefreshTriggers(prev => ({ ...prev, allBookings: prev.allBookings + 1 }));
  }, []);

  const refreshReviews = useCallback(async (farmhouseId?: string) => {
    setState(prev => ({ ...prev, reviewsRefreshing: true }));
    await new Promise(resolve => setTimeout(resolve, 500));
    setRefreshTriggers(prev => ({ ...prev, reviews: prev.reviews + 1 }));
  }, []);

  const refreshCoupons = useCallback(async () => {
    setState(prev => ({ ...prev, couponsRefreshing: true }));
    await new Promise(resolve => setTimeout(resolve, 500));
    setRefreshTriggers(prev => ({ ...prev, coupons: prev.coupons + 1 }));
  }, []);

  const refreshWishlist = useCallback(async () => {
    setState(prev => ({ ...prev, wishlistRefreshing: true }));
    await new Promise(resolve => setTimeout(resolve, 500));
    setRefreshTriggers(prev => ({ ...prev, wishlist: prev.wishlist + 1 }));
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

  // ==================== HELPER FUNCTIONS ====================
  
  const getFarmhouseById = useCallback((id: string) => {
    return state.availableFarmhouses.find(f => f.id === id) || 
           state.myFarmhouses.find(f => f.id === id);
  }, [state.availableFarmhouses, state.myFarmhouses]);

  const getBookingById = useCallback((id: string) => {
    return state.myBookings.find(b => b.id === id) ||
           state.allBookingsForMyFarmhouses.find(b => b.id === id);
  }, [state.myBookings, state.allBookingsForMyFarmhouses]);

  const getFarmhouseBookings = useCallback((farmhouseId: string) => {
    return state.allBookingsForMyFarmhouses.filter(b => b.farmhouseId === farmhouseId);
  }, [state.allBookingsForMyFarmhouses]);

  const getFarmhouseReviews = useCallback((farmhouseId: string) => {
    return state.reviews.filter(r => r.farmhouseId === farmhouseId);
  }, [state.reviews]);

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
  if (context === undefined) {
    throw new Error('useGlobalData must be used within a GlobalDataProvider');
  }
  return context;
}

// Convenience hooks for specific data
export function useMyBookings() {
  const { myBookings, myBookingsLoading, myBookingsError, myBookingsRefreshing, refreshMyBookings, getCategorizedBookings } = useGlobalData();
  return {
    data: myBookings,
    loading: myBookingsLoading,
    error: myBookingsError,
    refreshing: myBookingsRefreshing,
    refresh: refreshMyBookings,
    categorized: getCategorizedBookings(),
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
  const { myFarmhouses, myFarmhousesLoading, myFarmhousesError, myFarmhousesRefreshing, refreshMyFarmhouses } = useGlobalData();
  return {
    data: myFarmhouses,
    loading: myFarmhousesLoading,
    error: myFarmhousesError,
    refreshing: myFarmhousesRefreshing,
    refresh: refreshMyFarmhouses,
  };
}

export function useAllBookingsForOwner() {
  const { allBookingsForMyFarmhouses, allBookingsLoading, allBookingsError, allBookingsRefreshing, refreshAllBookings } = useGlobalData();
  return {
    data: allBookingsForMyFarmhouses,
    loading: allBookingsLoading,
    error: allBookingsError,
    refreshing: allBookingsRefreshing,
    refresh: refreshAllBookings,
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