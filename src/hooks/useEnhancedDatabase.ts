// Enhanced Database Hook - Phase 1A
// Provides enhanced database operations with connection management and performance monitoring

import { useState, useEffect, useCallback, useRef } from 'react';
import { enhancedDb } from '../services/enhancedDbService';
import { isDatabaseHealthy, getConnectionStatus, getPerformanceMetrics } from '../services/databaseConnectionManager';
import { DocumentData } from 'firebase/firestore';

interface UseEnhancedDatabaseOptions {
  enablePerformanceMonitoring?: boolean;
  enableRetryLogic?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: Error, operation: string) => void;
  onPerformanceUpdate?: (metrics: any) => void;
}

interface DatabaseOperationState {
  isLoading: boolean;
  error: Error | null;
  lastOperation: string | null;
  performanceMetrics: any | null;
  connectionStatus: string;
  isHealthy: boolean;
}

export const useEnhancedDatabase = (options: UseEnhancedDatabaseOptions = {}) => {
  const {
    enablePerformanceMonitoring = true,
    enableRetryLogic = true,
    maxRetries = 3,
    retryDelay = 1000,
    onError,
    onPerformanceUpdate
  } = options;

  const [state, setState] = useState<DatabaseOperationState>({
    isLoading: false,
    error: null,
    lastOperation: null,
    performanceMetrics: null,
    connectionStatus: getConnectionStatus(),
    isHealthy: isDatabaseHealthy()
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update connection status periodically
  useEffect(() => {
    const updateConnectionStatus = () => {
      setState(prev => ({
        ...prev,
        connectionStatus: getConnectionStatus(),
        isHealthy: isDatabaseHealthy()
      }));
    };

    const interval = setInterval(updateConnectionStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Enhanced operation wrapper with retry logic
  const executeOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> => {
    let lastError: Error | null = null;
    let attempt = 0;

    const executeWithRetry = async (): Promise<T> => {
      try {
        setState(prev => ({
          ...prev,
          isLoading: true,
          error: null,
          lastOperation: operationName
        }));

        // Check database health before operation
        if (!isDatabaseHealthy()) {
          throw new Error('Database is not healthy');
        }

        // Execute operation
        const result = await operation();
        
        // Update performance metrics if monitoring is enabled
        if (enablePerformanceMonitoring) {
          // Get performance metrics from the database connection manager
          const metrics = getPerformanceMetrics();
          setState(prev => ({
            ...prev,
            performanceMetrics: metrics
          }));
          
          onPerformanceUpdate?.(metrics);
        }

        setState(prev => ({
          ...prev,
          isLoading: false,
          error: null
        }));

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Handle retry logic
        if (enableRetryLogic && attempt < maxRetries) {
          attempt++;
          
          setState(prev => ({
            ...prev,
            error: new Error(`Attempt ${attempt} failed, retrying... (${lastError?.message || 'Unknown error'})`)
          }));

          // Wait before retry
          await new Promise(resolve => {
            retryTimeoutRef.current = setTimeout(resolve, retryDelay * attempt);
          });

          return executeWithRetry();
        }

        // Final error state
        const finalError = new Error(
          `Operation "${operationName}" failed after ${attempt + 1} attempts: ${lastError.message}`
        );

        setState(prev => ({
          ...prev,
          isLoading: false,
          error: finalError
        }));

        onError?.(finalError, operationName);
        throw finalError;
      }
    };

    return executeWithRetry();
  }, [enablePerformanceMonitoring, enableRetryLogic, maxRetries, retryDelay, onError, onPerformanceUpdate]);

  // Document operations
  const getDocument = useCallback(async <T>(
    collectionName: string,
    documentId: string
  ): Promise<T | null> => {
    return executeOperation(
      () => enhancedDb.get<T>(collectionName, documentId),
      `getDocument:${collectionName}:${documentId}`
    );
  }, [executeOperation]);

  const setDocument = useCallback(async <T extends DocumentData>(
    collectionName: string,
    documentId: string,
    data: T,
    merge: boolean = false
  ): Promise<void> => {
    return executeOperation(
      () => enhancedDb.set<T>(collectionName, documentId, data, merge),
      `setDocument:${collectionName}:${documentId}`
    );
  }, [executeOperation]);

  const updateDocument = useCallback(async (
    collectionName: string,
    documentId: string,
    data: any
  ): Promise<void> => {
    return executeOperation(
      () => enhancedDb.update(collectionName, documentId, data),
      `updateDocument:${collectionName}:${documentId}`
    );
  }, [executeOperation]);

  const deleteDocument = useCallback(async (
    collectionName: string,
    documentId: string
  ): Promise<void> => {
    return executeOperation(
      () => enhancedDb.delete(collectionName, documentId),
      `deleteDocument:${collectionName}:${documentId}`
    );
  }, [executeOperation]);

  const addDocument = useCallback(async <T extends DocumentData>(
    collectionName: string,
    data: T
  ): Promise<string> => {
    return executeOperation(
      () => enhancedDb.add<T>(collectionName, data),
      `addDocument:${collectionName}`
    );
  }, [executeOperation]);

  // Query operations
  const queryDocuments = useCallback(async <T>(
    collectionName: string,
    queryConstraints: Array<any> = []
  ): Promise<T[]> => {
    return executeOperation(
      () => enhancedDb.query<T>(collectionName, queryConstraints),
      `queryDocuments:${collectionName}`
    );
  }, [executeOperation]);

  const queryDocumentsPaginated = useCallback(async <T>(
    collectionName: string,
    pageSize: number = 10,
    lastDocument?: any,
    queryConstraints: Array<any> = []
  ): Promise<{ documents: T[]; hasMore: boolean; lastDoc: any }> => {
    return executeOperation(
      () => enhancedDb.queryPaginated<T>(collectionName, pageSize, lastDocument, queryConstraints),
      `queryDocumentsPaginated:${collectionName}`
    );
  }, [executeOperation]);

  // Subscription operations
  const subscribeToCollection = useCallback(<T>(
    collectionName: string,
    callback: (data: T[]) => void,
    errorCallback?: (error: Error) => void,
    queryConstraints: Array<any> = []
  ) => {
    return enhancedDb.subscribe<T>(collectionName, callback, errorCallback, queryConstraints);
  }, []);

  // Batch operations
  const createBatch = useCallback(() => {
    return enhancedDb.batch();
  }, []);

  const executeBatch = useCallback(async (
    batch: any,
    operationName: string = 'executeBatch'
  ): Promise<any[]> => {
    return executeOperation(
      () => enhancedDb.executeBatch(batch, operationName),
      operationName
    );
  }, [executeOperation]);

  const batchWriteDocuments = useCallback(async <T extends DocumentData>(
    collectionName: string,
    documents: T[],
    merge: boolean = false
  ): Promise<void> => {
    return executeOperation(
      () => enhancedDb.batchWrite<T>(collectionName, documents, merge),
      `batchWriteDocuments:${collectionName}`
    );
  }, [executeOperation]);

  // Transaction operations
  const executeTransaction = useCallback(async <T>(
    updateFunction: (transaction: any) => Promise<T>,
    operationName: string = 'executeTransaction'
  ): Promise<T> => {
    return executeOperation(
      () => enhancedDb.transaction(updateFunction, operationName),
      operationName
    );
  }, [executeOperation]);

  // Utility functions
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const resetState = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      lastOperation: null,
      performanceMetrics: null,
      connectionStatus: getConnectionStatus(),
      isHealthy: isDatabaseHealthy()
    });
  }, []);

  // Health check
  const checkHealth = useCallback(async (): Promise<boolean> => {
    try {
      const healthy = await enhancedDb.isHealthy();
      setState(prev => ({ ...prev, isHealthy: healthy }));
      return healthy;
    } catch (error) {
      setState(prev => ({ ...prev, isHealthy: false }));
      return false;
    }
  }, []);

  return {
    // State
    ...state,
    
    // Document operations
    getDocument,
    setDocument,
    updateDocument,
    deleteDocument,
    addDocument,
    
    // Query operations
    queryDocuments,
    queryDocumentsPaginated,
    subscribeToCollection,
    
    // Batch operations
    createBatch,
    executeBatch,
    batchWriteDocuments,
    
    // Transaction operations
    executeTransaction,
    
    // Utility functions
    clearError,
    resetState,
    checkHealth,
    cleanup,
    
    // Enhanced database instance (for advanced use cases)
    enhancedDb
  };
};

