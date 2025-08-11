// Lightweight in-memory database connection manager - no MongoDB dependencies
// This provides the same interface for compatibility but works entirely in-memory

import { getFailoverState } from './failoverService';

export interface ConnectionPool {
  maxConnections: number;
  activeConnections: number;
  availableConnections: number;
}

export interface HealthMetrics {
  connectionStatus: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  activeConnections: number;
  maxConnections: number;
  uptime: number;
  errorRate: number;
  lastHealthCheck: number;
}

export interface DatabaseMetrics {
  queryCount: number;
  averageResponseTime: number;
  successRate: number;
  lastQueryTime: number;
}

export interface FailoverStatus {
  isActive: boolean;
  lastFailover: number;
  failoverCount: number;
  currentProject: 'primary' | 'secondary'; // Changed to match failover service
}

class InMemoryDatabaseManager {
  private connectionPool: ConnectionPool;
  private healthMetrics: HealthMetrics;
  private performanceMetrics: DatabaseMetrics;
  private startTime: number;
  private isDestroyed: boolean = false;

  constructor() {
    this.startTime = Date.now();
    this.connectionPool = {
      maxConnections: 100,
      activeConnections: 0,
      availableConnections: 100
    };
    
    this.healthMetrics = {
      connectionStatus: 'healthy',
      responseTime: 5, // Very fast in-memory
      activeConnections: 0,
      maxConnections: 100,
      uptime: 0,
      errorRate: 0,
      lastHealthCheck: Date.now()
    };
    
    this.performanceMetrics = {
      queryCount: 0,
      averageResponseTime: 5,
      successRate: 1.0,
      lastQueryTime: Date.now()
    };

    // Start health monitoring
    this.startHealthMonitoring();
  }

  private startHealthMonitoring(): void {
    setInterval(() => {
      if (!this.isDestroyed) {
        this.updateHealthMetrics();
      }
    }, 30000); // Check every 30 seconds
  }

  private updateHealthMetrics(): void {
    const now = Date.now();
    this.healthMetrics.uptime = now - this.startTime;
    this.healthMetrics.lastHealthCheck = now;
    this.healthMetrics.activeConnections = this.connectionPool.activeConnections;
    this.healthMetrics.responseTime = this.performanceMetrics.averageResponseTime;
    
    // Simulate occasional minor issues for realistic testing
    if (Math.random() < 0.01) { // 1% chance of minor degradation
      this.healthMetrics.connectionStatus = 'degraded';
    } else {
      this.healthMetrics.connectionStatus = 'healthy';
    }
  }

  async acquireConnection(): Promise<boolean> {
    if (this.isDestroyed) return false;
    
    if (this.connectionPool.availableConnections > 0) {
      this.connectionPool.activeConnections++;
      this.connectionPool.availableConnections--;
      return true;
    }
    return false;
  }

  async releaseConnection(): Promise<void> {
    if (this.isDestroyed) return;
    
    if (this.connectionPool.activeConnections > 0) {
      this.connectionPool.activeConnections--;
      this.connectionPool.availableConnections++;
    }
  }

  async checkHealth(): Promise<HealthMetrics> {
    if (this.isDestroyed) {
      throw new Error('Database manager has been destroyed');
    }
    
    this.updateHealthMetrics();
    return this.healthMetrics;
  }

  getConnectionPool(): ConnectionPool {
    return { ...this.connectionPool };
  }

  getConnectionStatus(): string {
    return this.healthMetrics.connectionStatus;
  }

  isHealthy(): boolean {
    return this.healthMetrics.connectionStatus === 'healthy';
  }

  getHealthMetrics(): HealthMetrics {
    return { ...this.healthMetrics };
  }

  getPerformanceMetrics(): DatabaseMetrics {
    return { ...this.performanceMetrics };
  }

  getFailoverStatus(): FailoverStatus {
    // Get the actual failover state from the failover service
    const failoverState = getFailoverState();
    
    return {
      isActive: failoverState.isActive,
      lastFailover: failoverState.lastSwitchTime ? failoverState.lastSwitchTime.getTime() : 0,
      failoverCount: failoverState.recoveryAttempts,
      currentProject: failoverState.currentProject
    };
  }

  recordQueryPerformance(duration: number, success: boolean): void {
    if (this.isDestroyed) return;
    
    this.performanceMetrics.queryCount++;
    this.performanceMetrics.lastQueryTime = Date.now();
    
    // Update average response time
    const totalTime = this.performanceMetrics.averageResponseTime * (this.performanceMetrics.queryCount - 1) + duration;
    this.performanceMetrics.averageResponseTime = totalTime / this.performanceMetrics.queryCount;
    
    // Update success rate
    if (!success) {
      const totalFailures = (1 - this.performanceMetrics.successRate) * this.performanceMetrics.queryCount;
      this.performanceMetrics.successRate = (this.performanceMetrics.queryCount - totalFailures - 1) / this.performanceMetrics.queryCount;
    }
  }

  async triggerFailover(): Promise<void> {
    if (this.isDestroyed) return;
    
    // This method is no longer needed as failover status is managed by failoverService
    // Keeping it for now, but it will not trigger a failover in this in-memory manager
    console.warn('triggerFailover called, but this is an in-memory manager. Failover status is managed by failoverService.');
  }

  async destroy(): Promise<void> {
    this.isDestroyed = true;
    this.connectionPool.activeConnections = 0;
    this.connectionPool.availableConnections = 0;
  }
}

// Export singleton instance
export const databaseConnectionManager = new InMemoryDatabaseManager();

// Export convenience functions
export const getConnectionPool = () => databaseConnectionManager.getConnectionPool();
export const getHealthMetrics = () => databaseConnectionManager.getHealthMetrics();
export const getPerformanceMetrics = () => databaseConnectionManager.getPerformanceMetrics();
export const isDatabaseHealthy = () => databaseConnectionManager.isHealthy();
export const getConnectionStatus = () => databaseConnectionManager.getConnectionStatus();
export const getFailoverStatus = () => databaseConnectionManager.getFailoverStatus();
export const recordQueryPerformance = (duration: number, success: boolean) =>
  databaseConnectionManager.recordQueryPerformance(duration, success);
export const destroyDatabaseManager = () => databaseConnectionManager.destroy();
