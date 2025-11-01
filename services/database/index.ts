/**
 * Database abstraction layer
 *
 * This module provides a database-agnostic interface for all data operations.
 * Currently uses Firestore, but can be easily switched to another database
 * by implementing the IDatabase interface.
 *
 * Benefits:
 * - Centralized database operations
 * - Easy to switch database providers
 * - Consistent error handling
 * - Type-safe operations
 * - Easier testing with mock database
 *
 * Usage:
 * ```typescript
 * import { database, COLLECTIONS } from '@/services/database';
 *
 * // Get a document
 * const user = await database.getDocument(COLLECTIONS.USERS, userId);
 *
 * // Query with constraints
 * const result = await database.query(COLLECTIONS.FARMHOUSES, [
 *   { type: 'where', field: 'city', operator: '==', value: 'Mumbai' },
 *   { type: 'orderBy', field: 'createdAt', direction: 'desc' },
 *   { type: 'limit', limitValue: 10 }
 * ]);
 * ```
 */

export * from './types';
export { firestoreDatabase as database } from './firestore';

// Re-export collection names from constants for convenience
export { COLLECTIONS } from '../../config/constants';

/**
 * Query builder helpers for type-safe queries
 */
export const QueryBuilder = {
  where: (field: string, operator: any, value: any) => ({
    type: 'where' as const,
    field,
    operator,
    value,
  }),

  orderBy: (field: string, direction: 'asc' | 'desc' = 'asc') => ({
    type: 'orderBy' as const,
    field,
    direction,
  }),

  limit: (limitValue: number) => ({
    type: 'limit' as const,
    limitValue,
  }),

  startAfter: (value: any) => ({
    type: 'startAfter' as const,
    value,
  }),

  endBefore: (value: any) => ({
    type: 'endBefore' as const,
    value,
  }),
};
