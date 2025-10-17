/**
 * Review and Rating Service
 * Handles farmhouse reviews and ratings
 */

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
  orderBy,
  serverTimestamp,
  limit,
  increment,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { validators } from '../utils/validators';
import { logAuditEvent } from './auditService';

export interface Review {
  id: string;
  farmhouseId: string;
  farmhouseName: string;
  userId: string;
  userName: string;
  userEmail: string;
  rating: number; // 1-5
  comment: string;
  photos?: string[];
  helpful: number; // Number of upvotes
  createdAt: any;
  updatedAt?: any;
}

/**
 * Create a new review
 */
export async function createReview(reviewData: Omit<Review, 'id' | 'createdAt' | 'helpful'>): Promise<string> {
  try {
    // Validate rating
    const ratingValidation = validators.rating(reviewData.rating);
    if (!ratingValidation.isValid) {
      throw new Error(ratingValidation.error);
    }

    // Validate comment length
    if (reviewData.comment.length > 1000) {
      throw new Error('Review comment must be less than 1000 characters');
    }

    // Sanitize comment
    const sanitizedComment = validators.sanitizeText(reviewData.comment);

    // Check if user already reviewed this farmhouse
    const existingReview = await getUserReviewForFarmhouse(reviewData.userId, reviewData.farmhouseId);
    if (existingReview) {
      throw new Error('You have already reviewed this farmhouse. Please edit your existing review.');
    }

    const docRef = await addDoc(collection(db, 'reviews'), {
      ...reviewData,
      comment: sanitizedComment,
      helpful: 0,
      createdAt: serverTimestamp(),
    });

    // Update farmhouse rating
    await updateFarmhouseRating(reviewData.farmhouseId);

    // Log audit event
    await logAuditEvent(
      'review_created',
      reviewData.userId,
      'review',
      docRef.id,
      { farmhouseId: reviewData.farmhouseId, rating: reviewData.rating }
    );

    console.log('Review created successfully:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating review:', error);
    throw error;
  }
}

/**
 * Get all reviews for a farmhouse
 */
export async function getFarmhouseReviews(farmhouseId: string, maxResults: number = 50): Promise<Review[]> {
  try {
    const q = query(
      collection(db, 'reviews'),
      where('farmhouseId', '==', farmhouseId),
      orderBy('createdAt', 'desc'),
      limit(maxResults)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Review));
  } catch (error) {
    console.error('Error fetching farmhouse reviews:', error);
    return [];
  }
}

/**
 * Get user's review for a specific farmhouse
 */
export async function getUserReviewForFarmhouse(userId: string, farmhouseId: string): Promise<Review | null> {
  try {
    const q = query(
      collection(db, 'reviews'),
      where('userId', '==', userId),
      where('farmhouseId', '==', farmhouseId),
      limit(1)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    } as Review;
  } catch (error) {
    console.error('Error fetching user review:', error);
    return null;
  }
}

/**
 * Get all reviews by a user
 */
export async function getUserReviews(userId: string): Promise<Review[]> {
  try {
    const q = query(
      collection(db, 'reviews'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Review));
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    return [];
  }
}

/**
 * Update a review
 */
export async function updateReview(
  reviewId: string,
  userId: string,
  updates: { rating?: number; comment?: string; photos?: string[] }
): Promise<void> {
  try {
    const reviewRef = doc(db, 'reviews', reviewId);
    const reviewSnap = await getDoc(reviewRef);

    if (!reviewSnap.exists()) {
      throw new Error('Review not found');
    }

    const reviewData = reviewSnap.data();
    if (reviewData.userId !== userId) {
      throw new Error('Unauthorized: You can only edit your own reviews');
    }

    // Validate rating if provided
    if (updates.rating) {
      const ratingValidation = validators.rating(updates.rating);
      if (!ratingValidation.isValid) {
        throw new Error(ratingValidation.error);
      }
    }

    // Sanitize comment if provided
    if (updates.comment) {
      updates.comment = validators.sanitizeText(updates.comment);
    }

    await updateDoc(reviewRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });

    // Update farmhouse rating if rating changed
    if (updates.rating) {
      await updateFarmhouseRating(reviewData.farmhouseId);
    }

    // Log audit event
    await logAuditEvent('review_updated', userId, 'review', reviewId);

    console.log('Review updated:', reviewId);
  } catch (error) {
    console.error('Error updating review:', error);
    throw error;
  }
}

/**
 * Delete a review
 */
export async function deleteReview(reviewId: string, userId: string): Promise<void> {
  try {
    const reviewRef = doc(db, 'reviews', reviewId);
    const reviewSnap = await getDoc(reviewRef);

    if (!reviewSnap.exists()) {
      throw new Error('Review not found');
    }

    const reviewData = reviewSnap.data();
    if (reviewData.userId !== userId) {
      throw new Error('Unauthorized: You can only delete your own reviews');
    }

    const farmhouseId = reviewData.farmhouseId;

    await deleteDoc(reviewRef);

    // Update farmhouse rating
    await updateFarmhouseRating(farmhouseId);

    // Log audit event
    await logAuditEvent('review_deleted', userId, 'review', reviewId);

    console.log('Review deleted:', reviewId);
  } catch (error) {
    console.error('Error deleting review:', error);
    throw error;
  }
}

/**
 * Mark review as helpful (upvote)
 */
export async function markReviewHelpful(reviewId: string): Promise<void> {
  try {
    const reviewRef = doc(db, 'reviews', reviewId);
    await updateDoc(reviewRef, {
      helpful: increment(1)
    });
  } catch (error) {
    console.error('Error marking review helpful:', error);
    throw error;
  }
}

/**
 * Update farmhouse's average rating
 */
async function updateFarmhouseRating(farmhouseId: string): Promise<void> {
  try {
    const reviews = await getFarmhouseReviews(farmhouseId, 1000);

    if (reviews.length === 0) {
      // No reviews, set rating to 0
      const farmhouseRef = doc(db, 'farmhouses', farmhouseId);
      await updateDoc(farmhouseRef, {
        rating: 0,
        reviews: 0
      });
      return;
    }

    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    // Update farmhouse document
    const farmhouseRef = doc(db, 'farmhouses', farmhouseId);
    await updateDoc(farmhouseRef, {
      rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      reviews: reviews.length
    });
  } catch (error) {
    console.error('Error updating farmhouse rating:', error);
  }
}

/**
 * Get top rated farmhouses
 */
export async function getTopRatedFarmhouses(maxResults: number = 10): Promise<any[]> {
  try {
    const q = query(
      collection(db, 'farmhouses'),
      where('status', '==', 'approved'),
      orderBy('rating', 'desc'),
      orderBy('reviews', 'desc'),
      limit(maxResults)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching top rated farmhouses:', error);
    return [];
  }
}
