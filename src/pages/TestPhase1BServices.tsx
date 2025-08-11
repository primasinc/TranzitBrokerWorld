import React, { useState } from 'react';
import usePhase1BServices from '../hooks/usePhase1BServices';
import './TestPhase1BServices.module.css';

const TestPhase1BServices: React.FC = () => {
  const {
    stats,
    config,
    isLoading,
    error,
    cacheOperations,
    queryOperations,
    indexOperations,
    updateCacheConfig,
    updatePerformanceThresholds,
    healthCheck,
    monitorQuery,
    optimizeCache,
    optimizeIndexes,
    clearError,
    resetServices
  } = usePhase1BServices();

  const [testQuery, setTestQuery] = useState('SELECT * FROM loads WHERE status = "available"');
  const [testCollection, setTestCollection] = useState('loads');
  const [cacheKey, setCacheKey] = useState('test_key');
  const [cacheValue, setCacheValue] = useState('test_value');
  const [cacheTags, setCacheTags] = useState('test, demo');

  const handleTestQuery = () => {
    const startTime = performance.now();
    const resultCount = Math.floor(Math.random() * 1000) + 100;
    const resultSize = resultCount * 1024; // Simulate result size
    
    const { queryId, analysis } = monitorQuery(
      testQuery, 
      testCollection, 
      startTime, 
      resultCount, 
      resultSize
    );
    
    console.log('Query monitored:', { queryId, analysis });
  };

  const handleCacheTest = () => {
    // Test cache operations
    cacheOperations.set(cacheKey, cacheValue, { tags: cacheTags.split(',').map(t => t.trim()) });
    const cached = cacheOperations.get(cacheKey);
    console.log('Cached value:', cached);
  };

  const handleIndexTest = () => {
    // Test index operations
    const recommendations = indexOperations.getRecommendations(testCollection);
    console.log('Index recommendations:', recommendations);
  };

  const handleHealthCheck = async () => {
    const healthy = await healthCheck();
    console.log('Health check result:', healthy);
  };

  const handleCacheOptimization = async () => {
    const result = await optimizeCache();
    console.log('Cache optimization:', result);
  };

  const handleIndexOptimization = async () => {
    const result = await optimizeIndexes(testCollection);
    console.log('Index optimization:', result);
  };

  return (
    <div className="test-phase1b">
      <h1>🚀 Phase 1B Services Test Dashboard</h1>
      
      {error && (
        <div className="error-banner">
          <span>❌ {error}</span>
          <button onClick={clearError}>Clear</button>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <h3>📊 Cache Statistics</h3>
          <div className="stat-item">
            <span>Total Items:</span>
            <span>{stats.cache.totalItems}</span>
          </div>
          <div className="stat-item">
            <span>Total Size:</span>
            <span>{(stats.cache.totalSize / 1024 / 1024).toFixed(2)} MB</span>
          </div>
          <div className="stat-item">
            <span>Hit Rate:</span>
            <span>{(stats.cache.hitRate * 100).toFixed(1)}%</span>
          </div>
          <div className="stat-item">
            <span>Eviction Count:</span>
            <span>{stats.cache.evictionCount}</span>
          </div>
        </div>

        <div className="stat-card">
          <h3>🔍 Query Performance</h3>
          <div className="stat-item">
            <span>Total Queries:</span>
            <span>{stats.queries.totalQueries}</span>
          </div>
          <div className="stat-item">
            <span>Avg Execution:</span>
            <span>{stats.queries.averageExecutionTime.toFixed(2)}ms</span>
          </div>
          <div className="stat-item">
            <span>Critical Issues:</span>
            <span>{stats.queries.criticalIssues}</span>
          </div>
        </div>

        <div className="stat-card">
          <h3>📈 Index Health</h3>
          <div className="stat-item">
            <span>Total Indexes:</span>
            <span>{stats.indexes.totalIndexes}</span>
          </div>
          <div className="stat-item">
            <span>Health Score:</span>
            <span>{stats.indexes.healthScore}/100</span>
          </div>
          <div className="stat-item">
            <span>Critical Issues:</span>
            <span>{stats.indexes.criticalIssues}</span>
          </div>
          <div className="stat-item">
            <span>Optimization Opportunities:</span>
            <span>{stats.indexes.optimizationOpportunities}</span>
          </div>
        </div>
      </div>

      <div className="test-sections">
        <div className="test-section">
          <h3>🧪 Test Query Performance</h3>
          <div className="input-group">
            <label>Query:</label>
            <input
              type="text"
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              placeholder="Enter test query"
            />
          </div>
          <div className="input-group">
            <label>Collection:</label>
            <input
              type="text"
              value={testCollection}
              onChange={(e) => setTestCollection(e.target.value)}
              placeholder="Enter collection name"
            />
          </div>
          <button onClick={handleTestQuery} disabled={isLoading}>
            {isLoading ? 'Testing...' : 'Test Query Performance'}
          </button>
        </div>

        <div className="test-section">
          <h3>💾 Test Cache Operations</h3>
          <div className="input-group">
            <label>Key:</label>
            <input
              type="text"
              value={cacheKey}
              onChange={(e) => setCacheKey(e.target.value)}
              placeholder="Cache key"
            />
          </div>
          <div className="input-group">
            <label>Value:</label>
            <input
              type="text"
              value={cacheValue}
              onChange={(e) => setCacheValue(e.target.value)}
              placeholder="Cache value"
            />
          </div>
          <div className="input-group">
            <label>Tags:</label>
            <input
              type="text"
              value={cacheTags}
              onChange={(e) => setCacheTags(e.target.value)}
              placeholder="Comma-separated tags"
            />
          </div>
          <button onClick={handleCacheTest} disabled={isLoading}>
            {isLoading ? 'Testing...' : 'Test Cache Operations'}
          </button>
        </div>

        <div className="test-section">
          <h3>🔧 Test Index Operations</h3>
          <div className="input-group">
            <label>Collection:</label>
            <input
              type="text"
              value={testCollection}
              onChange={(e) => setTestCollection(e.target.value)}
              placeholder="Collection name"
            />
          </div>
          <button onClick={handleIndexTest} disabled={isLoading}>
            {isLoading ? 'Testing...' : 'Get Index Recommendations'}
          </button>
        </div>
      </div>

      <div className="action-buttons">
        <button onClick={handleHealthCheck} disabled={isLoading} className="btn-primary">
          {isLoading ? 'Checking...' : '🔍 Health Check'}
        </button>
        
        <button onClick={handleCacheOptimization} disabled={isLoading} className="btn-secondary">
          {isLoading ? 'Optimizing...' : '⚡ Optimize Cache'}
        </button>
        
        <button onClick={handleIndexOptimization} disabled={isLoading} className="btn-secondary">
          {isLoading ? 'Optimizing...' : '📊 Optimize Indexes'}
        </button>
        
        <button onClick={resetServices} disabled={isLoading} className="btn-danger">
          {isLoading ? 'Resetting...' : '🔄 Reset Services'}
        </button>
      </div>

      <div className="configuration-section">
        <h3>⚙️ Configuration</h3>
        <div className="config-grid">
          <div className="config-item">
            <label>Cache Max Size (MB):</label>
            <input
              type="number"
              value={Math.round(config.cache.maxSize / 1024 / 1024)}
              onChange={(e) => updateCacheConfig({ 
                maxSize: parseInt(e.target.value) * 1024 * 1024 
              })}
            />
          </div>
          
          <div className="config-item">
            <label>Cache Max Items:</label>
            <input
              type="number"
              value={config.cache.maxItems}
              onChange={(e) => updateCacheConfig({ 
                maxItems: parseInt(e.target.value) 
              })}
            />
          </div>
          
          <div className="config-item">
            <label>Default TTL (minutes):</label>
            <input
              type="number"
              value={Math.round(config.cache.defaultTTL / 1000 / 60)}
              onChange={(e) => updateCacheConfig({ 
                defaultTTL: parseInt(e.target.value) * 1000 * 60 
              })}
            />
          </div>
          
          <div className="config-item">
            <label>Eviction Policy:</label>
            <select
              value={config.cache.evictionPolicy}
              onChange={(e) => updateCacheConfig({ 
                evictionPolicy: e.target.value as any 
              })}
            >
              <option value="lru">LRU</option>
              <option value="lfu">LFU</option>
              <option value="fifo">FIFO</option>
              <option value="random">Random</option>
            </select>
          </div>
        </div>
      </div>

      <div className="info-section">
        <h3>ℹ️ Phase 1B Services Overview</h3>
        <p>
          This dashboard demonstrates the Phase 1B services: Advanced Caching, Query Performance Analysis, 
          and Index Optimization. These services work together to provide:
        </p>
        <ul>
          <li><strong>Advanced Cache Service:</strong> Redis-like caching with intelligent eviction policies</li>
          <li><strong>Query Performance Analyzer:</strong> Real-time monitoring and optimization recommendations</li>
          <li><strong>Index Optimization Engine:</strong> Automatic index analysis and performance improvements</li>
          <li><strong>Data Compression:</strong> Multi-algorithm compression for storage optimization</li>
        </ul>
        <p>
          Use the test sections above to experiment with each service and see real-time statistics.
        </p>
      </div>
    </div>
  );
};

export default TestPhase1BServices;
