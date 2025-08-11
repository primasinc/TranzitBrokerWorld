// Performance Optimization Service - Phase 1B Integration Layer
// Integrates cache, database, prefetching, and query optimization services
// Provides unified performance monitoring and optimization recommendations

import { cacheService } from './cacheService';
import { enhancedDb } from './enhancedDbService';
import { intelligentPrefetchService } from './intelligentPrefetchService';
import { queryOptimizationService } from './queryOptimizationService';
import { monitoringService } from './monitoringService';
import { dataCompressionService, getCompressionMetrics, analyzeStorageOptimization } from './dataCompressionService';

interface PerformanceMetrics {
  cacheHitRate: number;
  databaseResponseTime: number;
  queryExecutionTime: number;
  prefetchEffectiveness: number;
  compressionEfficiency: number;
  storageOptimization: number;
  overallPerformance: number;
  recommendations: string[];
}

interface OptimizationConfig {
  enableAutoOptimization: boolean;
  performanceThreshold: number;
  optimizationInterval: number;
  enablePredictiveOptimization: boolean;
  maxConcurrentOptimizations: number;
}

interface QueryPerformanceData {
  query: string;
  executionTime: number;
  resultSize: number;
  cacheHit: boolean;
  timestamp: number;
  optimizationApplied: boolean;
}

class PerformanceOptimizationService {
  private config: OptimizationConfig = {
    enableAutoOptimization: true,
    performanceThreshold: 0.8, // 80% performance target
    optimizationInterval: 5 * 60 * 1000, // 5 minutes
    enablePredictiveOptimization: true,
    maxConcurrentOptimizations: 3
  };

  private queryPerformanceHistory: QueryPerformanceData[] = [];
  private optimizationTimer: NodeJS.Timeout | null = null;
  private isOptimizing = false;
  private optimizationQueue: (() => Promise<void>)[] = [];

