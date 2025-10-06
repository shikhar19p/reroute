import React, { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';

interface Photo {
  uri: string;
  width: number;
  height: number;
  size: number;
}

interface Amenities {
  tv: number;
  geyser: number;
  bonfire: number;
  pool: boolean;
  chess: number;
  carroms: number;
  volleyball: number;
  customAmenities: string;
}

interface Rules {
  unmarriedNotAllowed: boolean;
  petsNotAllowed: boolean;
  quietHours: string;
  customRules: string;
}

interface FileData {
  uri: string;
  name?: string;
  mimeType?: string;
  size?: number;
}

interface Person {
  name: string;
  phone: string;
  aadhaarNumber: string;
  aadhaarFront: FileData | null;
  aadhaarBack: FileData | null;
}

interface BankDetails {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
}

interface KYC {
  person1: Person;
  person2: Person;
  panNumber: string;
  companyPAN: FileData | null;
  labourDoc: FileData | null;
  bankDetails: BankDetails;
  agreedToTerms: boolean;
}

interface CustomPricing {
  name: string;
  price: string;
}

interface Pricing {
  weeklyDay: string;
  weeklyNight: string;
  weekendDay: string;
  weekendNight: string;
  customPricing: CustomPricing[];
}

interface Farm {
  name: string;
  contactPhone1: string;
  contactPhone2: string;
  city: string;
  area: string;
  locationText: string;
  mapLink: string;
  bedrooms: string;
  capacity: string;
  description: string;
  pricing: Pricing;
  photos: Photo[];
  amenities: Amenities;
  rules: Rules;
  kyc: KYC;
}

interface FarmRegistrationContextType {
  farm: Farm;
  setFarm: React.Dispatch<React.SetStateAction<Farm>>;
  resetFarm: () => void;
  setField: (path: string | string[], newValue: any) => void;
  addPhoto: (item: Photo) => void;
  removePhoto: (index: number) => void;
  incAmenity: (key: string) => void;
  decAmenity: (key: string) => void;
}

const createInitialFarm = (): Farm => ({
  name: '',
  contactPhone1: '',
  contactPhone2: '',
  city: '',
  area: '',
  locationText: '',
  mapLink: '',
  bedrooms: '',
  capacity: '',
  description: '',
  pricing: {
    weeklyDay: '',
    weeklyNight: '',
    weekendDay: '',
    weekendNight: '',
    customPricing: [],
  },
  photos: [],
  amenities: {
    tv: 0,
    geyser: 0,
    bonfire: 0,
    pool: false,
    chess: 0,
    carroms: 0,
    volleyball: 0,
    customAmenities: '',
  },
  rules: {
    unmarriedNotAllowed: false,
    petsNotAllowed: false,
    quietHours: '',
    customRules: '',
  },
  kyc: {
    person1: {
      name: '',
      phone: '',
      aadhaarNumber: '',
      aadhaarFront: null,
      aadhaarBack: null,
    },
    person2: {
      name: '',
      phone: '',
      aadhaarNumber: '',
      aadhaarFront: null,
      aadhaarBack: null,
    },
    panNumber: '',
    companyPAN: null,
    labourDoc: null,
    bankDetails: {
      accountHolderName: '',
      accountNumber: '',
      ifscCode: '',
      branchName: '',
    },
    agreedToTerms: false,
  },
});

const FarmRegistrationContext = createContext<FarmRegistrationContextType | null>(null);

const cloneForPathSegment = (value: any): any => {
  if (Array.isArray(value)) {
    return [...value];
  }

  if (value && typeof value === 'object') {
    return { ...value };
  }

  return {};
};

export const FarmRegistrationProvider = ({ children }: { children: ReactNode }) => {
  const [farm, setFarm] = useState<Farm>(createInitialFarm);

  const resetFarm = useCallback(() => {
    setFarm(createInitialFarm());
  }, []);

  const setField = useCallback((path: string | string[], newValue: any) => {
    if (!path) {
      return;
    }

    const segments = Array.isArray(path) ? path : String(path).split('.');

    setFarm((prev) => {
      const updated = { ...prev };
      let current: any = updated;

      for (let i = 0; i < segments.length - 1; i += 1) {
        const key = segments[i];
        current[key] = cloneForPathSegment(current[key]);
        current = current[key];
      }

      current[segments[segments.length - 1]] = newValue;
      return updated;
    });
  }, []);

  const addPhoto = useCallback((item: Photo) => {
    if (!item) {
      return;
    }

    setFarm((prev) => ({
      ...prev,
      photos: [...prev.photos, item],
    }));
  }, []);

  const removePhoto = useCallback((index: number) => {
    setFarm((prev) => {
      if (index < 0 || index >= prev.photos.length) {
        return prev;
      }

      const photos = prev.photos.filter((_, idx) => idx !== index);

      return {
        ...prev,
        photos,
      };
    });
  }, []);

  const incAmenity = useCallback((key: string) => {
    if (!key) {
      return;
    }

    setFarm((prev) => ({
      ...prev,
      amenities: {
        ...prev.amenities,
        [key]: ((prev.amenities as any)[key] || 0) + 1,
      },
    }));
  }, []);

  const decAmenity = useCallback((key: string) => {
    if (!key) {
      return;
    }

    setFarm((prev) => ({
      ...prev,
      amenities: {
        ...prev.amenities,
        [key]: Math.max(((prev.amenities as any)[key] || 0) - 1, 0),
      },
    }));
  }, []);

  const value = useMemo(
    () => ({ farm, setFarm, resetFarm, setField, addPhoto, removePhoto, incAmenity, decAmenity }),
    [farm, resetFarm, setField, addPhoto, removePhoto, incAmenity, decAmenity]
  );

  return (
    <FarmRegistrationContext.Provider value={value}>
      {children}
    </FarmRegistrationContext.Provider>
  );
};

export const useFarmRegistration = () => {
  const context = useContext(FarmRegistrationContext);
  if (!context) {
    throw new Error('useFarmRegistration must be used within a FarmRegistrationProvider');
  }

  return context;
};

export const getInitialFarm = () => createInitialFarm();
