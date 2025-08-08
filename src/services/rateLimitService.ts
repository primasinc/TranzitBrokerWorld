// Rate Limiting Service - Business-optimized protection for production scale
interface RateLimitConfig {
  requests: number;
  window: number; // milliseconds
  burst?: number; // optional burst allowance
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  limit: number;
}

interface UserTier {
  tier: 'basic' | 'professional' | 'enterprise' | 'admin';
  requestsPerDay: number;
  requestsPerMinute: number;
  burstAllowance: number;
}

class RateLimitService {
  private limits = new Map<string, { count: number; resetTime: number }>();
  private userTiers: Record<string, UserTier> = {
    basic: {
      tier: 'basic',
      requestsPerDay: 1000,
      requestsPerMinute: 20,
      burstAllowance: 50
    },
    professional: {
      tier: 'professional', 
      requestsPerDay: 2000,
      requestsPerMinute: 40,
      burstAllowance: 100
    },
    enterprise: {
      tier: 'enterprise',
      requestsPerDay: 5000,
      requestsPerMinute: 100,
      burstAllowance: 200
    },
    admin: {
      tier: 'admin',
      requestsPerDay: 10000,
      requestsPerMinute: 200,
      burstAllowance: 500
    }
  };

  private endpointLimits: Record<string, RateLimitConfig> = {
    // Authentication endpoints (strict limits for security)
    'auth/login': { requests: 5, window: 5 * 60 * 1000 }, // 5 requests per 5 minutes
    'auth/register': { requests: 3, window: 10 * 60 * 1000 }, // 3 requests per 10 minutes
    'auth/reset-password': { requests: 3, window: 10 * 60 * 1000 },
    
    // Heavy operations (moderate limits)
    'loads/search': { requests: 30, window: 60 * 1000 }, // 30 requests per minute
    'loads/bulk-update': { requests: 10, window: 60 * 1000 },
    'reports/generate': { requests: 5, window: 60 * 1000 },
    
    // File operations (resource intensive)
    'files/upload': { requests: 10, window: 60 * 1000 },
    'files/download': { requests: 50, window: 60 * 1000 },
    
    // Light operations (generous limits)
    'user/profile': { requests: 100, window: 60 * 1000 },
    'loads/list': { requests: 100, window: 60 * 1000 },
    'notifications': { requests: 200, window: 60 * 1000 },
    
    // Admin operations (very generous for admins)
    'admin/users': { requests: 500, window: 60 * 1000 },
    'admin/system': { requests: 1000, window: 60 * 1000 }
  };

  private stats = {
    totalRequests: 0,
    blockedRequests: 0,
    violations: 0,
    userViolations: new Map<string, number>()
  };

  // Check if a request is allowed
  checkRateLimit(
    identifier: string,
    endpoint: string,
    userTier: string = 'basic'
  ): RateLimitResult {
    this.stats.totalRequests++;

    const now = Date.now();
    const tier = this.userTiers[userTier] || this.userTiers.basic;
    const endpointLimit = this.endpointLimits[endpoint] || { requests: 100, window: 60 * 1000 };

    // Create keys for different limit types
    const dailyKey = `${identifier}:daily:${Math.floor(now / (24 * 60 * 60 * 1000))}`;
    const minuteKey = `${identifier}:minute:${Math.floor(now / (60 * 1000))}`;
    const endpointKey = `${identifier}:endpoint:${endpoint}:${Math.floor(now / endpointLimit.window)}`;

    // Check daily limit
    const dailyLimit = this.checkLimit(dailyKey, tier.requestsPerDay, 24 * 60 * 60 * 1000);
    if (!dailyLimit.allowed) {
      this.recordViolation(identifier, 'daily');
      return {
        allowed: false,
        remaining: 0,
        resetTime: dailyLimit.resetTime,
        retryAfter: Math.ceil((dailyLimit.resetTime - now) / 1000),
        limit: tier.requestsPerDay
      };
    }

    // Check minute limit
    const minuteLimit = this.checkLimit(minuteKey, tier.requestsPerMinute, 60 * 1000);
    if (!minuteLimit.allowed) {
      this.recordViolation(identifier, 'minute');
      return {
        allowed: false,
        remaining: 0,
        resetTime: minuteLimit.resetTime,
        retryAfter: Math.ceil((minuteLimit.resetTime - now) / 1000),
        limit: tier.requestsPerMinute
      };
    }

    // Check endpoint-specific limit
    const endpointLimitResult = this.checkLimit(endpointKey, endpointLimit.requests, endpointLimit.window);
    if (!endpointLimitResult.allowed) {
      this.recordViolation(identifier, 'endpoint');
      return {
        allowed: false,
        remaining: 0,
        resetTime: endpointLimitResult.resetTime,
        retryAfter: Math.ceil((endpointLimitResult.resetTime - now) / 1000),
        limit: endpointLimit.requests
      };
    }

    // All checks passed
    return {
      allowed: true,
      remaining: Math.min(dailyLimit.remaining, minuteLimit.remaining, endpointLimitResult.remaining),
      resetTime: Math.min(dailyLimit.resetTime, minuteLimit.resetTime, endpointLimitResult.resetTime),
      limit: Math.min(tier.requestsPerDay, tier.requestsPerMinute, endpointLimit.requests)
    };
  }

