import React, { createContext, useContext, useMemo, useState, useEffect, ReactNode } from 'react';
import {
  getPendingFarms,
  approveFarmhouse,
  rejectFarmhouse,
  deleteFarmhouse,
  Farmhouse
} from '../services/farmhouseService';

interface AdminContextType {
  farms: Farmhouse[];
  loading: boolean;
  refreshFarms: () => Promise<void>;
  approveFarm: (id: string) => Promise<void>;
  rejectFarm: (id: string) => Promise<void>;
  removeFarm: (id: string) => Promise<void>;
  getFarmById: (id: string) => Farmhouse | undefined;
}

const AdminContext = createContext<AdminContextType | null>(null);

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const [farms, setFarms] = useState<Farmhouse[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshFarms = async () => {
    try {
      setLoading(true);
      const data = await getPendingFarms();
      setFarms(data);
    } catch (error) {
      console.error('Error fetching pending farms:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshFarms();
  }, []);

  const approveFarm = async (id: string) => {
    try {
      await approveFarmhouse(id);
      await refreshFarms();
    } catch (error) {
      console.error('Error approving farm:', error);
      throw error;
    }
  };

  const rejectFarm = async (id: string) => {
    try {
      await rejectFarmhouse(id);
      await refreshFarms();
    } catch (error) {
      console.error('Error rejecting farm:', error);
      throw error;
    }
  };

  const removeFarm = async (id: string) => {
    try {
      await deleteFarmhouse(id);
      await refreshFarms();
    } catch (error) {
      console.error('Error deleting farm:', error);
      throw error;
    }
  };

  const getFarmById = (id: string) => farms.find((farm) => farm.id === id);

  const value = useMemo(
    () => ({ farms, loading, refreshFarms, approveFarm, rejectFarm, removeFarm, getFarmById }),
    [farms, loading]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
