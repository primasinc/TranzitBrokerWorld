import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCache } from '../../hooks/useCache';
import styles from './CacheManager.module.css';

const CacheManager: React.FC = () => {
  const navigate = useNavigate();
  const { 
    stats, 
    getKeys, 
    clear, 
    remove, 
    getCacheStats 
  } = useCache();
  
  const [cacheKeys, setCacheKeys] = useState<string[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [refreshInterval, setRefreshInterval] = useState(5000);

  useEffect(() => {
    // Load cache keys
    const loadKeys = () => {
      setCacheKeys(getKeys());
    };

    loadKeys();
    const interval = setInterval(loadKeys, refreshInterval);

    return () => clearInterval(interval);
  }, [getKeys, refreshInterval]);

  const handleClearCache = () => {
    if (window.confirm('Are you sure you want to clear all cache? This will affect performance temporarily.')) {
      clear();
      setCacheKeys([]);
    }
  };

  const handleRemoveKey = (key: string) => {
    if (window.confirm(`Are you sure you want to remove cache key: ${key}?`)) {
      remove(key);
      setCacheKeys(getKeys());
    }
  };

  const handleRefreshIntervalChange = (interval: number) => {
    setRefreshInterval(interval);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getKeyType = (key: string): string => {
    if (key.startsWith('user:')) return 'User Data';
    if (key.startsWith('load:')) return 'Load Data';
    if (key.startsWith('shipment:')) return 'Shipment Data';
    if (key.startsWith('carrier:')) return 'Carrier Data';
    return 'Other';
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Cache Management</h1>
            <p>Monitor and manage application cache for optimal performance</p>
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

      {/* Cache Statistics */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <h3>Cache Size</h3>
          <div className={styles.statValue}>{stats.size} / {stats.maxSize}</div>
          <div className={styles.statLabel}>Items</div>
        </div>

        <div className={styles.statCard}>
          <h3>Hit Rate</h3>
          <div className={styles.statValue}>{stats.hitRate}</div>
          <div className={styles.statLabel}>Success Rate</div>
        </div>

        <div className={styles.statCard}>
          <h3>Cache Hits</h3>
          <div className={styles.statValue}>{stats.hits.toLocaleString()}</div>
          <div className={styles.statLabel}>Total Hits</div>
        </div>

        <div className={styles.statCard}>
          <h3>Cache Misses</h3>
          <div className={styles.statValue}>{stats.misses.toLocaleString()}</div>
          <div className={styles.statLabel}>Total Misses</div>
        </div>

        <div className={styles.statCard}>
          <h3>Evictions</h3>
          <div className={styles.statValue}>{stats.evictions.toLocaleString()}</div>
          <div className={styles.statLabel}>LRU Evictions</div>
        </div>

        <div className={styles.statCard}>
          <h3>Memory Usage</h3>
          <div className={styles.statValue}>~{formatBytes(stats.size * 1024)}</div>
          <div className={styles.statLabel}>Estimated</div>
        </div>
      </div>

      {/* Cache Controls */}
      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <h3>Cache Controls</h3>
          <div className={styles.buttonGroup}>
            <button 
              onClick={handleClearCache}
              className={styles.dangerButton}
            >
              Clear All Cache
            </button>
            <button 
              onClick={() => setCacheKeys(getKeys())}
              className={styles.secondaryButton}
            >
              Refresh Keys
            </button>
          </div>
        </div>

        <div className={styles.controlGroup}>
          <h3>Refresh Interval</h3>
          <select 
            value={refreshInterval}
            onChange={(e) => handleRefreshIntervalChange(Number(e.target.value))}
            className={styles.select}
          >
            <option value={1000}>1 second</option>
            <option value={5000}>5 seconds</option>
            <option value={10000}>10 seconds</option>
            <option value={30000}>30 seconds</option>
          </select>
        </div>
      </div>

      {/* Cache Keys */}
      <div className={styles.keysSection}>
        <h3>Cache Keys ({cacheKeys.length})</h3>
        
        {cacheKeys.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No cached items found</p>
          </div>
        ) : (
          <div className={styles.keysList}>
            {cacheKeys.map((key) => (
              <div key={key} className={styles.keyItem}>
                <div className={styles.keyInfo}>
                  <span className={styles.keyType}>{getKeyType(key)}</span>
                  <span className={styles.keyName}>{key}</span>
                </div>
                <button
                  onClick={() => handleRemoveKey(key)}
                  className={styles.removeButton}
                  title="Remove this cache key"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Performance Tips */}
      <div className={styles.tips}>
        <h3>Performance Tips</h3>
        <ul>
          <li><strong>High Hit Rate:</strong> Good cache utilization (aim for &gt;80%)</li>
          <li><strong>Low Evictions:</strong> Few evictions indicate good cache sizing</li>
          <li><strong>Cache Size:</strong> Monitor memory usage vs performance</li>
          <li><strong>Key Patterns:</strong> Use consistent naming for better management</li>
        </ul>
      </div>
    </div>
  );
};

export default CacheManager;
