import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, getCountFromServer } from 'firebase/firestore';
import { db } from '../config/firebase';
import { DashboardStats } from '../types';

export const useDashboardStats = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalFarmhouses: 0,
    pendingFarmhouses: 0,
    totalUsers: 0,
    totalBookings: 0,
    activeCoupons: 0,
    todayBookings: 0,
    weekBookings: 0,
    monthBookings: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const farmhousesRef = collection(db, 'farmhouses');
        const usersRef = collection(db, 'users');
        const bookingsRef = collection(db, 'bookings');
        const couponsRef = collection(db, 'coupons');

        const [
          totalFarmhouses,
          pendingFarmhouses,
          totalUsers,
          totalBookings,
          activeCoupons
        ] = await Promise.all([
          getCountFromServer(farmhousesRef),
          getCountFromServer(query(farmhousesRef, where('status', '==', 'pending_approval'))),
          getCountFromServer(usersRef),
          getCountFromServer(bookingsRef),
          getCountFromServer(query(couponsRef, where('is_active', '==', true)))
        ]);

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

        const [todayBookings, weekBookings, monthBookings] = await Promise.all([
          getCountFromServer(query(bookingsRef, where('created_at', '>=', today))),
          getCountFromServer(query(bookingsRef, where('created_at', '>=', weekAgo))),
          getCountFromServer(query(bookingsRef, where('created_at', '>=', monthAgo)))
        ]);

        setStats({
          totalFarmhouses: totalFarmhouses.data().count,
          pendingFarmhouses: pendingFarmhouses.data().count,
          totalUsers: totalUsers.data().count,
          totalBookings: totalBookings.data().count,
          activeCoupons: activeCoupons.data().count,
          todayBookings: todayBookings.data().count,
          weekBookings: weekBookings.data().count,
          monthBookings: monthBookings.data().count
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, loading };
};