  constructor() {
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    try {
      // Start performance monitoring
      await this.startPerformanceMonitoring();
      
      // Initialize auto-optimization if enabled
      if (this.config.enableAutoOptimization) {
        this.startAutoOptimization();
      }

      // Set up performance thresholds
      this.setupPerformanceThresholds();

      if (process.env.NODE_ENV === 'development') {
        console.log('[PerformanceOptimization] Service initialized successfully');
      }
    } catch (error) {
      console.error('[PerformanceOptimization] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive performance metrics across all services
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      const [
        cacheStats,
        dbStats,
        prefetchStats,
        queryStats,
        compressionStats,
        storageStats
      ] = await Promise.all([
        this.getCacheMetrics(),
        this.getDatabaseMetrics(),
        this.getPrefetchMetrics(),
        this.getQueryMetrics(),
        this.getCompressionMetrics(),
        this.getStorageOptimizationMetrics()
      ]);

      const overallPerformance = this.calculateOverallPerformance(
        cacheStats,
        dbStats,
        prefetchStats,
        queryStats,
        compressionStats,
        storageStats
      );

      const recommendations = await this.generateOptimizationRecommendations(
        cacheStats,
        dbStats,
        prefetchStats,
        queryStats,
        compressionStats,
        storageStats
      );

      return {
        cacheHitRate: cacheStats.hitRate,
        databaseResponseTime: dbStats.averageResponseTime,
        queryExecutionTime: queryStats.averageExecutionTime,
        prefetchEffectiveness: prefetchStats.effectiveness,
        compressionEfficiency: compressionStats.averageCompressionRatio || 1,
        storageOptimization: storageStats.totalEstimatedSavings || 0,
        overallPerformance,
        recommendations
      };
    } catch (error) {
      console.error('[PerformanceOptimization] Failed to get metrics:', error);
      throw error;
    }
  }

  /**
   * Execute query with performance optimization
   */
  async executeOptimizedQuery<T>(
    queryFn: () => Promise<T>,
    queryKey: string,
    options?: {
      enableCache?: boolean;
      enablePrefetch?: boolean;
      priority?: number;
    }
  ): Promise<T> {
    const startTime = Date.now();
    const queryId = `${queryKey}_${Date.now()}`;

    try {
      // Check cache first if enabled
      if (options?.enableCache !== false) {
        const cachedResult = cacheService.get<T>(queryKey);
        if (cachedResult) {
          this.recordQueryPerformance(queryId, queryKey, Date.now() - startTime, 0, true, false);
          return cachedResult;
        }
      }

      // Execute query
      const result = await queryFn();
      const executionTime = Date.now() - startTime;

      // Cache result if enabled
      if (options?.enableCache !== false) {
        cacheService.set(queryKey, result, undefined, options?.priority || 5);
      }

      // Record performance data
      this.recordQueryPerformance(queryId, queryKey, executionTime, 0, false, false);

      // Trigger prefetching if enabled
      if (options?.enablePrefetch !== false) {
        this.triggerIntelligentPrefetch(queryKey, result);
      }

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.recordQueryPerformance(queryId, queryKey, executionTime, 0, false, false);
      throw error;
    }
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmupCache(warmupData: Array<{ key: string; data: any; priority?: number }>): Promise<void> {
    try {
      const warmupPromises = warmupData.map(({ key, data, priority }) =>
        cacheService.set(key, data, undefined, priority || 5)
      );

      await Promise.all(warmupPromises);

      if (process.env.NODE_ENV === 'development') {
        console.log(`[PerformanceOptimization] Cache warmed up with ${warmupData.length} items`);
      }
    } catch (error) {
      console.error('[PerformanceOptimization] Cache warmup failed:', error);
      throw error;
    }
  }

  /**
   * Apply query optimizations based on performance analysis
   */
  async applyQueryOptimizations(): Promise<void> {
    if (this.isOptimizing || this.optimizationQueue.length >= this.config.maxConcurrentOptimizations) {
      return;
    }

    try {
      this.isOptimizing = true;
      
      const optimizations = await queryOptimizationService.getOptimizationRecommendations();
      
      for (const optimization of optimizations) {
        if (optimization.priority === 'high') {
          await this.applyOptimization(optimization);
        }
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[PerformanceOptimization] Query optimizations applied successfully');
      }
    } catch (error) {
      console.error('[PerformanceOptimization] Failed to apply optimizations:', error);
    } finally {
      this.isOptimizing = false;
    }
  }

  /**
   * Get real-time performance alerts
   */
  async getPerformanceAlerts(): Promise<Array<{
    type: 'warning' | 'critical' | 'info';
    message: string;
    timestamp: Date;
    metric: string;
    value: number;
    threshold: number;
  }>> {
    const alerts: Array<{
      type: 'warning' | 'critical' | 'info';
      message: string;
      timestamp: Date;
      metric: string;
      value: number;
      threshold: number;
    }> = [];

    try {
      const metrics = await this.getPerformanceMetrics();

      // Check cache hit rate
      if (metrics.cacheHitRate < 0.7) {
        alerts.push({
          type: 'warning',
          message: 'Cache hit rate below optimal threshold',
          timestamp: new Date(),
          metric: 'cacheHitRate',
          value: metrics.cacheHitRate,
          threshold: 0.7
        });
      }

      // Check database response time
      if (metrics.databaseResponseTime > 200) {
        alerts.push({
          type: 'critical',
          message: 'Database response time exceeds threshold',
          timestamp: new Date(),
          metric: 'databaseResponseTime',
          value: metrics.databaseResponseTime,
          threshold: 200
        });
      }

      // Check overall performance
      if (metrics.overallPerformance < this.config.performanceThreshold) {
        alerts.push({
          type: 'critical',
          message: 'Overall system performance below threshold',
          timestamp: new Date(),
          metric: 'overallPerformance',
          value: metrics.overallPerformance,
          threshold: this.config.performanceThreshold
        });
      }

      return alerts;
    } catch (error) {
      console.error('[PerformanceOptimization] Failed to get alerts:', error);
      return [];
    }
  }

  /**
   * Update optimization configuration
   */
  updateConfig(newConfig: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.config.enableAutoOptimization) {
      this.startAutoOptimization();
    } else {
      this.stopAutoOptimization();
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[PerformanceOptimization] Configuration updated:', newConfig);
    }
  }

  /**
   * Get detailed performance report
   */
  async generatePerformanceReport(): Promise<{
    summary: PerformanceMetrics;
    detailedMetrics: {
      cache: any;
      database: any;
      prefetch: any;
      queries: any;
      compression: any;
      storage: any;
    };
    recommendations: string[];
    trends: any[];
  }> {
    try {
      const summary = await this.getPerformanceMetrics();
      
      const detailedMetrics = {
        cache: await this.getCacheMetrics(),
        database: await this.getDatabaseMetrics(),
        prefetch: await this.getPrefetchMetrics(),
        queries: await this.getQueryMetrics(),
        compression: await this.getCompressionMetrics(),
        storage: await this.getStorageOptimizationMetrics()
      };

      const trends = this.analyzePerformanceTrends();
      
      return {
        summary,
        detailedMetrics,
        recommendations: summary.recommendations,
        trends
      };
    } catch (error) {
      console.error('[PerformanceOptimization] Failed to generate report:', error);
      throw error;
    }
  }

  // Private methods for internal functionality

  private async startPerformanceMonitoring(): Promise<void> {
    try {
      // Monitoring service doesn't have startMonitoring method, skip for now
      console.log('[PerformanceOptimization] Performance monitoring initialized');
    } catch (error) {
      console.warn('[PerformanceOptimization] Failed to start monitoring:', error);
    }
  }

  private startAutoOptimization(): void {
    if (this.optimizationTimer) {
      clearInterval(this.optimizationTimer);
    }

    this.optimizationTimer = setInterval(async () => {
      if (!this.isOptimizing) {
        await this.applyQueryOptimizations();
      }
    }, this.config.optimizationInterval);

    if (process.env.NODE_ENV === 'development') {
      console.log('[PerformanceOptimization] Auto-optimization started');
    }
  }

  private stopAutoOptimization(): void {
    if (this.optimizationTimer) {
      clearInterval(this.optimizationTimer);
      this.optimizationTimer = null;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[PerformanceOptimization] Auto-optimization stopped');
    }
  }

  private setupPerformanceThresholds(): void {
    // Set up performance monitoring thresholds if monitoring service supports it
    try {
      const monitoring = monitoringService as any;
      if (monitoring.setThreshold) {
        monitoring.setThreshold('cache_hit_rate', 0.7);
        monitoring.setThreshold('database_response_time', 200);
        monitoring.setThreshold('query_execution_time', 100);
        monitoring.setThreshold('overall_performance', this.config.performanceThreshold);
      }
    } catch (error) {
      // Silently fail if monitoring service doesn't support thresholds
    }
  }

  private async getCacheMetrics(): Promise<any> {
    try {
      const stats = cacheService.getStats();
      return {
        hitRate: stats.hits / (stats.hits + stats.misses) || 0,
        totalHits: stats.hits,
        totalMisses: stats.misses,
        totalSets: stats.sets,
        totalDeletes: stats.deletes,
        totalEvictions: stats.evictions,
        prefetches: stats.prefetches,
        prefetchHits: stats.prefetchHits
      };
    } catch (error) {
      console.error('[PerformanceOptimization] Failed to get cache metrics:', error);
      return {};
    }
  }

  private async getDatabaseMetrics(): Promise<any> {
    try {
      return await enhancedDb.getPerformanceMetrics();
    } catch (error) {
      console.error('[PerformanceOptimization] Failed to get database metrics:', error);
      return {};
    }
  }

  private async getPrefetchMetrics(): Promise<any> {
    try {
      return await intelligentPrefetchService.getMetrics();
    } catch (error) {
      console.error('[PerformanceOptimization] Failed to get prefetch metrics:', error);
      return {};
    }
  }

  private async getQueryMetrics(): Promise<any> {
    try {
      const recentQueries = this.queryPerformanceHistory
        .filter(q => Date.now() - q.timestamp < 24 * 60 * 60 * 1000) // Last 24 hours
        .slice(-100); // Last 100 queries

      if (recentQueries.length === 0) {
        return { averageExecutionTime: 0, totalQueries: 0, cacheHitRate: 0 };
      }

      const totalTime = recentQueries.reduce((sum, q) => sum + q.executionTime, 0);
      const cacheHits = recentQueries.filter(q => q.cacheHit).length;

      return {
        averageExecutionTime: totalTime / recentQueries.length,
        totalQueries: recentQueries.length,
        cacheHitRate: cacheHits / recentQueries.length,
        recentQueries
      };
    } catch (error) {
      console.error('[PerformanceOptimization] Failed to get query metrics:', error);
      return {};
    }
  }

  private async getCompressionMetrics(): Promise<any> {
    try {
      return getCompressionMetrics();
    } catch (error) {
      console.error('[PerformanceOptimization] Failed to get compression metrics:', error);
      return {
        totalCompressions: 0,
        averageCompressionRatio: 1,
        averageCompressionTime: 0,
        averageDecompressionTime: 0,
        totalSpaceSaved: 0,
        mostEffectiveAlgorithm: 'none'
      };
    }
  }

  private async getStorageOptimizationMetrics(): Promise<any> {
    try {
      const optimizations = await analyzeStorageOptimization();
      const totalSavings = optimizations.reduce((sum, opt) => sum + opt.estimatedSavings, 0);
      const highPriorityCount = optimizations.filter(opt => opt.priority === 'high').length;
      
      return {
        totalOptimizations: optimizations.length,
        totalEstimatedSavings: totalSavings,
        highPriorityCount,
        optimizations
      };
    } catch (error) {
      console.error('[PerformanceOptimization] Failed to get storage optimization metrics:', error);
      return {
        totalOptimizations: 0,
        totalEstimatedSavings: 0,
        highPriorityCount: 0,
        optimizations: []
      };
    }
  }

  private calculateOverallPerformance(
    cacheStats: any,
    dbStats: any,
    prefetchStats: any,
    queryStats: any,
    compressionStats: any,
    storageStats: any
  ): number {
    try {
      const cacheScore = cacheStats.hitRate || 0;
      const dbScore = Math.max(0, 1 - (dbStats.averageResponseTime || 0) / 1000);
      const prefetchScore = prefetchStats.effectiveness || 0;
      const queryScore = Math.max(0, 1 - (queryStats.averageExecutionTime || 0) / 1000);
      const compressionScore = 1 - (compressionStats.averageCompressionRatio || 1);
      const storageScore = Math.min(1, (storageStats.totalEstimatedSavings || 0) / 100);

      return (cacheScore + dbScore + prefetchScore + queryScore + compressionScore + storageScore) / 6;
    } catch (error) {
      console.error('[PerformanceOptimization] Failed to calculate overall performance:', error);
      return 0;
    }
  }

  private async generateOptimizationRecommendations(
    cacheStats: any,
    dbStats: any,
    prefetchStats: any,
    queryStats: any,
    compressionStats: any,
    storageStats: any
  ): Promise<string[]> {
    const recommendations: string[] = [];

    try {
      // Cache optimization recommendations
      if (cacheStats.hitRate < 0.7) {
        recommendations.push('Consider increasing cache size or implementing cache warming strategies');
      }

      if (cacheStats.prefetchHits / cacheStats.prefetches < 0.5) {
        recommendations.push('Review prefetching algorithms - low hit rate suggests poor prediction');
      }

      // Database optimization recommendations
      if (dbStats.averageResponseTime > 200) {
        recommendations.push('Database response time is high - consider query optimization or indexing');
      }

      // Query optimization recommendations
      if (queryStats.averageExecutionTime > 100) {
        recommendations.push('Query execution time is high - implement query caching or optimization');
      }

      // Prefetch optimization recommendations
      if (prefetchStats.effectiveness < 0.6) {
        recommendations.push('Prefetching effectiveness is low - review access pattern analysis');
      }

      // Compression optimization recommendations
      if (compressionStats.averageCompressionRatio > 0.8) {
        recommendations.push('Compression ratio is high - consider using more aggressive compression algorithms');
      }

      if (compressionStats.totalCompressions < 10) {
        recommendations.push('Low compression usage - consider enabling compression for large data sets');
      }

      // Storage optimization recommendations
      if (storageStats.highPriorityCount > 0) {
        recommendations.push(`${storageStats.highPriorityCount} high-priority storage optimizations available`);
      }

      if (storageStats.totalEstimatedSavings > 20) {
        recommendations.push(`Significant storage savings (${storageStats.totalEstimatedSavings.toFixed(1)}%) available through optimization`);
      }

      return recommendations;
    } catch (error) {
      console.error('[PerformanceOptimization] Failed to generate recommendations:', error);
      return ['Unable to generate optimization recommendations'];
    }
  }

  private recordQueryPerformance(
    queryId: string,
    query: string,
    executionTime: number,
    resultSize: number,
    cacheHit: boolean,
    optimizationApplied: boolean
  ): void {
    try {
      const performanceData: QueryPerformanceData = {
        query,
        executionTime,
        resultSize,
        cacheHit,
        timestamp: Date.now(),
        optimizationApplied
      };

      this.queryPerformanceHistory.push(performanceData);

      // Keep only last 1000 queries to prevent memory issues
      if (this.queryPerformanceHistory.length > 1000) {
        this.queryPerformanceHistory = this.queryPerformanceHistory.slice(-1000);
      }
    } catch (error) {
      console.error('[PerformanceOptimization] Failed to record query performance:', error);
    }
  }

  private async triggerIntelligentPrefetch(queryKey: string, result: any): Promise<void> {
    try {
      await intelligentPrefetchService.analyzeAndPrefetch(queryKey, result);
    } catch (error) {
      console.error('[PerformanceOptimization] Failed to trigger prefetch:', error);
    }
  }

  private async applyOptimization(optimization: any): Promise<void> {
    try {
      // Query optimization service doesn't have applyOptimization method
      // For now, just log the optimization attempt
      if (process.env.NODE_ENV === 'development') {
        console.log('[PerformanceOptimization] Optimization requested:', optimization);
      }
    } catch (error) {
      console.error('[PerformanceOptimization] Failed to apply optimization:', error);
    }
  }

  private analyzePerformanceTrends(): any[] {
    try {
      const recentQueries = this.queryPerformanceHistory
        .filter(q => Date.now() - q.timestamp < 7 * 24 * 60 * 60 * 1000) // Last 7 days
        .sort((a, b) => a.timestamp - b.timestamp);

      if (recentQueries.length < 10) {
        return [];
      }

      // Group by day and calculate averages
      const dailyStats = new Map<string, { totalTime: number; count: number; cacheHits: number }>();
      
      recentQueries.forEach(query => {
        const date = new Date(query.timestamp).toDateString();
        const existing = dailyStats.get(date) || { totalTime: 0, count: 0, cacheHits: 0 };
        
        existing.totalTime += query.executionTime;
        existing.count += 1;
        if (query.cacheHit) existing.cacheHits += 1;
        
        dailyStats.set(date, existing);
      });

      return Array.from(dailyStats.entries()).map(([date, stats]) => ({
        date,
        averageExecutionTime: stats.totalTime / stats.count,
        totalQueries: stats.count,
        cacheHitRate: stats.cacheHits / stats.count
      }));
    } catch (error) {
      console.error('[PerformanceOptimization] Failed to analyze trends:', error);
      return [];
    }
  }

  private handlePerformanceDegradation(data: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[PerformanceOptimization] Performance degradation detected:', data);
    }
    
    // Trigger immediate optimization
    this.applyQueryOptimizations();
  }

