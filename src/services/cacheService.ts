// Cache Service - Performance optimization for production scale
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  accessCount: number;
  lastAccessed: number;
}

interface CacheConfig {
  maxSize: number;
  defaultTTL: number; // 5 minutes default
  cleanupInterval: number; // 1 minute
  enableStats: boolean;
}

class CacheService {
  private cache = new Map<string, CacheItem<any>>();
  private config: CacheConfig = {
    maxSize: 1000, // Maximum number of cached items
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    cleanupInterval: 60 * 1000, // 1 minute
    enableStats: true
  };
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0
  };
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTimer();
  }

  // Set a value in cache
  set<T>(key: string, data: T, ttl?: number): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      accessCount: 0,
      lastAccessed: Date.now()
    };

    // Evict if cache is full
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, item);
    this.stats.sets++;

    if (process.env.NODE_ENV === 'development') {
      console.debug(`[Cache] Set: ${key}`);
    }
  }

  // Get a value from cache
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

    // Update access stats
    item.accessCount++;
    item.lastAccessed = Date.now();
    this.stats.hits++;

    if (process.env.NODE_ENV === 'development') {
      console.debug(`[Cache] Hit: ${key}`);
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
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[Cache] Delete: ${key}`);
      }
    }
    return deleted;
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
    this.stats.sets = 0;
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.deletes = 0;
    this.stats.evictions = 0;
    
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Cache] Cleared all');
    }
  }

  // Get cache statistics
  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: this.stats.hits + this.stats.misses > 0 
        ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  // Get cache keys (for debugging)
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  // Update configuration
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Check if item is expired
  private isExpired(item: CacheItem<any>): boolean {
    return Date.now() - item.timestamp > item.ttl;
  }

  // Evict least recently used item
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
      
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[Cache] Evicted: ${oldestKey}`);
      }
    }
  }

  // Cleanup expired items
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.cache.entries()) {
      if (this.isExpired(item)) {
        this.cache.delete(key);
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

  // Stop cleanup timer
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
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
  cacheService.set(`user:${userId}`, data, 10 * 60 * 1000); // 10 minutes for user data
};

export const getCachedUserData = (userId: string): any => {
  return cacheService.get(`user:${userId}`);
};

export const cacheLoadData = (loadId: string, data: any): void => {
  cacheService.set(`load:${loadId}`, data, 2 * 60 * 1000); // 2 minutes for load data
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
