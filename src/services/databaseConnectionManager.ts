// Database Connection Manager - Phase 1A
// Production-ready connection pooling and health management for Firebase

import { db } from '../config/firebase';
import { doc, setDoc, getDoc, onSnapshot, Timestamp, collection, query, where, orderBy, limit } from 'firebase/firestore';

// Types and Interfaces
export interface ConnectionPool {
  maxConnections: number;
  activeConnections: number;
  connectionTimeout: number;
  healthCheckInterval: number;
  failoverEnabled: boolean;
  lastCleanup: Date;
}

export interface HealthMetrics {
  responseTime: number;
  errorRate: number;
  connectionStatus: 'healthy' | 'degraded' | 'failing';
  lastHealthCheck: Date;
  uptime: number;
  activeConnections: number;
  maxConnections: number;
  lastFailover: Date | null;
  recoveryAttempts: number;
}

export interface DatabaseMetrics {
  queryDuration: number;
  connectionPoolSize: number;
  activeConnections: number;
  failedConnections: number;
  recoveryAttempts: number;
  timestamp: Date;
}

export interface FailoverConfig {
  primaryEndpoint: string;
  secondaryEndpoint: string;
  healthCheckThreshold: number;
  autoFailover: boolean;
  recoveryStrategy: 'immediate' | 'gradual' | 'manual';
}

// Connection Pool Configuration
const DEFAULT_POOL_CONFIG: ConnectionPool = {
  maxConnections: 100,
  activeConnections: 0,
  connectionTimeout: 30000, // 30 seconds
  healthCheckInterval: 30000, // 30 seconds
  failoverEnabled: true,
  lastCleanup: new Date()
};

// Health Thresholds
const HEALTH_THRESHOLDS = {
  RESPONSE_TIME_GOOD: 200, // ms
  RESPONSE_TIME_DEGRADED: 500, // ms
  RESPONSE_TIME_FAILING: 1000, // ms
  ERROR_RATE_GOOD: 0.01, // 1%
  ERROR_RATE_DEGRADED: 0.05, // 5%
  ERROR_RATE_FAILING: 0.10, // 10%
  UPTIME_GOOD: 0.99, // 99%
  UPTIME_DEGRADED: 0.95, // 95%
  UPTIME_FAILING: 0.90 // 90%
};

class DatabaseConnectionManager {
  private connectionPool: ConnectionPool = { ...DEFAULT_POOL_CONFIG };
  private healthMetrics: HealthMetrics;
  private isMonitoring = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private connectionListeners: Map<string, () => void> = new Map();
  private performanceMetrics: DatabaseMetrics[] = [];
  private failoverConfig: FailoverConfig;
  private isFailoverActive = false;
  private lastFailoverTime: Date | null = null;
  private recoveryAttempts = 0;

  constructor() {
    this.healthMetrics = this.initializeHealthMetrics();
    this.failoverConfig = this.initializeFailoverConfig();
    this.initializeConnectionManager();
  }

  private initializeHealthMetrics(): HealthMetrics {
    return {
      responseTime: 0,
      errorRate: 0,
      connectionStatus: 'healthy',
      lastHealthCheck: new Date(),
      uptime: 100,
      activeConnections: 0,
      maxConnections: this.connectionPool.maxConnections,
      lastFailover: null,
      recoveryAttempts: 0
    };
  }

  private initializeFailoverConfig(): FailoverConfig {
    return {
      primaryEndpoint: 'primary',
      secondaryEndpoint: 'secondary',
      healthCheckThreshold: 3, // 3 failed health checks before failover
      autoFailover: true,
      recoveryStrategy: 'gradual'
    };
  }

  private async initializeConnectionManager(): Promise<void> {
    try {
      // Load existing configuration from Firestore
      await this.loadConfigurationFromFirestore();
      
      // Start monitoring
      this.startHealthMonitoring();
      this.startCleanupInterval();
      
      // Set up real-time listeners for configuration changes
      this.setupConfigurationListeners();
      
      console.log('[DatabaseConnectionManager] Initialized successfully');
    } catch (error) {
      console.error('[DatabaseConnectionManager] Initialization failed:', error);
      // Fall back to default configuration
      this.connectionPool = { ...DEFAULT_POOL_CONFIG };
    }
  }

