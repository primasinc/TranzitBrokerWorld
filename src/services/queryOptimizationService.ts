// Query Optimization Service - Phase 1B
// Analyzes query patterns and provides optimization recommendations

import { EnhancedQueryService } from './enhancedDbService';
import { cacheService } from './cacheService';

interface QueryAnalysis {
  queryHash: string;
  collection: string;
  constraints: QueryConstraint[];
  executionTime: number;
  resultCount: number;
  timestamp: number;
  frequency: number;
  optimizationScore: number;
  recommendations: OptimizationRecommendation[];
}

interface QueryConstraint {
  type: 'where' | 'orderBy' | 'limit' | 'startAfter';
  field: string;
  value?: any;
  direction?: 'asc' | 'desc';
}

interface OptimizationRecommendation {
  type: 'index' | 'query' | 'caching' | 'structure';
  priority: 'high' | 'medium' | 'low';
  description: string;
  impact: 'high' | 'medium' | 'low';
  implementation: string;
}

interface IndexRecommendation {
  collection: string;
  fields: string[];
  type: 'single' | 'composite';
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: number; // 0-100
  reason: string;
}

interface DynamicIndex {
  id: string;
  collection: string;
  fields: string[];
  type: 'single' | 'composite';
  status: 'creating' | 'active' | 'failed' | 'dropping';
  createdAt: Date;
  lastUsed: Date;
  usageCount: number;
  performanceMetrics: {
    averageQueryTime: number;
    improvementFactor: number;
  };
}

interface IndexPerformanceMetrics {
  totalIndexes: number;
  activeIndexes: number;
  averageCreationTime: number;
  totalSpaceUsed: number;
  queryImprovement: number;
  maintenanceOverhead: number;
}

interface PerformanceMetrics {
  averageQueryTime: number;
  slowQueries: number;
  cacheHitRate: number;
  indexEfficiency: number;
  optimizationOpportunities: number;
}

class QueryOptimizationService {
  private queryAnalytics = new Map<string, QueryAnalysis>();
  private indexRecommendations = new Map<string, IndexRecommendation>();
  private dynamicIndexes = new Map<string, DynamicIndex>(); // New: Track dynamic indexes
  private isActive = false;
  private analysisTimer: NodeJS.Timeout | null = null;
  private maxAnalyticsSize = 1000;

  constructor() {
    this.start();
  }

  // Start the optimization service
  start(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    
    // Start analysis timer (every 5 minutes)
    this.analysisTimer = setInterval(() => {
      this.analyzeQueryPatterns();
      this.generateIndexRecommendations();
    }, 5 * 60 * 1000);
    
    console.log('[QueryOptimizationService] Service started');
  }

  // Stop the optimization service
  stop(): void {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
      this.analysisTimer = null;
    }
    
