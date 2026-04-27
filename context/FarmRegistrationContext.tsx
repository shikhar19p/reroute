import React, { createContext, useCallback, useContext, useMemo, useState, ReactNode, useEffect } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '../authContext';

// Platform-aware key-value storage for draft persistence
async function storageGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  return AsyncStorage.getItem(key);
}
async function storageSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { localStorage.setItem(key, value); } catch {}
    return;
  }
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  await AsyncStorage.setItem(key, value);
}
async function storageRemove(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { localStorage.removeItem(key); } catch {}
    return;
  }
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  await AsyncStorage.removeItem(key);
}

interface Photo {
  uri: string;
  width: number;
  height: number;
  size: number;
}

interface Amenities {
  // Essentials
  wifi: boolean;
  ac: boolean;
  parking: boolean;
  kitchen: boolean;
  tv: boolean;
  geyser: boolean;
  // Outdoors
  pool: boolean;
  bonfire: boolean;
  bbq: boolean;
  outdoorSeating: boolean;
  hotTub: boolean;
  // Entertainment
  djMusicSystem: boolean;
  projector: boolean;
  // Food & Services
  restaurant: boolean;
  foodPrepOnDemand: boolean;
  decorService: boolean;
  // Games & Sports
  chess: boolean;
  carrom: boolean;
  volleyball: boolean;
  badminton: boolean;
  tableTennis: boolean;
  cricket: boolean;
  // Additional
  customAmenities: string;
}

interface Rules {
  petsNotAllowed: boolean;
  alcoholNotAllowed: boolean;
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
  panCard: string;
  idProofType: 'driving_license' | 'passport' | 'voter_id';
  idProofNumber: string;
  idProofFront: FileData | null;
  idProofBack: FileData | null;
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
  propertyType: 'farmhouse' | 'resort';
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
  resetFarm: () => Promise<void>;
  setField: (path: string | string[], newValue: any) => void;
  addPhoto: (item: Photo) => void;
  removePhoto: (index: number) => void;
  incAmenity: (key: string) => void;
  decAmenity: (key: string) => void;
  saveDraft: () => Promise<void>;
  loadDraft: () => Promise<boolean>;
  clearDraft: () => Promise<void>;
  hasDraft: boolean;
}

const createInitialFarm = (): Farm => ({
  propertyType: 'farmhouse',
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
    wifi: false,
    ac: false,
    parking: false,
    kitchen: false,
    tv: false,
    geyser: false,
    pool: false,
    bonfire: false,
    bbq: false,
    outdoorSeating: false,
    hotTub: false,
    djMusicSystem: false,
    projector: false,
    restaurant: false,
    foodPrepOnDemand: false,
    decorService: false,
    chess: false,
    carrom: false,
    volleyball: false,
    badminton: false,
    tableTennis: false,
    cricket: false,
    customAmenities: '',
  },
  rules: {
    petsNotAllowed: false,
    alcoholNotAllowed: false,
    customRules: '',
  },
  kyc: {
    person1: {
      name: '',
      phone: '',
      panCard: '',
      idProofType: 'driving_license',
      idProofNumber: '',
      idProofFront: null,
      idProofBack: null,
    },
    person2: {
      name: '',
      phone: '',
      panCard: '',
      idProofType: 'driving_license',
      idProofNumber: '',
      idProofFront: null,
      idProofBack: null,
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

const DRAFT_STORAGE_KEY = 'farm_registration_draft';

export const FarmRegistrationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [farm, setFarm] = useState<Farm>(createInitialFarm);
  const [hasDraft, setHasDraft] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Get user-specific draft key
  const getDraftKey = useCallback(() => {
    return user?.uid ? `${DRAFT_STORAGE_KEY}_${user.uid}` : DRAFT_STORAGE_KEY;
  }, [user?.uid]);

  // Save draft to AsyncStorage
  const saveDraft = useCallback(async () => {
    try {
      const draftKey = getDraftKey();
      // Only save if there's meaningful data (not just initial empty state)
      const hasData = farm.name || farm.contactPhone1 || farm.city || farm.area || farm.photos.length > 0;

      if (hasData) {
        await storageSet(draftKey, JSON.stringify(farm));
        setHasDraft(true);
      }
    } catch (error) {
      console.warn('Error saving draft:', error);
    }
  }, [farm, getDraftKey]);

  // Load draft from AsyncStorage
  const loadDraft = useCallback(async (): Promise<boolean> => {
    try {
      const draftKey = getDraftKey();
      const draftData = await storageGet(draftKey);

      if (draftData) {
        const parsedDraft = JSON.parse(draftData);
        // Validate parsed draft has expected structure
        if (parsedDraft && typeof parsedDraft === 'object' && 'kyc' in parsedDraft) {
          setFarm(parsedDraft);
          setHasDraft(true);
          return true;
        }
        // Corrupted draft - clear it
        await storageRemove(draftKey);
        setHasDraft(false);
        return false;
      }
      return false;
    } catch (error) {
      console.warn('Error loading draft:', error);
      return false;
    }
  }, [getDraftKey]);

  // Clear draft from AsyncStorage
  const clearDraft = useCallback(async () => {
    try {
      const draftKey = getDraftKey();
      await storageRemove(draftKey);
      setHasDraft(false);
    } catch (error) {
      console.warn('Error clearing draft:', error);
    }
  }, [getDraftKey]);

  // Check for draft on mount
  useEffect(() => {
    const checkForDraft = async () => {
      try {
        const draftKey = getDraftKey();
        const draftData = await storageGet(draftKey);
        setHasDraft(!!draftData);
        setIsInitialized(true);
      } catch (error) {
        console.warn('Error checking for draft:', error);
        setIsInitialized(true);
      }
    };

    if (user) {
      checkForDraft();
    } else {
      setIsInitialized(true);
    }
  }, [user, getDraftKey]);

  // Auto-save draft when farm data changes (debounced).
  // Only save when there is actual user-entered data — avoids spurious draft detection on fresh mount.
  useEffect(() => {
    if (!isInitialized) return;
    const hasData = farm.name.trim() || farm.contactPhone1.trim() || farm.city.trim();
    if (!hasData) return;

    const timeoutId = setTimeout(() => {
      saveDraft();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [farm, saveDraft, isInitialized]);

  const resetFarm = useCallback(async () => {
    setFarm(createInitialFarm());
    await clearDraft();
  }, [clearDraft]);

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
    () => ({
      farm,
      setFarm,
      resetFarm,
      setField,
      addPhoto,
      removePhoto,
      incAmenity,
      decAmenity,
      saveDraft,
      loadDraft,
      clearDraft,
      hasDraft,
    }),
    [farm, resetFarm, setField, addPhoto, removePhoto, incAmenity, decAmenity, saveDraft, loadDraft, clearDraft, hasDraft]
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

