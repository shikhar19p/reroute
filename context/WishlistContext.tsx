import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '../authContext';
import {
  getUserFavorites,
  addToFavorites,
  removeFromFavorites,
  toggleFavorite as toggleFavoriteService
} from '../services/favoriteService';

interface WishlistContextType {
  wishlist: string[];
  addToWishlist: (id: string) => Promise<void>;
  removeFromWishlist: (id: string) => Promise<void>;
  toggleWishlist: (id: string) => Promise<boolean>;
  isInWishlist: (id: string) => boolean;
  loading: boolean;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Get auth context - this hook must always be called
  const authContext = useAuth();
  const user = authContext?.user || null;

  // Load wishlist from Firebase when user logs in
  useEffect(() => {
    if (user?.uid) {
      loadWishlist();
    } else {
      setWishlist([]);
      setLoading(false);
    }
  }, [user?.uid]);

  const loadWishlist = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      const favorites = await getUserFavorites(user.uid);
      setWishlist(favorites);
    } catch (error) {
      console.error('Error loading wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshWishlist = async () => {
    await loadWishlist();
  };

  const addToWishlist = async (id: string) => {
    if (!user?.uid) {
      console.warn('User not authenticated');
      return;
    }

    // Optimistic update
    setWishlist(prev => [...prev, id]);

    try {
      await addToFavorites(user.uid, id);
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      // Rollback on error
      setWishlist(prev => prev.filter(item => item !== id));
      throw error;
    }
  };

  const removeFromWishlist = async (id: string) => {
    if (!user?.uid) {
      console.warn('User not authenticated');
      return;
    }

    // Optimistic update
    setWishlist(prev => prev.filter(item => item !== id));

    try {
      await removeFromFavorites(user.uid, id);
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      // Rollback on error
      setWishlist(prev => [...prev, id]);
      throw error;
    }
  };

  const toggleWishlist = async (id: string): Promise<boolean> => {
    if (!user?.uid) {
      console.warn('User not authenticated');
      return false;
    }

    const wasInWishlist = wishlist.includes(id);

    // Optimistic update
    if (wasInWishlist) {
      setWishlist(prev => prev.filter(item => item !== id));
    } else {
      setWishlist(prev => [...prev, id]);
    }

    try {
      const isNowFavorite = await toggleFavoriteService(user.uid, id);
      return isNowFavorite;
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      // Rollback on error
      setWishlist(prev => wasInWishlist ? [...prev, id] : prev.filter(item => item !== id));
      throw error;
    }
  };

  const isInWishlist = (id: string) => {
    return wishlist.includes(id);
  };

  return (
    <WishlistContext.Provider value={{
      wishlist,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
      isInWishlist,
      loading,
      refreshWishlist
    }}>
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
