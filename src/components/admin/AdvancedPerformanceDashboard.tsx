// Advanced Performance Dashboard
// Phase 5: Enhanced Performance Monitoring & Optimization

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  usePerformanceReporting, 
  useAutoOptimization,
  useComponentPerformance 
} from '../../hooks/usePerformanceOptimization';
import advancedPerformanceService, { OptimizationRecommendation } from '../../services/advancedPerformanceService';
import styles from './AdvancedPerformanceDashboard.module.css';

interface PerformanceChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
  }[];
}

const AdvancedPerformanceDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedTab, setSelectedTab] = useState<'overview' | 'metrics' | 'recommendations' | 'alerts' | 'optimization'>('overview');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const { 
    report, 
    loading, 
    generateReport, 
    getRecommendations,
    markRecommendationAsImplemented,
    markRecommendationAsIgnored 
  } = usePerformanceReporting();
  
  const { optimizations } = useAutoOptimization();
  const { renderCount } = useComponentPerformance('AdvancedPerformanceDashboard');

  useEffect(() => {
    generateReport(selectedPeriod);
  }, [selectedPeriod, generateReport]);

  const handleGenerateReport = async () => {
    try {
      await generateReport(selectedPeriod);
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  };

  const handleImplementRecommendation = (id: string) => {
    markRecommendationAsImplemented(id);
    // Refresh recommendations
    setTimeout(() => {
      generateReport(selectedPeriod);
    }, 1000);
  };

  const handleIgnoreRecommendation = (id: string) => {
    markRecommendationAsIgnored(id);
    // Refresh recommendations
    setTimeout(() => {
      generateReport(selectedPeriod);
    }, 1000);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return '📈';
      case 'degrading': return '📉';
      default: return '➡️';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return '#28a745';
      case 'degrading': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return '#dc3545';
      case 'medium': return '#ffc107';
      default: return '#28a745';
    }
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'high': return '#dc3545';
      case 'medium': return '#ffc107';
      default: return '#28a745';
    }
  };

  if (loading && !report) {
    return (
      <div className={styles.container} style={{
        backgroundColor: isDarkMode ? '#1a1a1a' : '#f8f9fa',
        color: isDarkMode ? '#ffffff' : '#333333',
        minHeight: '100vh'
      }}>
        <div className={styles.loading}>
          <h2>Loading Performance Dashboard...</h2>
          <div className={styles.spinner}></div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container} style={{
      backgroundColor: isDarkMode ? '#1a1a1a' : '#f8f9fa',
      color: isDarkMode ? '#ffffff' : '#333333',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 style={{ color: isDarkMode ? '#ffffff' : '#333333' }}>
            🚀 Advanced Performance Dashboard
          </h1>
          <p style={{ color: isDarkMode ? '#cccccc' : '#666666' }}>
            Real-time performance monitoring and optimization
          </p>
        </div>
        <div className={styles.headerRight}>
          <button
            onClick={() => navigate('/admin')}
            className={styles.backButton}
            style={{
              backgroundColor: '#495057',
              color: 'white',
              marginRight: '10px',
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#343a40';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#495057';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            }}
          >
            <span style={{ fontSize: '16px' }}>←</span>
            Back to Dashboard
          </button>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={styles.themeToggle}
            style={{
              backgroundColor: isDarkMode ? '#6c757d' : '#17a2b8',
              color: 'white'
            }}
          >
            {isDarkMode ? '☀️' : '🌙'} {isDarkMode ? 'Light' : 'Dark'} Mode
          </button>
          <button
            onClick={handleGenerateReport}
            className={styles.refreshButton}
            style={{
              backgroundColor: '#28a745',
              color: 'white'
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className={styles.periodSelector}>
        <button
          onClick={() => setSelectedPeriod('daily')}
          className={`${styles.periodButton} ${selectedPeriod === 'daily' ? styles.active : ''}`}
          style={{
            backgroundColor: selectedPeriod === 'daily' ? '#007bff' : (isDarkMode ? '#2d2d2d' : '#f8f9fa'),
            color: selectedPeriod === 'daily' ? 'white' : (isDarkMode ? '#ffffff' : '#333333')
          }}
        >
          Daily
        </button>
        <button
          onClick={() => setSelectedPeriod('weekly')}
          className={`${styles.periodButton} ${selectedPeriod === 'weekly' ? styles.active : ''}`}
          style={{
            backgroundColor: selectedPeriod === 'weekly' ? '#007bff' : (isDarkMode ? '#2d2d2d' : '#f8f9fa'),
            color: selectedPeriod === 'weekly' ? 'white' : (isDarkMode ? '#ffffff' : '#333333')
          }}
        >
          Weekly
        </button>
        <button
          onClick={() => setSelectedPeriod('monthly')}
          className={`${styles.periodButton} ${selectedPeriod === 'monthly' ? styles.active : ''}`}
          style={{
            backgroundColor: selectedPeriod === 'monthly' ? '#007bff' : (isDarkMode ? '#2d2d2d' : '#f8f9fa'),
            color: selectedPeriod === 'monthly' ? 'white' : (isDarkMode ? '#ffffff' : '#333333')
          }}
        >
          Monthly
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className={styles.tabs}>
        <button
          onClick={() => setSelectedTab('overview')}
          className={`${styles.tab} ${selectedTab === 'overview' ? styles.active : ''}`}
          style={{
            backgroundColor: selectedTab === 'overview' ? '#007bff' : (isDarkMode ? '#2d2d2d' : '#f8f9fa'),
            color: selectedTab === 'overview' ? 'white' : (isDarkMode ? '#ffffff' : '#333333')
          }}
        >
          📊 Overview
        </button>
        <button
          onClick={() => setSelectedTab('metrics')}
          className={`${styles.tab} ${selectedTab === 'metrics' ? styles.active : ''}`}
          style={{
            backgroundColor: selectedTab === 'metrics' ? '#007bff' : (isDarkMode ? '#2d2d2d' : '#f8f9fa'),
            color: selectedTab === 'metrics' ? 'white' : (isDarkMode ? '#ffffff' : '#333333')
          }}
        >
          📈 Metrics
        </button>
        <button
          onClick={() => setSelectedTab('recommendations')}
          className={`${styles.tab} ${selectedTab === 'recommendations' ? styles.active : ''}`}
          style={{
            backgroundColor: selectedTab === 'recommendations' ? '#007bff' : (isDarkMode ? '#2d2d2d' : '#f8f9fa'),
            color: selectedTab === 'recommendations' ? 'white' : (isDarkMode ? '#ffffff' : '#333333')
          }}
        >
          💡 Recommendations
        </button>
        <button
          onClick={() => setSelectedTab('alerts')}
          className={`${styles.tab} ${selectedTab === 'alerts' ? styles.active : ''}`}
          style={{
            backgroundColor: selectedTab === 'alerts' ? '#007bff' : (isDarkMode ? '#2d2d2d' : '#f8f9fa'),
            color: selectedTab === 'alerts' ? 'white' : (isDarkMode ? '#ffffff' : '#333333')
          }}
        >
          🚨 Alerts
        </button>
        <button
          onClick={() => setSelectedTab('optimization')}
          className={`${styles.tab} ${selectedTab === 'optimization' ? styles.active : ''}`}
          style={{
            backgroundColor: selectedTab === 'optimization' ? '#007bff' : (isDarkMode ? '#2d2d2d' : '#f8f9fa'),
            color: selectedTab === 'optimization' ? 'white' : (isDarkMode ? '#ffffff' : '#333333')
          }}
        >
          ⚡ Optimization
        </button>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {selectedTab === 'overview' && report && (
          <div className={styles.overview}>
            {/* Key Metrics */}
            <div className={styles.metricsGrid}>
              <div className={styles.metricCard} style={{
                backgroundColor: isDarkMode ? '#2d2d2d' : '#ffffff',
                borderColor: isDarkMode ? '#444' : '#ddd'
              }}>
                <h3>Response Time</h3>
                <div className={styles.metricValue}>
                  {report.metrics.averageResponseTime.toFixed(0)}ms
                </div>
                <div className={styles.metricTrend} style={{ color: getTrendColor(report.trends.responseTime) }}>
                  {getTrendIcon(report.trends.responseTime)} {report.trends.responseTime}
                </div>
              </div>

              <div className={styles.metricCard} style={{
                backgroundColor: isDarkMode ? '#2d2d2d' : '#ffffff',
                borderColor: isDarkMode ? '#444' : '#ddd'
              }}>
                <h3>Memory Usage</h3>
                <div className={styles.metricValue}>
                  {report.metrics.averageMemoryUsage.toFixed(1)}MB
                </div>
                <div className={styles.metricTrend} style={{ color: getTrendColor(report.trends.memoryUsage) }}>
                  {getTrendIcon(report.trends.memoryUsage)} {report.trends.memoryUsage}
                </div>
              </div>

              <div className={styles.metricCard} style={{
                backgroundColor: isDarkMode ? '#2d2d2d' : '#ffffff',
                borderColor: isDarkMode ? '#444' : '#ddd'
              }}>
                <h3>Error Rate</h3>
                <div className={styles.metricValue}>
                  {(report.metrics.errorRate * 100).toFixed(2)}%
                </div>
                <div className={styles.metricTrend} style={{ color: getTrendColor(report.trends.errorRate) }}>
                  {getTrendIcon(report.trends.errorRate)} {report.trends.errorRate}
                </div>
              </div>

              <div className={styles.metricCard} style={{
                backgroundColor: isDarkMode ? '#2d2d2d' : '#ffffff',
                borderColor: isDarkMode ? '#444' : '#ddd'
              }}>
                <h3>User Satisfaction</h3>
                <div className={styles.metricValue}>
                  {report.metrics.userSatisfaction.toFixed(0)}%
                </div>
                <div className={styles.metricTrend}>
                  {report.metrics.userSatisfaction > 80 ? '😊' : report.metrics.userSatisfaction > 60 ? '😐' : '😞'}
                </div>
              </div>

              <div className={styles.metricCard} style={{
                backgroundColor: isDarkMode ? '#2d2d2d' : '#ffffff',
                borderColor: isDarkMode ? '#444' : '#ddd'
              }}>
                <h3>Total Requests</h3>
                <div className={styles.metricValue}>
                  {report.metrics.totalRequests.toLocaleString()}
                </div>
                <div className={styles.metricTrend}>
                  📊 {selectedPeriod}
                </div>
              </div>

              <div className={styles.metricCard} style={{
                backgroundColor: isDarkMode ? '#2d2d2d' : '#ffffff',
                borderColor: isDarkMode ? '#444' : '#ddd'
              }}>
                <h3>Cache Hit Rate</h3>
                <div className={styles.metricValue}>
                  {report.metrics.cacheHitRate.toFixed(1)}%
                </div>
                <div className={styles.metricTrend}>
                  {report.metrics.cacheHitRate > 80 ? '🔥' : '❄️'}
                </div>
              </div>
            </div>

            {/* Auto-Optimizations */}
            {optimizations.length > 0 && (
              <div className={styles.autoOptimizations} style={{
                backgroundColor: isDarkMode ? '#2d2d2d' : '#ffffff',
                borderColor: isDarkMode ? '#444' : '#ddd'
              }}>
                <h3>🤖 Auto-Applied Optimizations</h3>
                <ul>
                  {optimizations.map((opt, index) => (
                    <li key={index}>{opt}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {selectedTab === 'metrics' && (
          <div className={styles.metrics}>
            <h2>Detailed Performance Metrics</h2>
            <div className={styles.metricsContent}>
              <p>Detailed metrics and charts will be displayed here.</p>
              <p>Component render count: {renderCount}</p>
            </div>
          </div>
        )}

        {selectedTab === 'recommendations' && report && (
          <div className={styles.recommendations}>
            <h2>Optimization Recommendations</h2>
            {report.recommendations.length === 0 ? (
              <div className={styles.noRecommendations}>
                <p>🎉 No optimization recommendations at this time!</p>
                <p>Your application is performing well.</p>
              </div>
            ) : (
              <div className={styles.recommendationsList}>
                {report.recommendations.map((rec: OptimizationRecommendation) => (
                  <div key={rec.id} className={styles.recommendationCard} style={{
                    backgroundColor: isDarkMode ? '#2d2d2d' : '#ffffff',
                    borderColor: isDarkMode ? '#444' : '#ddd'
                  }}>
                    <div className={styles.recommendationHeader}>
                      <h3>{rec.title}</h3>
                      <div className={styles.recommendationMeta}>
                        <span 
                          className={styles.impact}
                          style={{ backgroundColor: getImpactColor(rec.impact) }}
                        >
                          Impact: {rec.impact}
                        </span>
                        <span 
                          className={styles.effort}
                          style={{ backgroundColor: getEffortColor(rec.effort) }}
                        >
                          Effort: {rec.effort}
                        </span>
                        <span className={styles.improvement}>
                          +{rec.estimatedImprovement}% improvement
                        </span>
                      </div>
                    </div>
                    <p>{rec.description}</p>
                    <div className={styles.recommendationActions}>
                      <button
                        onClick={() => handleImplementRecommendation(rec.id)}
                        className={styles.implementButton}
                        style={{ backgroundColor: '#28a745', color: 'white' }}
                      >
                        ✅ Implement
                      </button>
                      <button
                        onClick={() => handleIgnoreRecommendation(rec.id)}
                        className={styles.ignoreButton}
                        style={{ backgroundColor: '#6c757d', color: 'white' }}
                      >
                        ❌ Ignore
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedTab === 'alerts' && report && (
          <div className={styles.alerts}>
            <h2>Performance Alerts</h2>
            {report.alerts.length === 0 ? (
              <div className={styles.noAlerts}>
                <p>✅ No performance alerts at this time!</p>
                <p>Your application is running smoothly.</p>
              </div>
            ) : (
              <div className={styles.alertsList}>
                {report.alerts.map((alert: string, index: number) => (
                  <div key={index} className={styles.alertCard} style={{
                    backgroundColor: isDarkMode ? '#2d2d2d' : '#ffffff',
                    borderColor: isDarkMode ? '#444' : '#ddd'
                  }}>
                    <div className={styles.alertIcon}>🚨</div>
                    <div className={styles.alertContent}>
                      <p>{alert}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedTab === 'optimization' && (
          <div className={styles.optimization}>
            <h2>Performance Optimization Tools</h2>
            <div className={styles.optimizationTools}>
              <div className={styles.toolCard} style={{
                backgroundColor: isDarkMode ? '#2d2d2d' : '#ffffff',
                borderColor: isDarkMode ? '#444' : '#ddd'
              }}>
                <h3>🧹 Memory Cleanup</h3>
                <p>Force garbage collection and clear temporary caches</p>
                <button
                  onClick={() => {
                    if ('gc' in window) {
                      try {
                        (window as any).gc();
                        alert('Memory cleanup completed!');
                      } catch (e) {
                        alert('Garbage collection not available in this environment');
                      }
                    }
                  }}
                  className={styles.toolButton}
                  style={{ backgroundColor: '#17a2b8', color: 'white' }}
                >
                  Clean Memory
                </button>
              </div>

              <div className={styles.toolCard} style={{
                backgroundColor: isDarkMode ? '#2d2d2d' : '#ffffff',
                borderColor: isDarkMode ? '#444' : '#ddd'
              }}>
                <h3>📊 Generate Report</h3>
                <p>Generate a detailed performance report</p>
                <button
                  onClick={handleGenerateReport}
                  className={styles.toolButton}
                  style={{ backgroundColor: '#28a745', color: 'white' }}
                >
                  Generate Report
                </button>
              </div>

              <div className={styles.toolCard} style={{
                backgroundColor: isDarkMode ? '#2d2d2d' : '#ffffff',
                borderColor: isDarkMode ? '#444' : '#ddd'
              }}>
                <h3>🔍 Performance Analysis</h3>
                <p>Analyze current performance metrics</p>
                <button
                  onClick={() => {
                    const metrics = advancedPerformanceService.getMetrics();
                    const baselines = advancedPerformanceService.getBaselines();
                    console.log('Performance Metrics:', metrics);
                    console.log('Performance Baselines:', baselines);
                    alert('Performance analysis logged to console');
                  }}
                  className={styles.toolButton}
                  style={{ backgroundColor: '#6f42c1', color: 'white' }}
                >
                  Analyze Performance
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedPerformanceDashboard;
