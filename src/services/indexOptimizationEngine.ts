// Index Optimization Engine - Phase 1B
// Automatically analyzes and optimizes database indexes for optimal query performance

interface IndexDefinition {
  collection: string;
  fields: Record<string, 1 | -1>; // 1 for ascending, -1 for descending
  type: 'single' | 'compound' | 'text' | 'geospatial' | 'hash';
  unique: boolean;
  sparse: boolean;
  background: boolean;
  name?: string;
  partialFilterExpression?: any;
  expireAfterSeconds?: number;
}

interface IndexUsage {
  indexName: string;
  collection: string;
  accessCount: number;
  lastAccessed: number;
  queryPatterns: string[];
  performanceImpact: 'high' | 'medium' | 'low';
  size: number;
  fragmentation: number;
}

interface IndexRecommendation {
  type: 'create' | 'drop' | 'modify' | 'reindex';
  priority: 'critical' | 'high' | 'medium' | 'low';
  collection: string;
  description: string;
  expectedImprovement: number; // percentage
  implementationEffort: 'low' | 'medium' | 'high';
  currentIndex?: IndexDefinition;
  recommendedIndex?: IndexDefinition;
  reasoning: string[];
  estimatedCost: 'low' | 'medium' | 'high';
}

interface QueryAnalysis {
  query: string;
  collection: string;
  executionPlan: any;
  indexUsage: string[];
  missingIndexes: string[];
  performanceScore: number; // 0-100
  recommendations: string[];
}

class IndexOptimizationEngine {
  private indexRegistry = new Map<string, IndexDefinition>();
  private usageStats = new Map<string, IndexUsage>();
  private queryAnalysisCache = new Map<string, QueryAnalysis>();
  private isActive = false;
  private optimizationTimer?: NodeJS.Timeout;
  private analysisInterval = 300000; // 5 minutes
  private maxCacheSize = 1000;

  constructor() {
    this.start();
  }

  start(): void {
    if (this.isActive) return;
    this.isActive = true;
    
    // Start periodic optimization analysis
    this.optimizationTimer = setInterval(() => {
      this.performOptimizationAnalysis();
    }, this.analysisInterval);

    console.log('[IndexOptimizationEngine] Service started');
  }

  stop(): void {
    if (!this.isActive) return;
    this.isActive = false;
    
    if (this.optimizationTimer) {
      clearInterval(this.optimizationTimer);
    }

    console.log('[IndexOptimizationEngine] Service stopped');
  }

  /**
   * Register an existing index
   */
  registerIndex(index: IndexDefinition): void {
    if (!this.isActive) return;

    const indexName = index.name || this.generateIndexName(index);
    this.indexRegistry.set(indexName, { ...index, name: indexName });
    
    // Initialize usage stats
    if (!this.usageStats.has(indexName)) {
      this.usageStats.set(indexName, {
        indexName,
        collection: index.collection,
        accessCount: 0,
        lastAccessed: 0,
        queryPatterns: [],
        performanceImpact: 'low',
        size: 0,
        fragmentation: 0
      });
    }

    console.log(`[IndexOptimizationEngine] Index registered: ${indexName}`);
  }

  /**
   * Analyze a query and provide index recommendations
   */
  analyzeQuery(query: string, collection: string, executionPlan?: any): QueryAnalysis {
    if (!this.isActive) {
      return this.createDefaultAnalysis(query, collection);
    }

    const cacheKey = `${collection}:${this.hashQuery(query)}`;
    
    // Check cache first
    if (this.queryAnalysisCache.has(cacheKey)) {
      return this.queryAnalysisCache.get(cacheKey)!;
    }

    const analysis = this.performQueryAnalysis(query, collection, executionPlan);
    
    // Cache the result
    this.cacheQueryAnalysis(cacheKey, analysis);
    
    return analysis;
  }

