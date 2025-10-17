/**
 * Audit Logging Service
 * Tracks important security and business events
 */

import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export type AuditAction =
  | 'user_registered'
  | 'user_login'
  | 'user_logout'
  | 'farmhouse_created'
  | 'farmhouse_updated'
  | 'farmhouse_approved'
  | 'farmhouse_rejected'
  | 'farmhouse_deleted'
  | 'booking_created'
  | 'booking_updated'
  | 'booking_cancelled'
  | 'booking_confirmed'
  | 'booking_completed'
  | 'payment_initiated'
  | 'payment_success'
  | 'payment_failed'
  | 'review_created'
  | 'review_updated'
  | 'review_deleted'
  | 'favorite_added'
  | 'favorite_removed'
  | 'security_violation'
  | 'data_export'
  | 'admin_action';

export interface AuditLogEntry {
  id?: string;
  action: AuditAction;
  userId: string;
  userEmail?: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: any;
}

/**
 * Log an audit event
 */
export async function logAuditEvent(
  action: AuditAction,
  userId: string,
  resourceType: string,
  resourceId: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const auditEntry: any = {
      action,
      userId,
      resourceType,
      resourceId,
      metadata: metadata || {},
      timestamp: serverTimestamp(),
    };

    // Only add optional fields if they have values
    if (typeof navigator !== 'undefined' && navigator.userAgent) {
      auditEntry.userAgent = navigator.userAgent;
    }

    await addDoc(collection(db, 'audit_logs'), auditEntry);
  } catch (error) {
    // Don't throw error - logging should never break app functionality
    console.error('Failed to log audit event:', error);
  }
}

/**
 * Get audit logs for a specific user (admin only)
 */
export async function getUserAuditLogs(userId: string, maxResults: number = 50): Promise<AuditLogEntry[]> {
  try {
    const q = query(
      collection(db, 'audit_logs'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(maxResults)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as AuditLogEntry));
  } catch (error) {
    console.error('Error fetching user audit logs:', error);
    return [];
  }
}

/**
 * Get audit logs for a specific resource (admin only)
 */
export async function getResourceAuditLogs(
  resourceType: string,
  resourceId: string,
  maxResults: number = 50
): Promise<AuditLogEntry[]> {
  try {
    const q = query(
      collection(db, 'audit_logs'),
      where('resourceType', '==', resourceType),
      where('resourceId', '==', resourceId),
      orderBy('timestamp', 'desc'),
      limit(maxResults)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as AuditLogEntry));
  } catch (error) {
    console.error('Error fetching resource audit logs:', error);
    return [];
  }
}

/**
 * Get recent audit logs (admin only)
 */
export async function getRecentAuditLogs(maxResults: number = 100): Promise<AuditLogEntry[]> {
  try {
    const q = query(
      collection(db, 'audit_logs'),
      orderBy('timestamp', 'desc'),
      limit(maxResults)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as AuditLogEntry));
  } catch (error) {
    console.error('Error fetching recent audit logs:', error);
    return [];
  }
}

/**
 * Log security violations
 */
export async function logSecurityViolation(
  userId: string,
  violationType: string,
  details: Record<string, any>
): Promise<void> {
  await logAuditEvent(
    'security_violation',
    userId,
    'security',
    'violation',
    {
      violationType,
      ...details,
      severity: 'high',
      timestamp: new Date().toISOString(),
    }
  );
}

/**
 * Helper functions for common audit events
 */
export const auditHelpers = {
  userRegistered: (userId: string, email: string) =>
    logAuditEvent('user_registered', userId, 'user', userId, { email }),

  userLogin: (userId: string) =>
    logAuditEvent('user_login', userId, 'user', userId),

  userLogout: (userId: string) =>
    logAuditEvent('user_logout', userId, 'user', userId),

  farmhouseCreated: (userId: string, farmhouseId: string, farmhouseName: string) =>
    logAuditEvent('farmhouse_created', userId, 'farmhouse', farmhouseId, { farmhouseName }),

  farmhouseApproved: (adminId: string, farmhouseId: string) =>
    logAuditEvent('farmhouse_approved', adminId, 'farmhouse', farmhouseId),

  farmhouseRejected: (adminId: string, farmhouseId: string, reason?: string) =>
    logAuditEvent('farmhouse_rejected', adminId, 'farmhouse', farmhouseId, { reason }),

  bookingCreated: (userId: string, bookingId: string, farmhouseId: string, amount: number) =>
    logAuditEvent('booking_created', userId, 'booking', bookingId, { farmhouseId, amount }),

  bookingCancelled: (userId: string, bookingId: string, reason?: string) =>
    logAuditEvent('booking_cancelled', userId, 'booking', bookingId, { reason }),

  paymentSuccess: (userId: string, bookingId: string, amount: number, paymentId: string) =>
    logAuditEvent('payment_success', userId, 'payment', paymentId, { bookingId, amount }),

  reviewCreated: (userId: string, reviewId: string, farmhouseId: string, rating: number) =>
    logAuditEvent('review_created', userId, 'review', reviewId, { farmhouseId, rating }),
};
