import { useCallback, useEffect, useState } from 'react';
import { 
  cacheService, 
  cacheWithTTL, 
  getCachedData,
  cacheUserData,
  getCachedUserData,
  cacheLoadData,
  getCachedLoadData,
  invalidateUserCache,
  invalidateLoadCache
} from '../services/cacheService';

export const useCache = () => {
  const [stats, setStats] = useState(cacheService.getStats());

  // Update stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(cacheService.getStats());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Generic cache operations
  const set = useCallback(<T>(key: string, data: T, ttl?: number): void => {
    cacheService.set(key, data, ttl);
    setStats(cacheService.getStats());
  }, []);

  const get = useCallback(<T>(key: string): T | null => {
    const data = cacheService.get<T>(key);
    setStats(cacheService.getStats());
    return data;
  }, []);

  const has = useCallback((key: string): boolean => {
    return cacheService.has(key);
  }, []);

  const remove = useCallback((key: string): boolean => {
    const deleted = cacheService.delete(key);
    setStats(cacheService.getStats());
    return deleted;
  }, []);

  const clear = useCallback((): void => {
    cacheService.clear();
    setStats(cacheService.getStats());
  }, []);

  // User-specific cache operations
  const setUserData = useCallback((userId: string, data: any): void => {
    cacheUserData(userId, data);
    setStats(cacheService.getStats());
  }, []);

  const getUserData = useCallback((userId: string): any => {
    const data = getCachedUserData(userId);
    setStats(cacheService.getStats());
    return data;
  }, []);

  const invalidateUser = useCallback((userId: string): void => {
    invalidateUserCache(userId);
    setStats(cacheService.getStats());
  }, []);

  // Load-specific cache operations
  const setLoadData = useCallback((loadId: string, data: any): void => {
    cacheLoadData(loadId, data);
    setStats(cacheService.getStats());
  }, []);

  const getLoadData = useCallback((loadId: string): any => {
    const data = getCachedLoadData(loadId);
    setStats(cacheService.getStats());
    return data;
  }, []);

  const invalidateLoad = useCallback((loadId: string): void => {
    invalidateLoadCache(loadId);
    setStats(cacheService.getStats());
  }, []);

  // Cache with automatic TTL
  const setWithTTL = useCallback(<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void => {
    cacheWithTTL(key, data, ttl);
    setStats(cacheService.getStats());
  }, []);

  // Get cache keys for debugging
  const getKeys = useCallback((): string[] => {
    return cacheService.getKeys();
  }, []);

  // Get current cache statistics
  const getCacheStats = useCallback(() => {
    return cacheService.getStats();
  }, []);

  return {
    // Generic operations
    set,
    get,
    has,
    remove,
    clear,
    setWithTTL,
    
    // User operations
    setUserData,
    getUserData,
    invalidateUser,
    
    // Load operations
    setLoadData,
    getLoadData,
    invalidateLoad,
    
    // Debug operations
    getKeys,
    getCacheStats,
    
    // Current stats
    stats
  };
};
