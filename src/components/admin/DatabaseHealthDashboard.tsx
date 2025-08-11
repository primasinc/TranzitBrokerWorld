import React, { useState, useEffect } from 'react';
import styles from './DatabaseHealthDashboard.module.css';
import {
  databaseConnectionManager,
  getConnectionPool,
  getHealthMetrics,
  getPerformanceMetrics
} from '../../services/databaseConnectionManager';
import { enhancedDb } from '../../services/enhancedDbService';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'failing';
  color: string;
  icon: string;
}

const DatabaseHealthDashboard: React.FC = () => {
  const [connectionPool, setConnectionPool] = useState(getConnectionPool());
  const [healthMetrics, setHealthMetrics] = useState(getHealthMetrics());
  const [performanceMetrics, setPerformanceMetrics] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    const updateMetrics = () => {
      setConnectionPool(getConnectionPool());
      setHealthMetrics(getHealthMetrics());
      setPerformanceMetrics([getPerformanceMetrics()]);
    };

    // Update metrics every 5 seconds
    const interval = setInterval(updateMetrics, 5000);
    
    // Initial update
    updateMetrics();

    return () => clearInterval(interval);
  }, []);

  const refreshMetrics = async () => {
    setIsRefreshing(true);
    try {
      // Force a health check
      await enhancedDb.isHealthy();
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to refresh metrics:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getHealthStatus = (status: string): HealthStatus => {
    switch (status) {
      case 'healthy':
        return { status: 'healthy', color: '#10b981', icon: '✅' };
      case 'degraded':
        return { status: 'degraded', color: '#f59e0b', icon: '⚠️' };
      case 'failing':
        return { status: 'failing', color: '#ef4444', icon: '❌' };
      default:
        return { status: 'degraded', color: '#f59e0b', icon: '❓' };
    }
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatTimestamp = (date: Date): string => {
    return date.toLocaleTimeString();
  };

  const getConnectionPoolUtilization = (): number => {
    return connectionPool.activeConnections / connectionPool.maxConnections;
  };

  const getAverageResponseTime = (): number => {
    if (performanceMetrics.length === 0) return 0;
    const total = performanceMetrics.reduce((sum, metric) => sum + metric.queryDuration, 0);
    return total / performanceMetrics.length;
  };

  const getSuccessRate = (): number => {
    if (performanceMetrics.length === 0) return 1;
    const successful = performanceMetrics.filter(metric => metric.failedConnections === 0).length;
    return successful / performanceMetrics.length;
  };

  const healthStatus = getHealthStatus(healthMetrics.connectionStatus);

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h2>Database Health Dashboard</h2>
        <div className={styles.headerControls}>
          <span className={styles.lastRefresh}>
            Last updated: {formatTimestamp(lastRefresh)}
          </span>
          <button 
            onClick={refreshMetrics} 
            disabled={isRefreshing}
            className={styles.refreshButton}
          >
            {isRefreshing ? '🔄' : '🔄'} Refresh
          </button>
        </div>
      </div>

      {/* Overall Health Status */}
      <div className={styles.healthStatus}>
        <div className={styles.statusCard} style={{ borderColor: healthStatus.color }}>
          <div className={styles.statusHeader}>
            <span className={styles.statusIcon}>{healthStatus.icon}</span>
            <h3>Database Status</h3>
          </div>
          <div className={styles.statusDetails}>
            <div className={styles.statusItem}>
              <span className={styles.label}>Status:</span>
              <span className={styles.value} style={{ color: healthStatus.color }}>
                {healthStatus.status.toUpperCase()}
              </span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.label}>Response Time:</span>
              <span className={styles.value}>
                {formatDuration(healthMetrics.responseTime)}
              </span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.label}>Error Rate:</span>
              <span className={styles.value}>
                {formatPercentage(healthMetrics.errorRate)}
              </span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.label}>Last Health Check:</span>
              <span className={styles.value}>
                {formatTimestamp(new Date(healthMetrics.lastHealthCheck))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Pool Status */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <h3>Connection Pool</h3>
          <div className={styles.metricContent}>
            <div className={styles.metricRow}>
              <span className={styles.label}>Active Connections:</span>
              <span className={styles.value}>
                {connectionPool.activeConnections} / {connectionPool.maxConnections}
              </span>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.label}>Utilization:</span>
              <span className={styles.value}>
                {formatPercentage(getConnectionPoolUtilization())}
              </span>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.label}>Available Connections:</span>
              <span className={styles.value}>
                {connectionPool.availableConnections}
              </span>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.label}>Connection Pool Status:</span>
              <span className={styles.value}>
                {connectionPool.activeConnections > 0 ? '🟢 Active' : '⚪ Idle'}
              </span>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className={styles.metricCard}>
          <h3>Performance Metrics</h3>
          <div className={styles.metricContent}>
            <div className={styles.metricRow}>
              <span className={styles.label}>Average Response Time:</span>
              <span className={styles.value}>
                {formatDuration(getAverageResponseTime())}
              </span>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.label}>Success Rate:</span>
              <span className={styles.value}>
                {formatPercentage(getSuccessRate())}
              </span>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.label}>Total Queries:</span>
              <span className={styles.value}>
                {performanceMetrics.length}
              </span>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.label}>Failed Queries:</span>
              <span className={styles.value}>
                {performanceMetrics.filter(m => m.failedConnections > 0).length}
              </span>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.label}>Error Rate:</span>
              <span className={styles.value}>
                {formatPercentage(healthMetrics.errorRate)}
              </span>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.label}>Uptime:</span>
              <span className={styles.value}>
                {formatDuration(healthMetrics.uptime)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Performance Data */}
      <div className={styles.performanceSection}>
        <h3>Recent Performance Data</h3>
        <div className={styles.performanceTable}>
          <div className={styles.tableHeader}>
            <span>Time</span>
            <span>Operation</span>
            <span>Duration</span>
            <span>Status</span>
            <span>Collection</span>
          </div>
          {performanceMetrics.slice(-10).reverse().map((metric, index) => (
            <div key={index} className={styles.tableRow}>
              <span>{formatTimestamp(metric.timestamp)}</span>
              <span>{metric.operation || 'Unknown'}</span>
              <span>{formatDuration(metric.queryDuration)}</span>
              <span className={metric.failedConnections > 0 ? styles.error : styles.success}>
                {metric.failedConnections > 0 ? '❌ Failed' : '✅ Success'}
              </span>
              <span>{metric.collection || 'N/A'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* System Actions */}
      <div className={styles.actionsSection}>
        <h3>System Actions</h3>
        <div className={styles.actionButtons}>
          <button 
            onClick={() => databaseConnectionManager.destroy()}
            className={styles.actionButton}
            title="Stop monitoring and cleanup resources"
          >
            🛑 Stop Monitoring
          </button>
          <button 
            onClick={() => window.location.reload()}
            className={styles.actionButton}
            title="Restart the dashboard"
          >
            🔄 Restart Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default DatabaseHealthDashboard;
