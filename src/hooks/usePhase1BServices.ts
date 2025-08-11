// Phase 1B Services Integration Hook
// Provides unified access to Advanced Caching, Query Performance Analysis, and Index Optimization

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  advancedCacheService, 
  setCache, 
  getCache, 
  deleteCache, 
  hasCache, 
  clearCacheByTags, 
  getCacheStats, 
  getCacheConfig, 
  updateCacheConfig, 
  clearCache, 
  getCacheKeys, 
  getCacheSize 
} from '../services/advancedCacheService';

import { 
  queryPerformanceAnalyzer, 
  recordQuery, 
  getQueryMetrics, 
  getCollectionPerformance, 
  getOverallPerformance, 
  getQueryPatterns, 
  getOptimizationRecommendations, 
  updatePerformanceThresholds, 
  clearQueryHistory 
} from '../services/queryPerformanceAnalyzer';

import { 
  indexOptimizationEngine, 
  registerIndex, 
  analyzeQuery, 
  getIndexRecommendations, 
  getIndexHealthSummary, 
  getIndexUsageStats, 
  updateIndexUsage, 
  simulateIndexCreation, 
  generateIndexScript 
} from '../services/indexOptimizationEngine';

interface Phase1BStats {
  cache: {
    totalItems: number;
    totalSize: number;
    hitRate: number;
    missRate: number;
    evictionCount: number;
    averageAccessTime: number;
  };
  queries: {
    totalQueries: number;
    averageExecutionTime: number;
    performanceDistribution: Record<string, number>;
    criticalIssues: number;
  };
  indexes: {
    totalIndexes: number;
    healthScore: number;
    criticalIssues: number;
    optimizationOpportunities: number;
  };
}

interface Phase1BConfig {
  cache: {
    maxSize: number;
    maxItems: number;
    defaultTTL: number;
    evictionPolicy: 'lru' | 'lfu' | 'fifo' | 'random';
    enableCompression: boolean;
    enablePersistence: boolean;
  };
  performance: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
    critical: number;
  };
}

