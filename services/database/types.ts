/**
 * Database abstraction layer types
 *
 * These types define the interface for database operations,
 * making it easy to switch database providers in the future.
 */

export type WhereFilterOp =
  | '<'
  | '<='
  | '=='
  | '!='
  | '>='
  | '>'
  | 'array-contains'
  | 'array-contains-any'
  | 'in'
  | 'not-in';

export type OrderByDirection = 'asc' | 'desc';

export interface QueryConstraint {
  type: 'where' | 'orderBy' | 'limit' | 'startAfter' | 'endBefore';
  field?: string;
  operator?: WhereFilterOp;
  value?: any;
  direction?: OrderByDirection;
  limitValue?: number;
}

export interface DatabaseDocument<T = any> {
  id: string;
  data: T;
  exists: boolean;
}

export interface DatabaseQueryResult<T = any> {
  docs: DatabaseDocument<T>[];
  empty: boolean;
  size: number;
}

export interface DatabaseUnsubscribe {
  (): void;
}

export interface DatabaseListener<T = any> {
  (snapshot: DatabaseQueryResult<T>): void;
}

export interface DatabaseError {
  code: string;
  message: string;
  name: string;
}

/**
 * Abstract database interface
 * Implement this interface to support different database providers
 */
export interface IDatabase {
  // Document operations
  getDocument<T>(collection: string, documentId: string): Promise<DatabaseDocument<T>>;
  setDocument<T>(collection: string, documentId: string, data: T): Promise<void>;
  updateDocument<T>(collection: string, documentId: string, data: Partial<T>): Promise<void>;
  deleteDocument(collection: string, documentId: string): Promise<void>;
  addDocument<T>(collection: string, data: T): Promise<string>;

  // Query operations
  query<T>(collection: string, constraints: QueryConstraint[]): Promise<DatabaseQueryResult<T>>;
  queryOnce<T>(collection: string, constraints: QueryConstraint[]): Promise<DatabaseQueryResult<T>>;

  // Real-time listeners
  onSnapshot<T>(
    collection: string,
    constraints: QueryConstraint[],
    listener: DatabaseListener<T>,
    errorHandler?: (error: DatabaseError) => void
  ): DatabaseUnsubscribe;

  onDocumentSnapshot<T>(
    collection: string,
    documentId: string,
    listener: (doc: DatabaseDocument<T>) => void,
    errorHandler?: (error: DatabaseError) => void
  ): DatabaseUnsubscribe;

  // Batch operations
  batchWrite(operations: BatchOperation[]): Promise<void>;

  // Transaction operations
  runTransaction<T>(updateFunction: (transaction: ITransaction) => Promise<T>): Promise<T>;
}

export interface BatchOperation {
  type: 'set' | 'update' | 'delete';
  collection: string;
  documentId: string;
  data?: any;
}

export interface ITransaction {
  get<T>(collection: string, documentId: string): Promise<DatabaseDocument<T>>;
  set<T>(collection: string, documentId: string, data: T): void;
  update<T>(collection: string, documentId: string, data: Partial<T>): void;
  delete(collection: string, documentId: string): void;
}
