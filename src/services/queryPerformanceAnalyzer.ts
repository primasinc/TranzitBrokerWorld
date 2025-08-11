// Query Performance Analyzer - Phase 1B
// Analyzes query performance, identifies bottlenecks, and provides optimization recommendations

interface QueryMetrics {
  queryId: string;
  query: string;
  collection: string;
  executionTime: number;
  resultCount: number;
  resultSize: number;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  performance: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  bottlenecks: string[];
  recommendations: string[];
}

interface PerformanceThresholds {
  excellent: number; // milliseconds
  good: number;
  fair: number;
  poor: number;
  critical: number;
}

interface QueryPattern {
  pattern: string;
  frequency: number;
  averageExecutionTime: number;
  totalExecutions: number;
  lastExecuted: number;
  performanceTrend: 'improving' | 'stable' | 'degrading';
}

interface OptimizationRecommendation {
  type: 'index' | 'query' | 'structure' | 'caching' | 'pagination';
  priority: 'high' | 'medium' | 'low';
  description: string;
  expectedImprovement: number; // percentage
  implementationEffort: 'low' | 'medium' | 'high';
  code: string;
}

class QueryPerformanceAnalyzer {
  private queryHistory: QueryMetrics[] = [];
  private queryPatterns = new Map<string, QueryPattern>();
  private performanceThresholds: PerformanceThresholds;
  private isActive = false;
  private analysisTimer?: NodeJS.Timeout;
  private maxHistorySize = 10000;
  private analysisInterval = 60000; // 1 minute

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    this.performanceThresholds = {
      excellent: 50,    // < 50ms
      good: 100,        // < 100ms
      fair: 250,        // < 250ms
      poor: 500,        // < 500ms
      critical: 1000,   // >= 1000ms
      ...thresholds
    };

