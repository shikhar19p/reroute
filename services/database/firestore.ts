/**
 * Firestore implementation of database abstraction layer
 *
 * This file implements the IDatabase interface for Firestore.
 * To switch to a different database, create a new implementation
 * of IDatabase and update the export in index.ts
 */

import {
  collection as firestoreCollection,
  doc as firestoreDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query as firestoreQuery,
  where,
  orderBy,
  limit,
  startAfter,
  endBefore,
  onSnapshot as firestoreOnSnapshot,
  writeBatch,
  runTransaction as firestoreRunTransaction,
  Firestore,
  DocumentSnapshot,
  QuerySnapshot,
  Unsubscribe,
  QueryConstraint as FirestoreQueryConstraint,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import type {
  IDatabase,
  DatabaseDocument,
  DatabaseQueryResult,
  DatabaseUnsubscribe,
  DatabaseListener,
  DatabaseError,
  QueryConstraint,
  BatchOperation,
  ITransaction,
} from './types';

class FirestoreDatabase implements IDatabase {
  private db: Firestore;

  constructor(firestoreInstance: Firestore) {
    this.db = firestoreInstance;
  }

  // ========================================================================
  // Document Operations
  // ========================================================================

  async getDocument<T>(collectionName: string, documentId: string): Promise<DatabaseDocument<T>> {
    const docRef = firestoreDoc(this.db, collectionName, documentId);
    const snapshot = await getDoc(docRef);

    return {
      id: snapshot.id,
      data: snapshot.data() as T,
      exists: snapshot.exists(),
    };
  }

  async setDocument<T>(collectionName: string, documentId: string, data: T): Promise<void> {
    const docRef = firestoreDoc(this.db, collectionName, documentId);
    await setDoc(docRef, data as any);
  }

  async updateDocument<T>(collectionName: string, documentId: string, data: Partial<T>): Promise<void> {
    const docRef = firestoreDoc(this.db, collectionName, documentId);
    await updateDoc(docRef, data as any);
  }

  async deleteDocument(collectionName: string, documentId: string): Promise<void> {
    const docRef = firestoreDoc(this.db, collectionName, documentId);
    await deleteDoc(docRef);
  }

  async addDocument<T>(collectionName: string, data: T): Promise<string> {
    const collectionRef = firestoreCollection(this.db, collectionName);
    const docRef = await addDoc(collectionRef, data as any);
    return docRef.id;
  }

  // ========================================================================
  // Query Operations
  // ========================================================================

  private buildQueryConstraints(constraints: QueryConstraint[]): FirestoreQueryConstraint[] {
    return constraints.map((constraint) => {
      switch (constraint.type) {
        case 'where':
          return where(constraint.field!, constraint.operator!, constraint.value);
        case 'orderBy':
          return orderBy(constraint.field!, constraint.direction);
        case 'limit':
          return limit(constraint.limitValue!);
        case 'startAfter':
          return startAfter(constraint.value);
        case 'endBefore':
          return endBefore(constraint.value);
        default:
          throw new Error(`Unknown constraint type: ${(constraint as any).type}`);
      }
    });
  }

  async query<T>(collectionName: string, constraints: QueryConstraint[]): Promise<DatabaseQueryResult<T>> {
    return this.queryOnce<T>(collectionName, constraints);
  }

  async queryOnce<T>(collectionName: string, constraints: QueryConstraint[]): Promise<DatabaseQueryResult<T>> {
    const collectionRef = firestoreCollection(this.db, collectionName);
    const queryConstraints = this.buildQueryConstraints(constraints);
    const q = firestoreQuery(collectionRef, ...queryConstraints);
    const snapshot = await getDocs(q);

    return this.snapshotToResult<T>(snapshot);
  }

  // ========================================================================
  // Real-time Listeners
  // ========================================================================

  onSnapshot<T>(
    collectionName: string,
    constraints: QueryConstraint[],
    listener: DatabaseListener<T>,
    errorHandler?: (error: DatabaseError) => void
  ): DatabaseUnsubscribe {
    const collectionRef = firestoreCollection(this.db, collectionName);
    const queryConstraints = this.buildQueryConstraints(constraints);
    const q = firestoreQuery(collectionRef, ...queryConstraints);

    const unsubscribe: Unsubscribe = firestoreOnSnapshot(
      q,
      (snapshot) => {
        listener(this.snapshotToResult<T>(snapshot));
      },
      (error) => {
        if (errorHandler) {
          errorHandler(this.convertError(error));
        }
      }
    );

    return unsubscribe;
  }

  onDocumentSnapshot<T>(
    collectionName: string,
    documentId: string,
    listener: (doc: DatabaseDocument<T>) => void,
    errorHandler?: (error: DatabaseError) => void
  ): DatabaseUnsubscribe {
    const docRef = firestoreDoc(this.db, collectionName, documentId);

    const unsubscribe: Unsubscribe = firestoreOnSnapshot(
      docRef,
      (snapshot) => {
        listener({
          id: snapshot.id,
          data: snapshot.data() as T,
          exists: snapshot.exists(),
        });
      },
      (error) => {
        if (errorHandler) {
          errorHandler(this.convertError(error));
        }
      }
    );

    return unsubscribe;
  }

  // ========================================================================
  // Batch Operations
  // ========================================================================

  async batchWrite(operations: BatchOperation[]): Promise<void> {
    const batch = writeBatch(this.db);

    for (const op of operations) {
      const docRef = firestoreDoc(this.db, op.collection, op.documentId);

      switch (op.type) {
        case 'set':
          batch.set(docRef, op.data);
          break;
        case 'update':
          batch.update(docRef, op.data);
          break;
        case 'delete':
          batch.delete(docRef);
          break;
      }
    }

    await batch.commit();
  }

  // ========================================================================
  // Transaction Operations
  // ========================================================================

  async runTransaction<T>(updateFunction: (transaction: ITransaction) => Promise<T>): Promise<T> {
    return firestoreRunTransaction(this.db, async (firestoreTransaction) => {
      const transactionWrapper: ITransaction = {
        async get<TDoc>(collectionName: string, documentId: string): Promise<DatabaseDocument<TDoc>> {
          const docRef = firestoreDoc(db, collectionName, documentId);
          const snapshot = await firestoreTransaction.get(docRef);
          return {
            id: snapshot.id,
            data: snapshot.data() as TDoc,
            exists: snapshot.exists(),
          };
        },

        set<TDoc>(collectionName: string, documentId: string, data: TDoc): void {
          const docRef = firestoreDoc(db, collectionName, documentId);
          firestoreTransaction.set(docRef, data as any);
        },

        update<TDoc>(collectionName: string, documentId: string, data: Partial<TDoc>): void {
          const docRef = firestoreDoc(db, collectionName, documentId);
          firestoreTransaction.update(docRef, data as any);
        },

        delete(collectionName: string, documentId: string): void {
          const docRef = firestoreDoc(db, collectionName, documentId);
          firestoreTransaction.delete(docRef);
        },
      };

      return updateFunction(transactionWrapper);
    });
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  private snapshotToResult<T>(snapshot: QuerySnapshot): DatabaseQueryResult<T> {
    const docs: DatabaseDocument<T>[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      data: doc.data() as T,
      exists: doc.exists(),
    }));

    return {
      docs,
      empty: snapshot.empty,
      size: snapshot.size,
    };
  }

  private convertError(error: any): DatabaseError {
    return {
      code: error.code || 'unknown',
      message: error.message || 'Unknown error occurred',
      name: error.name || 'DatabaseError',
    };
  }
}

// Export singleton instance
export const firestoreDatabase = new FirestoreDatabase(db);
