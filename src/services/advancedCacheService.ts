// Advanced Cache Service - Phase 1B
// Provides Redis-like caching functionality with intelligent eviction and performance optimization

interface CacheItem<T = any> {
  key: string;
  value: T;
  timestamp: number;
  expiresAt?: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  tags?: string[];
}

interface CacheStats {
  totalItems: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  averageAccessTime: number;
  memoryUsage: number;
  timestamp: number;
}

interface CacheConfig {
  maxSize: number; // Maximum memory usage in bytes
  maxItems: number; // Maximum number of items
  defaultTTL: number; // Default time-to-live in milliseconds
  evictionPolicy: 'lru' | 'lfu' | 'fifo' | 'random';
  enableCompression: boolean;
  enablePersistence: boolean;
  compressionThreshold: number; // Minimum size to compress
}

class AdvancedCacheService {
  private cache = new Map<string, CacheItem>();
  private stats: CacheStats;
  private config: CacheConfig;
  private isActive = false;
  private evictionTimer?: NodeJS.Timeout;
  private persistenceTimer?: NodeJS.Timeout;
  private accessLog: Array<{ key: string; timestamp: number; operation: 'get' | 'set' | 'delete' }> = [];

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      maxSize: 100 * 1024 * 1024, // 100MB default
      maxItems: 10000,
      defaultTTL: 5 * 60 * 1000, // 5 minutes default
      evictionPolicy: 'lru',
      enableCompression: true,
      enablePersistence: false,
      compressionThreshold: 1024, // 1KB
      ...config
    };

    this.stats = {
      totalItems: 0,
      totalSize: 0,
      hitRate: 0,
      missRate: 0,
      evictionCount: 0,
      averageAccessTime: 0,
      memoryUsage: 0,
      timestamp: Date.now()
    };

    this.start();
  }

  start(): void {
    if (this.isActive) return;
    this.isActive = true;
    
    // Start eviction timer
    this.evictionTimer = setInterval(() => {
      this.performEviction();
    }, 30000); // Check every 30 seconds

    // Start persistence timer if enabled
    if (this.config.enablePersistence) {
      this.persistenceTimer = setInterval(() => {
        this.persistCache();
      }, 60000); // Persist every minute
    }

    console.log('[AdvancedCacheService] Service started');
  }

  stop(): void {
    if (!this.isActive) return;
    this.isActive = false;
    
    if (this.evictionTimer) {
      clearInterval(this.evictionTimer);
    }
    
    if (this.persistenceTimer) {
      clearInterval(this.persistenceTimer);
    }

    console.log('[AdvancedCacheService] Service stopped');
  }

  /**
   * Set a value in the cache
   */
  set<T>(key: string, value: T, options?: {
    ttl?: number;
    tags?: string[];
    compress?: boolean;
  }): boolean {
    if (!this.isActive) return false;

    const startTime = performance.now();
    
    try {
      // Check if we need to evict items first
      const itemSize = this.calculateItemSize(key, value);
      if (this.shouldEvict(itemSize)) {
        this.performEviction();
      }

      // Create cache item
      const item: CacheItem<T> = {
        key,
        value: options?.compress && itemSize > this.config.compressionThreshold 
          ? this.compressValue(value) 
          : value,
        timestamp: Date.now(),
        expiresAt: options?.ttl ? Date.now() + options.ttl : undefined,
        accessCount: 0,
        lastAccessed: Date.now(),
        size: itemSize,
        tags: options?.tags || []
      };

      // Remove existing item if it exists
      if (this.cache.has(key)) {
        this.removeItem(key);
      }

      // Add new item
      this.cache.set(key, item);
      this.updateStats('set', itemSize);
      
      this.logAccess(key, 'set');
      
      const accessTime = performance.now() - startTime;
      this.updateAccessTime(accessTime);

      return true;
    } catch (error) {
      console.error('[AdvancedCacheService] Set operation failed:', error);
      return false;
    }
  }

  /**
   * Get a value from the cache
   */
  get<T>(key: string): T | null {
    if (!this.isActive) return null;

    const startTime = performance.now();
    
    try {
      const item = this.cache.get(key);
      
      if (!item) {
        this.updateStats('miss');
        this.logAccess(key, 'get');
        return null;
      }

      // Check if item has expired
      if (item.expiresAt && Date.now() > item.expiresAt) {
        this.delete(key);
        this.updateStats('miss');
        this.logAccess(key, 'get');
        return null;
      }

      // Update access statistics
      item.accessCount++;
      item.lastAccessed = Date.now();
      
      // Decompress if needed
      let value = item.value;
      if (this.isCompressed(value)) {
        value = this.decompressValue(value);
      }

      this.updateStats('hit');
      this.logAccess(key, 'get');
      
      const accessTime = performance.now() - startTime;
      this.updateAccessTime(accessTime);

      return value as T;
    } catch (error) {
      console.error('[AdvancedCacheService] Get operation failed:', error);
      this.updateStats('miss');
      return null;
    }
  }

  /**
   * Delete an item from the cache
   */
  delete(key: string): boolean {
    if (!this.isActive) return false;

    try {
      const item = this.cache.get(key);
      if (item) {
        this.removeItem(key);
        this.logAccess(key, 'delete');
        return true;
      }
      return false;
    } catch (error) {
      console.error('[AdvancedCacheService] Delete operation failed:', error);
      return false;
    }
  }

  /**
   * Check if a key exists in the cache
   */
  has(key: string): boolean {
    if (!this.isActive) return false;
    
    const item = this.cache.get(key);
    if (!item) return false;
    
    // Check if expired
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Clear all items with specific tags
   */
  clearByTags(tags: string[]): number {
    if (!this.isActive) return 0;

    let clearedCount = 0;
    const keysToDelete: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (item.tags && item.tags.some(tag => tags.includes(tag))) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      if (this.delete(key)) {
        clearedCount++;
      }
    });

    return clearedCount;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache configuration
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Update cache configuration
   */
  updateConfig(updates: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...updates };
    console.log('[AdvancedCacheService] Configuration updated:', updates);
  }

  /**
   * Clear all cache data
   */
  clear(): void {
    this.cache.clear();
    this.resetStats();
    console.log('[AdvancedCacheService] Cache cleared');
  }

  /**
   * Get all keys in the cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size information
   */
  size(): { items: number; memory: number } {
    return {
      items: this.cache.size,
      memory: this.stats.totalSize
    };
  }

  // Private methods

  private calculateItemSize(key: string, value: any): number {
    try {
      const serialized = JSON.stringify({ key, value });
      return new Blob([serialized]).size;
    } catch {
      return key.length + 100; // Fallback size estimation
    }
  }

  private shouldEvict(newItemSize: number): boolean {
    return this.stats.totalSize + newItemSize > this.config.maxSize ||
           this.cache.size >= this.config.maxItems;
  }

  private performEviction(): void {
    if (this.cache.size === 0) return;

    const itemsToEvict = Math.max(1, Math.floor(this.cache.size * 0.1)); // Evict 10% of items
    let evictedCount = 0;

    switch (this.config.evictionPolicy) {
      case 'lru':
        evictedCount = this.evictLRU(itemsToEvict);
        break;
      case 'lfu':
        evictedCount = this.evictLFU(itemsToEvict);
        break;
      case 'fifo':
        evictedCount = this.evictFIFO(itemsToEvict);
        break;
      case 'random':
        evictedCount = this.evictRandom(itemsToEvict);
        break;
    }

    if (evictedCount > 0) {
      this.stats.evictionCount += evictedCount;
      console.log(`[AdvancedCacheService] Evicted ${evictedCount} items using ${this.config.evictionPolicy} policy`);
    }
  }

  private evictLRU(count: number): number {
    const items = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)
      .slice(0, count);

    items.forEach(([key]) => this.removeItem(key));
    return items.length;
  }

  private evictLFU(count: number): number {
    const items = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.accessCount - b.accessCount)
      .slice(0, count);

    items.forEach(([key]) => this.removeItem(key));
    return items.length;
  }

  private evictFIFO(count: number): number {
    const items = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp)
      .slice(0, count);

    items.forEach(([key]) => this.removeItem(key));
    return items.length;
  }

  private evictRandom(count: number): number {
    const keys = Array.from(this.cache.keys());
    const randomKeys = keys.sort(() => Math.random() - 0.5).slice(0, count);
    
    randomKeys.forEach(key => this.removeItem(key));
    return randomKeys.length;
  }

  private removeItem(key: string): void {
    const item = this.cache.get(key);
    if (item) {
      this.stats.totalSize -= item.size;
      this.stats.totalItems--;
      this.cache.delete(key);
    }
  }

  private updateStats(operation: 'hit' | 'miss' | 'set', size?: number): void {
    if (operation === 'set' && size) {
      this.stats.totalSize += size;
      this.stats.totalItems++;
    }

    // Update hit/miss rates
    const totalAccesses = this.stats.hitRate + this.stats.missRate;
    if (operation === 'hit') {
      this.stats.hitRate++;
    } else if (operation === 'miss') {
      this.stats.missRate++;
    }

    // Calculate rates
    const total = this.stats.hitRate + this.stats.missRate;
    if (total > 0) {
      this.stats.hitRate = this.stats.hitRate / total;
      this.stats.missRate = this.stats.missRate / total;
    }
  }

  private updateAccessTime(accessTime: number): void {
    const totalAccesses = this.stats.hitRate + this.stats.missRate;
    this.stats.averageAccessTime = 
      (this.stats.averageAccessTime * (totalAccesses - 1) + accessTime) / totalAccesses;
  }

  private logAccess(key: string, operation: 'get' | 'set' | 'delete'): void {
    this.accessLog.push({ key, timestamp: Date.now(), operation });
    
    // Keep only last 1000 access logs
    if (this.accessLog.length > 1000) {
      this.accessLog = this.accessLog.slice(-1000);
    }
  }

  private resetStats(): void {
    this.stats = {
      totalItems: 0,
      totalSize: 0,
      hitRate: 0,
      missRate: 0,
      evictionCount: 0,
      averageAccessTime: 0,
      memoryUsage: 0,
      timestamp: Date.now()
    };
  }

  private compressValue<T>(value: T): any {
    // Simple compression simulation - in production, use actual compression
    try {
      const serialized = JSON.stringify(value);
      return { _compressed: true, data: serialized, algorithm: 'simple' };
    } catch {
      return value;
    }
  }

  private decompressValue(compressedValue: any): any {
    if (compressedValue && compressedValue._compressed) {
      try {
        return JSON.parse(compressedValue.data);
      } catch {
        return compressedValue;
      }
    }
    return compressedValue;
  }

  private isCompressed(value: any): boolean {
    return value && typeof value === 'object' && value._compressed === true;
  }

  private persistCache(): void {
    // In production, implement actual persistence logic
    // For now, just log the operation
    console.log('[AdvancedCacheService] Cache persistence triggered');
  }

  destroy(): void {
    this.stop();
    this.clear();
    console.log('[AdvancedCacheService] Service destroyed');
  }
}

// Create singleton instance
export const advancedCacheService = new AdvancedCacheService();

// Export public API
export const setCache = <T>(key: string, value: T, options?: any) => 
  advancedCacheService.set(key, value, options);

export const getCache = <T>(key: string): T | null => 
  advancedCacheService.get<T>(key);

export const deleteCache = (key: string): boolean => 
  advancedCacheService.delete(key);

export const hasCache = (key: string): boolean => 
  advancedCacheService.has(key);

export const clearCacheByTags = (tags: string[]): number => 
  advancedCacheService.clearByTags(tags);

export const getCacheStats = () => 
  advancedCacheService.getStats();

export const getCacheConfig = () => 
  advancedCacheService.getConfig();

export const updateCacheConfig = (updates: Partial<CacheConfig>) => 
  advancedCacheService.updateConfig(updates);

export const clearCache = () => 
  advancedCacheService.clear();

export const getCacheKeys = () => 
  advancedCacheService.keys();

export const getCacheSize = () => 
  advancedCacheService.size();

export default advancedCacheService;
