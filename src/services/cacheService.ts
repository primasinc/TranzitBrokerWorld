// Cache Service - Performance optimization for production scale
// Enhanced with Phase 1B features: Intelligent prefetching, cache warming, and advanced eviction

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  accessCount: number;
  lastAccessed: number;
  priority: number; // New: Priority for intelligent eviction
  prefetchScore: number; // New: Score for prefetching decisions
  dependencies: string[]; // New: Cache dependencies for invalidation
  tags: string[]; // New: Tags for pattern-based invalidation
}

interface CacheConfig {
  maxSize: number;
  defaultTTL: number; // 5 minutes default
  cleanupInterval: number; // 1 minute
  enableStats: boolean;
  enablePrefetching: boolean; // New: Enable intelligent prefetching
  prefetchThreshold: number; // New: Minimum score to trigger prefetch
  maxPrefetchItems: number; // New: Maximum items to prefetch
  enableAdvancedInvalidation: boolean; // New: Enable advanced invalidation strategies
  invalidationPatterns: InvalidationPattern[]; // New: Custom invalidation patterns
}

interface InvalidationPattern {
  name: string;
  pattern: string; // Regex pattern for matching keys
  action: 'invalidate' | 'refresh' | 'extend';
  priority: number;
  enabled: boolean;
}

interface CacheDependency {
  key: string;
  dependentKeys: string[];
  invalidationStrategy: 'cascade' | 'selective' | 'none';
}

interface PrefetchCandidate {
  key: string;
  score: number;
  lastAccessed: number;
  accessPattern: 'frequent' | 'periodic' | 'sporadic';
}

