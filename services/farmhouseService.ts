import {
  collection,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  serverTimestamp,
  orderBy,
  DocumentData,
  documentId,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

// This is the flat interface your application's components will use.
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
  // All 6 pricing fields
  weeklyDay: number;
  weeklyNight: number;
  occasionalDay: number;
  occasionalNight: number;
  weekendDay: number;
  weekendNight: number;
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
  ownerId: string;
  status: 'pending' | 'approved' | 'rejected';
  rating?: number;
  reviews?: number;
  bookedDates?: string[];
  blockedDates?: string[];
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  createdAt: any;
  approvedAt?: any;
}

/**
 * Transforms a nested Firestore document into the flat Farmhouse object used by the app.
 * @param docData The data from a Firestore document.
 * @param id The ID of the document.
 * @returns A flattened Farmhouse object.
 */
const transformDocToFarmhouse = (docData: DocumentData, id: string): Farmhouse => {
  const { basicDetails, pricing, photoUrls, rules, amenities, ...rest } = docData;

  return {
    id,
    // --- Basic Details ---
    name: basicDetails?.name || 'Unnamed Farmhouse',
    location: basicDetails?.locationText || `${basicDetails?.area || ''}, ${basicDetails?.city || ''}`,
    city: basicDetails?.city || '',
    area: basicDetails?.area || '',
    mapLink: basicDetails?.mapLink || '',
    bedrooms: parseInt(basicDetails?.bedrooms, 10) || 0,
    capacity: parseInt(basicDetails?.capacity, 10) || 0,
    description: basicDetails?.description || '',

    // --- Pricing (All 6 fields) ---
    weeklyDay: parseInt(pricing?.weeklyDay, 10) || 0,
    weeklyNight: parseInt(pricing?.weeklyNight, 10) || 0,
    occasionalDay: parseInt(pricing?.occasionalDay, 10) || 0,
    occasionalNight: parseInt(pricing?.occasionalNight, 10) || 0,
    weekendDay: parseInt(pricing?.weekendDay, 10) || 0,
    weekendNight: parseInt(pricing?.weekendNight, 10) || 0,
    customPricing: pricing?.customPricing?.map((p: any) => ({
      label: p.name, // Map 'name' from DB to 'label' for the UI
      price: parseInt(p.price, 10)
    })) || [],

    // --- Photos ---
    photos: photoUrls || [],

    // --- Rules ---
    rules: {
      unmarriedCouples: !rules?.unmarriedNotAllowed, // Inverted logic
      pets: !rules?.petsNotAllowed, // Inverted logic
      quietHours: !!rules?.quietHours,
    },

    // --- Amenities ---
    amenities: amenities || {},

    // --- Other top-level fields ---
    ...rest,

    // --- Set defaults for fields that may not exist in the new structure ---
    rating: docData.rating || 4.5, // Default rating
    reviews: docData.reviews || 0,
  } as Farmhouse;
};

/**
 * Gets all farmhouses with 'approved' status.
 */
export async function getApprovedFarmhouses(): Promise<Farmhouse[]> {
  try {
    const q = query(
      collection(db, 'farmhouses'),
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => transformDocToFarmhouse(doc.data(), doc.id));
  } catch (error) {
    console.error('Error fetching approved farmhouses:', error);
    return [];
  }
}

/**
 * Gets multiple farmhouses by their IDs.
 * Firestore 'in' query is limited to 30 items. This handles more by chunking.
 */
export async function getFarmhousesByIds(ids: string[]): Promise<Farmhouse[]> {
  if (!ids || ids.length === 0) {
    return [];
  }

  try {
    const farmhouses: Farmhouse[] = [];
    const chunkSize = 30; // Firestore 'in' query limit
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      
      const q = query(
        collection(db, 'farmhouses'),
        where(documentId(), 'in', chunk)
      );
      
      const snapshot = await getDocs(q);
      const chunkFarmhouses = snapshot.docs.map(doc => transformDocToFarmhouse(doc.data(), doc.id));
      farmhouses.push(...chunkFarmhouses);
    }
    return farmhouses;

  } catch (error) {
    console.error('Error fetching farmhouses by IDs:', error);
    return [];
  }
}


/**
 * Gets a single farmhouse by its ID.
 */
export async function getFarmhouseById(id: string): Promise<Farmhouse | null> {
  try {
    const docRef = doc(db, 'farmhouses', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return transformDocToFarmhouse(docSnap.data(), docSnap.id);
    }
    return null;
  } catch (error) {
    console.error('Error fetching farmhouse:', error);
    return null;
  }
}

/**
 * Gets all farmhouses with 'pending' status (for admin).
 */
export async function getPendingFarms(): Promise<Farmhouse[]> {
  try {
    const q = query(
      collection(db, 'farmhouses'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => transformDocToFarmhouse(doc.data(), doc.id));
  } catch (error) {
    console.error('Error fetching pending farms:', error);
    throw error;
  }
}

/**
 * Gets all farmhouses belonging to a specific owner.
 */
export async function getFarmhousesByOwner(ownerId: string): Promise<Farmhouse[]> {
  try {
    const q = query(
      collection(db, 'farmhouses'),
      where('ownerId', '==', ownerId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => transformDocToFarmhouse(doc.data(), doc.id));
  } catch (error) {
    console.error('Error fetching owner farmhouses:', error);
    return [];
  }
}

/**
 * Approves a farmhouse (for admin).
 */
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

/**
 * Rejects a farmhouse (for admin).
 */
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

/**
 * Deletes a farmhouse document (for admin).
 */
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

/**
 * Updates farmhouse details (for admin).
 * Note: This function would need to be expanded to handle "un-flattening" data
 * if you intend to update nested fields from a flat object.
 */
export async function updateFarmhouse(farmId: string, updates: Partial<Farmhouse>): Promise<void> {
  try {
    const farmRef = doc(db, 'farmhouses', farmId);
    // This is a simple update. For nested fields, a more complex object is needed.
    // e.g., { 'basicDetails.name': 'New Name' }
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