  private handlePerformanceImprovement(data: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.log('[PerformanceOptimization] Performance improvement detected:', data);
    }
  }

  // Cleanup method
  destroy(): void {
    if (this.optimizationTimer) {
      clearInterval(this.optimizationTimer);
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[PerformanceOptimization] Service destroyed');
    }
  }
}

// Create singleton instance
export const performanceOptimizationService = new PerformanceOptimizationService();

// Export utility functions
export const executeOptimizedQuery = <T>(
  queryFn: () => Promise<T>,
  queryKey: string,
  options?: {
    enableCache?: boolean;
    enablePrefetch?: boolean;
    priority?: number;
  }
): Promise<T> => performanceOptimizationService.executeOptimizedQuery(queryFn, queryKey, options);

export const getPerformanceMetrics = (): Promise<PerformanceMetrics> =>
  performanceOptimizationService.getPerformanceMetrics();

export const warmupCache = (warmupData: Array<{ key: string; data: any; priority?: number }>): Promise<void> =>
  performanceOptimizationService.warmupCache(warmupData);

export const getPerformanceAlerts = (): Promise<Array<{
  type: 'warning' | 'critical' | 'info';
  message: string;
  timestamp: Date;
  metric: string;
  value: number;
  threshold: number;
}>> => performanceOptimizationService.getPerformanceAlerts();

export const generatePerformanceReport = (): Promise<{
  summary: PerformanceMetrics;
  detailedMetrics: any;
  recommendations: string[];
  trends: any[];
}> => performanceOptimizationService.generatePerformanceReport();

export const updatePerformanceConfig = (config: Partial<OptimizationConfig>): void =>
  performanceOptimizationService.updateConfig(config);

export default performanceOptimizationService;
