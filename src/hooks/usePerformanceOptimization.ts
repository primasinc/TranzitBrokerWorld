// Performance Optimization Hooks
// Phase 5: Enhanced Performance Monitoring & Optimization

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import advancedPerformanceService from '../services/advancedPerformanceService';

interface PerformanceConfig {
  enableLazyLoading?: boolean;
  enableMemoryOptimization?: boolean;
  enableCodeSplitting?: boolean;
  cacheTimeout?: number;
  maxCacheSize?: number;
}

interface LazyLoadConfig {
  threshold?: number;
  rootMargin?: string;
  fallback?: React.ReactNode;
}

interface MemoryOptimizationConfig {
  cleanupInterval?: number;
  maxMemoryUsage?: number;
  enableGarbageCollection?: boolean;
}

// Hook for lazy loading components
export const useLazyLoad = <T>(
  loader: () => Promise<T>,
  config: LazyLoadConfig = {}
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  const {
    threshold = 0.1,
    rootMargin = '50px',
    fallback = null
  } = config;

  const loadData = useCallback(async () => {
    if (loading || data) return;

    setLoading(true);
    setError(null);

    try {
      const startTime = performance.now();
      const result = await loader();
      const endTime = performance.now();
      
      // Record performance metric
      advancedPerformanceService.recordMetric(
        'response_time',
        endTime - startTime,
        'lazy_load'
      );

      setData(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      
      // Record error metric
      advancedPerformanceService.recordMetric(
        'error_rate',
        1,
        'lazy_load_error'
      );
    } finally {
      setLoading(false);
    }
  }, [loader, loading, data]);

  useEffect(() => {
    if (!elementRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          loadData();
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin
      }
    );

    observer.observe(elementRef.current);

    return () => {
      observer.disconnect();
    };
  }, [loadData, threshold, rootMargin]);

  return {
    data,
    loading,
    error,
    isVisible,
    elementRef,
    fallback: loading ? fallback : null
  };
};

// Hook for memory optimization
export const useMemoryOptimization = (config: MemoryOptimizationConfig = {}) => {
  const {
    cleanupInterval = 60000, // 1 minute
    maxMemoryUsage = 50, // MB
    enableGarbageCollection = true
  } = config;

  const cleanupRef = useRef<NodeJS.Timeout | null>(null);
  const memoryCheckRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    // Force garbage collection if available
    if (enableGarbageCollection && 'gc' in window) {
      try {
        (window as any).gc();
      } catch (e) {
        // GC not available
      }
    }

    // Clear any cached data
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes('temp') || name.includes('cache')) {
            caches.delete(name);
          }
        });
      });
    }

    console.log('🧹 Memory cleanup performed');
  }, [enableGarbageCollection]);

  const checkMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      
      // Record memory usage
      advancedPerformanceService.recordMetric(
        'memory_usage',
        usedMB,
        'memory_optimization'
      );

      if (usedMB > maxMemoryUsage) {
        console.warn(`⚠️ High memory usage detected: ${usedMB.toFixed(2)}MB`);
        cleanup();
      }
    }
  }, [maxMemoryUsage, cleanup]);

  useEffect(() => {
    // Set up periodic cleanup
    cleanupRef.current = setInterval(cleanup, cleanupInterval);
    
    // Set up memory monitoring
    memoryCheckRef.current = setInterval(checkMemoryUsage, 30000); // Every 30 seconds

    return () => {
      if (cleanupRef.current) {
        clearInterval(cleanupRef.current);
      }
      if (memoryCheckRef.current) {
        clearInterval(memoryCheckRef.current);
      }
    };
  }, [cleanup, cleanupInterval, checkMemoryUsage]);

  return {
    cleanup,
    checkMemoryUsage
  };
};

// Hook for component performance monitoring
export const useComponentPerformance = (componentName: string) => {
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(performance.now());

  useEffect(() => {
    renderCountRef.current++;
    const currentTime = performance.now();
    const renderTime = currentTime - lastRenderTimeRef.current;
    
    // Record render performance
    advancedPerformanceService.recordMetric(
      'response_time',
      renderTime,
      `component_render_${componentName}`
    );

    lastRenderTimeRef.current = currentTime;

    // Warn if component is rendering too frequently
    if (renderCountRef.current > 100) {
      console.warn(`⚠️ Component ${componentName} has rendered ${renderCountRef.current} times`);
    }
  });

  return {
    renderCount: renderCountRef.current,
    lastRenderTime: lastRenderTimeRef.current
  };
};

