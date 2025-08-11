// Performance Optimization Hook - Phase 1B Integration
// Provides React components with easy access to performance optimization features

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  performanceOptimizationService,
  getPerformanceMetrics,
  executeOptimizedQuery,
  warmupCache,
  getPerformanceAlerts,
  generatePerformanceReport,
  updatePerformanceConfig
} from '../services/performanceOptimizationService';

interface PerformanceMetrics {
  cacheHitRate: number;
  databaseResponseTime: number;
  queryExecutionTime: number;
  prefetchEffectiveness: number;
  overallPerformance: number;
  recommendations: string[];
}

interface PerformanceAlert {
  type: 'warning' | 'critical' | 'info';
  message: string;
  timestamp: Date;
  metric: string;
  value: number;
  threshold: number;
}

interface OptimizationConfig {
  enableAutoOptimization: boolean;
  performanceThreshold: number;
  optimizationInterval: number;
  enablePredictiveOptimization: boolean;
  maxConcurrentOptimizations: number;
}

interface UsePerformanceOptimizationOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableAlerts?: boolean;
  enableMetrics?: boolean;
}

export const usePerformanceOptimization = (options: UsePerformanceOptimizationOptions = {}) => {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    enableAlerts = true,
    enableMetrics = true
  } = options;

  // State
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Refs
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Initialize performance monitoring
  useEffect(() => {
    if (enableMetrics) {
      refreshMetrics();
    }

    if (enableAlerts) {
      refreshAlerts();
    }

    // Set up auto-refresh if enabled
    if (autoRefresh) {
      startAutoRefresh();
    }

    return () => {
      isMountedRef.current = false;
      stopAutoRefresh();
    };
  }, [autoRefresh, enableMetrics, enableAlerts]);

  // Auto-refresh functionality
  const startAutoRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }

    refreshTimerRef.current = setInterval(() => {
      if (isMountedRef.current) {
        if (enableMetrics) {
          refreshMetrics();
        }
        if (enableAlerts) {
          refreshAlerts();
        }
      }
    }, refreshInterval);
  }, [refreshInterval, enableMetrics, enableAlerts]);

  const stopAutoRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  // Core functionality
  const refreshMetrics = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const performanceMetrics = await getPerformanceMetrics();
      
      if (isMountedRef.current) {
        setMetrics(performanceMetrics);
        setLastUpdated(new Date());
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch performance metrics');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const refreshAlerts = useCallback(async () => {
    if (!isMountedRef.current || !enableAlerts) return;

    try {
      const performanceAlerts = await getPerformanceAlerts();
      
      if (isMountedRef.current) {
        setAlerts(performanceAlerts);
      }
    } catch (err) {
      console.error('Failed to fetch performance alerts:', err);
    }
  }, [enableAlerts]);

  const executeQuery = useCallback(async <T>(
    queryFn: () => Promise<T>,
    queryKey: string,
    queryOptions?: {
      enableCache?: boolean;
      enablePrefetch?: boolean;
      priority?: number;
    }
  ): Promise<T> => {
    try {
      setError(null);
      return await executeOptimizedQuery(queryFn, queryKey, queryOptions);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Query execution failed';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const warmupCacheData = useCallback(async (
    warmupData: Array<{ key: string; data: any; priority?: number }>
  ): Promise<void> => {
    try {
      setError(null);
      await warmupCache(warmupData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Cache warmup failed';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const generateReport = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      
      const report = await generatePerformanceReport();
      
      if (isMountedRef.current) {
        setLastUpdated(new Date());
      }
      
      return report;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate performance report';
      setError(errorMessage);
      throw err;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const updateConfig = useCallback((newConfig: Partial<OptimizationConfig>) => {
    try {
      setError(null);
      updatePerformanceConfig(newConfig);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update configuration';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Utility functions
  const getPerformanceScore = useCallback((): number => {
    if (!metrics) return 0;
    
    // Calculate a weighted performance score
    const weights = {
      cache: 0.3,
      database: 0.25,
      query: 0.25,
      prefetch: 0.2
    };

    return (
      metrics.cacheHitRate * weights.cache +
      Math.max(0, 1 - metrics.databaseResponseTime / 1000) * weights.database +
      Math.max(0, 1 - metrics.queryExecutionTime / 1000) * weights.query +
      metrics.prefetchEffectiveness * weights.prefetch
    );
  }, [metrics]);

  const getPerformanceStatus = useCallback((): 'excellent' | 'good' | 'fair' | 'poor' => {
    const score = getPerformanceScore();
    
    if (score >= 0.9) return 'excellent';
    if (score >= 0.8) return 'good';
    if (score >= 0.6) return 'fair';
    return 'poor';
  }, [getPerformanceScore]);

  const getCriticalAlerts = useCallback((): PerformanceAlert[] => {
    return alerts.filter(alert => alert.type === 'critical');
  }, [alerts]);

  const getWarningAlerts = useCallback((): PerformanceAlert[] => {
    return alerts.filter(alert => alert.type === 'warning');
  }, [alerts]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const forceRefresh = useCallback(async () => {
    await Promise.all([
      refreshMetrics(),
      refreshAlerts()
    ]);
  }, [refreshMetrics, refreshAlerts]);

  // Return hook interface
  return {
    // State
    metrics,
    alerts,
    isLoading,
    error,
    lastUpdated,
    
    // Core functions
    executeQuery,
    warmupCacheData,
    generateReport,
    updateConfig,
    
    // Utility functions
    getPerformanceScore,
    getPerformanceStatus,
    getCriticalAlerts,
    getWarningAlerts,
    
    // Control functions
    refreshMetrics,
    refreshAlerts,
    forceRefresh,
    clearError,
    startAutoRefresh,
    stopAutoRefresh,
    
    // Service instance (for advanced usage)
    service: performanceOptimizationService
  };
};

// Specialized hooks for specific use cases
export const usePerformanceMetrics = () => {
  const { metrics, isLoading, error, refreshMetrics } = usePerformanceOptimization({
    enableAlerts: false,
    enableMetrics: true
  });

  return { metrics, isLoading, error, refreshMetrics };
};

export const usePerformanceAlerts = () => {
  const { alerts, isLoading, error, refreshAlerts } = usePerformanceOptimization({
    enableAlerts: true,
    enableMetrics: false
  });

  return { alerts, isLoading, error, refreshAlerts };
};

export const useOptimizedQuery = () => {
  const { executeQuery, isLoading, error } = usePerformanceOptimization({
    autoRefresh: false,
    enableMetrics: false,
    enableAlerts: false
  });

  return { executeQuery, isLoading, error };
};

export const useCacheWarmup = () => {
  const { warmupCacheData, isLoading, error } = usePerformanceOptimization({
    autoRefresh: false,
    enableMetrics: false,
    enableAlerts: false
  });

  return { warmupCacheData, isLoading, error };
};

export default usePerformanceOptimization;
