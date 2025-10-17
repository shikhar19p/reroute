import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  serverTimestamp,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

// Simple cache implementation for approved farmhouses
let approvedFarmhousesCache: { data: Farmhouse[]; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Cache for individual farmhouse details
const farmhouseDetailsCache: Map<string, { data: Farmhouse; timestamp: number }> = new Map();

export interface Farmhouse {
  id: string;
  name: string;
  location: string;
  city: string;
  area: string;
  mapLink: string;
  bedrooms: number;
  capacity: number;
  description: string;
  price: number;
  weekendPrice: number;
  customPricing?: Array<{ label: string; price: number }>;
  photos: string[];
  amenities: {
    tv: number;
    geyser: number;
    bonfire: number;
    chess: number;
    carroms: number;
    volleyball: number;
    pool: boolean;
  };
  rules: {
    unmarriedCouples: boolean;
    pets: boolean;
    quietHours: boolean;
  };
  kyc: {
    aadhaarFront: string;
    aadhaarBack: string;
    panCard: string;
    labourLicense: string;
    bankAccountHolder: string;
    bankAccountNumber: string;
    ifscCode: string;
    branch: string;
  };
  ownerId: string;
  ownerEmail: string;
  status: 'pending' | 'approved' | 'rejected';
  rating?: number;
  reviews?: number;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  createdAt: any;
  approvedAt?: any;
}

// Save farm registration (status: pending)
export async function saveFarmRegistration(farmData: Omit<Farmhouse, 'id' | 'createdAt' | 'status'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'farmhouses'), {
      ...farmData,
      status: 'pending',
      rating: 0,
      reviews: 0,
      createdAt: serverTimestamp(),
    });

    // Clear cache when new farmhouse is added
    clearFarmhousesCache();

    console.log('Farm saved successfully with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error saving farm:', error);
    throw error;
  }
}

// Get all pending farms (for admin)
export async function getPendingFarms(): Promise<Farmhouse[]> {
  try {
    const q = query(
      collection(db, 'farmhouses'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Farmhouse));
  } catch (error) {
    console.error('Error fetching pending farms:', error);
    throw error;
  }
}

// Mock data for testing UI
const MOCK_FARMHOUSES: Farmhouse[] = [
  {
    id: 'mock-1',
    name: 'Green Valley Farmhouse',
    location: 'Bangalore Rural, Karnataka',
    city: 'Bangalore',
    area: 'Devanahalli',
    mapLink: 'https://maps.google.com',
    bedrooms: 4,
    capacity: 15,
    description: 'Beautiful farmhouse with lush greenery and modern amenities',
    price: 8000,
    weekendPrice: 12000,
    photos: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800'],
    amenities: { tv: 2, geyser: 3, bonfire: 1, chess: 1, carroms: 1, volleyball: 1, pool: true },
    rules: { unmarriedCouples: true, pets: true, quietHours: false },
    kyc: { aadhaarFront: '', aadhaarBack: '', panCard: '', labourLicense: '', bankAccountHolder: '', bankAccountNumber: '', ifscCode: '', branch: '' },
    ownerId: 'owner1',
    ownerEmail: 'owner@example.com',
    status: 'approved' as const,
    rating: 4.5,
    reviews: 28,
    coordinates: { latitude: 13.2464, longitude: 77.7106 },
    createdAt: new Date(),
  },
  {
    id: 'mock-2',
    name: 'Serene Hills Resort',
    location: 'Chikmagalur, Karnataka',
    city: 'Chikmagalur',
    area: 'Mullayangiri',
    mapLink: 'https://maps.google.com',
    bedrooms: 6,
    capacity: 20,
    description: 'Luxurious resort in the hills with breathtaking views',
    price: 15000,
    weekendPrice: 20000,
    photos: ['https://images.unsplash.com/photo-1602343168117-bb8ffe3e2e9f?w=800'],
    amenities: { tv: 3, geyser: 4, bonfire: 2, chess: 2, carroms: 2, volleyball: 1, pool: true },
    rules: { unmarriedCouples: true, pets: false, quietHours: true },
    kyc: { aadhaarFront: '', aadhaarBack: '', panCard: '', labourLicense: '', bankAccountHolder: '', bankAccountNumber: '', ifscCode: '', branch: '' },
    ownerId: 'owner2',
    ownerEmail: 'owner2@example.com',
    status: 'approved' as const,
    rating: 4.8,
    reviews: 42,
    coordinates: { latitude: 13.3888, longitude: 75.7198 },
    createdAt: new Date(),
  },
  {
    id: 'mock-3',
    name: 'Sunset Paradise Villa',
    location: 'Coorg, Karnataka',
    city: 'Coorg',
    area: 'Madikeri',
    mapLink: 'https://maps.google.com',
    bedrooms: 5,
    capacity: 18,
    description: 'Premium villa with coffee plantation views',
    price: 12000,
    weekendPrice: 18000,
    photos: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'],
    amenities: { tv: 2, geyser: 3, bonfire: 1, chess: 1, carroms: 1, volleyball: 1, pool: false },
    rules: { unmarriedCouples: true, pets: true, quietHours: false },
    kyc: { aadhaarFront: '', aadhaarBack: '', panCard: '', labourLicense: '', bankAccountHolder: '', bankAccountNumber: '', ifscCode: '', branch: '' },
    ownerId: 'owner3',
    ownerEmail: 'owner3@example.com',
    status: 'approved' as const,
    rating: 4.6,
    reviews: 35,
    coordinates: { latitude: 12.4244, longitude: 75.7382 },
    createdAt: new Date(),
  },
];

