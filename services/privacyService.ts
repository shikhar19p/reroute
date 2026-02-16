/**
 * Privacy and Data Management Service
 * Implements GDPR/App Store compliance features
 */

import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { ref, listAll, deleteObject } from 'firebase/storage';
import { deleteUser } from 'firebase/auth';
import { db, storage, auth } from '../firebaseConfig';
import { logger } from '../utils/logger';

const privacyLogger = logger.child('Privacy');

export interface UserDataExport {
  profile: any;
  bookings: any[];
  reviews: any[];
  favorites: any[];
  notifications: any[];
  payments: any[];
  exportedAt: string;
}

/**
 * Export all user data (GDPR compliance)
 */
export async function exportUserData(userId: string): Promise<UserDataExport> {
  try {
    privacyLogger.info('Exporting user data', { userId });

    const [profile, bookings, reviews, favorites, notifications, payments] = await Promise.all([
      getUserProfile(userId),
      getUserBookings(userId),
      getUserReviews(userId),
      getUserFavorites(userId),
      getUserNotifications(userId),
      getUserPayments(userId),
    ]);

    const exportData: UserDataExport = {
      profile,
      bookings,
      reviews,
      favorites,
      notifications,
      payments,
      exportedAt: new Date().toISOString(),
    };

    privacyLogger.info('User data exported successfully', { userId });
    return exportData;
  } catch (error) {
    privacyLogger.error('Failed to export user data', error, { userId });
    throw new Error('Failed to export your data. Please try again or contact support.');
  }
}

/**
 * Delete all user data (Right to be forgotten)
 */
export async function deleteUserData(userId: string, password?: string): Promise<void> {
  try {
    privacyLogger.info('Starting user data deletion', { userId });

    // Verify user authentication
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.uid !== userId) {
      throw new Error('Authentication required for data deletion');
    }

    // Delete data in batches to avoid timeout
    await Promise.all([
      deleteUserBookings(userId),
      deleteUserReviews(userId),
      deleteUserFavorites(userId),
      deleteUserNotifications(userId),
      deleteUserPayments(userId),
      deleteUserStorage(userId),
    ]);

    // Delete user profile
    await deleteDoc(doc(db, 'users', userId));

    // Delete Firebase Auth account
    await deleteUser(currentUser);

    privacyLogger.info('User data deleted successfully', { userId });
  } catch (error) {
    privacyLogger.error('Failed to delete user data', error, { userId });
    throw new Error('Failed to delete your account. Please contact support.');
  }
}

/**
 * Anonymize user data (alternative to deletion for data retention requirements)
 */
export async function anonymizeUserData(userId: string): Promise<void> {
  try {
    privacyLogger.info('Anonymizing user data', { userId });

    const batch = writeBatch(db);

    // Anonymize user profile
    const userRef = doc(db, 'users', userId);
    batch.update(userRef, {
      name: 'Deleted User',
      email: `deleted_${userId}@anonymized.local`,
      phone: null,
      photoURL: null,
      anonymized: true,
      anonymizedAt: new Date().toISOString(),
    });

    // Anonymize reviews
    const reviewsQuery = query(collection(db, 'reviews'), where('userId', '==', userId));
    const reviewsSnapshot = await getDocs(reviewsQuery);
    reviewsSnapshot.docs.forEach(reviewDoc => {
      batch.update(reviewDoc.ref, {
        userName: 'Anonymous User',
        userId: 'anonymized',
      });
    });

    await batch.commit();

    privacyLogger.info('User data anonymized successfully', { userId });
  } catch (error) {
    privacyLogger.error('Failed to anonymize user data', error, { userId });
    throw error;
  }
}

// Helper functions

async function getUserProfile(userId: string): Promise<any> {
  const userDoc = await getDoc(doc(db, 'users', userId));
  return userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } : null;
}

async function getUserBookings(userId: string): Promise<any[]> {
  const q = query(collection(db, 'bookings'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getUserReviews(userId: string): Promise<any[]> {
  const q = query(collection(db, 'reviews'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getUserFavorites(userId: string): Promise<any[]> {
  const favDoc = await getDoc(doc(db, 'favorites', userId));
  return favDoc.exists() ? favDoc.data().farmhouseIds || [] : [];
}

async function getUserNotifications(userId: string): Promise<any[]> {
  const q = query(collection(db, 'notifications'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getUserPayments(userId: string): Promise<any[]> {
  const q = query(collection(db, 'payments'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function deleteUserBookings(userId: string): Promise<void> {
  const q = query(collection(db, 'bookings'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
}

async function deleteUserReviews(userId: string): Promise<void> {
  const q = query(collection(db, 'reviews'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
}

async function deleteUserFavorites(userId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'favorites', userId));
  } catch (error) {
    // Ignore if doesn't exist
  }
}

async function deleteUserNotifications(userId: string): Promise<void> {
  const q = query(collection(db, 'notifications'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
}

async function deleteUserPayments(userId: string): Promise<void> {
  const q = query(collection(db, 'payments'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
}

async function deleteUserStorage(userId: string): Promise<void> {
  try {
    const userStorageRef = ref(storage, `users/${userId}`);
    const fileList = await listAll(userStorageRef);
    
    await Promise.all(
      fileList.items.map(item => deleteObject(item))
    );
  } catch (error) {
    privacyLogger.warn('Failed to delete user storage files', { userId });
    // Don't throw - storage deletion is not critical
  }
}

/**
 * Update user privacy preferences
 */
export async function updatePrivacyPreferences(
  userId: string,
  preferences: {
    allowAnalytics?: boolean;
    allowMarketing?: boolean;
    allowNotifications?: boolean;
    dataRetentionDays?: number;
  }
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      privacyPreferences: preferences,
      privacyUpdatedAt: new Date().toISOString(),
    });
    privacyLogger.info('Privacy preferences updated', { userId });
  } catch (error) {
    privacyLogger.error('Failed to update privacy preferences', error, { userId });
    throw error;
  }
}

/**
 * Get user privacy preferences
 */
export async function getPrivacyPreferences(userId: string): Promise<any> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return userDoc.data().privacyPreferences || {
        allowAnalytics: true,
        allowMarketing: false,
        allowNotifications: true,
        dataRetentionDays: 365,
      };
    }
    return null;
  } catch (error) {
    privacyLogger.error('Failed to get privacy preferences', error, { userId });
    throw error;
  }
}