    console.log('[QueryOptimizationService] Service stopped');
  }

  // Record query execution for analysis
  recordQueryExecution(
    collection: string,
    constraints: QueryConstraint[],
    executionTime: number,
    resultCount: number
  ): void {
    if (!this.isActive) return;
    
    const queryHash = this.generateQueryHash(collection, constraints);
    const existing = this.queryAnalytics.get(queryHash);
    
    if (existing) {
      // Update existing analysis
      existing.executionTime = (existing.executionTime + executionTime) / 2; // Running average
      existing.resultCount = resultCount;
      existing.frequency++;
      existing.timestamp = Date.now();
      existing.optimizationScore = this.calculateOptimizationScore(existing);
      existing.recommendations = this.generateRecommendations(existing);
    } else {
      // Create new analysis
      const analysis: QueryAnalysis = {
        queryHash,
        collection,
        constraints,
        executionTime,
        resultCount,
        timestamp: Date.now(),
        frequency: 1,
        optimizationScore: 0,
        recommendations: []
      };
      
      analysis.optimizationScore = this.calculateOptimizationScore(analysis);
      analysis.recommendations = this.generateRecommendations(analysis);
      
      this.queryAnalytics.set(queryHash, analysis);
    }
    
    // Clean up old analytics to prevent memory bloat
    if (this.queryAnalytics.size > this.maxAnalyticsSize) {
      this.cleanupOldAnalytics();
    }
  }

  // Generate query hash for consistent identification
  private generateQueryHash(collection: string, constraints: QueryConstraint[]): string {
    const normalizedConstraints = constraints
      .map(c => ({ type: c.type, field: c.field, value: c.value, direction: c.direction }))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        if (a.field !== b.field) return a.field.localeCompare(b.field);
        return 0;
      });
    
    const queryString = JSON.stringify({
      collection,
      constraints: normalizedConstraints
    });
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < queryString.length; i++) {
      const char = queryString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return `query_${Math.abs(hash)}`;
  }

  // Calculate optimization score for a query
  private calculateOptimizationScore(analysis: QueryAnalysis): number {
    let score = 0;
    
    // Execution time factor (0-40 points)
    if (analysis.executionTime < 100) {
      score += 40;
    } else if (analysis.executionTime < 500) {
      score += 30;
    } else if (analysis.executionTime < 1000) {
      score += 20;
    } else if (analysis.executionTime < 2000) {
      score += 10;
    }
    
    // Frequency factor (0-30 points)
    if (analysis.frequency > 100) {
      score += 30;
    } else if (analysis.frequency > 50) {
      score += 20;
    } else if (analysis.frequency > 20) {
      score += 10;
    }
    
    // Result count factor (0-20 points)
    if (analysis.resultCount < 10) {
      score += 20;
    } else if (analysis.resultCount < 100) {
      score += 15;
    } else if (analysis.resultCount < 1000) {
      score += 10;
    } else if (analysis.resultCount < 10000) {
      score += 5;
    }
    
    // Constraint complexity factor (0-10 points)
    const complexConstraints = analysis.constraints.filter(c => 
      c.type === 'where' && (typeof c.value === 'object' || Array.isArray(c.value))
    );
    if (complexConstraints.length === 0) {
      score += 10;
    } else if (complexConstraints.length === 1) {
      score += 5;
    }
    
    return Math.min(100, score);
  }

  // Generate optimization recommendations
  private generateRecommendations(analysis: QueryAnalysis): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    
    // Check for slow execution time
    if (analysis.executionTime > 1000) {
      recommendations.push({
        type: 'index',
        priority: 'high',
        description: 'Query execution time is slow, consider adding indexes',
        impact: 'high',
        implementation: `Add composite index on ${analysis.collection} for fields: ${this.getIndexableFields(analysis.constraints).join(', ')}`
      });
    }
    
    // Check for high result count
    if (analysis.resultCount > 1000) {
      recommendations.push({
        type: 'query',
        priority: 'medium',
        description: 'Large result set, consider adding limits or filters',
        impact: 'medium',
        implementation: 'Add limit() constraint or additional where() filters to reduce result size'
      });
    }
    
    // Check for missing indexes
    const whereConstraints = analysis.constraints.filter(c => c.type === 'where');
    if (whereConstraints.length > 2) {
      recommendations.push({
        type: 'index',
        priority: 'medium',
        description: 'Multiple where constraints detected, composite index may improve performance',
        impact: 'medium',
        implementation: `Create composite index on ${analysis.collection} for: ${whereConstraints.map(c => c.field).join(', ')}`
      });
    }
    
    // Check for ordering without index
    const orderConstraints = analysis.constraints.filter(c => c.type === 'orderBy');
    if (orderConstraints.length > 0) {
      const hasOrderIndex = this.checkOrderIndexCoverage(analysis.collection, orderConstraints);
      if (!hasOrderIndex) {
        recommendations.push({
          type: 'index',
          priority: 'medium',
          description: 'Ordering without proper index may cause performance issues',
          impact: 'medium',
          implementation: `Add index on ${analysis.collection} for ordering field: ${orderConstraints.map(c => c.field).join(', ')}`
        });
      }
    }
    
    // Check for caching opportunities
    if (analysis.frequency > 50) {
      recommendations.push({
        type: 'caching',
        priority: 'low',
        description: 'Frequently executed query, consider aggressive caching',
        impact: 'low',
        implementation: 'Increase cache TTL or implement cache warming for this query pattern'
      });
    }
    
    return recommendations;
  }

  // Get fields that should be indexed
  private getIndexableFields(constraints: QueryConstraint[]): string[] {
    return constraints
      .filter(c => c.type === 'where')
      .map(c => c.field)
      .filter((field, index, array) => array.indexOf(field) === index); // Remove duplicates
  }

  // Check if ordering fields have proper index coverage
  private checkOrderIndexCoverage(collection: string, orderConstraints: QueryConstraint[]): boolean {
    // This is a simplified check - in production you'd query actual index metadata
    const orderFields = orderConstraints.map(c => c.field);
    
    // Check if we have any index recommendations for these fields
    for (const [key, recommendation] of this.indexRecommendations.entries()) {
      if (key.startsWith(collection) && recommendation.fields.some(field => orderFields.includes(field))) {
        return true;
      }
    }
    
    return false;
  }

  // Analyze query patterns and identify optimization opportunities
  private analyzeQueryPatterns(): void {
    if (!this.isActive) return;
    
    const now = Date.now();
    const slowQueries = Array.from(this.queryAnalytics.values())
      .filter(analysis => analysis.executionTime > 1000)
      .sort((a, b) => b.executionTime - a.executionTime);
    
    const frequentQueries = Array.from(this.queryAnalytics.values())
      .filter(analysis => analysis.frequency > 20)
      .sort((a, b) => b.frequency - a.frequency);
    
    // Log optimization insights
    if (slowQueries.length > 0) {
      console.log(`[QueryOptimizationService] Found ${slowQueries.length} slow queries that need optimization`);
      slowQueries.slice(0, 5).forEach(query => {
        console.log(`  - ${query.collection}: ${query.executionTime.toFixed(2)}ms (${query.frequency} times)`);
      });
    }
    
    if (frequentQueries.length > 0) {
      console.log(`[QueryOptimizationService] Found ${frequentQueries.length} frequently executed queries`);
      frequentQueries.slice(0, 5).forEach(query => {
        console.log(`  - ${query.collection}: ${query.frequency} times (${query.executionTime.toFixed(2)}ms avg)`);
      });
    }
  }

  // Generate index recommendations based on query patterns
  private generateIndexRecommendations(): void {
    if (!this.isActive) return;
    
    const collectionQueries = new Map<string, QueryAnalysis[]>();
    
    // Group queries by collection
    for (const analysis of this.queryAnalytics.values()) {
      if (!collectionQueries.has(analysis.collection)) {
        collectionQueries.set(analysis.collection, []);
      }
      collectionQueries.get(analysis.collection)!.push(analysis);
    }
    
    // Generate recommendations for each collection
    for (const [collection, queries] of collectionQueries.entries()) {
      this.generateCollectionIndexRecommendations(collection, queries);
    }
  }

  // Generate index recommendations for a specific collection
  private generateCollectionIndexRecommendations(collection: string, queries: QueryAnalysis[]): void {
    const fieldUsage = new Map<string, { count: number; totalTime: number; avgTime: number }>();
    
    // Analyze field usage patterns
    for (const query of queries) {
      for (const constraint of query.constraints) {
        if (constraint.type === 'where') {
          const field = constraint.field;
          const existing = fieldUsage.get(field) || { count: 0, totalTime: 0, avgTime: 0 };
          
          existing.count++;
          existing.totalTime += query.executionTime;
          existing.avgTime = existing.totalTime / existing.count;
          
          fieldUsage.set(field, existing);
        }
      }
    }
    
    // Generate single field index recommendations
    for (const [field, usage] of fieldUsage.entries()) {
      if (usage.count > 10 && usage.avgTime > 500) {
        const key = `${collection}_${field}_single`;
        const recommendation: IndexRecommendation = {
          collection,
          fields: [field],
          type: 'single',
          priority: usage.avgTime > 1000 ? 'high' : 'medium',
          estimatedImpact: Math.min(100, Math.floor((usage.avgTime - 100) / 10)),
          reason: `Field used in ${usage.count} queries with ${usage.avgTime.toFixed(2)}ms average execution time`
        };
        
        this.indexRecommendations.set(key, recommendation);
      }
    }
    
    // Generate composite index recommendations for frequently combined fields
    const fieldCombinations = this.analyzeFieldCombinations(queries);
    for (const combination of fieldCombinations) {
      if (combination.count > 5 && combination.avgTime > 800) {
        const key = `${collection}_${combination.fields.join('_')}_composite`;
        const recommendation: IndexRecommendation = {
          collection,
          fields: combination.fields,
          type: 'composite',
          priority: combination.avgTime > 1500 ? 'high' : 'medium',
          estimatedImpact: Math.min(100, Math.floor((combination.avgTime - 200) / 15)),
          reason: `Fields frequently combined in ${combination.count} queries with ${combination.avgTime.toFixed(2)}ms average execution time`
        };
        
        this.indexRecommendations.set(key, recommendation);
      }
    }
  }

  // Analyze which fields are frequently used together
  private analyzeFieldCombinations(queries: QueryAnalysis[]): Array<{ fields: string[]; count: number; avgTime: number }> {
    const combinations = new Map<string, { fields: string[]; count: number; totalTime: number; avgTime: number }>();
    
    for (const query of queries) {
      const whereFields = query.constraints
        .filter(c => c.type === 'where')
        .map(c => c.field)
        .sort();
      
      if (whereFields.length > 1) {
        const key = whereFields.join('|');
        const existing = combinations.get(key) || { fields: whereFields, count: 0, totalTime: 0, avgTime: 0 };
        
        existing.count++;
        existing.totalTime += query.executionTime;
        existing.avgTime = existing.totalTime / existing.count;
        
        combinations.set(key, existing);
      }
    }
    
    return Array.from(combinations.values());
  }

  // Clean up old analytics data
  private cleanupOldAnalytics(): void {
    const now = Date.now();
    const cutoff = now - (24 * 60 * 60 * 1000); // 24 hours
    
    for (const [key, analysis] of this.queryAnalytics.entries()) {
      if (analysis.timestamp < cutoff) {
        this.queryAnalytics.delete(key);
      }
    }
  }

  // Get performance metrics
  getPerformanceMetrics(): PerformanceMetrics {
    const queries = Array.from(this.queryAnalytics.values());
    
    if (queries.length === 0) {
      return {
        averageQueryTime: 0,
        slowQueries: 0,
        cacheHitRate: 0,
        indexEfficiency: 0,
        optimizationOpportunities: 0
      };
    }
    
    const totalTime = queries.reduce((sum, q) => sum + q.executionTime, 0);
    const slowQueries = queries.filter(q => q.executionTime > 1000).length;
    const cacheStats = cacheService.getStats();
    const optimizationOpportunities = queries.filter(q => q.optimizationScore < 70).length;
    
    // Calculate index efficiency based on recommendations
    const highPriorityIndexes = Array.from(this.indexRecommendations.values())
      .filter(r => r.priority === 'high').length;
    const indexEfficiency = Math.max(0, 100 - (highPriorityIndexes * 10));
    
    return {
      averageQueryTime: totalTime / queries.length,
      slowQueries,
      cacheHitRate: parseFloat(cacheStats.hitRate),
      indexEfficiency,
      optimizationOpportunities
    };
  }

  // Get optimization recommendations
  getOptimizationRecommendations(): OptimizationRecommendation[] {
    const allRecommendations: OptimizationRecommendation[] = [];
    
    for (const analysis of this.queryAnalytics.values()) {
      allRecommendations.push(...analysis.recommendations);
    }
    
    // Sort by priority and impact
    return allRecommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const impactOrder = { high: 3, medium: 2, low: 1 };
      
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      
      return impactOrder[b.impact] - impactOrder[a.impact];
    });
  }

  // Get index recommendations
  getIndexRecommendations(): IndexRecommendation[] {
    return Array.from(this.indexRecommendations.values())
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return b.estimatedImpact - a.estimatedImpact;
      });
  }

  // Get query analytics
  getQueryAnalytics(): QueryAnalysis[] {
    return Array.from(this.queryAnalytics.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  // Dynamic index management methods for Phase 1B
  async createDynamicIndex(collection: string, fields: string[], type: 'single' | 'composite' = 'single'): Promise<string> {
    const indexId = `idx_${collection}_${fields.join('_')}_${Date.now()}`;
    
    const dynamicIndex: DynamicIndex = {
      id: indexId,
      collection,
      fields,
      type,
      status: 'creating',
      createdAt: new Date(),
      lastUsed: new Date(),
      usageCount: 0,
      performanceMetrics: {
        averageQueryTime: 0,
        improvementFactor: 0
      }
    };

    this.dynamicIndexes.set(indexId, dynamicIndex);
    
    try {
      // Simulate index creation (in real implementation, this would create actual database indexes)
      await this.simulateIndexCreation(indexId);
      
      dynamicIndex.status = 'active';
      console.log(`[QueryOptimization] Dynamic index created: ${indexId}`);
      
      return indexId;
    } catch (error) {
      dynamicIndex.status = 'failed';
      console.error(`[QueryOptimization] Failed to create index ${indexId}:`, error);
      throw error;
    }
  }

  async dropDynamicIndex(indexId: string): Promise<boolean> {
    const index = this.dynamicIndexes.get(indexId);
    if (!index) return false;

    index.status = 'dropping';
    
    try {
      // Simulate index dropping
      await this.simulateIndexDropping(indexId);
      
      this.dynamicIndexes.delete(indexId);
      console.log(`[QueryOptimization] Dynamic index dropped: ${indexId}`);
      
      return true;
    } catch (error) {
      index.status = 'active'; // Revert status on failure
      console.error(`[QueryOptimization] Failed to drop index ${indexId}:`, error);
      return false;
    }
  }

  getDynamicIndexes(): DynamicIndex[] {
    return Array.from(this.dynamicIndexes.values());
  }

  getIndexPerformanceMetrics(): IndexPerformanceMetrics {
    const indexes = Array.from(this.dynamicIndexes.values());
    const activeIndexes = indexes.filter(idx => idx.status === 'active');
    
    const totalSpaceUsed = activeIndexes.reduce((sum, idx) => {
      // Estimate space usage based on field count and type
      const baseSize = idx.fields.length * 100; // 100 bytes per field as estimate
      return sum + baseSize;
    }, 0);

    const queryImprovement = activeIndexes.reduce((sum, idx) => {
      return sum + idx.performanceMetrics.improvementFactor;
    }, 0) / Math.max(1, activeIndexes.length);

    return {
      totalIndexes: indexes.length,
      activeIndexes: activeIndexes.length,
      averageCreationTime: 0, // Would be calculated from actual creation times
      totalSpaceUsed,
      queryImprovement,
      maintenanceOverhead: Math.round(activeIndexes.length * 0.1 * 100) / 100 // 10% overhead per index, rounded to 2 decimal places
    };
  }

  private async simulateIndexCreation(indexId: string): Promise<void> {
    // Simulate async index creation process
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`[QueryOptimization] Simulated index creation completed: ${indexId}`);
        resolve();
      }, 100);
    });
  }

  private async simulateIndexDropping(indexId: string): Promise<void> {
    // Simulate async index dropping process
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`[QueryOptimization] Simulated index dropping completed: ${indexId}`);
        resolve();
      }, 50);
    });
  }

  // Clean up resources
  destroy(): void {
    this.stop();
    this.queryAnalytics.clear();
    this.indexRecommendations.clear();
    this.dynamicIndexes.clear();
  }
}