  /**
   * Get index recommendations for a collection
   */
  getIndexRecommendations(collection: string): IndexRecommendation[] {
    if (!this.isActive) return [];

    const recommendations: IndexRecommendation[] = [];
    const collectionIndexes = Array.from(this.indexRegistry.values())
      .filter(index => index.collection === collection);

    // Analyze missing indexes
    const missingIndexes = this.identifyMissingIndexes(collection);
    missingIndexes.forEach(missing => {
      recommendations.push({
        type: 'create',
        priority: this.calculatePriority(missing),
        collection,
        description: `Create index for fields: ${Object.keys(missing.fields).join(', ')}`,
        expectedImprovement: this.estimateImprovement(missing),
        implementationEffort: 'medium',
        recommendedIndex: missing,
        reasoning: this.generateReasoning(missing),
        estimatedCost: 'medium'
      });
    });

    // Analyze unused indexes
    const unusedIndexes = this.identifyUnusedIndexes(collection);
    unusedIndexes.forEach(unused => {
      recommendations.push({
        type: 'drop',
        priority: 'low',
        collection,
        description: `Drop unused index: ${unused.name}`,
        expectedImprovement: 5, // Small improvement from reduced maintenance overhead
        implementationEffort: 'low',
        currentIndex: unused,
        reasoning: ['Index has low access count', 'Minimal performance impact'],
        estimatedCost: 'low'
      });
    });

    // Analyze index modifications
    const modificationRecommendations = this.identifyIndexModifications(collection);
    recommendations.push(...modificationRecommendations);

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Get overall index health summary
   */
  getIndexHealthSummary(): {
    totalIndexes: number;
    collections: string[];
    healthScore: number;
    criticalIssues: number;
    optimizationOpportunities: number;
    recommendations: IndexRecommendation[];
  } {
    if (!this.isActive) {
      return {
        totalIndexes: 0,
        collections: [],
        healthScore: 0,
        criticalIssues: 0,
        optimizationOpportunities: 0,
        recommendations: []
      };
    }

    const collections = new Set(Array.from(this.indexRegistry.values()).map(i => i.collection));
    const totalIndexes = this.indexRegistry.size;
    
    let healthScore = 100;
    let criticalIssues = 0;
    let optimizationOpportunities = 0;

    // Analyze each collection
    collections.forEach(collection => {
      const collectionIndexes = Array.from(this.indexRegistry.values())
        .filter(index => index.collection === collection);
      
      const recommendations = this.getIndexRecommendations(collection);
      
      criticalIssues += recommendations.filter(r => r.priority === 'critical').length;
      optimizationOpportunities += recommendations.length;
      
      // Reduce health score based on issues
      healthScore -= recommendations.filter(r => r.priority === 'critical').length * 20;
      healthScore -= recommendations.filter(r => r.priority === 'high').length * 10;
      healthScore = Math.max(0, healthScore);
    });

    const allRecommendations = Array.from(collections)
      .flatMap(collection => this.getIndexRecommendations(collection))
      .sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
      .slice(0, 20); // Top 20 recommendations

    return {
      totalIndexes,
      collections: Array.from(collections),
      healthScore,
      criticalIssues,
      optimizationOpportunities,
      recommendations: allRecommendations
    };
  }

  /**
   * Get index usage statistics
   */
  getIndexUsageStats(): IndexUsage[] {
    return Array.from(this.usageStats.values())
      .sort((a, b) => b.accessCount - a.accessCount);
  }

  /**
   * Update index usage statistics
   */
  updateIndexUsage(indexName: string, queryPattern: string, performanceImpact: 'high' | 'medium' | 'low'): void {
    if (!this.isActive) return;

    const usage = this.usageStats.get(indexName);
    if (usage) {
      usage.accessCount++;
      usage.lastAccessed = Date.now();
      usage.performanceImpact = performanceImpact;
      
      if (!usage.queryPatterns.includes(queryPattern)) {
        usage.queryPatterns.push(queryPattern);
        // Keep only last 10 patterns
        if (usage.queryPatterns.length > 10) {
          usage.queryPatterns = usage.queryPatterns.slice(-10);
        }
      }
    }
  }

  /**
   * Simulate index creation and estimate performance impact
   */
  simulateIndexCreation(index: IndexDefinition): {
    estimatedSize: number;
    estimatedPerformanceGain: number;
    maintenanceOverhead: number;
    recommendation: 'create' | 'skip' | 'modify';
  } {
    if (!this.isActive) {
      return {
        estimatedSize: 0,
        estimatedPerformanceGain: 0,
        maintenanceOverhead: 0,
        recommendation: 'skip'
      };
    }

    // Estimate index size based on collection size and field types
    const estimatedSize = this.estimateIndexSize(index);
    
    // Estimate performance gain based on query patterns
    const estimatedPerformanceGain = this.estimatePerformanceGain(index);
    
    // Estimate maintenance overhead
    const maintenanceOverhead = this.estimateMaintenanceOverhead(index);
    
    // Make recommendation
    let recommendation: 'create' | 'skip' | 'modify' = 'skip';
    if (estimatedPerformanceGain > 50 && maintenanceOverhead < 30) {
      recommendation = 'create';
    } else if (estimatedPerformanceGain > 30 && maintenanceOverhead < 50) {
      recommendation = 'modify';
    }

    return {
      estimatedSize,
      estimatedPerformanceGain,
      maintenanceOverhead,
      recommendation
    };
  }

  /**
   * Generate index creation script
   */
  generateIndexScript(recommendation: IndexRecommendation): string {
    if (recommendation.type === 'create' && recommendation.recommendedIndex) {
      const index = recommendation.recommendedIndex;
      const fields = Object.entries(index.fields)
        .map(([field, order]) => `"${field}": ${order}`)
        .join(', ');
      
      let script = `// Create index for ${index.collection}\n`;
      script += `db.${index.collection}.createIndex({\n`;
      script += `  ${fields}\n`;
      script += `}, {\n`;
      
      if (index.unique) script += `  unique: true,\n`;
      if (index.sparse) script += `  sparse: true,\n`;
      if (index.background) script += `  background: true,\n`;
      if (index.name) script += `  name: "${index.name}",\n`;
      if (index.partialFilterExpression) {
        script += `  partialFilterExpression: ${JSON.stringify(index.partialFilterExpression, null, 2)},\n`;
      }
      if (index.expireAfterSeconds) {
        script += `  expireAfterSeconds: ${index.expireAfterSeconds},\n`;
      }
      
      script += `});`;
      
      return script;
    }
    
    if (recommendation.type === 'drop' && recommendation.currentIndex) {
      return `// Drop unused index\ndb.${recommendation.currentIndex.collection}.dropIndex("${recommendation.currentIndex.name}");`;
    }
    
    return `// ${recommendation.description}`;
  }

  // Private methods

  private performQueryAnalysis(query: string, collection: string, executionPlan?: any): QueryAnalysis {
    const indexUsage = this.identifyIndexUsage(query, collection);
    const missingIndexes = this.identifyMissingIndexesForQuery(query, collection);
    const performanceScore = this.calculatePerformanceScore(query, collection, indexUsage, missingIndexes);
    const recommendations = this.generateQueryRecommendations(query, collection, missingIndexes);

    return {
      query,
      collection,
      executionPlan,
      indexUsage,
      missingIndexes,
      performanceScore,
      recommendations
    };
  }

  private identifyIndexUsage(query: string, collection: string): string[] {
    const usedIndexes: string[] = [];
    
    // Simple pattern matching - in production, use more sophisticated parsing
    const collectionIndexes = Array.from(this.indexRegistry.values())
      .filter(index => index.collection === collection);
    
    collectionIndexes.forEach(index => {
      const indexFields = Object.keys(index.fields);
      if (indexFields.some(field => query.includes(field))) {
        usedIndexes.push(index.name || this.generateIndexName(index));
      }
    });
    
    return usedIndexes;
  }

  private identifyMissingIndexesForQuery(query: string, collection: string): string[] {
    const missing: string[] = [];
    
    // Analyze query to identify fields that should be indexed
    const commonFields = ['id', 'userId', 'status', 'createdAt', 'updatedAt'];
    const queryFields = commonFields.filter(field => query.includes(field));
    
    const existingIndexes = Array.from(this.indexRegistry.values())
      .filter(index => index.collection === collection);
    
    queryFields.forEach(field => {
      const hasIndex = existingIndexes.some(index => 
        Object.keys(index.fields).includes(field)
      );
      
      if (!hasIndex) {
        missing.push(field);
      }
    });
    
    return missing;
  }

  private calculatePerformanceScore(query: string, collection: string, indexUsage: string[], missingIndexes: string[]): number {
    let score = 100;
    
    // Reduce score for missing indexes
    score -= missingIndexes.length * 20;
    
    // Reduce score for queries without index usage
    if (indexUsage.length === 0) {
      score -= 30;
    }
    
    // Reduce score for complex queries
    if (query.includes('orderBy') && query.includes('where')) {
      score -= 15;
    }
    
    return Math.max(0, score);
  }

  private generateQueryRecommendations(query: string, collection: string, missingIndexes: string[]): string[] {
    const recommendations: string[] = [];
    
    if (missingIndexes.length > 0) {
      recommendations.push(`Create indexes for fields: ${missingIndexes.join(', ')}`);
    }
    
    if (query.includes('orderBy') && !query.includes('limit')) {
      recommendations.push('Add limit clause to ordered queries');
    }
    
    if (query.includes('where') && query.includes('orderBy')) {
      recommendations.push('Ensure where clause fields are indexed before orderBy fields');
    }
    
    return recommendations;
  }

  private identifyMissingIndexes(collection: string): IndexDefinition[] {
    const missing: IndexDefinition[] = [];
    
    // Common index patterns for different collection types
    const commonIndexes = this.getCommonIndexes(collection);
    
    const existingIndexes = Array.from(this.indexRegistry.values())
      .filter(index => index.collection === collection);
    
    commonIndexes.forEach(commonIndex => {
      const hasIndex = existingIndexes.some(existing => 
        this.indexesAreEquivalent(existing, commonIndex)
      );
      
      if (!hasIndex) {
        missing.push(commonIndex);
      }
    });
    
    return missing;
  }

  private getCommonIndexes(collection: string): IndexDefinition[] {
    // Define common index patterns based on collection type
    const commonIndexes: IndexDefinition[] = [];
    
    if (collection.includes('user') || collection.includes('User')) {
      commonIndexes.push({
        collection,
        fields: { email: 1 },
        type: 'single',
        unique: true,
        sparse: false,
        background: true
      });
    }
    
    if (collection.includes('load') || collection.includes('Load')) {
      commonIndexes.push({
        collection,
        fields: { status: 1, createdAt: -1 },
        type: 'compound',
        unique: false,
        sparse: false,
        background: true
      });
    }
    
    // Add more collection-specific patterns as needed
    
    return commonIndexes;
  }

  private indexesAreEquivalent(index1: IndexDefinition, index2: IndexDefinition): boolean {
    if (index1.type !== index2.type) return false;
    
    const fields1 = Object.keys(index1.fields).sort();
    const fields2 = Object.keys(index2.fields).sort();
    
    if (fields1.length !== fields2.length) return false;
    
    return fields1.every(field => fields2.includes(field));
  }

  private identifyUnusedIndexes(collection: string): IndexDefinition[] {
    const unused: IndexDefinition[] = [];
    
    const collectionIndexes = Array.from(this.indexRegistry.values())
      .filter(index => index.collection === collection);
    
    collectionIndexes.forEach(index => {
      const usage = this.usageStats.get(index.name || this.generateIndexName(index));
      if (usage && usage.accessCount < 5) { // Less than 5 accesses
        unused.push(index);
      }
    });
    
    return unused;
  }

  private identifyIndexModifications(collection: string): IndexRecommendation[] {
    const modifications: IndexRecommendation[] = [];
    
    // Analyze existing indexes for potential improvements
    const collectionIndexes = Array.from(this.indexRegistry.values())
      .filter(index => index.collection === collection);
    
    collectionIndexes.forEach(index => {
      // Check for single-field indexes that could be compound
      if (index.type === 'single' && this.shouldBeCompound(index)) {
        modifications.push({
          type: 'modify',
          priority: 'medium',
          collection,
          description: `Convert single-field index to compound index for better performance`,
          expectedImprovement: 25,
          implementationEffort: 'medium',
          currentIndex: index,
          reasoning: ['Compound indexes can serve multiple query patterns', 'Reduces total index count'],
          estimatedCost: 'medium'
        });
      }
    });
    
    return modifications;
  }

  private shouldBeCompound(index: IndexDefinition): boolean {
    // Simple heuristic - in production, use more sophisticated analysis
    return index.collection.includes('load') || index.collection.includes('Load');
  }

  private calculatePriority(index: IndexDefinition): IndexRecommendation['priority'] {
    // Simple priority calculation based on collection and field types
    if (index.collection.includes('user') && Object.keys(index.fields).includes('email')) {
      return 'critical';
    }
    
    if (index.type === 'compound') {
      return 'high';
    }
    
    return 'medium';
  }

  private estimateImprovement(index: IndexDefinition): number {
    // Estimate performance improvement based on index type and usage patterns
    if (index.type === 'compound') return 60;
    if (index.type === 'single') return 40;
    return 30;
  }

  private generateReasoning(index: IndexDefinition): string[] {
    const reasoning: string[] = [];
    
    if (index.type === 'compound') {
      reasoning.push('Compound indexes support multiple query patterns');
      reasoning.push('Reduces the need for multiple single-field indexes');
    }
    
    if (Object.keys(index.fields).includes('status')) {
      reasoning.push('Status fields are commonly used in WHERE clauses');
    }
    
    if (Object.keys(index.fields).includes('createdAt')) {
      reasoning.push('Timestamp fields support efficient range queries');
    }
    
    return reasoning;
  }

  private estimateIndexSize(index: IndexDefinition): number {
    // Simple size estimation - in production, use actual collection statistics
    const fieldCount = Object.keys(index.fields).length;
    const baseSize = 1024 * 1024; // 1MB base
    return baseSize * fieldCount;
  }

  private estimatePerformanceGain(index: IndexDefinition): number {
    // Estimate performance gain based on index characteristics
    let gain = 30; // Base gain
    
    if (index.type === 'compound') gain += 20;
    if (index.unique) gain += 10;
    if (Object.keys(index.fields).includes('status')) gain += 15;
    
    return Math.min(90, gain);
  }

  private estimateMaintenanceOverhead(index: IndexDefinition): number {
    // Estimate maintenance overhead
    let overhead = 20; // Base overhead
    
    if (index.type === 'compound') overhead += 10;
    if (index.unique) overhead += 5;
    
    return Math.min(50, overhead);
  }

  private generateIndexName(index: IndexDefinition): string {
    const fields = Object.keys(index.fields).join('_');
    return `${index.collection}_${fields}_idx`;
  }

  private hashQuery(query: string): string {
    // Simple hash function for query caching
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  private cacheQueryAnalysis(key: string, analysis: QueryAnalysis): void {
    this.queryAnalysisCache.set(key, analysis);
    
    // Maintain cache size
    if (this.queryAnalysisCache.size > this.maxCacheSize) {
      const firstKey = this.queryAnalysisCache.keys().next().value;
      this.queryAnalysisCache.delete(firstKey);
    }
  }

  private createDefaultAnalysis(query: string, collection: string): QueryAnalysis {
    return {
      query,
      collection,
      executionPlan: null,
      indexUsage: [],
      missingIndexes: [],
      performanceScore: 50,
      recommendations: ['Service not active - enable for full analysis']
    };
  }

  private performOptimizationAnalysis(): void {
    // Perform periodic analysis and generate insights
    const healthSummary = this.getIndexHealthSummary();
    
    if (healthSummary.criticalIssues > 0) {
      console.warn(`[IndexOptimizationEngine] ${healthSummary.criticalIssues} critical index issues detected`);
    }
    
    if (healthSummary.optimizationOpportunities > 0) {
      console.log(`[IndexOptimizationEngine] ${healthSummary.optimizationOpportunities} optimization opportunities available`);
    }
  }

  destroy(): void {
    this.stop();
    this.indexRegistry.clear();
    this.usageStats.clear();
    this.queryAnalysisCache.clear();
    console.log('[IndexOptimizationEngine] Service destroyed');
  }
}

// Create singleton instance
export const indexOptimizationEngine = new IndexOptimizationEngine();

// Export public API
export const registerIndex = (index: IndexDefinition) => 
  indexOptimizationEngine.registerIndex(index);

export const analyzeQuery = (query: string, collection: string, executionPlan?: any) => 
  indexOptimizationEngine.analyzeQuery(query, collection, executionPlan);

export const getIndexRecommendations = (collection: string) => 
  indexOptimizationEngine.getIndexRecommendations(collection);

export const getIndexHealthSummary = () => 
  indexOptimizationEngine.getIndexHealthSummary();

export const getIndexUsageStats = () => 
  indexOptimizationEngine.getIndexUsageStats();

export const updateIndexUsage = (indexName: string, queryPattern: string, performanceImpact: 'high' | 'medium' | 'low') => 
  indexOptimizationEngine.updateIndexUsage(indexName, queryPattern, performanceImpact);

export const simulateIndexCreation = (index: IndexDefinition) => 
  indexOptimizationEngine.simulateIndexCreation(index);

export const generateIndexScript = (recommendation: IndexRecommendation) => 
  indexOptimizationEngine.generateIndexScript(recommendation);

export default indexOptimizationEngine;
