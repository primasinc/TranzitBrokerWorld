// Enhanced Database Service - Phase 1A
// Wraps Firebase operations with connection management and performance monitoring

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  Unsubscribe,
  QuerySnapshot,
  DocumentData,
  DocumentReference,
  CollectionReference,
  Query,
  WriteBatch,
  writeBatch,
  runTransaction,
  Transaction
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  databaseConnectionManager, 
  recordQueryPerformance,
  isDatabaseHealthy 
} from './databaseConnectionManager';

// Enhanced operation result with performance metrics
export interface EnhancedOperationResult<T> {
  data: T;
  performance: {
    duration: number;
    connectionStatus: string;
    timestamp: Date;
  };
  metadata: {
    operation: string;
    collection: string;
    documentId?: string;
    retryCount: number;
  };
}

// Retry configuration
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2
};

// Performance monitoring wrapper
async function withPerformanceMonitoring<T>(
  operation: () => Promise<T>,
  operationName: string,
  collectionName: string,
  documentId?: string
): Promise<EnhancedOperationResult<T>> {
  const startTime = Date.now();
  let retryCount = 0;
  let lastError: Error | null = null;

  // Check database health before operation
  if (!isDatabaseHealthy()) {
    console.warn(`[EnhancedDatabaseService] Database health check failed for ${operationName}`);
  }

  // Acquire connection from pool
  const connectionAcquired = await databaseConnectionManager.acquireConnection();
  if (!connectionAcquired) {
    throw new Error('No available database connections');
  }

  try {
    // Perform operation with retry logic
    const result = await withRetry(operation, DEFAULT_RETRY_CONFIG, retryCount);
    
    const duration = Date.now() - startTime;
    const connectionStatus = databaseConnectionManager.getConnectionStatus();
    
    // Record successful performance
    recordQueryPerformance(duration, true);
    
    return {
      data: result,
      performance: {
        duration,
        connectionStatus,
        timestamp: new Date()
      },
      metadata: {
        operation: operationName,
        collection: collectionName,
        documentId,
        retryCount
      }
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const connectionStatus = databaseConnectionManager.getConnectionStatus();
    
    // Record failed performance
    recordQueryPerformance(duration, false);
    
    lastError = error instanceof Error ? error : new Error(String(error));
    throw new Error(`Database operation failed: ${operationName} - ${lastError.message}`);
  } finally {
    // Always release connection
    await databaseConnectionManager.releaseConnection();
  }
}

// Retry logic with exponential backoff
async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig,
  retryCount: number
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retryCount >= config.maxRetries) {
      throw error;
    }

    const delay = Math.min(
      config.baseDelay * Math.pow(config.backoffMultiplier, retryCount),
      config.maxDelay
    );

    console.warn(`[EnhancedDatabaseService] Operation failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${config.maxRetries})`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(operation, config, retryCount + 1);
  }
}

// Enhanced Document Operations
export class EnhancedDocService {
  
  // Get document with enhanced monitoring
  static async getDocument<T>(
    collectionName: string,
    documentId: string
  ): Promise<EnhancedOperationResult<T | null>> {
    return withPerformanceMonitoring(
      async () => {
        const docRef = doc(db, collectionName, documentId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() as T : null;
      },
      'getDocument',
      collectionName,
      documentId
    );
  }

  // Set document with enhanced monitoring
  static async setDocument<T extends DocumentData>(
    collectionName: string,
    documentId: string,
    data: T,
    merge: boolean = false
  ): Promise<EnhancedOperationResult<void>> {
    return withPerformanceMonitoring(
      async () => {
        const docRef = doc(db, collectionName, documentId);
        await setDoc(docRef, data, { merge });
      },
      'setDocument',
      collectionName,
      documentId
    );
  }

  // Update document with enhanced monitoring
  static async updateDocument(
    collectionName: string,
    documentId: string,
    data: Partial<DocumentData>
  ): Promise<EnhancedOperationResult<void>> {
    return withPerformanceMonitoring(
      async () => {
        const docRef = doc(db, collectionName, documentId);
        await updateDoc(docRef, data);
      },
      'updateDocument',
      collectionName,
      documentId
    );
  }

  // Delete document with enhanced monitoring
  static async deleteDocument(
    collectionName: string,
    documentId: string
  ): Promise<EnhancedOperationResult<void>> {
    return withPerformanceMonitoring(
      async () => {
        const docRef = doc(db, collectionName, documentId);
        await deleteDoc(docRef);
      },
      'deleteDocument',
      collectionName,
      documentId
    );
  }

  // Add document with enhanced monitoring
  static async addDocument<T extends DocumentData>(
    collectionName: string,
    data: T
  ): Promise<EnhancedOperationResult<string>> {
    return withPerformanceMonitoring(
      async () => {
        const colRef = collection(db, collectionName);
        const docRef = await addDoc(colRef, data);
        return docRef.id;
      },
      'addDocument',
      collectionName
    );
  }
}

// Enhanced Query Operations
export class EnhancedQueryService {
  
