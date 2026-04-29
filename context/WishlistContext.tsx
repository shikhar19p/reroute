import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../authContext';

const wishlistCacheKey = (uid: string) => `@reroute/cache/wishlist/${uid}`;

// --- Firestore Helper Functions ---

/**
 * Fetches the wishlist array for a given user from Firestore.
 * Creates a user document with an empty wishlist if one doesn't exist.
 * @param userId - The UID of the user.
 * @returns An array of farmhouse IDs.
 */
const getUserWishlist = async (userId: string): Promise<string[]> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return userSnap.data().wishlist || [];
    }
    // If user document doesn't exist, create it.
    await setDoc(userRef, { wishlist: [] });
    return [];
  } catch (error) {
    console.error("Error fetching user wishlist:", error);
    return [];
  }
};

/**
 * Adds a farmhouse ID to the user's wishlist array in Firestore.
 * @param userId - The UID of the user.
 * @param farmhouseId - The ID of the farmhouse to add.
 */
const addToUserWishlist = async (userId: string, farmhouseId: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      wishlist: arrayUnion(farmhouseId),
    });
  } catch (error) {
    // If the document doesn't exist, create it first then add.
    if ((error as any).code === 'not-found') {
      await setDoc(doc(db, 'users', userId), { wishlist: [farmhouseId] });
    } else {
      console.error("Error adding to wishlist:", error);
      throw error;
    }
  }
};

/**
 * Removes a farmhouse ID from the user's wishlist array in Firestore.
 * @param userId - The UID of the user.
 * @param farmhouseId - The ID of the farmhouse to remove.
 */
const removeFromUserWishlist = async (userId: string, farmhouseId: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      wishlist: arrayRemove(farmhouseId),
    });
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    // Don't throw error if doc doesn't exist, as it means the item isn't there anyway.
  }
};


// --- Wishlist Context ---

interface WishlistContextType {
  wishlist: string[];
  addToWishlist: (id: string) => Promise<void>;
  removeFromWishlist: (id: string) => Promise<void>;
  isInWishlist: (id: string) => boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState<string[]>([]);

  useEffect(() => {
    const loadWishlist = async () => {
      if (user) {
        // Hydrate from cache immediately so wishlist shows while offline
        try {
          const cached = await AsyncStorage.getItem(wishlistCacheKey(user.uid));
          if (cached) setWishlist(JSON.parse(cached));
        } catch {}
        const userWishlist = await getUserWishlist(user.uid);
        setWishlist(userWishlist);
        AsyncStorage.setItem(wishlistCacheKey(user.uid), JSON.stringify(userWishlist)).catch(() => {});
      } else {
        setWishlist([]);
      }
    };
    loadWishlist();
  }, [user?.uid]);

  const addToWishlist = async (id: string) => {
    if (!user) return;
    const next = [...wishlist, id];
    setWishlist(next);
    AsyncStorage.setItem(wishlistCacheKey(user.uid), JSON.stringify(next)).catch(() => {});
    try {
      await addToUserWishlist(user.uid, id);
    } catch (error) {
      console.error('Failed to add to wishlist:', error);
      const reverted = wishlist.filter(item => item !== id);
      setWishlist(reverted);
      AsyncStorage.setItem(wishlistCacheKey(user.uid), JSON.stringify(reverted)).catch(() => {});
    }
  };

  const removeFromWishlist = async (id: string) => {
    if (!user) return;
    const originalWishlist = [...wishlist];
    const next = wishlist.filter(item => item !== id);
    setWishlist(next);
    AsyncStorage.setItem(wishlistCacheKey(user.uid), JSON.stringify(next)).catch(() => {});
    try {
      await removeFromUserWishlist(user.uid, id);
    } catch (error) {
      console.error('Failed to remove from wishlist:', error);
      setWishlist(originalWishlist);
      AsyncStorage.setItem(wishlistCacheKey(user.uid), JSON.stringify(originalWishlist)).catch(() => {});
    }
  };

  const isInWishlist = (id: string) => {
    return wishlist.includes(id);
  };

  return (
    <WishlistContext.Provider value={{ wishlist, addToWishlist, removeFromWishlist, isInWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within WishlistProvider');
  }
  return context;
}