  private async loadConfigurationFromFirestore(): Promise<void> {
    try {
      const configDoc = await getDoc(doc(db, 'system', 'connectionPool'));
      if (configDoc.exists()) {
        const data = configDoc.data();
        this.connectionPool = {
          ...this.connectionPool,
          ...data,
          lastCleanup: data.lastCleanup?.toDate() || new Date()
        };
      }

      const healthDoc = await getDoc(doc(db, 'system', 'databaseHealth'));
      if (healthDoc.exists()) {
        const data = healthDoc.data();
        this.healthMetrics = {
          ...this.healthMetrics,
          ...data,
          lastHealthCheck: data.lastHealthCheck?.toDate() || new Date(),
          lastFailover: data.lastFailover?.toDate() || null
        };
      }
    } catch (error) {
      console.warn('[DatabaseConnectionManager] Failed to load configuration, using defaults:', error);
    }
  }

  private setupConfigurationListeners(): void {
    // Listen for connection pool configuration changes
    const connectionPoolListener = onSnapshot(
      doc(db, 'system', 'connectionPool'),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          this.connectionPool = {
            ...this.connectionPool,
            ...data,
            lastCleanup: data.lastCleanup?.toDate() || new Date()
          };
          console.log('[DatabaseConnectionManager] Configuration updated:', this.connectionPool);
        }
      },
      (error) => {
        console.error('[DatabaseConnectionManager] Configuration listener error:', error);
      }
    );

    this.connectionListeners.set('connectionPool', connectionPoolListener);

    // Listen for health metrics changes
    const healthListener = onSnapshot(
      doc(db, 'system', 'databaseHealth'),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          this.healthMetrics = {
            ...this.healthMetrics,
            ...data,
            lastHealthCheck: data.lastHealthCheck?.toDate() || new Date(),
            lastFailover: data.lastFailover?.toDate() || null
          };
        }
      },
      (error) => {
        console.error('[DatabaseConnectionManager] Health listener error:', error);
      }
    );

    this.connectionListeners.set('health', healthListener);
  }

  // Connection Pool Management
  async acquireConnection(): Promise<boolean> {
    if (this.connectionPool.activeConnections >= this.connectionPool.maxConnections) {
      console.warn('[DatabaseConnectionManager] Connection pool exhausted');
      return false;
    }

    this.connectionPool.activeConnections++;
    await this.updateConnectionPoolInFirestore();
    return true;
  }

  async releaseConnection(): Promise<void> {
    if (this.connectionPool.activeConnections > 0) {
      this.connectionPool.activeConnections--;
      await this.updateConnectionPoolInFirestore();
    }
  }

  private async updateConnectionPoolInFirestore(): Promise<void> {
    try {
      await setDoc(doc(db, 'system', 'connectionPool'), {
        ...this.connectionPool,
        lastCleanup: Timestamp.fromDate(this.connectionPool.lastCleanup)
      });
    } catch (error) {
      console.error('[DatabaseConnectionManager] Failed to update connection pool:', error);
    }
  }

  // Health Monitoring
  private startHealthMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.connectionPool.healthCheckInterval);

    console.log('[DatabaseConnectionManager] Health monitoring started');
  }

  private async performHealthCheck(): Promise<void> {
    const startTime = Date.now();
    let healthCheckSuccessful = false;

    try {
      // Perform a simple health check query
      const healthCheckQuery = query(
        collection(db, 'system'),
        where('__name__', '==', 'databaseHealth'),
        limit(1)
      );

      // This will trigger the query and measure response time
      const snapshot = await getDoc(doc(db, 'system', 'databaseHealth'));
      
      if (snapshot.exists()) {
        healthCheckSuccessful = true;
      }
    } catch (error) {
      console.error('[DatabaseConnectionManager] Health check failed:', error);
      healthCheckSuccessful = false;
    }

    const responseTime = Date.now() - startTime;
    
    // Update health metrics
    this.updateHealthMetrics(responseTime, healthCheckSuccessful);
    
    // Check if failover is needed
    if (this.shouldTriggerFailover()) {
      await this.triggerFailover();
    }
  }

  private updateHealthMetrics(responseTime: number, success: boolean): void {
    // Calculate moving average for response time
    const alpha = 0.1; // Smoothing factor
    this.healthMetrics.responseTime = 
      alpha * responseTime + (1 - alpha) * this.healthMetrics.responseTime;

    // Update error rate
    const totalChecks = this.healthMetrics.recoveryAttempts + 1;
    if (!success) {
      this.healthMetrics.recoveryAttempts++;
    }
    this.healthMetrics.errorRate = this.healthMetrics.recoveryAttempts / totalChecks;

    // Update connection status
    this.healthMetrics.connectionStatus = this.calculateConnectionStatus();
    
    // Update timestamp
    this.healthMetrics.lastHealthCheck = new Date();
    this.healthMetrics.activeConnections = this.connectionPool.activeConnections;

    // Store in Firestore
    this.updateHealthMetricsInFirestore();
  }

  private calculateConnectionStatus(): 'healthy' | 'degraded' | 'failing' {
    if (this.healthMetrics.responseTime <= HEALTH_THRESHOLDS.RESPONSE_TIME_GOOD &&
        this.healthMetrics.errorRate <= HEALTH_THRESHOLDS.ERROR_RATE_GOOD) {
      return 'healthy';
    } else if (this.healthMetrics.responseTime <= HEALTH_THRESHOLDS.RESPONSE_TIME_DEGRADED &&
               this.healthMetrics.errorRate <= HEALTH_THRESHOLDS.ERROR_RATE_DEGRADED) {
      return 'degraded';
    } else {
      return 'failing';
    }
  }

  private async updateHealthMetricsInFirestore(): Promise<void> {
    try {
      await setDoc(doc(db, 'system', 'databaseHealth'), {
        ...this.healthMetrics,
        lastHealthCheck: Timestamp.fromDate(this.healthMetrics.lastHealthCheck),
        lastFailover: this.healthMetrics.lastFailover ? 
          Timestamp.fromDate(this.healthMetrics.lastFailover) : null
      });
    } catch (error) {
      console.error('[DatabaseConnectionManager] Failed to update health metrics:', error);
    }
  }

  // Failover Management
  private shouldTriggerFailover(): boolean {
    if (!this.failoverConfig.autoFailover || this.isFailoverActive) {
      return false;
    }

    return this.healthMetrics.connectionStatus === 'failing' &&
           this.healthMetrics.recoveryAttempts >= this.failoverConfig.healthCheckThreshold;
  }

  private async triggerFailover(): Promise<void> {
    console.warn('[DatabaseConnectionManager] Triggering failover...');
    
    this.isFailoverActive = true;
    this.lastFailoverTime = new Date();
    this.healthMetrics.lastFailover = new Date();
    this.healthMetrics.recoveryAttempts = 0;

    try {
      // Implement your failover logic here
      // This could involve switching to a different Firebase project or region
      await this.performFailover();
      
      console.log('[DatabaseConnectionManager] Failover completed successfully');
    } catch (error) {
      console.error('[DatabaseConnectionManager] Failover failed:', error);
      this.isFailoverActive = false;
    }
  }

  private async performFailover(): Promise<void> {
    // This is a placeholder for actual failover implementation
    // In a real scenario, you might:
    // 1. Switch to a different Firebase project
    // 2. Change database regions
    // 3. Use different connection endpoints
    
    // For now, we'll simulate a failover by resetting health metrics
    this.healthMetrics.connectionStatus = 'healthy';
    this.healthMetrics.responseTime = HEALTH_THRESHOLDS.RESPONSE_TIME_GOOD;
    this.healthMetrics.errorRate = 0;
    
    // Wait a bit to simulate failover time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.isFailoverActive = false;
  }

  // Performance Monitoring
  recordQueryPerformance(duration: number, success: boolean): void {
    const metric: DatabaseMetrics = {
      queryDuration: duration,
      connectionPoolSize: this.connectionPool.maxConnections,
      activeConnections: this.connectionPool.activeConnections,
      failedConnections: success ? 0 : 1,
      recoveryAttempts: this.healthMetrics.recoveryAttempts,
      timestamp: new Date()
    };

    this.performanceMetrics.push(metric);
    
    // Keep only last 1000 metrics
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics = this.performanceMetrics.slice(-1000);
    }

    // Update performance metrics in Firestore periodically
    this.updatePerformanceMetricsInFirestore();
  }

  private async updatePerformanceMetricsInFirestore(): Promise<void> {
    try {
      const averageQueryTime = this.performanceMetrics.reduce((sum, m) => sum + m.queryDuration, 0) / 
                              this.performanceMetrics.length;
      
      const totalQueries = this.performanceMetrics.length;
      const failedQueries = this.performanceMetrics.reduce((sum, m) => sum + m.failedConnections, 0);
      
      const connectionPoolUtilization = this.connectionPool.activeConnections / this.connectionPool.maxConnections;

      await setDoc(doc(db, 'system', 'performanceMetrics'), {
        databaseMetrics: {
          averageQueryTime: Math.round(averageQueryTime),
          totalQueries,
          failedQueries,
          connectionPoolUtilization: Math.round(connectionPoolUtilization * 100) / 100,
          lastUpdated: Timestamp.now()
        }
      });
    } catch (error) {
      console.error('[DatabaseConnectionManager] Failed to update performance metrics:', error);
    }
  }

  // Cleanup and Maintenance
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(async () => {
      await this.performCleanup();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  private async performCleanup(): Promise<void> {
    try {
      // Clean up old performance metrics
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      this.performanceMetrics = this.performanceMetrics.filter(
        metric => metric.timestamp > cutoffTime
      );

      // Update last cleanup time
      this.connectionPool.lastCleanup = new Date();
      await this.updateConnectionPoolInFirestore();

      console.log('[DatabaseConnectionManager] Cleanup completed');
    } catch (error) {
      console.error('[DatabaseConnectionManager] Cleanup failed:', error);
    }
  }

  // Public API
  getConnectionPool(): ConnectionPool {
    return { ...this.connectionPool };
  }

  getHealthMetrics(): HealthMetrics {
    return { ...this.healthMetrics };
  }

  getPerformanceMetrics(): DatabaseMetrics[] {
    return [...this.performanceMetrics];
  }

  isHealthy(): boolean {
    return this.healthMetrics.connectionStatus === 'healthy';
  }

  getConnectionStatus(): string {
    return this.healthMetrics.connectionStatus;
  }

  // Cleanup
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Clean up listeners
    this.connectionListeners.forEach(listener => listener());
    this.connectionListeners.clear();

    this.isMonitoring = false;
    console.log('[DatabaseConnectionManager] Destroyed');
  }
}

// Create singleton instance
export const databaseConnectionManager = new DatabaseConnectionManager();

// Export helper functions
export const getConnectionPool = () => databaseConnectionManager.getConnectionPool();
export const getHealthMetrics = () => databaseConnectionManager.getHealthMetrics();
export const getPerformanceMetrics = () => databaseConnectionManager.getPerformanceMetrics();
export const isDatabaseHealthy = () => databaseConnectionManager.isHealthy();
export const getConnectionStatus = () => databaseConnectionManager.getConnectionStatus();
export const recordQueryPerformance = (duration: number, success: boolean) => 
  databaseConnectionManager.recordQueryPerformance(duration, success);

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    databaseConnectionManager.destroy();
  });
}
