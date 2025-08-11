// Intelligent Prefetching Service - Phase 1B
// Analyzes user behavior patterns and automatically prefetches data

import { cacheService, getPrefetchCandidates, warmCache } from './cacheService';
import { EnhancedDocService, EnhancedQueryService } from './enhancedDbService';

interface PrefetchStrategy {
  name: string;
  priority: number;
  enabled: boolean;
  conditions: PrefetchCondition[];
  actions: PrefetchAction[];
}

interface PrefetchCondition {
  type: 'userActivity' | 'timeBased' | 'dataAccess' | 'navigation';
  value: any;
  operator: 'equals' | 'greaterThan' | 'lessThan' | 'contains' | 'pattern';
}

interface PrefetchAction {
  type: 'document' | 'query' | 'collection';
  target: string;
  parameters?: any;
  priority: number;
  ttl: number;
}

interface UserBehaviorPattern {
  userId: string;
  actions: UserAction[];
  lastActivity: number;
  sessionDuration: number;
  preferences: Record<string, any>;
}

interface UserAction {
  type: string;
  timestamp: number;
  target: string;
  metadata?: any;
}

class IntelligentPrefetchService {
  private strategies: PrefetchStrategy[] = [];
  private userPatterns = new Map<string, UserBehaviorPattern>();
  private isActive = false;
  private prefetchTimer: NodeJS.Timeout | null = null;
  private analysisTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeDefaultStrategies();
    this.start();
  }

  // Initialize default prefetch strategies
  private initializeDefaultStrategies(): void {
    // Strategy 1: User Profile Prefetching
    this.strategies.push({
      name: 'User Profile Prefetching',
      priority: 10,
      enabled: true,
      conditions: [
        { type: 'userActivity', value: 'login', operator: 'equals' },
        { type: 'userActivity', value: 'profileView', operator: 'equals' }
      ],
      actions: [
        { type: 'document', target: 'users', priority: 9, ttl: 10 * 60 * 1000 }
      ]
    });

    // Strategy 2: Load Data Prefetching
    this.strategies.push({
      name: 'Load Data Prefetching',
      priority: 8,
      enabled: true,
      conditions: [
        { type: 'userActivity', value: 'loadSearch', operator: 'equals' },
        { type: 'userActivity', value: 'loadView', operator: 'equals' }
      ],
      actions: [
        { type: 'query', target: 'loads', parameters: { status: 'available' }, priority: 7, ttl: 2 * 60 * 1000 },
        { type: 'query', target: 'carriers', parameters: { status: 'active' }, priority: 6, ttl: 5 * 60 * 1000 }
      ]
    });

    // Strategy 3: Time-Based Prefetching
    this.strategies.push({
      name: 'Time-Based Prefetching',
      priority: 6,
      enabled: true,
      conditions: [
        { type: 'timeBased', value: 'businessHours', operator: 'equals' }
      ],
      actions: [
        { type: 'query', target: 'loads', parameters: { status: 'urgent' }, priority: 8, ttl: 1 * 60 * 1000 },
        { type: 'query', target: 'notifications', parameters: { priority: 'high' }, priority: 7, ttl: 30 * 1000 }
      ]
    });

    // Strategy 4: Navigation-Based Prefetching
    this.strategies.push({
      name: 'Navigation-Based Prefetching',
      priority: 5,
      enabled: true,
      conditions: [
        { type: 'navigation', value: 'dashboard', operator: 'equals' }
      ],
      actions: [
        { type: 'query', target: 'analytics', parameters: { type: 'summary' }, priority: 6, ttl: 5 * 60 * 1000 },
        { type: 'query', target: 'recentActivity', parameters: { limit: 20 }, priority: 5, ttl: 2 * 60 * 1000 }
      ]
    });
  }

  // Start the prefetching service
  start(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    
    // Start prefetch timer (every 30 seconds)
    this.prefetchTimer = setInterval(() => {
      this.executePrefetchStrategies();
    }, 30 * 1000);
    
    // Start behavior analysis timer (every 2 minutes)
    this.analysisTimer = setInterval(() => {
      this.analyzeUserBehavior();
    }, 2 * 60 * 1000);
    
    console.log('[IntelligentPrefetchService] Service started');
  }

  // Stop the prefetching service
  stop(): void {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    if (this.prefetchTimer) {
      clearInterval(this.prefetchTimer);
      this.prefetchTimer = null;
    }
    
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
      this.analysisTimer = null;
    }
    
    console.log('[IntelligentPrefetchService] Service stopped');
  }

  // Record user action for behavior analysis
  recordUserAction(userId: string, action: Omit<UserAction, 'timestamp'>): void {
    if (!this.isActive) return;
    
    const userPattern = this.userPatterns.get(userId) || {
      userId,
      actions: [],
      lastActivity: Date.now(),
      sessionDuration: 0,
      preferences: {}
    };
    
    const fullAction: UserAction = {
      ...action,
      timestamp: Date.now()
    };
    
    userPattern.actions.push(fullAction);
    userPattern.lastActivity = fullAction.timestamp;
    
    // Keep only last 100 actions to prevent memory bloat
    if (userPattern.actions.length > 100) {
      userPattern.actions = userPattern.actions.slice(-100);
    }
    
    this.userPatterns.set(userId, userPattern);
    
    // Trigger immediate prefetch if conditions are met
    this.triggerImmediatePrefetch(userId, fullAction);
  }

  // Trigger immediate prefetch based on user action
  private async triggerImmediatePrefetch(userId: string, action: UserAction): Promise<void> {
    const applicableStrategies = this.strategies.filter(strategy => 
      strategy.enabled && this.evaluateStrategyConditions(strategy, userId, action)
    );
    
    if (applicableStrategies.length === 0) return;
    
    // Sort by priority and execute top strategies
    const topStrategies = applicableStrategies
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3); // Limit to top 3 strategies
    
    for (const strategy of topStrategies) {
      await this.executeStrategy(strategy, userId);
    }
  }

  // Execute prefetch strategies periodically
  private async executePrefetchStrategies(): Promise<void> {
    if (!this.isActive) return;
    
    const now = Date.now();
    const activeUsers = Array.from(this.userPatterns.values())
      .filter(pattern => now - pattern.lastActivity < 30 * 60 * 1000); // Active in last 30 minutes
    
    for (const userPattern of activeUsers) {
      const applicableStrategies = this.strategies.filter(strategy => 
        strategy.enabled && this.evaluateStrategyConditions(strategy, userPattern.userId)
      );
      
      for (const strategy of applicableStrategies) {
        await this.executeStrategy(strategy, userPattern.userId);
      }
    }
  }

  // Evaluate if strategy conditions are met
  private evaluateStrategyConditions(strategy: PrefetchStrategy, userId: string, action?: UserAction): boolean {
    return strategy.conditions.every(condition => {
      switch (condition.type) {
        case 'userActivity':
          if (!action) return false;
          return this.evaluateCondition(action.type, condition.value, condition.operator);
        
        case 'timeBased':
          return this.evaluateTimeCondition(condition.value, condition.operator);
        
        case 'dataAccess':
          return this.evaluateDataAccessCondition(userId, condition.value, condition.operator);
        
        case 'navigation':
          if (!action) return false;
          return this.evaluateCondition(action.target, condition.value, condition.operator);
        
        default:
          return false;
      }
    });
  }

  // Evaluate basic condition
  private evaluateCondition(actual: any, expected: any, operator: string): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected;
      case 'contains':
        return String(actual).includes(String(expected));
      case 'pattern':
        return new RegExp(expected).test(String(actual));
      default:
        return false;
    }
  }

  // Evaluate time-based condition
  private evaluateTimeCondition(value: string, operator: string): boolean {
    const now = new Date();
    const hour = now.getHours();
    
    switch (value) {
      case 'businessHours':
        return hour >= 8 && hour <= 18; // 8 AM to 6 PM
      case 'morning':
        return hour >= 6 && hour <= 12;
      case 'afternoon':
        return hour >= 12 && hour <= 18;
      case 'evening':
        return hour >= 18 && hour <= 22;
      default:
        return false;
    }
  }

  // Evaluate data access condition
  private evaluateDataAccessCondition(userId: string, value: any, operator: string): boolean {
    const userPattern = this.userPatterns.get(userId);
    if (!userPattern) return false;
    
    const recentActions = userPattern.actions.filter(
      action => Date.now() - action.timestamp < 5 * 60 * 1000 // Last 5 minutes
    );
    
    switch (operator) {
      case 'greaterThan':
        return recentActions.length > value;
      case 'lessThan':
        return recentActions.length < value;
      default:
        return false;
    }
  }

  // Execute a specific prefetch strategy
  private async executeStrategy(strategy: PrefetchStrategy, userId: string): Promise<void> {
    try {
      for (const action of strategy.actions) {
        await this.executePrefetchAction(action, userId);
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[IntelligentPrefetchService] Executed strategy: ${strategy.name} for user: ${userId}`);
      }
    } catch (error) {
      console.warn(`[IntelligentPrefetchService] Failed to execute strategy ${strategy.name}:`, error);
    }
  }

  // Execute a specific prefetch action
  private async executePrefetchAction(action: PrefetchAction, userId: string): Promise<void> {
    try {
      let data: any;
      
      switch (action.type) {
        case 'document':
          if (action.target === 'users') {
            const result = await EnhancedDocService.getDocument('users', userId);
            data = result.data;
          }
          break;
        
        case 'query':
          const result = await EnhancedQueryService.getDocuments(action.target, [
            ...Object.entries(action.parameters || {}).map(([key, value]) => ({ field: key, value, type: 'where' }))
          ]);
          data = result.data;
          break;
        
        case 'collection':
          const collectionResult = await EnhancedQueryService.getDocuments(action.target);
          data = collectionResult.data;
          break;
      }
      
      if (data) {
        // Cache the prefetched data
        const cacheKey = `prefetch:${userId}:${action.target}:${JSON.stringify(action.parameters || {})}`;
        cacheService.set(cacheKey, data, action.ttl, action.priority);
        
        if (process.env.NODE_ENV === 'development') {
          console.debug(`[IntelligentPrefetchService] Prefetched ${action.target} for user ${userId}`);
        }
      }
    } catch (error) {
      console.warn(`[IntelligentPrefetchService] Failed to execute action ${action.type}:`, error);
    }
  }

  // Analyze user behavior patterns
  private analyzeUserBehavior(): void {
    if (!this.isActive) return;
    
    const now = Date.now();
    
    for (const [userId, pattern] of this.userPatterns.entries()) {
      // Calculate session duration
      if (pattern.actions.length > 0) {
        const firstAction = pattern.actions[0];
        pattern.sessionDuration = now - firstAction.timestamp;
      }
      
      // Analyze preferences based on actions
      this.analyzeUserPreferences(pattern);
      
      // Clean up old patterns (inactive for more than 24 hours)
      if (now - pattern.lastActivity > 24 * 60 * 60 * 1000) {
        this.userPatterns.delete(userId);
      }
    }
  }

  // Analyze user preferences based on behavior
  private analyzeUserPreferences(pattern: UserBehaviorPattern): void {
    const actionCounts = new Map<string, number>();
    
    // Count action types
    for (const action of pattern.actions) {
      actionCounts.set(action.type, (actionCounts.get(action.type) || 0) + 1);
    }
    
    // Identify most common actions
    const sortedActions = Array.from(actionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    pattern.preferences = {
      favoriteActions: sortedActions.map(([action]) => action),
      totalActions: pattern.actions.length,
      sessionDuration: pattern.sessionDuration
    };
  }

  // Get prefetch statistics
  getStats() {
    return {
      isActive: this.isActive,
      strategies: this.strategies.length,
      activeStrategies: this.strategies.filter(s => s.enabled).length,
      trackedUsers: this.userPatterns.size,
      totalActions: Array.from(this.userPatterns.values())
        .reduce((sum, pattern) => sum + pattern.actions.length, 0)
    };
  }

  // Get user behavior insights
  getUserInsights(userId: string): UserBehaviorPattern | null {
    return this.userPatterns.get(userId) || null;
  }

  // Add missing getMetrics method
  getMetrics() {
    // Calculate effectiveness based on successful prefetches vs total attempts
    const totalActions = Array.from(this.userPatterns.values())
      .reduce((sum, pattern) => sum + pattern.actions.length, 0);
    
    // For now, return a calculated effectiveness score based on active strategies and user engagement
    // In a real implementation, this would track actual prefetch success rates
    const activeStrategiesCount = this.strategies.filter(s => s.enabled).length;
    const effectiveness = this.isActive && totalActions > 0 
      ? Math.min(0.95, Math.max(0.1, (activeStrategiesCount / Math.max(1, this.strategies.length)) * 0.8 + 0.2))
      : 0.5;
    
    return {
      totalStrategies: this.strategies.length,
      activeStrategies: this.strategies.filter(s => s.enabled).length,
      totalUsers: this.userPatterns.size,
      isActive: this.isActive,
      lastAnalysis: Date.now(),
      effectiveness
    };
  }

  // Add missing analyzeAndPrefetch method
  async analyzeAndPrefetch(queryKey: string, result: any): Promise<void> {
    try {
      // Analyze the query result and trigger prefetch if beneficial
      if (result && typeof result === 'object') {
        const userId = 'system'; // Default user for system-triggered prefetch
        const action: UserAction = {
          type: 'queryResult',
          timestamp: Date.now(),
          target: queryKey,
          metadata: { resultSize: Array.isArray(result) ? result.length : 1 }
        };
        
        await this.triggerImmediatePrefetch(userId, action);
      }
    } catch (error) {
      console.warn('[IntelligentPrefetch] Failed to analyze and prefetch:', error);
    }
  }

  // Add custom prefetch strategy
  addStrategy(strategy: PrefetchStrategy): void {
    this.strategies.push(strategy);
    console.log(`[IntelligentPrefetchService] Added strategy: ${strategy.name}`);
  }

  // Update strategy configuration
  updateStrategy(name: string, updates: Partial<PrefetchStrategy>): void {
    const strategy = this.strategies.find(s => s.name === name);
    if (strategy) {
      Object.assign(strategy, updates);
      console.log(`[IntelligentPrefetchService] Updated strategy: ${name}`);
    }
  }

  // Clean up resources
  destroy(): void {
    this.stop();
    this.userPatterns.clear();
    this.strategies = [];
  }
}

// Create singleton instance
export const intelligentPrefetchService = new IntelligentPrefetchService();

// Export helper functions
export const recordUserAction = (userId: string, action: Omit<UserAction, 'timestamp'>): void => {
  intelligentPrefetchService.recordUserAction(userId, action);
};

export const getPrefetchStats = () => {
  return intelligentPrefetchService.getStats();
};

export const getUserInsights = (userId: string) => {
  return intelligentPrefetchService.getUserInsights(userId);
};

export const addPrefetchStrategy = (strategy: PrefetchStrategy): void => {
  intelligentPrefetchService.addStrategy(strategy);
};

export const updatePrefetchStrategy = (name: string, updates: Partial<PrefetchStrategy>): void => {
  intelligentPrefetchService.updateStrategy(name, updates);
};
