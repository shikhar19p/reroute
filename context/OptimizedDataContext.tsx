import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../authContext';
import { Farmhouse } from '../types/navigation';

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
  createdAt: string;
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

// ==================== HOOK FOR AVAILABLE FARMHOUSES ====================
// Separated to allow independent usage and caching

export function useAvailableFarmhouses() {
  const [data, setData] = useState<Farmhouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: Unsubscribe;

    const fetchData = () => {
      try {
        const farmhousesRef = collection(db, 'farmhouses');
        const q = query(
          farmhousesRef,
          where('status', '==', 'approved'),
          orderBy('createdAt', 'desc')
        );

        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const farmhouses = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            } as Farmhouse));
            setData(farmhouses);
            setLoading(false);
            setError(null);
          },
          (err) => {
            console.error('Error fetching farmhouses:', err);
            setError(err.message);
            setLoading(false);
          }
        );
      } catch (err: any) {
        console.error('Error setting up farmhouses listener:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return { data, loading, error };
}

// ==================== HOOK FOR USER BOOKINGS ====================

export function useMyBookings() {
  const { user } = useAuth();
  const [data, setData] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setData([]);
      setLoading(false);
      return;
    }

    let unsubscribe: Unsubscribe;

    try {
      const bookingsRef = collection(db, 'bookings');
      const q = query(
        bookingsRef,
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const bookings = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Booking));
          setData(bookings);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Error fetching user bookings:', err);
          setError(err.message);
          setLoading(false);
        }
      );
    } catch (err: any) {
      console.error('Error setting up bookings listener:', err);
      setError(err.message);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.uid]);

  return { data, loading, error };
}

// ==================== HOOK FOR OWNER FARMHOUSES ====================

export function useMyFarmhouses() {
  const { user } = useAuth();
  const [data, setData] = useState<Farmhouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setData([]);
      setLoading(false);
      return;
    }

    let unsubscribe: Unsubscribe;

    try {
      const farmhousesRef = collection(db, 'farmhouses');
      const q = query(
        farmhousesRef,
        where('ownerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const farmhouses = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Farmhouse));
          setData(farmhouses);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Error fetching owner farmhouses:', err);
          setError(err.message);
          setLoading(false);
        }
      );
    } catch (err: any) {
      console.error('Error setting up farmhouses listener:', err);
      setError(err.message);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.uid]);

  return { data, loading, error };
}

// ==================== HOOK FOR OWNER BOOKINGS ====================

export function useOwnerBookings() {
  const { user } = useAuth();
  const { data: myFarmhouses } = useMyFarmhouses();
  const [data, setData] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid || myFarmhouses.length === 0) {
      setData([]);
      setLoading(false);
      return;
    }

    let unsubscribe: Unsubscribe;

    try {
      const farmhouseIds = myFarmhouses.map(f => f.id);
      const bookingsRef = collection(db, 'bookings');
      const q = query(
        bookingsRef,
        where('farmhouseId', 'in', farmhouseIds.slice(0, 10)), // Firestore 'in' limit is 10
        orderBy('createdAt', 'desc')
      );

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const bookings = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Booking));
          setData(bookings);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Error fetching owner bookings:', err);
          setError(err.message);
          setLoading(false);
        }
      );
    } catch (err: any) {
      console.error('Error setting up owner bookings listener:', err);
      setError(err.message);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.uid, myFarmhouses]);

  return { data, loading, error };
}

// ==================== HOOK FOR COUPONS ====================

export function useCoupons() {
  const [data, setData] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: Unsubscribe;

    try {
      const couponsRef = collection(db, 'coupons');
      const q = query(
        couponsRef,
        where('is_active', '==', true),
        orderBy('valid_until', 'desc')
      );

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const coupons = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Coupon));
          setData(coupons);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Error fetching coupons:', err);
          setError(err.message);
          setLoading(false);
        }
      );
    } catch (err: any) {
      console.error('Error setting up coupons listener:', err);
      setError(err.message);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return { data, loading, error };
}

// ==================== LEGACY GLOBAL DATA PROVIDER ====================
// Kept for backward compatibility - gradually migrate to individual hooks

interface GlobalDataContextType {
  // For backward compatibility
  availableFarmhouses: Farmhouse[];
  myBookings: Booking[];
  coupons: Coupon[];
  loading: boolean;
  error: string | null;
}

const GlobalDataContext = createContext<GlobalDataContextType | undefined>(undefined);

export function GlobalDataProvider({ children }: { children: ReactNode }) {
  const { data: availableFarmhouses, loading: farmhousesLoading } = useAvailableFarmhouses();
  const { data: myBookings, loading: bookingsLoading } = useMyBookings();
  const { data: coupons, loading: couponsLoading } = useCoupons();

  const loading = farmhousesLoading || bookingsLoading || couponsLoading;

  const value = useMemo(
    () => ({
      availableFarmhouses,
      myBookings,
      coupons,
      loading,
      error: null,
    }),
    [availableFarmhouses, myBookings, coupons, loading]
  );

  return (
    <GlobalDataContext.Provider value={value}>
      {children}
    </GlobalDataContext.Provider>
  );
}

export function useGlobalData() {
  const context = useContext(GlobalDataContext);
  if (!context) {
    throw new Error('useGlobalData must be used within GlobalDataProvider');
  }
  return context;
}