    this.start();
  }

  start(): void {
    if (this.isActive) return;
    this.isActive = true;
    
    // Start periodic analysis
    this.analysisTimer = setInterval(() => {
      this.analyzeQueryPatterns();
    }, this.analysisInterval);

    console.log('[QueryPerformanceAnalyzer] Service started');
  }

  stop(): void {
    if (!this.isActive) return;
    this.isActive = false;
    
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
    }

    console.log('[QueryPerformanceAnalyzer] Service stopped');
  }

  /**
   * Record a query execution for analysis
   */
  recordQuery(query: string, collection: string, executionTime: number, resultCount: number, resultSize: number, userId?: string, sessionId?: string): string {
    if (!this.isActive) return '';

    const queryId = this.generateQueryId();
    const performance = this.categorizePerformance(executionTime);
    const bottlenecks = this.identifyBottlenecks(executionTime, resultCount, resultSize);
    const recommendations = this.generateRecommendations(query, collection, executionTime, resultCount, resultSize);

    const metrics: QueryMetrics = {
      queryId,
      query,
      collection,
      executionTime,
      resultCount,
      resultSize,
      timestamp: Date.now(),
      userId,
      sessionId,
      performance,
      bottlenecks,
      recommendations
    };

    this.queryHistory.push(metrics);
    this.updateQueryPatterns(query, collection, executionTime);
    
    // Maintain history size
    if (this.queryHistory.length > this.maxHistorySize) {
      this.queryHistory = this.queryHistory.slice(-this.maxHistorySize);
    }

    return queryId;
  }

  /**
   * Get performance metrics for a specific query
   */
  getQueryMetrics(queryId: string): QueryMetrics | null {
    return this.queryHistory.find(metric => metric.queryId === queryId) || null;
  }

  /**
   * Get performance summary for a collection
   */
  getCollectionPerformance(collection: string): {
    totalQueries: number;
    averageExecutionTime: number;
    performanceDistribution: Record<string, number>;
    topSlowQueries: QueryMetrics[];
    recommendations: OptimizationRecommendation[];
  } {
    const collectionQueries = this.queryHistory.filter(q => q.collection === collection);
    
    if (collectionQueries.length === 0) {
      return {
        totalQueries: 0,
        averageExecutionTime: 0,
        performanceDistribution: {},
        topSlowQueries: [],
        recommendations: []
      };
    }

    const totalQueries = collectionQueries.length;
    const averageExecutionTime = collectionQueries.reduce((sum, q) => sum + q.executionTime, 0) / totalQueries;
    
    const performanceDistribution = collectionQueries.reduce((acc, q) => {
      acc[q.performance] = (acc[q.performance] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topSlowQueries = collectionQueries
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10);

    const recommendations = this.generateCollectionRecommendations(collection, collectionQueries);

    return {
      totalQueries,
      averageExecutionTime,
      performanceDistribution,
      topSlowQueries,
      recommendations
    };
  }

  /**
   * Get overall performance summary
   */
  getOverallPerformance(): {
    totalQueries: number;
    averageExecutionTime: number;
    performanceDistribution: Record<string, number>;
    topCollections: Array<{ collection: string; queryCount: number; averageTime: number }>;
    criticalIssues: QueryMetrics[];
  } {
    if (this.queryHistory.length === 0) {
      return {
        totalQueries: 0,
        averageExecutionTime: 0,
        performanceDistribution: {},
        topCollections: [],
        criticalIssues: []
      };
    }

    const totalQueries = this.queryHistory.length;
    const averageExecutionTime = this.queryHistory.reduce((sum, q) => sum + q.executionTime, 0) / totalQueries;
    
    const performanceDistribution = this.queryHistory.reduce((acc, q) => {
      acc[q.performance] = (acc[q.performance] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group by collection
    const collectionStats = new Map<string, { count: number; totalTime: number }>();
    this.queryHistory.forEach(q => {
      const current = collectionStats.get(q.collection) || { count: 0, totalTime: 0 };
      collectionStats.set(q.collection, {
        count: current.count + 1,
        totalTime: current.totalTime + q.executionTime
      });
    });

    const topCollections = Array.from(collectionStats.entries())
      .map(([collection, stats]) => ({
        collection,
        queryCount: stats.count,
        averageTime: stats.totalTime / stats.count
      }))
      .sort((a, b) => b.queryCount - a.queryCount)
      .slice(0, 10);

    const criticalIssues = this.queryHistory
      .filter(q => q.performance === 'critical')
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20);

    return {
      totalQueries,
      averageExecutionTime,
      performanceDistribution,
      topCollections,
      criticalIssues
    };
  }

  /**
   * Get query patterns analysis
   */
  getQueryPatterns(): QueryPattern[] {
    return Array.from(this.queryPatterns.values())
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    
    // Analyze slow queries
    const slowQueries = this.queryHistory.filter(q => q.performance === 'poor' || q.performance === 'critical');
    
    slowQueries.forEach(query => {
      const queryRecommendations = this.generateRecommendations(
        query.query, 
        query.collection, 
        query.executionTime, 
        query.resultCount, 
        query.resultSize
      );
      
      queryRecommendations.forEach(rec => {
        recommendations.push({
          type: rec.type as any,
          priority: query.performance === 'critical' ? 'high' : 'medium',
          description: rec,
          expectedImprovement: this.calculateExpectedImprovement(query.executionTime),
          implementationEffort: this.estimateImplementationEffort(rec),
          code: this.generateOptimizationCode(rec, query)
        });
      });
    });

    // Remove duplicates and sort by priority
    const uniqueRecommendations = this.removeDuplicateRecommendations(recommendations);
    return uniqueRecommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Update performance thresholds
   */
  updateThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.performanceThresholds = { ...this.performanceThresholds, ...thresholds };
    console.log('[QueryPerformanceAnalyzer] Performance thresholds updated:', thresholds);
  }

  /**
   * Clear query history
   */
  clearHistory(): void {
    this.queryHistory = [];
    this.queryPatterns.clear();
    console.log('[QueryPerformanceAnalyzer] Query history cleared');
  }

  // Private methods

  private generateQueryId(): string {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private categorizePerformance(executionTime: number): QueryMetrics['performance'] {
    if (executionTime < this.performanceThresholds.excellent) return 'excellent';
    if (executionTime < this.performanceThresholds.good) return 'good';
    if (executionTime < this.performanceThresholds.fair) return 'fair';
    if (executionTime < this.performanceThresholds.poor) return 'poor';
    return 'critical';
  }

  private identifyBottlenecks(executionTime: number, resultCount: number, resultSize: number): string[] {
    const bottlenecks: string[] = [];

    if (executionTime > this.performanceThresholds.critical) {
      bottlenecks.push('Critical execution time - possible missing indexes or inefficient query structure');
    }

    if (resultCount > 1000) {
      bottlenecks.push('Large result set - consider pagination or limiting results');
    }

    if (resultSize > 1024 * 1024) { // 1MB
      bottlenecks.push('Large result size - consider data compression or field selection');
    }

    if (executionTime > this.performanceThresholds.poor && resultCount < 100) {
      bottlenecks.push('Slow query with small result set - possible missing indexes');
    }

    return bottlenecks;
  }

  private generateRecommendations(query: string, collection: string, executionTime: number, resultCount: number, resultSize: number): string[] {
    const recommendations: string[] = [];

    if (executionTime > this.performanceThresholds.poor) {
      recommendations.push(`Add composite index on ${collection} collection for frequently queried fields`);
      recommendations.push(`Consider implementing query result caching for ${collection}`);
    }

    if (resultCount > 1000) {
      recommendations.push(`Implement pagination for ${collection} queries to limit result size`);
      recommendations.push(`Add limit() to ${collection} queries to prevent large result sets`);
    }

    if (resultSize > 1024 * 1024) {
      recommendations.push(`Select only necessary fields in ${collection} queries to reduce data transfer`);
      recommendations.push(`Implement data compression for ${collection} results`);
    }

    if (query.includes('orderBy') && !query.includes('limit')) {
      recommendations.push(`Add limit() to ordered queries in ${collection} to improve performance`);
    }

    return recommendations;
  }

  private updateQueryPatterns(query: string, collection: string, executionTime: number): void {
    const pattern = this.extractQueryPattern(query);
    const key = `${collection}:${pattern}`;
    
    const existing = this.queryPatterns.get(key);
    if (existing) {
      existing.frequency++;
      existing.totalExecutions++;
      existing.lastExecuted = Date.now();
      
      // Update performance trend
      const newAverage = (existing.averageExecutionTime * (existing.totalExecutions - 1) + executionTime) / existing.totalExecutions;
      if (newAverage < existing.averageExecutionTime * 0.9) {
        existing.performanceTrend = 'improving';
      } else if (newAverage > existing.averageExecutionTime * 1.1) {
        existing.performanceTrend = 'degrading';
      } else {
        existing.performanceTrend = 'stable';
      }
      
      existing.averageExecutionTime = newAverage;
    } else {
      this.queryPatterns.set(key, {
        pattern,
        frequency: 1,
        averageExecutionTime: executionTime,
        totalExecutions: 1,
        lastExecuted: Date.now(),
        performanceTrend: 'stable'
      });
    }
  }

  private extractQueryPattern(query: string): string {
    // Extract the basic structure of the query for pattern analysis
    // This is a simplified version - in production, use more sophisticated parsing
    return query
      .replace(/\s+/g, ' ')
      .replace(/['"]/g, '')
      .replace(/\d+/g, 'N')
      .trim();
  }

  private analyzeQueryPatterns(): void {
    // Analyze patterns and generate insights
    const patterns = this.getQueryPatterns();
    
    patterns.forEach(pattern => {
      if (pattern.performanceTrend === 'degrading' && pattern.frequency > 5) {
        console.warn(`[QueryPerformanceAnalyzer] Performance degrading for pattern: ${pattern.pattern}`);
      }
    });
  }

  private generateCollectionRecommendations(collection: string, queries: QueryMetrics[]): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    
    const slowQueries = queries.filter(q => q.performance === 'poor' || q.performance === 'critical');
    if (slowQueries.length > 0) {
      recommendations.push({
        type: 'index',
        priority: 'high',
        description: `Add composite indexes for ${collection} collection to improve query performance`,
        expectedImprovement: 60,
        implementationEffort: 'medium',
        code: `// Add composite index for ${collection}\ndb.${collection}.createIndex({ field1: 1, field2: 1 })`
      });
    }

    const largeResultQueries = queries.filter(q => q.resultCount > 1000);
    if (largeResultQueries.length > 0) {
      recommendations.push({
        type: 'pagination',
        priority: 'medium',
        description: `Implement pagination for ${collection} queries to handle large result sets`,
        expectedImprovement: 40,
        implementationEffort: 'low',
        code: `// Implement pagination\nconst pageSize = 50;\nconst page = 1;\nconst results = await db.${collection}.find().limit(pageSize).skip((page - 1) * pageSize);`
      });
    }

    return recommendations;
  }

  private calculateExpectedImprovement(executionTime: number): number {
    if (executionTime > this.performanceThresholds.critical) return 80;
    if (executionTime > this.performanceThresholds.poor) return 60;
    if (executionTime > this.performanceThresholds.fair) return 40;
    return 20;
  }

  private estimateImplementationEffort(recommendation: string): 'low' | 'medium' | 'high' {
    if (recommendation.includes('limit') || recommendation.includes('pagination')) return 'low';
    if (recommendation.includes('index')) return 'medium';
    if (recommendation.includes('caching') || recommendation.includes('compression')) return 'high';
    return 'medium';
  }

  private generateOptimizationCode(recommendation: string, query: QueryMetrics): string {
    // Generate sample code based on the recommendation
    if (recommendation.includes('index')) {
      return `// Add index for ${query.collection}\ndb.${query.collection}.createIndex({ field: 1 });`;
    }
    
    if (recommendation.includes('limit')) {
      return `// Add limit to query\nconst results = await db.${query.collection}.find().limit(100);`;
    }
    
    if (recommendation.includes('pagination')) {
      return `// Implement pagination\nconst pageSize = 50;\nconst page = 1;\nconst results = await db.${query.collection}.find().limit(pageSize).skip((page - 1) * pageSize);`;
    }
    
    return `// Optimization: ${recommendation}`;
  }

  private removeDuplicateRecommendations(recommendations: OptimizationRecommendation[]): OptimizationRecommendation[] {
    const seen = new Set<string>();
    return recommendations.filter(rec => {
      const key = `${rec.type}:${rec.description}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  destroy(): void {
    this.stop();
    this.clearHistory();
    console.log('[QueryPerformanceAnalyzer] Service destroyed');
  }
}

// Create singleton instance
export const queryPerformanceAnalyzer = new QueryPerformanceAnalyzer();

// Export public API
export const recordQuery = (query: string, collection: string, executionTime: number, resultCount: number, resultSize: number, userId?: string, sessionId?: string) => 
  queryPerformanceAnalyzer.recordQuery(query, collection, executionTime, resultCount, resultSize, userId, sessionId);

export const getQueryMetrics = (queryId: string) => 
  queryPerformanceAnalyzer.getQueryMetrics(queryId);

export const getCollectionPerformance = (collection: string) => 
  queryPerformanceAnalyzer.getCollectionPerformance(collection);

export const getOverallPerformance = () => 
  queryPerformanceAnalyzer.getOverallPerformance();

export const getQueryPatterns = () => 
  queryPerformanceAnalyzer.getQueryPatterns();

export const getOptimizationRecommendations = () => 
  queryPerformanceAnalyzer.getOptimizationRecommendations();

export const updatePerformanceThresholds = (thresholds: Partial<PerformanceThresholds>) => 
  queryPerformanceAnalyzer.updateThresholds(thresholds);

export const clearQueryHistory = () => 
  queryPerformanceAnalyzer.clearHistory();

export default queryPerformanceAnalyzer;