// Clear cache (useful after adding/updating farmhouses)
export function clearFarmhousesCache(): void {
  approvedFarmhousesCache = null;
  farmhouseDetailsCache.clear();
  console.log('Farmhouse cache cleared');
}

// Get all approved farmhouses (for users to browse) with caching
export async function getApprovedFarmhouses(forceRefresh = false): Promise<Farmhouse[]> {
  try {
    // Check cache first
    if (!forceRefresh && approvedFarmhousesCache) {
      const now = Date.now();
      const cacheAge = now - approvedFarmhousesCache.timestamp;

      if (cacheAge < CACHE_DURATION) {
        console.log('Returning cached approved farmhouses');
        return approvedFarmhousesCache.data;
      }
    }

    console.log('Fetching fresh approved farmhouses from Firebase');
    const q = query(
      collection(db, 'farmhouses'),
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const farmhouses = snapshot.docs.map(doc => {
      const data = doc.data();

      // Normalize data structure for compatibility with UI
      return {
        id: doc.id,
        // Handle both new format (basicDetails) and old format (direct fields)
        name: data.basicDetails?.name || data.name,
        location: data.basicDetails?.city || data.location || data.city,
        city: data.basicDetails?.city || data.city,
        area: data.basicDetails?.area || data.area,
        mapLink: data.basicDetails?.mapLink || data.mapLink,
        bedrooms: data.basicDetails?.bedrooms || data.bedrooms || 0,
        capacity: data.basicDetails?.capacity || data.capacity,
        description: data.basicDetails?.description || data.description,
        // Pricing - handle both formats
        price: data.pricing?.weeklyDay || data.price,
        weekendPrice: data.pricing?.weekendDay || data.weekendPrice,
        customPricing: data.pricing?.customPricing || data.customPricing || [],
        // Photos - handle both photoUrls (new) and photos (old)
        photos: data.photoUrls || data.photos || [],
        photoUrls: data.photoUrls || data.photos || [],
        // Other fields
        amenities: data.amenities || {},
        rules: data.rules || {},
        kyc: data.kyc || {},
        ownerId: data.ownerId,
        ownerEmail: data.ownerEmail || '',
        status: data.status,
        rating: data.rating || 0,
        reviews: data.reviews || 0,
        coordinates: data.coordinates || null,
        createdAt: data.createdAt,
        approvedAt: data.approvedAt,
      } as Farmhouse;
    });

    // If no farmhouses found, return mock data for testing
    if (farmhouses.length === 0) {
      console.log('No approved farmhouses found, returning mock data');
      return MOCK_FARMHOUSES;
    }

    // Update cache
    approvedFarmhousesCache = {
      data: farmhouses,
      timestamp: Date.now()
    };

    return farmhouses;
  } catch (error) {
    console.error('Error fetching approved farmhouses:', error);
    // Return mock data on error so UI can be tested
    return MOCK_FARMHOUSES;
  }
}

// Get farmhouse by ID with caching
export async function getFarmhouseById(id: string, forceRefresh = false): Promise<Farmhouse | null> {
  try {
    // Check cache first
    if (!forceRefresh && farmhouseDetailsCache.has(id)) {
      const cached = farmhouseDetailsCache.get(id)!;
      const now = Date.now();
      const cacheAge = now - cached.timestamp;

      if (cacheAge < CACHE_DURATION) {
        console.log(`Returning cached farmhouse details for ${id}`);
        return cached.data;
      }
    }

    console.log(`Fetching fresh farmhouse details for ${id}`);
    const docRef = doc(db, 'farmhouses', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();

      // Normalize data structure for compatibility with UI
      const farmhouse = {
        id: docSnap.id,
        // Handle both new format (basicDetails) and old format (direct fields)
        name: data.basicDetails?.name || data.name,
        location: data.basicDetails?.city || data.location || data.city,
        city: data.basicDetails?.city || data.city,
        area: data.basicDetails?.area || data.area,
        mapLink: data.basicDetails?.mapLink || data.mapLink,
        bedrooms: data.basicDetails?.bedrooms || data.bedrooms || 0,
        capacity: data.basicDetails?.capacity || data.capacity,
        description: data.basicDetails?.description || data.description,
        // Pricing - handle both formats
        price: data.pricing?.weeklyDay || data.price,
        weekendPrice: data.pricing?.weekendDay || data.weekendPrice,
        customPricing: data.pricing?.customPricing || data.customPricing || [],
        // Photos - handle both photoUrls (new) and photos (old)
        photos: data.photoUrls || data.photos || [],
        photoUrls: data.photoUrls || data.photos || [],
        // Other fields
        amenities: data.amenities || {},
        rules: data.rules || {},
        kyc: data.kyc || {},
        ownerId: data.ownerId,
        ownerEmail: data.ownerEmail || '',
        status: data.status,
        rating: data.rating || 0,
        reviews: data.reviews || 0,
        coordinates: data.coordinates || null,
        createdAt: data.createdAt,
        approvedAt: data.approvedAt,
      } as Farmhouse;

      // Update cache
      farmhouseDetailsCache.set(id, {
        data: farmhouse,
        timestamp: Date.now()
      });

      return farmhouse;
    }
    return null;
  } catch (error) {
    console.error('Error fetching farmhouse:', error);
    return null;
  }
}

// Admin: Approve farmhouse
export async function approveFarmhouse(farmId: string): Promise<void> {
  try {
    const farmRef = doc(db, 'farmhouses', farmId);
    await updateDoc(farmRef, {
      status: 'approved',
      approvedAt: serverTimestamp()
    });
    // Clear cache when farmhouse is approved
    clearFarmhousesCache();
    console.log('Farmhouse approved:', farmId);
  } catch (error) {
    console.error('Error approving farmhouse:', error);
    throw error;
  }
}

// Admin: Reject farmhouse
export async function rejectFarmhouse(farmId: string): Promise<void> {
  try {
    const farmRef = doc(db, 'farmhouses', farmId);
    await updateDoc(farmRef, {
      status: 'rejected'
    });
    // Clear cache when farmhouse is rejected
    clearFarmhousesCache();
    console.log('Farmhouse rejected:', farmId);
  } catch (error) {
    console.error('Error rejecting farmhouse:', error);
    throw error;
  }
}

// Admin: Delete farmhouse
export async function deleteFarmhouse(farmId: string): Promise<void> {
  try {
    const farmRef = doc(db, 'farmhouses', farmId);
    await deleteDoc(farmRef);
    // Clear cache when farmhouse is deleted
    clearFarmhousesCache();
    console.log('Farmhouse deleted:', farmId);
  } catch (error) {
    console.error('Error deleting farmhouse:', error);
    throw error;
  }
}

// Admin: Update farmhouse details
export async function updateFarmhouse(farmId: string, updates: Partial<Farmhouse>): Promise<void> {
  try {
    const farmRef = doc(db, 'farmhouses', farmId);
    await updateDoc(farmRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    // Clear cache when farmhouse is updated
    clearFarmhousesCache();
    console.log('Farmhouse updated:', farmId);
  } catch (error) {
    console.error('Error updating farmhouse:', error);
    throw error;
  }
}

// Get farmhouses by owner
export async function getFarmhousesByOwner(ownerId: string): Promise<Farmhouse[]> {
  try {
    const q = query(
      collection(db, 'farmhouses'),
      where('ownerId', '==', ownerId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Farmhouse));
  } catch (error) {
    console.error('Error fetching owner farmhouses:', error);
    return [];
  }
}

// Check if owner has any farmhouses
export async function ownerHasFarmhouses(ownerId: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, 'farmhouses'),
      where('ownerId', '==', ownerId)
    );

    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking owner farmhouses:', error);
    return false;
  }
}
