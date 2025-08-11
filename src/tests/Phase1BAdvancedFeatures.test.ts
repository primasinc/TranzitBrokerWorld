import { 
  cacheService,
  invalidateCacheByPattern,
  invalidateCacheByTags,
  invalidateCacheByDependency,
  setCacheWithDependencies,
  addCacheInvalidationPattern,
  removeCacheInvalidationPattern
} from '../services/cacheService';

import {
  createDynamicIndex,
  dropDynamicIndex,
  getDynamicIndexes,
  getIndexPerformanceMetrics,
  queryOptimizationService
} from '../services/queryOptimizationService';

import {
  compressData,
  decompressData,
  analyzeStorageOptimization,
  getCompressionMetrics,
  dataCompressionService
} from '../services/dataCompressionService';

describe('Phase 1B Advanced Features', () => {
  beforeEach(() => {
    // Clear all caches and reset services before each test
    cacheService.clear();
    queryOptimizationService.stop();
    queryOptimizationService.start();
    dataCompressionService.stop();
    dataCompressionService.start();
  });

  afterEach(() => {
    // Clean up after each test
    cacheService.destroy();
    queryOptimizationService.destroy();
    dataCompressionService.destroy();
  });

  describe('Advanced Cache Invalidation Strategies', () => {
    test('should invalidate cache by pattern using regex', () => {
      // Setup test data
      cacheService.set('user:123:profile', { name: 'John' });
      cacheService.set('user:456:profile', { name: 'Jane' });
      cacheService.set('load:789:details', { id: '789' });
      cacheService.set('user:123:settings', { theme: 'dark' });

      // Test pattern invalidation
      const invalidatedCount = invalidateCacheByPattern('user:.*:profile');
      
      expect(invalidatedCount).toBe(2);
      expect(cacheService.has('user:123:profile')).toBe(false);
      expect(cacheService.has('user:456:profile')).toBe(false);
      expect(cacheService.has('load:789:details')).toBe(true);
      expect(cacheService.has('user:123:settings')).toBe(true);
    });

    test('should invalidate cache by tags', () => {
      // Setup test data with dependencies and tags
      setCacheWithDependencies('user:123:profile', { name: 'John' }, [], ['user', 'profile']);
      setCacheWithDependencies('user:456:profile', { name: 'Jane' }, [], ['user', 'profile']);
      setCacheWithDependencies('load:789:details', { id: '789' }, [], ['load', 'details']);

      // Test tag invalidation
      const invalidatedCount = invalidateCacheByTags(['profile']);
      
      expect(invalidatedCount).toBe(2);
      expect(cacheService.has('user:123:profile')).toBe(false);
      expect(cacheService.has('user:456:profile')).toBe(false);
      expect(cacheService.has('load:789:details')).toBe(true);
    });

    test('should invalidate cache by dependencies', () => {
      // Setup test data with dependencies
      setCacheWithDependencies('user:123:profile', { name: 'John' }, ['user:123']);
      setCacheWithDependencies('user:123:settings', { theme: 'dark' }, ['user:123']);
      setCacheWithDependencies('load:789:details', { id: '789' }, ['load:789']);

      // Test dependency invalidation
      const invalidatedCount = invalidateCacheByDependency('user:123');
      
      expect(invalidatedCount).toBe(2);
      expect(cacheService.has('user:123:profile')).toBe(false);
      expect(cacheService.has('user:123:settings')).toBe(false);
      expect(cacheService.has('load:789:details')).toBe(true);
    });

    test('should manage invalidation patterns', () => {
      const pattern = {
        name: 'user-cleanup',
        pattern: 'user:.*',
        action: 'invalidate' as const,
        priority: 5,
        enabled: true
      };

      // Add pattern
      addCacheInvalidationPattern(pattern);
      
      // Test pattern execution
      cacheService.set('user:123:profile', { name: 'John' });
      cacheService.set('load:789:details', { id: '789' });

      const invalidatedCount = invalidateCacheByPattern('user:.*');
      expect(invalidatedCount).toBe(1);
      expect(cacheService.has('user:123:profile')).toBe(false);
      expect(cacheService.has('load:789:details')).toBe(true);

      // Remove pattern
      const removed = removeCacheInvalidationPattern('user-cleanup');
      expect(removed).toBe(true);
    });
  });

  describe('Dynamic Index Management', () => {
    test('should create and manage dynamic indexes', async () => {
      // Create a dynamic index
      const indexId = await createDynamicIndex('users', ['email', 'status'], 'composite');
      
      expect(indexId).toBeDefined();
      expect(indexId).toMatch(/^idx_users_email_status_\d+$/);

      // Verify index was created
      const indexes = getDynamicIndexes();
      expect(indexes).toHaveLength(1);
      expect(indexes[0].id).toBe(indexId);
      expect(indexes[0].status).toBe('active');
      expect(indexes[0].collection).toBe('users');
      expect(indexes[0].fields).toEqual(['email', 'status']);
      expect(indexes[0].type).toBe('composite');
    });

    test('should drop dynamic indexes', async () => {
      // Create an index first
      const indexId = await createDynamicIndex('loads', ['origin', 'destination']);
      
      // Verify it exists
      let indexes = getDynamicIndexes();
      expect(indexes).toHaveLength(1);

      // Drop the index
      const dropped = await dropDynamicIndex(indexId);
      expect(dropped).toBe(true);

      // Verify it was removed
      indexes = getDynamicIndexes();
      expect(indexes).toHaveLength(0);
    });

    test('should track index performance metrics', async () => {
      // Create multiple indexes
      await createDynamicIndex('users', ['email']);
      await createDynamicIndex('loads', ['origin']);
      await createDynamicIndex('carriers', ['rating']);

      // Get performance metrics
      const metrics = getIndexPerformanceMetrics();
      
      expect(metrics.totalIndexes).toBe(3);
      expect(metrics.activeIndexes).toBe(3);
      expect(metrics.totalSpaceUsed).toBeGreaterThan(0);
      expect(metrics.maintenanceOverhead).toBe(0.3); // 3 indexes * 0.1
    });

    test('should handle index creation failures gracefully', async () => {
      // Mock a failure scenario
      jest.spyOn(queryOptimizationService as any, 'simulateIndexCreation')
        .mockRejectedValueOnce(new Error('Index creation failed'));

      await expect(createDynamicIndex('users', ['email']))
        .rejects.toThrow('Index creation failed');

      // Verify failed index is tracked
      const indexes = getDynamicIndexes();
      expect(indexes).toHaveLength(1);
      expect(indexes[0].status).toBe('failed');
    });
  });

  describe('Storage Optimization Analytics', () => {
    test('should analyze storage optimization opportunities', async () => {
      const optimizations = await analyzeStorageOptimization();
      
      expect(Array.isArray(optimizations)).toBe(true);
      expect(optimizations.length).toBeGreaterThan(0);
      
      // Verify optimization structure
      const optimization = optimizations[0];
      expect(optimization).toHaveProperty('type');
      expect(optimization).toHaveProperty('target');
      expect(optimization).toHaveProperty('estimatedSavings');
      expect(optimization).toHaveProperty('priority');
      expect(optimization).toHaveProperty('status');
    });

    test('should compress and decompress data effectively', async () => {
      const testData = {
        users: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `User ${i}`,
          email: `user${i}@example.com`,
          profile: {
            bio: `This is a long bio for user ${i} that contains a lot of text to test compression`,
            preferences: {
              theme: 'dark',
              language: 'en',
              notifications: true
            }
          }
        }))
      };

      // Compress data
      const { compressed, stats } = await compressData(testData);
      
      expect(compressed).toBeDefined();
      expect(stats.originalSize).toBeGreaterThan(0);
      expect(stats.compressedSize).toBeGreaterThan(0);
      expect(stats.compressionRatio).toBeLessThan(1); // Should compress
      expect(stats.compressionTime).toBeGreaterThan(0);

      // Decompress data
      const { data: decompressed } = await decompressData(compressed, stats.algorithm);
      
      expect(decompressed).toEqual(testData);
    });

    test('should provide compression metrics', () => {
      const metrics = getCompressionMetrics();
      
      expect(metrics).toHaveProperty('totalCompressions');
      expect(metrics).toHaveProperty('averageCompressionRatio');
      expect(metrics).toHaveProperty('averageCompressionTime');
      expect(metrics).toHaveProperty('averageDecompressionTime');
      expect(metrics).toHaveProperty('totalSpaceSaved');
      expect(metrics).toHaveProperty('mostEffectiveAlgorithm');
    });
  });

  describe('Integration Performance', () => {
    test('should maintain performance under load', async () => {
      const startTime = performance.now();
      
      // Simulate heavy operations
      for (let i = 0; i < 100; i++) {
        cacheService.set(`key:${i}`, { data: `value:${i}` });
        await createDynamicIndex(`collection:${i}`, [`field:${i}`]);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(totalTime).toBeLessThan(5000); // 5 seconds
      
      // Verify all operations completed
      expect(cacheService.getStats().size).toBe(100);
      expect(getDynamicIndexes().length).toBe(100);
    });

    test('should handle concurrent operations', async () => {
      const promises = [];
      
      // Create concurrent operations
      for (let i = 0; i < 50; i++) {
        promises.push(createDynamicIndex(`collection:${i}`, [`field:${i}`]));
        promises.push(Promise.resolve(cacheService.set(`key:${i}`, { data: `value:${i}` })));
      }
      
      // Execute all concurrently
      await Promise.all(promises);
      
      // Verify all completed successfully
      expect(getDynamicIndexes().length).toBe(50);
      expect(cacheService.getStats().size).toBe(50);
    });
  });
});
