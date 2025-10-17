import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { saveSession } from '../sessionManager';
import { logAuditEvent } from './auditService';

/**
 * Switch user role between customer and owner
 */
export async function switchUserRole(
  userId: string,
  newRole: 'customer' | 'owner'
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    const oldRole = userData.role;

    // Update role in Firestore
    await updateDoc(userRef, {
      role: newRole,
      previousRole: oldRole,
      roleUpdatedAt: new Date().toISOString(),
    });

    // Update session
    await saveSession({
      uid: userId,
      email: userData.email,
      role: newRole,
      displayName: userData.displayName,
      photoURL: userData.photoURL,
    });

    // Log role switch
    await logAuditEvent('role_switched', userId, 'user', userId, {
      oldRole,
      newRole,
    });

    console.log(`User role switched from ${oldRole} to ${newRole}`);
  } catch (error) {
    console.error('Error switching user role:', error);
    throw error;
  }
}

/**
 * Get user's current role
 */
export async function getUserRole(userId: string): Promise<'customer' | 'owner' | null> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return null;
    }

    return userDoc.data().role || null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}
