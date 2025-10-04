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

// Get all approved farmhouses (for users to browse)
export async function getApprovedFarmhouses(): Promise<Farmhouse[]> {
  try {
    const q = query(
      collection(db, 'farmhouses'),
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Farmhouse));
  } catch (error) {
    console.error('Error fetching approved farmhouses:', error);
    return []; // Return empty array on error so app doesn't crash
  }
}

// Get farmhouse by ID
export async function getFarmhouseById(id: string): Promise<Farmhouse | null> {
  try {
    const docRef = doc(db, 'farmhouses', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Farmhouse;
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