  // Get documents with enhanced monitoring
  static async getDocuments<T>(
    collectionName: string,
    queryConstraints: Array<any> = []
  ): Promise<EnhancedOperationResult<T[]>> {
    return withPerformanceMonitoring(
      async () => {
        const colRef = collection(db, collectionName);
        const q = query(colRef, ...queryConstraints);
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as T[];
      },
      'getDocuments',
      collectionName
    );
  }

  // Get documents with pagination
  static async getDocumentsPaginated<T>(
    collectionName: string,
    pageSize: number = 10,
    lastDocument?: any,
    queryConstraints: Array<any> = []
  ): Promise<EnhancedOperationResult<{
    documents: T[];
    hasMore: boolean;
    lastDoc: any;
  }>> {
    return withPerformanceMonitoring(
      async () => {
        const colRef = collection(db, collectionName);
        let q = query(colRef, ...queryConstraints, limit(pageSize));
        
        if (lastDocument) {
          q = query(q, startAfter(lastDocument));
        }
        
        const querySnapshot = await getDocs(q);
        const documents = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as T[];
        
        const hasMore = querySnapshot.docs.length === pageSize;
        const lastDoc = hasMore ? querySnapshot.docs[querySnapshot.docs.length - 1] : null;
        
        return { documents, hasMore, lastDoc };
      },
      'getDocumentsPaginated',
      collectionName
    );
  }

  // Real-time listener with enhanced monitoring
  static subscribeToCollection<T>(
    collectionName: string,
    callback: (data: T[]) => void,
    errorCallback?: (error: Error) => void,
    queryConstraints: Array<any> = []
  ): Unsubscribe {
    const colRef = collection(db, collectionName);
    const q = query(colRef, ...queryConstraints);
    
    return onSnapshot(
      q,
      (querySnapshot) => {
        const documents = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as T[];
        
        callback(documents);
      },
      (error) => {
        console.error(`[EnhancedDatabaseService] Subscription error for ${collectionName}:`, error);
        errorCallback?.(error);
      }
    );
  }
}

// Enhanced Batch Operations
export class EnhancedBatchService {
  
  // Create a new batch with enhanced monitoring
  static createBatch(): WriteBatch {
    return writeBatch(db);
  }

  // Execute batch with enhanced monitoring
  static async executeBatch(
    batch: WriteBatch,
    operationName: string = 'executeBatch'
  ): Promise<EnhancedOperationResult<void>> {
    return withPerformanceMonitoring(
      async () => {
        await batch.commit();
      },
      operationName,
      'batch'
    );
  }

  // Batch write multiple documents
  static async batchWriteDocuments<T extends DocumentData>(
    collectionName: string,
    documents: Array<{ id?: string; data: T; operation: 'set' | 'update' | 'delete' }>,
    merge: boolean = false
  ): Promise<EnhancedOperationResult<void>> {
    return withPerformanceMonitoring(
      async () => {
        const batch = writeBatch(db);
        
        documents.forEach(({ id, data, operation }) => {
          if (operation === 'delete' && id) {
            batch.delete(doc(db, collectionName, id));
            } else if (operation === 'update' && id) {
            batch.update(doc(db, collectionName, id), data as any);
          } else if (operation === 'set' && id) {
            batch.set(doc(db, collectionName, id), data, { merge });
          } else if (operation === 'set') {
            batch.set(doc(db, collectionName), data);
          }
        });
        
        await batch.commit();
      },
      'batchWriteDocuments',
      collectionName
    );
  }
}

// Enhanced Transaction Operations
export class EnhancedTransactionService {
  
  // Execute transaction with enhanced monitoring
  static async executeTransaction<T>(
    updateFunction: (transaction: Transaction) => Promise<T>,
    operationName: string = 'executeTransaction'
  ): Promise<EnhancedOperationResult<T>> {
    return withPerformanceMonitoring(
      async () => {
        return await runTransaction(db, updateFunction);
      },
      operationName,
      'transaction'
    );
  }
}

// Utility functions for common operations
export const enhancedDb = {
  // Document operations
  get: EnhancedDocService.getDocument,
  set: EnhancedDocService.setDocument,
  update: EnhancedDocService.updateDocument,
  delete: EnhancedDocService.deleteDocument,
  add: EnhancedDocService.addDocument,
  
  // Query operations
  query: EnhancedQueryService.getDocuments,
  queryPaginated: EnhancedQueryService.getDocumentsPaginated,
  subscribe: EnhancedQueryService.subscribeToCollection,
  
  // Batch operations
  batch: EnhancedBatchService.createBatch,
  executeBatch: EnhancedBatchService.executeBatch,
  batchWrite: EnhancedBatchService.batchWriteDocuments,
  
  // Transaction operations
  transaction: EnhancedTransactionService.executeTransaction,
  
  // Health and performance
  isHealthy: isDatabaseHealthy,
  getConnectionStatus: () => databaseConnectionManager.getConnectionStatus(),
  getHealthMetrics: () => databaseConnectionManager.getConnectionStatus(),
  getConnectionPool: () => databaseConnectionManager.getConnectionPool(),
  getPerformanceMetrics: () => databaseConnectionManager.getPerformanceMetrics()
};

// Export individual services for specific use cases
// Individual services are exported when declared above
