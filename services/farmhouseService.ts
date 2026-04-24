import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  orderBy,
  DocumentData,
  documentId,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Farmhouse } from '../types/navigation';
export type { Farmhouse };

// Helper function to convert a string to Title Case
const toTitleCase = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Converts the raw Firestore farmhouse document into the Farmhouse type used by the app
export const convertFarmhouseData = (id: string, data: any): Farmhouse => {
  const basicDetails = data.basicDetails || {};
  const pricing = data.pricing || {};
  const amenitiesData = data.amenities || {};
  const rulesData = data.rules || {};

  // Extract coordinates from Google Maps link
  let coordinates = undefined;
  if (basicDetails.mapLink) {
    const match = basicDetails.mapLink.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match) {
      coordinates = {
        lat: parseFloat(match[1]),
        lng: parseFloat(match[2]),
      };
    }
  }

  return {
    id,
    name: toTitleCase(basicDetails.name || 'Unnamed Farmhouse'),
    location: toTitleCase(basicDetails.area || 'Unknown Location'),
    city: toTitleCase(basicDetails.city || 'Unknown City'),
    area: toTitleCase(basicDetails.area || 'Unknown Area'),
    description: basicDetails.description || 'No description available.',
    weeklyNight: parseInt(pricing.weeklyNight, 10) || 0,
    weekendNight: parseInt(pricing.weekendNight, 10) || 0,
    weeklyDay: parseInt(pricing.weeklyDay, 10) || 0,
    weekendDay: parseInt(pricing.weekendDay, 10) || 0,
    occasionalDay: parseInt(pricing.occasionalDay, 10) || 0,
    occasionalNight: parseInt(pricing.occasionalNight, 10) || 0,
    capacity: parseInt(basicDetails.capacity, 10) || 1,
    bedrooms: parseInt(basicDetails.bedrooms, 10) || 1,
    rating: data.rating ?? 0,
    reviews: data.reviews || 0,
    photos: data.photoUrls || [],
    amenities: {
      tv: amenitiesData.tv || 0,
      geyser: amenitiesData.geyser || 0,
      bonfire: amenitiesData.bonfire > 0 ? 1 : 0,
      chess: amenitiesData.chess > 0 ? 1 : 0,
      carroms: amenitiesData.carroms > 0 ? 1 : 0,
      volleyball: amenitiesData.volleyball > 0 ? 1 : 0,
      pool: amenitiesData.pool || false,
      wifi: amenitiesData.wifi || false,
      ac: amenitiesData.ac || false,
      parking: amenitiesData.parking || false,
      kitchen: amenitiesData.kitchen || false,
      bbq: amenitiesData.bbq || false,
      outdoorSeating: amenitiesData.outdoorSeating || false,
      hotTub: amenitiesData.hotTub || false,
      djMusicSystem: amenitiesData.djMusicSystem || false,
      projector: amenitiesData.projector || false,
      restaurant: amenitiesData.restaurant || false,
      foodPrepOnDemand: amenitiesData.foodPrepOnDemand || false,
      decorService: amenitiesData.decorService || false,
      badminton: amenitiesData.badminton || false,
      tableTennis: amenitiesData.tableTennis || false,
      cricket: amenitiesData.cricket || false,
      additionalAmenities: amenitiesData.additionalAmenities || amenitiesData.customAmenities || '',
    },
    rules: {
      pets: !rulesData.petsNotAllowed,
    },
    customPricing: (pricing.customPricing || []).map((p: any) => ({
      label: p.name,
      price: parseInt(p.price, 10),
    })),
    bookedDates: data.bookedDates || [],
    blockedDates: data.blockedDates || [],
    mapLink: basicDetails.mapLink || '',
    coordinates: coordinates,
    extraGuestPrice: parseInt(pricing.extraGuestPrice, 10) || 500,
    ownerId: data.ownerId || '',
    status: data.status || 'pending',
    createdAt: data.createdAt || null,
    approvedAt: data.approvedAt || null,
  };
};

// Fetch all approved farmhouses
export async function getApprovedFarmhouses(): Promise<Farmhouse[]> {
  try {
    const farmsCollection = collection(db, 'farmhouses');
    const q = query(
      farmsCollection,
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => convertFarmhouseData(doc.id, doc.data()));
  } catch (error) {
    console.error("Error fetching approved farmhouses:", error);
    throw error;
  }
}

// Fetches all farmhouses with a 'pending' status
export async function getPendingFarms(): Promise<Farmhouse[]> {
  try {
    const farmsCollection = collection(db, 'farmhouses');
    const q = query(
      farmsCollection,
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => convertFarmhouseData(doc.id, doc.data()));
  } catch (error) {
    console.error("Error fetching pending farms:", error);
    throw error;
  }
}

// Fetch a single farmhouse by its ID
export async function getFarmhouseById(farmhouseId: string): Promise<Farmhouse | null> {
  if (!farmhouseId) return null;
  try {
    const farmhouseRef = doc(db, 'farmhouses', farmhouseId);
    const docSnap = await getDoc(farmhouseRef);

    if (docSnap.exists()) {
      return convertFarmhouseData(docSnap.id, docSnap.data());
    } else {
      console.warn(`No farmhouse found with ID: ${farmhouseId}`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching farmhouse by ID (${farmhouseId}):`, error);
    throw error;
  }
}

// Gets multiple farmhouses by their IDs
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
      const chunkFarmhouses = snapshot.docs.map(doc => convertFarmhouseData(doc.id, doc.data()));
      farmhouses.push(...chunkFarmhouses);
    }
    return farmhouses;
  } catch (error) {
    console.error('Error fetching farmhouses by IDs:', error);
    return [];
  }
}

// Gets all farmhouses belonging to a specific owner
export async function getFarmhousesByOwner(ownerId: string): Promise<Farmhouse[]> {
  try {
    const q = query(
      collection(db, 'farmhouses'),
      where('ownerId', '==', ownerId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => convertFarmhouseData(doc.id, doc.data()));
  } catch (error) {
    console.error('Error fetching owner farmhouses:', error);
    return [];
  }
}

// Checks if an owner has any farmhouses
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

// Adds dates to a farmhouse's 'bookedDates' array
export async function addBookedDatesToFarmhouse(farmhouseId: string, dates: string[]): Promise<void> {
  if (!farmhouseId || !dates || dates.length === 0) return;
  try {
    const farmhouseRef = doc(db, 'farmhouses', farmhouseId);
    await updateDoc(farmhouseRef, {
      bookedDates: arrayUnion(...dates),
    });
  } catch (error) {
    console.error("Error adding booked dates:", error);
    throw error;
  }
}

// Removes dates from a farmhouse's 'bookedDates' array
export async function removeBookedDatesFromFarmhouse(farmhouseId: string, dates: string[]): Promise<void> {
  if (!farmhouseId || !dates || dates.length === 0) return;
  try {
    const farmhouseRef = doc(db, 'farmhouses', farmhouseId);
    await updateDoc(farmhouseRef, {
      bookedDates: arrayRemove(...dates),
    });
  } catch (error) {
    console.error("Error removing booked dates:", error);
    throw error;
  }
}

// Approves a farmhouse (for admin)
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

// Rejects a farmhouse (for admin)
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

// Deletes a farmhouse document (for admin)
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

// Updates farmhouse details (for admin)
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