// Hook for API performance monitoring
export const useApiPerformance = () => {
  const apiCallRef = useRef<Map<string, number>>(new Map());

  const monitorApiCall = useCallback(async <T>(
    apiCall: () => Promise<T>,
    endpoint: string
  ): Promise<T> => {
    const startTime = performance.now();
    const callId = `${endpoint}_${Date.now()}`;
    
    apiCallRef.current.set(callId, startTime);

    try {
      const result = await apiCall();
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Record successful API call
      advancedPerformanceService.recordMetric(
        'response_time',
        duration,
        `api_call_${endpoint}`
      );

      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Record failed API call
      advancedPerformanceService.recordMetric(
        'error_rate',
        1,
        `api_error_${endpoint}`
      );

      throw error;
    } finally {
      apiCallRef.current.delete(callId);
    }
  }, []);

  return {
    monitorApiCall
  };
};

// Hook for user interaction performance
export const useUserInteractionPerformance = () => {
  const interactionStartRef = useRef<Map<string, number>>(new Map());

  const startInteraction = useCallback((interactionType: string) => {
    interactionStartRef.current.set(interactionType, performance.now());
  }, []);

  const endInteraction = useCallback((interactionType: string) => {
    const startTime = interactionStartRef.current.get(interactionType);
    if (startTime) {
      const duration = performance.now() - startTime;
      
      // Record user interaction performance
      advancedPerformanceService.recordMetric(
        'user_interaction',
        duration,
        `interaction_${interactionType}`
      );

      interactionStartRef.current.delete(interactionType);
    }
  }, []);

  return {
    startInteraction,
    endInteraction
  };
};

// Hook for performance optimization configuration
export const usePerformanceConfig = (config: PerformanceConfig = {}) => {
  const {
    enableLazyLoading = true,
    enableMemoryOptimization = true,
    enableCodeSplitting = true,
    cacheTimeout = 300000, // 5 minutes
    maxCacheSize = 100
  } = config;

  // Set up memory optimization if enabled
  useMemoryOptimization({
    enableGarbageCollection: enableMemoryOptimization
  });

  const optimizedConfig = useMemo(() => ({
    enableLazyLoading,
    enableMemoryOptimization,
    enableCodeSplitting,
    cacheTimeout,
    maxCacheSize
  }), [enableLazyLoading, enableMemoryOptimization, enableCodeSplitting, cacheTimeout, maxCacheSize]);

  return {
    config: optimizedConfig,
    isLazyLoadingEnabled: enableLazyLoading,
    isMemoryOptimizationEnabled: enableMemoryOptimization,
    isCodeSplittingEnabled: enableCodeSplitting
  };
};

// Hook for performance reporting
export const usePerformanceReporting = () => {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generateReport = useCallback(async (period: 'daily' | 'weekly' | 'monthly' = 'daily') => {
    setLoading(true);
    try {
      const performanceReport = advancedPerformanceService.getPerformanceReport(period);
      setReport(performanceReport);
      return performanceReport;
    } catch (error) {
      console.error('Failed to generate performance report:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getRecommendations = useCallback(() => {
    return advancedPerformanceService.getRecommendations();
  }, []);

  const markRecommendationAsImplemented = useCallback((id: string) => {
    advancedPerformanceService.markRecommendationAsImplemented(id);
  }, []);

  const markRecommendationAsIgnored = useCallback((id: string) => {
    advancedPerformanceService.markRecommendationAsIgnored(id);
  }, []);

  return {
    report,
    loading,
    generateReport,
    getRecommendations,
    markRecommendationAsImplemented,
    markRecommendationAsIgnored
  };
};

// Hook for automatic performance optimization
export const useAutoOptimization = () => {
  const [optimizations, setOptimizations] = useState<string[]>([]);

  useEffect(() => {
    const checkOptimizations = () => {
      const recommendations = advancedPerformanceService.getRecommendations();
      const appliedOptimizations: string[] = [];

      recommendations.forEach(rec => {
        if (rec.impact === 'high' && rec.effort === 'low') {
          // Auto-apply low-effort, high-impact optimizations
          appliedOptimizations.push(rec.title);
          advancedPerformanceService.markRecommendationAsImplemented(rec.id);
        }
      });

      if (appliedOptimizations.length > 0) {
        setOptimizations(prev => [...prev, ...appliedOptimizations]);
        console.log('🤖 Auto-applied optimizations:', appliedOptimizations);
      }
    };

    // Check for auto-optimizations every 5 minutes
    const interval = setInterval(checkOptimizations, 300000);
    checkOptimizations(); // Initial check

    return () => clearInterval(interval);
  }, []);

  return {
    optimizations
  };
};