// Create singleton instance
export const queryOptimizationService = new QueryOptimizationService();

// Export helper functions
export const recordQueryExecution = (
  collection: string,
  constraints: QueryConstraint[],
  executionTime: number,
  resultCount: number
): void => {
  queryOptimizationService.recordQueryExecution(collection, constraints, executionTime, resultCount);
};

export const getPerformanceMetrics = () => {
  return queryOptimizationService.getPerformanceMetrics();
};

export const getOptimizationRecommendations = () => {
  return queryOptimizationService.getOptimizationRecommendations();
};

export const getIndexRecommendations = () => {
  return queryOptimizationService.getIndexRecommendations();
};

export const getQueryAnalytics = () => {
  return queryOptimizationService.getQueryAnalytics();
};

// Dynamic index management exports for Phase 1B
export const createDynamicIndex = (collection: string, fields: string[], type: 'single' | 'composite' = 'single') => {
  return queryOptimizationService.createDynamicIndex(collection, fields, type);
};

export const dropDynamicIndex = (indexId: string) => {
  return queryOptimizationService.dropDynamicIndex(indexId);
};

export const getDynamicIndexes = () => {
  return queryOptimizationService.getDynamicIndexes();
};

export const getIndexPerformanceMetrics = () => {
  return queryOptimizationService.getIndexPerformanceMetrics();
};