  // Check a specific limit
  private checkLimit(key: string, maxRequests: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const limit = this.limits.get(key);

    if (!limit || now > limit.resetTime) {
      // First request or window expired
      this.limits.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: now + windowMs,
        limit: maxRequests
      };
    }

    if (limit.count >= maxRequests) {
      // Limit exceeded
      this.stats.blockedRequests++;
      return {
        allowed: false,
        remaining: 0,
        resetTime: limit.resetTime,
        limit: maxRequests
      };
    }

    // Increment count
    limit.count++;
    this.limits.set(key, limit);

    return {
      allowed: true,
      remaining: maxRequests - limit.count,
      resetTime: limit.resetTime,
      limit: maxRequests
    };
  }

  // Record a violation
  private recordViolation(identifier: string, type: string): void {
    this.stats.violations++;
    const current = this.stats.userViolations.get(identifier) || 0;
    this.stats.userViolations.set(identifier, current + 1);

    if (process.env.NODE_ENV === 'development') {
      console.warn(`[Rate Limit] Violation: ${identifier} (${type})`);
    }
  }

  // Get user tier based on subscription
  getUserTier(userData?: any): string {
    if (!userData) return 'basic';
    
    // Check if user is admin
    if (userData.isAdmin || userData.isSuperAdmin) return 'admin';
    
    // Check subscription tier (you can customize this based on your business model)
    if (userData.subscriptionTier === 'enterprise') return 'enterprise';
    if (userData.subscriptionTier === 'professional') return 'professional';
    
    return 'basic';
  }

  // Get rate limit statistics
  getStats() {
    return {
      ...this.stats,
      userViolations: Object.fromEntries(this.stats.userViolations),
      hitRate: this.stats.totalRequests > 0 
        ? ((this.stats.totalRequests - this.stats.blockedRequests) / this.stats.totalRequests * 100).toFixed(2) + '%'
        : '100%'
    };
  }

  // Clear rate limit data (for testing/admin)
  clearLimits(): void {
    this.limits.clear();
    this.stats.totalRequests = 0;
    this.stats.blockedRequests = 0;
    this.stats.violations = 0;
    this.stats.userViolations.clear();
  }

  // Update user tier limits (admin function)
  updateUserTier(tier: string, config: Partial<UserTier>): void {
    if (this.userTiers[tier]) {
      this.userTiers[tier] = { ...this.userTiers[tier], ...config };
    }
  }

  // Get current limits for a user
  getUserLimits(userTier: string): UserTier {
    return this.userTiers[userTier] || this.userTiers.basic;
  }

  // Check if user is blocked (for admin monitoring)
  isUserBlocked(identifier: string): boolean {
    const violations = this.stats.userViolations.get(identifier) || 0;
    return violations > 10; // Block after 10 violations
  }

  // Unblock a user (admin function)
  unblockUser(identifier: string): void {
    this.stats.userViolations.delete(identifier);
  }

  // Cleanup old rate limit data
  cleanup(): void {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    for (const [key, limit] of this.limits.entries()) {
      if (limit.resetTime < oneDayAgo) {
        this.limits.delete(key);
      }
    }
  }
}

// Create singleton instance
export const rateLimitService = new RateLimitService();

// Export helper functions
export const checkRateLimit = (
  identifier: string,
  endpoint: string,
  userTier?: string
): RateLimitResult => {
  return rateLimitService.checkRateLimit(identifier, endpoint, userTier);
};

export const getUserTier = (userData?: any): string => {
  return rateLimitService.getUserTier(userData);
};

export const getRateLimitStats = () => {
  return rateLimitService.getStats();
};

// Start cleanup interval
setInterval(() => {
  rateLimitService.cleanup();
}, 60 * 60 * 1000); // Cleanup every hour
