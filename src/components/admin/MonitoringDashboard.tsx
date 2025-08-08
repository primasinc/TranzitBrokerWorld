import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMonitoring } from '../../hooks/useMonitoring';
import styles from './MonitoringDashboard.module.css';

interface MonitoringData {
  summary: {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    averageResponseTime: number;
    totalErrors: number;
    lastError?: any;
  };
  performanceMetrics: any[];
  errorMetrics: any[];
}

const MonitoringDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { getMonitoringData, setMonitoringEnabled } = useMonitoring();
  const [monitoringData, setMonitoringData] = useState<MonitoringData | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    const updateData = () => {
      const data = getMonitoringData();
      setMonitoringData(data);
    };

    // Initial load
    updateData();

    // Auto-refresh if enabled
    if (autoRefresh) {
      const interval = setInterval(updateData, 5000); // Update every 5 seconds
      return () => clearInterval(interval);
    }
  }, [getMonitoringData, autoRefresh]);

  const handleToggleMonitoring = (enabled: boolean) => {
    setIsEnabled(enabled);
    setMonitoringEnabled(enabled);
  };

  const handleClearData = () => {
    // This would clear the monitoring data
    setMonitoringData(null);
  };

  if (!monitoringData) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading monitoring data...</div>
      </div>
    );
  }

  const { summary, performanceMetrics, errorMetrics } = monitoringData;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Application Monitoring Dashboard</h1>
            <div className={styles.controls}>
              <label>
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => handleToggleMonitoring(e.target.checked)}
                />
                Enable Monitoring
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                Auto Refresh
              </label>
              <button onClick={handleClearData} className={styles.clearButton}>
                Clear Data
              </button>
            </div>
          </div>
          <button 
            onClick={() => navigate('/admin')}
            style={{
              backgroundColor: '#495057',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#343a40';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#495057';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span style={{ fontSize: '16px' }}>←</span>
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className={styles.summary}>
        <div className={styles.summaryCard}>
          <h3>Total Operations</h3>
          <div className={styles.value}>{summary.totalOperations}</div>
        </div>
        <div className={styles.summaryCard}>
          <h3>Success Rate</h3>
          <div className={styles.value}>
            {summary.totalOperations > 0
              ? `${((summary.successfulOperations / summary.totalOperations) * 100).toFixed(1)}%`
              : '0%'}
          </div>
        </div>
        <div className={styles.summaryCard}>
          <h3>Average Response Time</h3>
          <div className={styles.value}>{summary.averageResponseTime.toFixed(2)}ms</div>
        </div>
        <div className={styles.summaryCard}>
          <h3>Total Errors</h3>
          <div className={styles.value}>{summary.totalErrors}</div>
        </div>
      </div>

      <div className={styles.sections}>
        <div className={styles.section}>
          <h2>Recent Performance Metrics</h2>
          <div className={styles.metricsList}>
            {performanceMetrics.slice(-10).reverse().map((metric, index) => (
              <div key={index} className={styles.metricItem}>
                <div className={styles.metricHeader}>
                  <span className={styles.operation}>{metric.operation}</span>
                  <span className={`${styles.status} ${metric.success ? styles.success : styles.error}`}>
                    {metric.success ? '✓' : '✗'}
                  </span>
                </div>
                <div className={styles.metricDetails}>
                  <span>{metric.duration.toFixed(2)}ms</span>
                  <span>{new Date(metric.timestamp).toLocaleTimeString()}</span>
                </div>
                {metric.error && (
                  <div className={styles.errorMessage}>{metric.error}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <h2>Recent Errors</h2>
          <div className={styles.metricsList}>
            {errorMetrics.slice(-10).reverse().map((error, index) => (
              <div key={index} className={styles.errorItem}>
                <div className={styles.errorHeader}>
                  <span className={styles.errorMessage}>{error.error}</span>
                  <span className={styles.timestamp}>
                    {new Date(error.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                {error.context && (
                  <div className={styles.errorContext}>
                    <pre>{JSON.stringify(error.context, null, 2)}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonitoringDashboard;
