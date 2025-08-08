import { useCallback, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  rateLimitService, 
  checkRateLimit, 
  getUserTier, 
  getRateLimitStats 
} from '../services/rateLimitService';

export interface RateLimitOptions {
  endpoint: string;
  retryAttempts?: number;
  retryDelay?: number;
  showUserFeedback?: boolean;
}

export const useRateLimit = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(getRateLimitStats());
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState<string>('');

  // Update stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(getRateLimitStats());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Check if current user is blocked
  useEffect(() => {
    if (user?.uid) {
      const blocked = rateLimitService.isUserBlocked(user.uid);
      setIsBlocked(blocked);
      if (blocked) {
        setBlockReason('Too many rate limit violations');
      }
    }
  }, [user?.uid, stats]);

  // Main rate limit check function with retry logic
  const checkLimit = useCallback(async (
    options: RateLimitOptions,
    operation: () => Promise<any>
  ): Promise<{ success: boolean; data?: any; error?: string; retryAfter?: number }> => {
    const {
      endpoint,
      retryAttempts = 3,
      retryDelay = 1000,
      showUserFeedback = true
    } = options;

    if (!user?.uid) {
      return { success: false, error: 'User not authenticated' };
    }

    const userTier = getUserTier(user);
    let lastError: string = '';
    let lastRetryAfter: number = 0;

    for (let attempt = 0; attempt < retryAttempts; attempt++) {
      // Check rate limit
      const rateLimitResult = checkRateLimit(user.uid, endpoint, userTier);

      if (!rateLimitResult.allowed) {
        lastError = `Rate limit exceeded. Please wait ${rateLimitResult.retryAfter} seconds.`;
        lastRetryAfter = rateLimitResult.retryAfter || 0;

        if (showUserFeedback) {
          // Show user-friendly message
          if (typeof window !== 'undefined') {
            const message = `Rate limit exceeded. Please wait ${Math.ceil(lastRetryAfter / 60)} minutes before trying again.`;
            alert(message);
          }
        }

        // Wait before retry
        if (attempt < retryAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        }
        continue;
      }

      try {
        // Rate limit check passed, execute operation
        const result = await operation();
        return { success: true, data: result };
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Operation failed';
        
        // Don't retry on non-rate-limit errors
        if (!lastError.includes('rate limit')) {
          return { success: false, error: lastError };
        }

        // Wait before retry
        if (attempt < retryAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        }
      }
    }

    return { success: false, error: lastError, retryAfter: lastRetryAfter };
  }, [user]);

  // Simple rate limit check (no operation execution)
  const isAllowed = useCallback((endpoint: string): boolean => {
    if (!user?.uid) return false;
    
    const userTier = getUserTier(user);
    const result = checkRateLimit(user.uid, endpoint, userTier);
    return result.allowed;
  }, [user]);

  // Get current user's rate limit status
  const getUserStatus = useCallback(() => {
    if (!user?.uid) return null;
    
    const userTier = getUserTier(user);
    const limits = rateLimitService.getUserLimits(userTier);
    const violations = stats.userViolations[user.uid] || 0;
    
    return {
      tier: userTier,
      limits,
      violations,
      isBlocked: rateLimitService.isUserBlocked(user.uid),
      remainingRequests: {
        daily: limits.requestsPerDay - (stats.totalRequests % limits.requestsPerDay),
        minute: limits.requestsPerMinute - (stats.totalRequests % limits.requestsPerMinute)
      }
    };
  }, [user, stats]);

  // Rate-limited API call wrapper
  const apiCall = useCallback(async <T>(
    endpoint: string,
    apiFunction: () => Promise<T>,
    options?: Partial<RateLimitOptions>
  ): Promise<{ success: boolean; data?: T; error?: string }> => {
    return checkLimit(
      { endpoint, ...options },
      apiFunction
    );
  }, [checkLimit]);

  // Rate-limited Firestore operations
  const firestoreCall = useCallback(async <T>(
    endpoint: string,
    firestoreFunction: () => Promise<T>,
    options?: Partial<RateLimitOptions>
  ): Promise<{ success: boolean; data?: T; error?: string }> => {
    return checkLimit(
      { endpoint, ...options },
      firestoreFunction
    );
  }, [checkLimit]);

  // Check if user can perform an action
  const canPerform = useCallback((action: string): boolean => {
    if (!user?.uid) return false;
    
    const userTier = getUserTier(user);
    const result = checkRateLimit(user.uid, action, userTier);
    return result.allowed;
  }, [user]);

  // Get remaining requests for an endpoint
  const getRemaining = useCallback((endpoint: string): number => {
    if (!user?.uid) return 0;
    
    const userTier = getUserTier(user);
    const result = checkRateLimit(user.uid, endpoint, userTier);
    return result.remaining;
  }, [user]);

  // Unblock current user (admin function)
  const unblockUser = useCallback(() => {
    if (user?.uid) {
      rateLimitService.unblockUser(user.uid);
      setIsBlocked(false);
      setBlockReason('');
    }
  }, [user]);

  // Clear all rate limits (admin function)
  const clearAllLimits = useCallback(() => {
    rateLimitService.clearLimits();
    setStats(getRateLimitStats());
  }, []);

  return {
    // Core functions
    checkLimit,
    isAllowed,
    apiCall,
    firestoreCall,
    canPerform,
    getRemaining,
    
    // User status
    getUserStatus,
    isBlocked,
    blockReason,
    
    // Admin functions
    unblockUser,
    clearAllLimits,
    
    // Statistics
    stats,
    
    // User tier
    userTier: user ? getUserTier(user) : 'basic'
  };
};
