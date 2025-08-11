// Phase 1B Performance Dashboard - Advanced Caching & Query Optimization
// Comprehensive dashboard showcasing all Phase 1B features and performance metrics

import React, { useState, useEffect } from 'react';
import { usePerformanceOptimization } from '../../hooks/usePerformanceOptimization';
import styles from './Phase1BDashboard.module.css';

interface DashboardSection {
  id: string;
  title: string;
  description: string;
  component: React.ReactNode;
}

const Phase1BDashboard: React.FC = () => {
  const {
    metrics,
    alerts,
    isLoading,
    error,
    lastUpdated,
    executeQuery,
    warmupCacheData,
    generateReport,
    updateConfig,
    getPerformanceScore,
    getPerformanceStatus,
    getCriticalAlerts,
    getWarningAlerts,
    forceRefresh,
    clearError
  } = usePerformanceOptimization({
    autoRefresh: true,
    refreshInterval: 15000, // 15 seconds for real-time monitoring
    enableAlerts: true,
    enableMetrics: true
  });

  const [activeSection, setActiveSection] = useState('overview');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState({
    enableAutoOptimization: true,
    performanceThreshold: 0.8,
    optimizationInterval: 5,
    enablePredictiveOptimization: true,
    maxConcurrentOptimizations: 3
  });

  // Performance status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return '#10b981';
      case 'good': return '#3b82f6';
      case 'fair': return '#f59e0b';
      case 'poor': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // Format performance metrics
  const formatMetric = (value: number, type: 'percentage' | 'time' | 'number' = 'number') => {
    if (type === 'percentage') {
      return `${(value * 100).toFixed(1)}%`;
    } else if (type === 'time') {
      return `${value.toFixed(0)}ms`;
    } else {
      return value.toFixed(2);
    }
  };

  // Handle configuration updates
  const handleConfigUpdate = async () => {
    try {
      await updateConfig({
        ...configForm,
        optimizationInterval: configForm.optimizationInterval * 60 * 1000 // Convert to milliseconds
      });
      setShowConfigModal(false);
    } catch (error) {
      console.error('Failed to update configuration:', error);
    }
  };

  // Test optimized query execution
  const testOptimizedQuery = async () => {
    try {
      const result = await executeQuery(
        async () => {
          // Simulate a database query
          await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 50));
          return { message: 'Test query executed successfully', timestamp: new Date() };
        },
        'test_query',
        { enableCache: true, enablePrefetch: true, priority: 8 }
      );
      console.log('Optimized query result:', result);
    } catch (error) {
      console.error('Query test failed:', error);
    }
  };

  // Test cache warmup
  const testCacheWarmup = async () => {
    try {
      const testData = [
        { key: 'user_profile_123', data: { name: 'Test User', role: 'admin' }, priority: 9 },
        { key: 'load_data_456', data: { id: '456', status: 'active' }, priority: 7 },
        { key: 'carrier_info_789', data: { id: '789', rating: 4.5 }, priority: 6 }
      ];
      
      await warmupCacheData(testData);
      console.log('Cache warmup completed successfully');
    } catch (error) {
      console.error('Cache warmup failed:', error);
    }
  };

  // Dashboard sections
  const dashboardSections: DashboardSection[] = [
    {
      id: 'overview',
      title: 'Performance Overview',
      description: 'Real-time performance metrics and system health',
      component: (
        <div className={styles.overviewSection}>
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <h3>Overall Performance</h3>
              <div className={styles.metricValue} style={{ color: getStatusColor(getPerformanceStatus()) }}>
                {formatMetric(getPerformanceScore(), 'percentage')}
              </div>
              <div className={styles.metricStatus}>{getPerformanceStatus().toUpperCase()}</div>
            </div>
            
            <div className={styles.metricCard}>
              <h3>Cache Hit Rate</h3>
              <div className={styles.metricValue}>
                {metrics ? formatMetric(metrics.cacheHitRate, 'percentage') : 'N/A'}
              </div>
              <div className={styles.metricTrend}>
                {metrics && metrics.cacheHitRate > 0.8 ? '📈 Excellent' : '📉 Needs Improvement'}
              </div>
            </div>
            
            <div className={styles.metricCard}>
              <h3>Database Response</h3>
              <div className={styles.metricValue}>
                {metrics ? formatMetric(metrics.databaseResponseTime, 'time') : 'N/A'}
              </div>
              <div className={styles.metricTrend}>
                {metrics && metrics.databaseResponseTime < 200 ? '🚀 Fast' : '🐌 Slow'}
              </div>
            </div>
            
            <div className={styles.metricCard}>
              <h3>Query Performance</h3>
              <div className={styles.metricValue}>
                {metrics ? formatMetric(metrics.queryExecutionTime, 'time') : 'N/A'}
              </div>
              <div className={styles.metricTrend}>
                {metrics && metrics.queryExecutionTime < 100 ? '⚡ Optimized' : '🔧 Needs Optimization'}
              </div>
            </div>
          </div>
          
          <div className={styles.lastUpdated}>
            Last Updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
          </div>
        </div>
      )
    },
    {
      id: 'alerts',
      title: 'Performance Alerts',
      description: 'Real-time alerts and system notifications',
      component: (
        <div className={styles.alertsSection}>
          <div className={styles.alertsHeader}>
            <h3>Active Alerts</h3>
            <div className={styles.alertCounts}>
              <span className={styles.criticalCount}>
                Critical: {getCriticalAlerts().length}
              </span>
              <span className={styles.warningCount}>
                Warnings: {getWarningAlerts().length}
              </span>
            </div>
          </div>
          
          <div className={styles.alertsList}>
            {alerts.length === 0 ? (
              <div className={styles.noAlerts}>🎉 No active alerts - system performing well!</div>
            ) : (
              alerts.map((alert, index) => (
                <div key={index} className={`${styles.alertItem} ${styles[alert.type]}`}>
                  <div className={styles.alertHeader}>
                    <span className={styles.alertType}>{alert.type.toUpperCase()}</span>
                    <span className={styles.alertTime}>
                      {alert.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className={styles.alertMessage}>{alert.message}</div>
                  <div className={styles.alertDetails}>
                    {alert.metric}: {alert.value} (Threshold: {alert.threshold})
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )
    },
    {
      id: 'optimization',
      title: 'Query Optimization',
      description: 'Intelligent query optimization and recommendations',
      component: (
        <div className={styles.optimizationSection}>
          <div className={styles.optimizationHeader}>
            <h3>Optimization Recommendations</h3>
            <button 
              className={styles.optimizeButton}
              onClick={() => forceRefresh()}
              disabled={isLoading}
            >
              {isLoading ? '🔄 Refreshing...' : '🔄 Refresh'}
            </button>
          </div>
          
          <div className={styles.recommendationsList}>
            {metrics?.recommendations && metrics.recommendations.length > 0 ? (
              metrics.recommendations.map((rec, index) => (
                <div key={index} className={styles.recommendationItem}>
                  <div className={styles.recommendationIcon}>💡</div>
                  <div className={styles.recommendationText}>{rec}</div>
                  <button className={styles.implementButton}>Implement</button>
                </div>
              ))
            ) : (
              <div className={styles.noRecommendations}>
                🎯 No optimization recommendations at this time
              </div>
            )}
          </div>
          
          <div className={styles.testSection}>
            <h4>Test Phase 1B Features</h4>
            <div className={styles.testButtons}>
              <button 
                className={styles.testButton}
                onClick={testOptimizedQuery}
              >
                🚀 Test Optimized Query
              </button>
              <button 
                className={styles.testButton}
                onClick={testCacheWarmup}
              >
                🔥 Test Cache Warmup
              </button>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'caching',
      title: 'Advanced Caching',
      description: 'Multi-level caching strategies and performance',
      component: (
        <div className={styles.cachingSection}>
          <div className={styles.cacheStats}>
            <h3>Cache Performance Statistics</h3>
            <div className={styles.cacheMetrics}>
              <div className={styles.cacheMetric}>
                <label>Cache Hit Rate:</label>
                <span>{metrics ? formatMetric(metrics.cacheHitRate, 'percentage') : 'N/A'}</span>
              </div>
              <div className={styles.cacheMetric}>
                <label>Prefetch Effectiveness:</label>
                <span>{metrics ? formatMetric(metrics.prefetchEffectiveness, 'percentage') : 'N/A'}</span>
              </div>
            </div>
          </div>
          
          <div className={styles.cacheStrategies}>
            <h4>Active Caching Strategies</h4>
            <div className={styles.strategyList}>
              <div className={styles.strategyItem}>
                <span className={styles.strategyIcon}>🎯</span>
                <span className={styles.strategyName}>Intelligent Prefetching</span>
                <span className={styles.strategyStatus}>Active</span>
              </div>
              <div className={styles.strategyItem}>
                <span className={styles.strategyIcon}>🔥</span>
                <span className={styles.strategyName}>Cache Warming</span>
                <span className={styles.strategyStatus}>Active</span>
              </div>
              <div className={styles.strategyItem}>
                <span className={styles.strategyIcon}>⚡</span>
                <span className={styles.strategyName}>Priority-Based Eviction</span>
                <span className={styles.strategyStatus}>Active</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'monitoring',
      title: 'Real-time Monitoring',
      description: 'Live system monitoring and performance tracking',
      component: (
        <div className={styles.monitoringSection}>
          <div className={styles.monitoringHeader}>
            <h3>System Performance Monitoring</h3>
            <div className={styles.monitoringStatus}>
              <span className={styles.statusIndicator}></span>
              Live Monitoring Active
            </div>
          </div>
          
          <div className={styles.monitoringMetrics}>
            <div className={styles.monitoringMetric}>
              <label>Response Time Trend:</label>
              <div className={styles.trendChart}>
                📊 Performance trending analysis available
              </div>
            </div>
            
            <div className={styles.monitoringMetric}>
              <label>System Health:</label>
              <div className={styles.healthStatus}>
                <span className={styles.healthIndicator}></span>
                {getPerformanceStatus() === 'excellent' || getPerformanceStatus() === 'good' 
                  ? 'Healthy' 
                  : 'Needs Attention'}
              </div>
            </div>
          </div>
          
          <div className={styles.monitoringActions}>
            <button 
              className={styles.generateReportButton}
              onClick={async () => {
                try {
                  const report = await generateReport();
                  console.log('Performance report generated:', report);
                  alert('Performance report generated successfully! Check console for details.');
                } catch (error) {
                  console.error('Failed to generate report:', error);
                }
              }}
            >
              📊 Generate Performance Report
            </button>
          </div>
        </div>
      )
    }
  ];

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorMessage}>
          <h2>🚨 Error Loading Dashboard</h2>
          <p>{error}</p>
          <button onClick={clearError} className={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.dashboardHeader}>
        <div className={styles.headerContent}>
          <h1>🚀 Phase 1B Performance Dashboard</h1>
          <p>Advanced Caching & Query Optimization - Real-time Performance Monitoring</p>
        </div>
        
        <div className={styles.headerActions}>
          <button 
            className={styles.configButton}
            onClick={() => setShowConfigModal(true)}
          >
            ⚙️ Configuration
          </button>
          <button 
            className={styles.refreshButton}
            onClick={forceRefresh}
            disabled={isLoading}
          >
            {isLoading ? '🔄 Loading...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      <div className={styles.dashboardNavigation}>
        {dashboardSections.map(section => (
          <button
            key={section.id}
            className={`${styles.navButton} ${activeSection === section.id ? styles.active : ''}`}
            onClick={() => setActiveSection(section.id)}
          >
            {section.title}
          </button>
        ))}
      </div>

      <div className={styles.dashboardContent}>
        {dashboardSections.find(s => s.id === activeSection)?.component}
      </div>

      {/* Configuration Modal */}
      {showConfigModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Performance Optimization Configuration</h3>
              <button 
                className={styles.closeButton}
                onClick={() => setShowConfigModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className={styles.modalContent}>
              <div className={styles.configField}>
                <label>Enable Auto-Optimization:</label>
                <input
                  type="checkbox"
                  checked={configForm.enableAutoOptimization}
                  onChange={(e) => setConfigForm(prev => ({
                    ...prev,
                    enableAutoOptimization: e.target.checked
                  }))}
                />
              </div>
              
              <div className={styles.configField}>
                <label>Performance Threshold:</label>
                <input
                  type="range"
                  min="0.5"
                  max="1.0"
                  step="0.1"
                  value={configForm.performanceThreshold}
                  onChange={(e) => setConfigForm(prev => ({
                    ...prev,
                    performanceThreshold: parseFloat(e.target.value)
                  }))}
                />
                <span>{formatMetric(configForm.performanceThreshold, 'percentage')}</span>
              </div>
              
              <div className={styles.configField}>
                <label>Optimization Interval (minutes):</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={configForm.optimizationInterval}
                  onChange={(e) => setConfigForm(prev => ({
                    ...prev,
                    optimizationInterval: parseInt(e.target.value)
                  }))}
                />
              </div>
              
              <div className={styles.configField}>
                <label>Enable Predictive Optimization:</label>
                <input
                  type="checkbox"
                  checked={configForm.enablePredictiveOptimization}
                  onChange={(e) => setConfigForm(prev => ({
                    ...prev,
                    enablePredictiveOptimization: e.target.checked
                  }))}
                />
              </div>
              
              <div className={styles.configField}>
                <label>Max Concurrent Optimizations:</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={configForm.maxConcurrentOptimizations}
                  onChange={(e) => setConfigForm(prev => ({
                    ...prev,
                    maxConcurrentOptimizations: parseInt(e.target.value)
                  }))}
                />
              </div>
            </div>
            
            <div className={styles.modalActions}>
              <button 
                className={styles.cancelButton}
                onClick={() => setShowConfigModal(false)}
              >
                Cancel
              </button>
              <button 
                className={styles.saveButton}
                onClick={handleConfigUpdate}
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Phase1BDashboard;