export const usePhase1BServices = () => {
  const [stats, setStats] = useState<Phase1BStats>({
    cache: {
      totalItems: 0,
      totalSize: 0,
      hitRate: 0,
      missRate: 0,
      evictionCount: 0,
      averageAccessTime: 0
    },
    queries: {
      totalQueries: 0,
      averageExecutionTime: 0,
      performanceDistribution: {},
      criticalIssues: 0
    },
    indexes: {
      totalIndexes: 0,
      healthScore: 0,
      criticalIssues: 0,
      optimizationOpportunities: 0
    }
  });

  const [config, setConfig] = useState<Phase1BConfig>({
    cache: {
      maxSize: 100 * 1024 * 1024, // 100MB
      maxItems: 10000,
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      evictionPolicy: 'lru',
      enableCompression: true,
      enablePersistence: false
    },
    performance: {
      excellent: 50,
      good: 100,
      fair: 250,
      poor: 500,
      critical: 1000
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update stats periodically
  useEffect(() => {
    const updateStats = () => {
      try {
        const cacheStats = getCacheStats();
        const queryStats = getOverallPerformance();
        const indexStats = getIndexHealthSummary();

        setStats({
          cache: {
            totalItems: cacheStats.totalItems,
            totalSize: cacheStats.totalSize,
            hitRate: cacheStats.hitRate,
            missRate: cacheStats.missRate,
            evictionCount: cacheStats.evictionCount,
            averageAccessTime: cacheStats.averageAccessTime
          },
          queries: {
            totalQueries: queryStats.totalQueries,
            averageExecutionTime: queryStats.averageExecutionTime,
            performanceDistribution: queryStats.performanceDistribution,
            criticalIssues: queryStats.criticalIssues.length
          },
          indexes: {
            totalIndexes: indexStats.totalIndexes,
            healthScore: indexStats.healthScore,
            criticalIssues: indexStats.criticalIssues,
            optimizationOpportunities: indexStats.optimizationOpportunities
          }
        });
      } catch (err) {
        setError(`Failed to update stats: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };

    // Update immediately
    updateStats();

    // Update every 30 seconds
    const interval = setInterval(updateStats, 30000);

    return () => clearInterval(interval);
  }, []);

  // Cache operations
  const cacheOperations = useMemo(() => ({
    set: setCache,
    get: getCache,
    delete: deleteCache,
    has: hasCache,
    clearByTags: clearCacheByTags,
    clear: clearCache,
    getKeys: getCacheKeys,
    getSize: getCacheSize
  }), []);

  // Query performance operations
  const queryOperations = useMemo(() => ({
    record: recordQuery,
    getMetrics: getQueryMetrics,
    getCollectionPerformance,
    getOverallPerformance,
    getPatterns: getQueryPatterns,
    getRecommendations: getOptimizationRecommendations,
    clearHistory: clearQueryHistory
  }), []);

  // Index optimization operations
  const indexOperations = useMemo(() => ({
    register: registerIndex,
    analyze: analyzeQuery,
    getRecommendations: getIndexRecommendations,
    getHealthSummary: getIndexHealthSummary,
    getUsageStats: getIndexUsageStats,
    updateUsage: updateIndexUsage,
    simulate: simulateIndexCreation,
    generateScript: generateIndexScript
  }), []);

  // Configuration management
  const updateCacheConfig = useCallback((updates: Partial<Phase1BConfig['cache']>) => {
    try {
      setConfig(prev => ({
        ...prev,
        cache: { ...prev.cache, ...updates }
      }));
      
      // Apply to service
      const serviceUpdates = {
        maxSize: updates.maxSize,
        maxItems: updates.maxItems,
        defaultTTL: updates.defaultTTL,
        evictionPolicy: updates.evictionPolicy,
        enableCompression: updates.enableCompression,
        enablePersistence: updates.enablePersistence
      };
      
      updateCacheConfig(serviceUpdates);
    } catch (err) {
      setError(`Failed to update cache config: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, []);

  const updatePerformanceThresholds = useCallback((updates: Partial<Phase1BConfig['performance']>) => {
    try {
      setConfig(prev => ({
        ...prev,
        performance: { ...prev.performance, ...updates }
      }));
      
      // Apply to service
      updatePerformanceThresholds(updates);
    } catch (err) {
      setError(`Failed to update performance thresholds: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, []);

  // Health check
  const healthCheck = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const results = await Promise.allSettled([
        Promise.resolve(getCacheStats()),
        Promise.resolve(getOverallPerformance()),
        Promise.resolve(getIndexHealthSummary())
      ]);

      const hasErrors = results.some(result => result.status === 'rejected');
      
      if (hasErrors) {
        const errors = results
          .map((result, index) => result.status === 'rejected' ? `Service ${index + 1}: ${result.reason}` : null)
          .filter(Boolean)
          .join('; ');
        
        setError(`Health check failed: ${errors}`);
        return false;
      }

      return true;
    } catch (err) {
      setError(`Health check failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Performance monitoring
  const monitorQuery = useCallback((query: string, collection: string, startTime: number, resultCount: number, resultSize: number, userId?: string, sessionId?: string) => {
    try {
      const executionTime = performance.now() - startTime;
      const queryId = recordQuery(query, collection, executionTime, resultCount, resultSize, userId, sessionId);
      
      // Also analyze for index optimization
      const analysis = analyzeQuery(query, collection);
      
      return { queryId, analysis };
    } catch (err) {
      setError(`Failed to monitor query: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return { queryId: '', analysis: null };
    }
  }, []);

  // Cache optimization
  const optimizeCache = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const currentStats = getCacheStats();
      const currentSize = getCacheSize();
      
      // Analyze cache efficiency
      const hitRate = currentStats.hitRate;
      const memoryUsage = currentSize.memory;
      
      let optimizations: string[] = [];
      
      if (hitRate < 0.7) {
        optimizations.push('Low hit rate detected - consider adjusting TTL or eviction policy');
      }
      
      if (memoryUsage > config.cache.maxSize * 0.8) {
        optimizations.push('High memory usage - consider reducing max size or enabling compression');
      }
      
      if (currentStats.evictionCount > 100) {
        optimizations.push('High eviction rate - consider increasing cache size or adjusting policy');
      }
      
      return {
        success: true,
        optimizations,
        currentStats,
        currentSize
      };
    } catch (err) {
      setError(`Cache optimization failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return { success: false, optimizations: [], currentStats: null, currentSize: null };
    } finally {
      setIsLoading(false);
    }
  }, [config.cache.maxSize]);

  // Index optimization
  const optimizeIndexes = useCallback(async (collection?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (collection) {
        const recommendations = getIndexRecommendations(collection);
        const healthSummary = getIndexHealthSummary();
        
        return {
          success: true,
          recommendations,
          healthSummary,
          collection
        };
      } else {
        const healthSummary = getIndexHealthSummary();
        const allRecommendations = healthSummary.recommendations;
        
        return {
          success: true,
          recommendations: allRecommendations,
          healthSummary,
          collection: 'all'
        };
      }
    } catch (err) {
      setError(`Index optimization failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return { success: false, recommendations: [], healthSummary: null, collection };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Reset all services
  const resetServices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        Promise.resolve(clearCache()),
        Promise.resolve(clearQueryHistory())
      ]);
      
      // Reset stats
      setStats({
        cache: {
          totalItems: 0,
          totalSize: 0,
          hitRate: 0,
          missRate: 0,
          evictionCount: 0,
          averageAccessTime: 0
        },
        queries: {
          totalQueries: 0,
          averageExecutionTime: 0,
          performanceDistribution: {},
          criticalIssues: 0
        },
        indexes: {
          totalIndexes: 0,
          healthScore: 0,
          criticalIssues: 0,
          optimizationOpportunities: 0
        }
      });
      
      return true;
    } catch (err) {
      setError(`Failed to reset services: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    // State
    stats,
    config,
    isLoading,
    error,
    
    // Operations
    cacheOperations,
    queryOperations,
    indexOperations,
    
    // Configuration
    updateCacheConfig,
    updatePerformanceThresholds,
    
    // Utilities
    healthCheck,
    monitorQuery,
    optimizeCache,
    optimizeIndexes,
    clearError,
    resetServices
  };
};

export default usePhase1BServices;
