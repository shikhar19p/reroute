/**
 * Favorites/Wishlist Service
 * Handles user's favorite farmhouses
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDocs,
  collection,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { logAuditEvent } from './auditService';

export interface UserFavorites {
  userId: string;
  farmhouseIds: string[];
  updatedAt: any;
}

/**
 * Add farmhouse to user's favorites
 */
export async function addToFavorites(userId: string, farmhouseId: string): Promise<void> {
  try {
    const favoritesRef = doc(db, 'favorites', userId);
    const favoritesSnap = await getDoc(favoritesRef);

    if (favoritesSnap.exists()) {
      // Update existing favorites
      await updateDoc(favoritesRef, {
        farmhouseIds: arrayUnion(farmhouseId),
        updatedAt: new Date().toISOString()
      });
    } else {
      // Create new favorites document
      await setDoc(favoritesRef, {
        userId,
        farmhouseIds: [farmhouseId],
        updatedAt: new Date().toISOString()
      });
    }

    // Log audit event
    await logAuditEvent('favorite_added', userId, 'farmhouse', farmhouseId);

    console.log('Added to favorites:', farmhouseId);
  } catch (error) {
    console.error('Error adding to favorites:', error);
    throw error;
  }
}

/**
 * Remove farmhouse from user's favorites
 */
export async function removeFromFavorites(userId: string, farmhouseId: string): Promise<void> {
  try {
    const favoritesRef = doc(db, 'favorites', userId);

    await updateDoc(favoritesRef, {
      farmhouseIds: arrayRemove(farmhouseId),
      updatedAt: new Date().toISOString()
    });

    // Log audit event
    await logAuditEvent('favorite_removed', userId, 'farmhouse', farmhouseId);

    console.log('Removed from favorites:', farmhouseId);
  } catch (error) {
    console.error('Error removing from favorites:', error);
    throw error;
  }
}

/**
 * Check if farmhouse is in user's favorites
 */
export async function isFavorite(userId: string, farmhouseId: string): Promise<boolean> {
  try {
    const favoritesRef = doc(db, 'favorites', userId);
    const favoritesSnap = await getDoc(favoritesRef);

    if (!favoritesSnap.exists()) {
      return false;
    }

    const data = favoritesSnap.data() as UserFavorites;
    return data.farmhouseIds.includes(farmhouseId);
  } catch (error) {
    console.error('Error checking favorite status:', error);
    return false;
  }
}

/**
 * Get user's favorite farmhouses
 */
export async function getUserFavorites(userId: string): Promise<string[]> {
  try {
    const favoritesRef = doc(db, 'favorites', userId);
    const favoritesSnap = await getDoc(favoritesRef);

    if (!favoritesSnap.exists()) {
      return [];
    }

    const data = favoritesSnap.data() as UserFavorites;
    return data.farmhouseIds || [];
  } catch (error) {
    console.error('Error fetching user favorites:', error);
    return [];
  }
}

/**
 * Get detailed farmhouse information for user's favorites
 */
export async function getUserFavoritesDetails(userId: string): Promise<any[]> {
  try {
    const favoriteIds = await getUserFavorites(userId);

    if (favoriteIds.length === 0) {
      return [];
    }

    // Fetch farmhouse details for each favorite
    // Note: For better performance with many favorites, consider batching or pagination
    const farmhouses = await Promise.all(
      favoriteIds.map(async (farmhouseId) => {
        try {
          const farmhouseRef = doc(db, 'farmhouses', farmhouseId);
          const farmhouseSnap = await getDoc(farmhouseRef);

          if (farmhouseSnap.exists()) {
            return {
              id: farmhouseSnap.id,
              ...farmhouseSnap.data()
            };
          }
          return null;
        } catch (error) {
          console.error(`Error fetching farmhouse ${farmhouseId}:`, error);
          return null;
        }
      })
    );

    // Filter out null values (farmhouses that don't exist)
    return farmhouses.filter(farmhouse => farmhouse !== null);
  } catch (error) {
    console.error('Error fetching favorites details:', error);
    return [];
  }
}

/**
 * Get count of users who favorited a farmhouse
 */
export async function getFavoritesCount(farmhouseId: string): Promise<number> {
  try {
    const q = query(
      collection(db, 'favorites'),
      where('farmhouseIds', 'array-contains', farmhouseId)
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Error fetching favorites count:', error);
    return 0;
  }
}

/**
 * Toggle favorite status (add if not favorite, remove if favorite)
 */
export async function toggleFavorite(userId: string, farmhouseId: string): Promise<boolean> {
  try {
    const isFav = await isFavorite(userId, farmhouseId);

    if (isFav) {
      await removeFromFavorites(userId, farmhouseId);
      return false;
    } else {
      await addToFavorites(userId, farmhouseId);
      return true;
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    throw error;
  }
}

/**
 * Clear all favorites for a user
 */
export async function clearAllFavorites(userId: string): Promise<void> {
  try {
    const favoritesRef = doc(db, 'favorites', userId);
    await updateDoc(favoritesRef, {
      farmhouseIds: [],
      updatedAt: new Date().toISOString()
    });

    console.log('Cleared all favorites for user:', userId);
  } catch (error) {
    console.error('Error clearing favorites:', error);
    throw error;
  }
}
