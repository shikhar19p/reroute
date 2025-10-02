import React, { createContext, useContext, useMemo, useState, ReactNode } from 'react';

interface Farm {
  id: string;
  name: string;
  contactPhone1: string;
  contactPhone2: string;
  city: string;
  area: string;
  locationText: string;
  mapLink: string;
  capacity: string;
  priceWeekly: string;
  priceOccasional: string;
  priceWeekend: string;
  blockedDates: string[];
  description: string;
}

interface AdminContextType {
  farms: Farm[];
  removeFarm: (id: string) => void;
  updateFarm: (id: string, updates: Partial<Farm>) => void;
  getFarmById: (id: string) => Farm | undefined;
}

const initialFarms: Farm[] = [
  {
    id: 'farm-1',
    name: 'Green Acres Farm',
    contactPhone1: '9876543210',
    contactPhone2: '9123456780',
    city: 'Nashik',
    area: 'Trimbak Road',
    locationText: 'Near Vineyards, Nashik',
    mapLink: 'https://maps.example.com/green-acres',
    capacity: '25',
    priceWeekly: '35000',
    priceOccasional: '15000',
    priceWeekend: '22000',
    blockedDates: ['2024-09-14', '2024-09-15'],
    description: 'Spacious farmhouse with modern amenities and vineyard views.',
  },
  {
    id: 'farm-2',
    name: 'Lakeside Retreat',
    contactPhone1: '9988776655',
    contactPhone2: '',
    city: 'Pune',
    area: 'Mulshi',
    locationText: 'Lake-facing property with private dock.',
    mapLink: 'https://maps.example.com/lakeside-retreat',
    capacity: '18',
    priceWeekly: '42000',
    priceOccasional: '18000',
    priceWeekend: '26000',
    blockedDates: ['2024-09-21'],
    description: 'Cozy retreat ideal for family getaways and small events.',
  },
];

const AdminContext = createContext<AdminContextType | null>(null);

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const [farms, setFarms] = useState<Farm[]>(initialFarms);

  const removeFarm = (id: string) => {
    setFarms((prev) => prev.filter((farm) => farm.id !== id));
  };

  const updateFarm = (id: string, updates: Partial<Farm>) => {
    setFarms((prev) =>
      prev.map((farm) =>
        farm.id === id
          ? {
              ...farm,
              ...updates,
              blockedDates: Array.isArray(updates.blockedDates)
                ? updates.blockedDates
                : farm.blockedDates,
            }
          : farm
      )
    );
  };

  const getFarmById = (id: string) => farms.find((farm) => farm.id === id);

  const value = useMemo(
    () => ({ farms, removeFarm, updateFarm, getFarmById }),
    [farms]
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
