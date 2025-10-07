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
} from 'firebase/firestore';
import { Farmhouse } from '../types/navigation';

const db = getFirestore();

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
        latitude: parseFloat(match[1]),
        longitude: parseFloat(match[2]),
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
    rating: data.rating || 4.5,
    reviews: data.reviews || 10,
    photos: data.photoUrls || [],
    amenities: {
      tv: amenitiesData.tv || 0,
      geyser: amenitiesData.geyser || 0,
      bonfire: amenitiesData.bonfire > 0 ? 1 : 0,
      chess: amenitiesData.chess > 0 ? 1 : 0,
      carroms: amenitiesData.carroms > 0 ? 1 : 0,
      volleyball: amenitiesData.volleyball > 0 ? 1 : 0,
      pool: amenitiesData.pool || false,
    },
    rules: {
      unmarriedCouples: !rulesData.unmarriedNotAllowed,
      pets: !rulesData.petsNotAllowed,
      quietHours: !!rulesData.quietHours,
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
    const q = query(farmsCollection, where('status', '==', 'approved'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => convertFarmhouseData(doc.id, doc.data()));
  } catch (error) {
    console.error("Error fetching approved farmhouses:", error);
    throw error;
  }
}

// NEW FUNCTION: Fetches all farmhouses with a 'pending' status.
export async function getPendingFarms(): Promise<Farmhouse[]> {
  try {
    const farmsCollection = collection(db, 'farmhouses');
    const q = query(farmsCollection, where('status', '==', 'pending'));
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