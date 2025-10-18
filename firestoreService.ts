import { db } from './firebaseConfig';
import { collection, doc, setDoc, getDoc, query, where, getDocs } from 'firebase/firestore';

export async function registerUser(userId: string, role: 'owner' | 'customer', email: string) {
  if (!email || !userId) {
    throw new Error('Missing required fields: userId and email');
  }

  await setDoc(doc(db, 'users', userId), {
    role,
    email,
    totalBookings: 0, // Initialize totalBookings to 0
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function registerFarmhouse(ownerId: string, data: any) {
  if (!data.name || !data.location) {
    throw new Error('Missing required fields: name and location');
  }

  // Check for duplicate farmhouse names for same owner
  const q = query(
    collection(db, 'farmhouses'),
    where('ownerId', '==', ownerId),
    where('name', '==', data.name)
  );
  
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    throw new Error('Farmhouse with this name already exists for this owner');
  }

  const ref = doc(collection(db, 'farmhouses'));
  await setDoc(ref, { 
    ...data, 
    ownerId, 
    createdAt: new Date().toISOString() 
  });
  
  return ref.id;
}

export async function createBooking(userId: string, farmhouseId: string, date: string) {
  // Validate booking date is not in the past
  const bookingDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (bookingDate < today) {
    throw new Error('Cannot book dates in the past');
  }

  // Ensure farmhouse exists
  const farmhouseDoc = await getDoc(doc(db, 'farmhouses', farmhouseId));
  if (!farmhouseDoc.exists()) {
    throw new Error('Farmhouse does not exist');
  }

  const ref = doc(collection(db, 'bookings'));
  await setDoc(ref, { 
    userId, 
    farmhouseId, 
    date, 
    status: 'pending',
    createdAt: new Date().toISOString() 
  });
  
  return ref.id;
}