// Specialized hooks for common use cases
export const useDocument = <T extends DocumentData>(
  collectionName: string,
  documentId: string,
  options?: UseEnhancedDatabaseOptions
) => {
  const db = useEnhancedDatabase(options);
  const [document, setDocument] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadDocument = useCallback(async () => {
    if (!documentId) return;
    
    setIsLoading(true);
    try {
      const doc = await db.getDocument<T>(collectionName, documentId);
      setDocument(doc);
    } catch (error) {
      console.error('Failed to load document:', error);
    } finally {
      setIsLoading(false);
    }
  }, [db, collectionName, documentId]);

  const saveDocument = useCallback(async (data: T) => {
    setIsLoading(true);
    try {
      await db.setDocument<T>(collectionName, documentId, data);
      setDocument(data);
    } catch (error) {
      console.error('Failed to save document:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [db, collectionName, documentId]);

  const updateDocument = useCallback(async (updates: Partial<T>) => {
    setIsLoading(true);
    try {
      await db.updateDocument(collectionName, documentId, updates);
      setDocument(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      console.error('Failed to update document:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [db, collectionName, documentId]);

  const deleteDocument = useCallback(async () => {
    setIsLoading(true);
    try {
      await db.deleteDocument(collectionName, documentId);
      setDocument(null);
    } catch (error) {
      console.error('Failed to delete document:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [db, collectionName, documentId]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  return {
    document,
    isLoading: isLoading || db.isLoading,
    error: db.error,
    loadDocument,
    saveDocument,
    updateDocument,
    deleteDocument,
    // Don't spread db to avoid duplicate properties
    connectionStatus: db.connectionStatus,
    isHealthy: db.isHealthy,
    performanceMetrics: db.performanceMetrics,
    lastOperation: db.lastOperation,
    clearError: db.clearError,
    resetState: db.resetState,
    checkHealth: db.checkHealth,
    cleanup: db.cleanup
  };
};

export const useCollection = <T extends DocumentData>(
  collectionName: string,
  queryConstraints: Array<any> = [],
  options?: UseEnhancedDatabaseOptions
) => {
  const db = useEnhancedDatabase(options);
  const [documents, setDocuments] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const docs = await db.queryDocuments<T>(collectionName, queryConstraints);
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setIsLoading(false);
    }
  }, [db, collectionName, queryConstraints]);

  const addDocument = useCallback(async (data: T) => {
    setIsLoading(true);
    try {
      const id = await db.addDocument<T>(collectionName, data);
      const newDoc = { id, ...data } as T;
      setDocuments(prev => [...prev, newDoc]);
      return id;
    } catch (error) {
      console.error('Failed to add document:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [db, collectionName]);

  const removeDocument = useCallback(async (documentId: string) => {
    setIsLoading(true);
    try {
      await db.deleteDocument(collectionName, documentId);
      setDocuments(prev => prev.filter(doc => (doc as any).id !== documentId));
    } catch (error) {
      console.error('Failed to remove document:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [db, collectionName]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  return {
    documents,
    isLoading: isLoading || db.isLoading,
    error: db.error,
    loadDocuments,
    addDocument,
    removeDocument,
    // Don't spread db to avoid duplicate properties
    connectionStatus: db.connectionStatus,
    isHealthy: db.isHealthy,
    performanceMetrics: db.performanceMetrics,
    lastOperation: db.lastOperation,
    clearError: db.clearError,
    resetState: db.resetState,
    checkHealth: db.checkHealth,
    cleanup: db.cleanup
  };
};