class CacheService {
  private cache = new Map<string, CacheItem<any>>();
  private config: CacheConfig = {
    maxSize: 1000, // Maximum number of cached items
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    cleanupInterval: 60 * 1000, // 1 minute
    enableStats: true,
    enablePrefetching: true, // New: Enable intelligent prefetching
    prefetchThreshold: 0.7, // New: Minimum score to trigger prefetch
    maxPrefetchItems: 10, // New: Maximum items to prefetch
    enableAdvancedInvalidation: true, // New: Enable advanced invalidation strategies
    invalidationPatterns: [] // New: Custom invalidation patterns
  };
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    prefetches: 0, // New: Track prefetch operations
    prefetchHits: 0 // New: Track prefetch effectiveness
  };
  private cleanupTimer: NodeJS.Timeout | null = null;
  private prefetchTimer: NodeJS.Timeout | null = null; // New: Timer for prefetch operations
  private accessPatterns = new Map<string, number[]>(); // New: Track access patterns for prefetching

  constructor() {
    this.startCleanupTimer();
    if (this.config.enablePrefetching) {
      this.startPrefetchTimer();
    }
  }

  // Set a value in cache with enhanced features
  set<T>(key: string, data: T, ttl?: number, priority: number = 1): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      accessCount: 0,
      lastAccessed: Date.now(),
      priority: Math.max(0, Math.min(10, priority)), // Clamp priority between 0-10
      prefetchScore: 0,
      dependencies: [], // New: Initialize dependencies
      tags: [] // New: Initialize tags
    };

    // Evict if cache is full using intelligent eviction
    if (this.cache.size >= this.config.maxSize) {
      this.intelligentEviction();
    }

    this.cache.set(key, item);
    this.stats.sets++;

    // Track access pattern for prefetching
    this.trackAccessPattern(key);

    if (process.env.NODE_ENV === 'development') {
      console.debug(`[Cache] Set: ${key} (priority: ${priority})`);
    }
  }

  // Get a value from cache with enhanced tracking
  get<T>(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (this.isExpired(item)) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access stats and prefetch score
    item.accessCount++;
    item.lastAccessed = Date.now();
    this.updatePrefetchScore(key, item);
    this.stats.hits++;

    if (process.env.NODE_ENV === 'development') {
      console.debug(`[Cache] Hit: ${key} (score: ${item.prefetchScore.toFixed(2)})`);
    }

    return item.data;
  }

  // Check if item exists and is not expired
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (this.isExpired(item)) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  // Delete a specific key
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
      this.accessPatterns.delete(key); // Clean up access pattern tracking
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[Cache] Delete: ${key}`);
      }
    }
    return deleted;
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
    this.accessPatterns.clear(); // Clear access patterns
    this.stats.sets = 0;
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.deletes = 0;
    this.stats.evictions = 0;
    this.stats.prefetches = 0;
    this.stats.prefetchHits = 0;
    
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Cache] Cleared all');
    }
  }

  // Get cache statistics with enhanced metrics
  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: this.stats.hits + this.stats.misses > 0 
        ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2) + '%'
        : '0%',
      prefetchEffectiveness: this.stats.prefetches > 0
        ? (this.stats.prefetchHits / this.stats.prefetches * 100).toFixed(2) + '%'
        : '0%',
      averagePriority: this.getAveragePriority(),
      prefetchCandidates: this.getPrefetchCandidates().length
    };
  }

  // Advanced invalidation methods for Phase 1B
  invalidateByPattern(pattern: string): number {
    if (!this.config.enableAdvancedInvalidation) return 0;
    
    const regex = new RegExp(pattern);
    let invalidatedCount = 0;
    
    for (const [key] of this.cache) {
      if (regex.test(key)) {
        this.cache.delete(key);
        invalidatedCount++;
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[Cache] Pattern invalidation: ${pattern} - ${invalidatedCount} items removed`);
    }
    
    return invalidatedCount;
  }

  invalidateByTags(tags: string[]): number {
    if (!this.config.enableAdvancedInvalidation) return 0;
    
    let invalidatedCount = 0;
    
    for (const [key, item] of this.cache) {
      if (tags.some(tag => item.tags.includes(tag))) {
        this.cache.delete(key);
        invalidatedCount++;
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[Cache] Tag invalidation: ${tags.join(', ')} - ${invalidatedCount} items removed`);
    }
    
    return invalidatedCount;
  }

  invalidateByDependency(dependencyKey: string): number {
    if (!this.config.enableAdvancedInvalidation) return 0;
    
    let invalidatedCount = 0;
    
    for (const [key, item] of this.cache) {
      if (item.dependencies.includes(dependencyKey)) {
        this.cache.delete(key);
        invalidatedCount++;
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[Cache] Dependency invalidation: ${dependencyKey} - ${invalidatedCount} items removed`);
    }
    
    return invalidatedCount;
  }

  setWithDependencies<T>(key: string, data: T, dependencies: string[] = [], tags: string[] = [], ttl?: number, priority: number = 1): void {
    this.set(key, data, ttl, priority);
    
    const item = this.cache.get(key);
    if (item) {
      item.dependencies = dependencies;
      item.tags = tags;
    }
  }

  addInvalidationPattern(pattern: InvalidationPattern): void {
    if (!this.config.enableAdvancedInvalidation) return;
    
    this.config.invalidationPatterns.push(pattern);
    this.config.invalidationPatterns.sort((a, b) => b.priority - a.priority);
    
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[Cache] Added invalidation pattern: ${pattern.name}`);
    }
  }

  removeInvalidationPattern(patternName: string): boolean {
    if (!this.config.enableAdvancedInvalidation) return false;
    
    const initialLength = this.config.invalidationPatterns.length;
    this.config.invalidationPatterns = this.config.invalidationPatterns.filter(p => p.name !== patternName);
    
    const removed = initialLength !== this.config.invalidationPatterns.length;
    if (removed && process.env.NODE_ENV === 'development') {
      console.debug(`[Cache] Removed invalidation pattern: ${patternName}`);
    }
    
    return removed;
  }

  // Get cache keys (for debugging)
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  // Update configuration
  updateConfig(newConfig: Partial<CacheConfig>): void {
    const oldPrefetching = this.config.enablePrefetching;
    this.config = { ...this.config, ...newConfig };
    
    // Start/stop prefetch timer based on new config
    if (this.config.enablePrefetching && !oldPrefetching) {
      this.startPrefetchTimer();
    } else if (!this.config.enablePrefetching && oldPrefetching) {
      this.stopPrefetchTimer();
    }
  }

  // New: Warm cache with frequently accessed data
  warmCache(warmData: Array<{ key: string; data: any; ttl?: number; priority?: number }>): void {
    if (!this.config.enablePrefetching) return;

    let warmed = 0;
    for (const item of warmData) {
      if (this.cache.size < this.config.maxSize) {
        this.set(item.key, item.data, item.ttl, item.priority);
        warmed++;
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.debug(`[Cache] Warmed ${warmed} items`);
    }
  }

  // New: Get prefetch candidates for external prefetching
  getPrefetchCandidates(): PrefetchCandidate[] {
    if (!this.config.enablePrefetching) return [];

    const candidates: PrefetchCandidate[] = [];
    const now = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.prefetchScore >= this.config.prefetchThreshold) {
        const pattern = this.analyzeAccessPattern(key);
        candidates.push({
          key,
          score: item.prefetchScore,
          lastAccessed: item.lastAccessed,
          accessPattern: pattern
        });
      }
    }

    // Sort by score and return top candidates
    return candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, this.config.maxPrefetchItems);
  }

  // Check if item is expired
  private isExpired(item: CacheItem<any>): boolean {
    return Date.now() - item.timestamp > item.ttl;
  }

  // Enhanced: Intelligent eviction using priority and access patterns
  private intelligentEviction(): void {
    let bestCandidate: string | null = null;
    let bestScore = -Infinity;

    for (const [key, item] of this.cache.entries()) {
      // Calculate eviction score (lower is better for keeping)
      const timeSinceAccess = Date.now() - item.lastAccessed;
      const accessFrequency = item.accessCount / Math.max(1, timeSinceAccess / 1000);
      const evictionScore = (timeSinceAccess / 1000) - (item.priority * 10) - (accessFrequency * 100);

      if (evictionScore > bestScore) {
        bestScore = evictionScore;
        bestCandidate = key;
      }
    }

    if (bestCandidate) {
      this.cache.delete(bestCandidate);
      this.accessPatterns.delete(bestCandidate);
      this.stats.evictions++;
      
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[Cache] Intelligently evicted: ${bestCandidate} (score: ${bestScore.toFixed(2)})`);
      }
    }
  }

  // New: Track access patterns for prefetching
  private trackAccessPattern(key: string): void {
    const now = Date.now();
    if (!this.accessPatterns.has(key)) {
      this.accessPatterns.set(key, []);
    }
    
    const pattern = this.accessPatterns.get(key)!;
    pattern.push(now);
    
    // Keep only last 20 access times to prevent memory bloat
    if (pattern.length > 20) {
      pattern.splice(0, pattern.length - 20);
    }
  }

  // New: Update prefetch score based on access patterns
  private updatePrefetchScore(key: string, item: CacheItem<any>): void {
    const pattern = this.accessPatterns.get(key);
    if (!pattern || pattern.length < 2) {
      item.prefetchScore = 0;
      return;
    }

    // Calculate time intervals between accesses
    const intervals: number[] = [];
    for (let i = 1; i < pattern.length; i++) {
      intervals.push(pattern[i] - pattern[i - 1]);
    }

    // Calculate score based on:
    // 1. Consistency of access intervals
    // 2. Frequency of access
    // 3. Recency of access
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const intervalVariance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    const consistency = Math.max(0, 1 - (intervalVariance / Math.pow(avgInterval, 2)));
    const frequency = Math.min(1, pattern.length / 20);
    const recency = Math.max(0, 1 - ((Date.now() - item.lastAccessed) / (5 * 60 * 1000)));

    item.prefetchScore = (consistency * 0.4) + (frequency * 0.3) + (recency * 0.3);
  }

  // New: Analyze access pattern for external use
  private analyzeAccessPattern(key: string): 'frequent' | 'periodic' | 'sporadic' {
    const pattern = this.accessPatterns.get(key);
    if (!pattern || pattern.length < 3) return 'sporadic';

    const intervals = [];
    for (let i = 1; i < pattern.length; i++) {
      intervals.push(pattern[i] - pattern[i - 1]);
    }

    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;

    if (variance < avgInterval * 0.1) return 'periodic';
    if (intervals.length > 10) return 'frequent';
    return 'sporadic';
  }

  // New: Get average priority for stats
  private getAveragePriority(): number {
    if (this.cache.size === 0) return 0;
    const totalPriority = Array.from(this.cache.values()).reduce((sum, item) => sum + item.priority, 0);
    return totalPriority / this.cache.size;
  }

  // Cleanup expired items
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.cache.entries()) {
      if (this.isExpired(item)) {
        this.cache.delete(key);
        this.accessPatterns.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0 && process.env.NODE_ENV === 'development') {
      console.debug(`[Cache] Cleaned up ${cleaned} expired items`);
    }
  }

  // Start cleanup timer
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  // New: Start prefetch timer
  private startPrefetchTimer(): void {
    if (this.prefetchTimer) return;
    
    this.prefetchTimer = setInterval(() => {
      this.performIntelligentPrefetch();
    }, 30 * 1000); // Every 30 seconds
  }

  // New: Stop prefetch timer
  private stopPrefetchTimer(): void {
    if (this.prefetchTimer) {
      clearInterval(this.prefetchTimer);
      this.prefetchTimer = null;
    }
  }

  // New: Perform intelligent prefetching
  private performIntelligentPrefetch(): void {
    if (!this.config.enablePrefetching) return;

    const candidates = this.getPrefetchCandidates();
    if (candidates.length === 0) return;

    // This is a hook for external prefetching logic
    // The actual prefetching will be implemented in the enhanced database service
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[Cache] Identified ${candidates.length} prefetch candidates`);
    }
  }

  // Stop cleanup timer
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.stopPrefetchTimer();
    this.clear();
  }
}

// Create singleton instance
export const cacheService = new CacheService();

// Export helper functions for common caching patterns
export const cacheWithTTL = <T>(
  key: string,
  data: T,
  ttl: number = 5 * 60 * 1000 // 5 minutes default
): void => {
  cacheService.set(key, data, ttl);
};

export const getCachedData = <T>(key: string): T | null => {
  return cacheService.get<T>(key);
};

export const cacheUserData = (userId: string, data: any): void => {
  cacheService.set(`user:${userId}`, data, 10 * 60 * 1000, 8); // High priority for user data
};

export const getCachedUserData = (userId: string): any => {
  return cacheService.get(`user:${userId}`);
};

export const cacheLoadData = (loadId: string, data: any): void => {
  cacheService.set(`load:${loadId}`, data, 2 * 60 * 1000, 6); // Medium priority for load data
};

export const getCachedLoadData = (loadId: string): any => {
  return cacheService.get(`load:${loadId}`);
};

export const invalidateUserCache = (userId: string): void => {
  cacheService.delete(`user:${userId}`);
};

export const invalidateLoadCache = (loadId: string): void => {
  cacheService.delete(`load:${loadId}`);
};

// New: Enhanced caching functions for Phase 1B
export const cacheWithPriority = <T>(
  key: string,
  data: T,
  priority: number = 5,
  ttl: number = 5 * 60 * 1000
): void => {
  cacheService.set(key, data, ttl, priority);
};

export const warmCache = (warmData: Array<{ key: string; data: any; ttl?: number; priority?: number }>): void => {
  cacheService.warmCache(warmData);
};

export const getPrefetchCandidates = (): Array<{ key: string; score: number; accessPattern: string }> => {
  return cacheService.getPrefetchCandidates().map(candidate => ({
    key: candidate.key,
    score: candidate.score,
    accessPattern: candidate.accessPattern
  }));
};

export const getCacheStats = () => {
  return cacheService.getStats();
};

// Advanced invalidation exports for Phase 1B
export const invalidateCacheByPattern = (pattern: string): number => {
  return cacheService.invalidateByPattern(pattern);
};

export const invalidateCacheByTags = (tags: string[]): number => {
  return cacheService.invalidateByTags(tags);
};

export const invalidateCacheByDependency = (dependencyKey: string): number => {
  return cacheService.invalidateByDependency(dependencyKey);
};

export const setCacheWithDependencies = <T>(
  key: string, 
  data: T, 
  dependencies: string[] = [], 
  tags: string[] = [], 
  ttl?: number, 
  priority: number = 1
): void => {
  cacheService.setWithDependencies(key, data, dependencies, tags, ttl, priority);
};

export const addCacheInvalidationPattern = (pattern: InvalidationPattern): void => {
  cacheService.addInvalidationPattern(pattern);
};

export const removeCacheInvalidationPattern = (patternName: string): boolean => {
  return cacheService.removeInvalidationPattern(patternName);
};
