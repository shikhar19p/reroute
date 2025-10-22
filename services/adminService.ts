import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { logAuditEvent } from './auditService';

/**
 * Admin Service
 * Handles admin-specific operations
 */

export interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin';
  createdAt: string;
  permissions: AdminPermissions;
}

export interface AdminPermissions {
  approveFarmhouses: boolean;
  manageBookings: boolean;
  manageUsers: boolean;
  manageCoupons: boolean;
  viewAnalytics: boolean;
  managePayments: boolean;
}

/**
 * Create a new admin user
 * Note: This should only be called by super admin or through secure backend
 */
export async function createAdminUser(
  userId: string,
  email: string,
  displayName: string,
  permissions?: Partial<AdminPermissions>
): Promise<void> {
  try {
    const defaultPermissions: AdminPermissions = {
      approveFarmhouses: true,
      manageBookings: true,
      manageUsers: true,
      manageCoupons: true,
      viewAnalytics: true,
      managePayments: true,
      ...permissions,
    };

    const adminData: Omit<AdminUser, 'uid'> = {
      email,
      displayName,
      role: 'admin',
      createdAt: new Date().toISOString(),
      permissions: defaultPermissions,
    };

    await setDoc(doc(db, 'users', userId), adminData, { merge: true });

    // Log admin creation
    await logAuditEvent('admin_created', userId, 'user', userId, {
      email,
      permissions: defaultPermissions,
    });

    console.log('Admin user created:', email);
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
}

/**
 * Check if user has admin privileges
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return false;
    }

    const userData = userDoc.data();
    return userData.role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Get admin permissions
 */
export async function getAdminPermissions(userId: string): Promise<AdminPermissions | null> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return null;
    }

    const userData = userDoc.data();

    if (userData.role !== 'admin') {
      return null;
    }

    return userData.permissions || {
      approveFarmhouses: true,
      manageBookings: true,
      manageUsers: true,
      manageCoupons: true,
      viewAnalytics: true,
      managePayments: true,
    };
  } catch (error) {
    console.error('Error getting admin permissions:', error);
    return null;
  }
}

/**
 * Update admin permissions
 */
export async function updateAdminPermissions(
  userId: string,
  permissions: Partial<AdminPermissions>
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists() || userDoc.data().role !== 'admin') {
      throw new Error('User is not an admin');
    }

    await updateDoc(userRef, {
      'permissions': {
        ...userDoc.data().permissions,
        ...permissions,
      },
      updatedAt: new Date().toISOString(),
    });

    // Log permission update
    await logAuditEvent('admin_permissions_updated', userId, 'user', userId, {
      updatedPermissions: permissions,
    });

    console.log('Admin permissions updated');
  } catch (error) {
    console.error('Error updating admin permissions:', error);
    throw error;
  }
}

/**
 * Remove admin privileges from user
 */
export async function revokeAdminAccess(userId: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);

    await updateDoc(userRef, {
      role: 'customer',
      previousRole: 'admin',
      revokedAt: new Date().toISOString(),
    });

    // Log admin revocation
    await logAuditEvent('admin_revoked', userId, 'user', userId, {
      revokedAt: new Date().toISOString(),
    });

    console.log('Admin access revoked');
  } catch (error) {
    console.error('Error revoking admin access:', error);
    throw error;
  }
}

/**
 * Check if admin has specific permission
 */
export async function hasPermission(
  userId: string,
  permission: keyof AdminPermissions
): Promise<boolean> {
  try {
    const permissions = await getAdminPermissions(userId);

    if (!permissions) {
      return false;
    }

    return permissions[permission] === true;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}
