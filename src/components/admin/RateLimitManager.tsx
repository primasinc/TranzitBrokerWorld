import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRateLimit } from '../../hooks/useRateLimit';
import { rateLimitService } from '../../services/rateLimitService';
import styles from './RateLimitManager.module.css';

const RateLimitManager: React.FC = () => {
  const navigate = useNavigate();
  const { stats, clearAllLimits, unblockUser } = useRateLimit();
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      // Force refresh of stats
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const handleClearAllLimits = () => {
    if (window.confirm('Are you sure you want to clear all rate limit data? This will reset all counters.')) {
      clearAllLimits();
    }
  };

  const handleUnblockUser = (userId: string) => {
    if (window.confirm(`Are you sure you want to unblock user: ${userId}?`)) {
      rateLimitService.unblockUser(userId);
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  const getViolationLevel = (violations: number): string => {
    if (violations === 0) return 'none';
    if (violations <= 3) return 'low';
    if (violations <= 7) return 'medium';
    return 'high';
  };

  const blockedUsers = Object.entries(stats.userViolations)
    .filter(([_, violations]) => violations > 10)
    .sort(([_, a], [__, b]) => b - a);

  const topViolators = Object.entries(stats.userViolations)
    .sort(([_, a], [__, b]) => b - a)
    .slice(0, 10);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Rate Limit Management</h1>
            <p>Monitor and manage rate limiting for optimal system performance</p>
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

      {/* Rate Limit Statistics */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <h3>Total Requests</h3>
          <div className={styles.statValue}>{stats.totalRequests.toLocaleString()}</div>
          <div className={styles.statLabel}>All Time</div>
        </div>

        <div className={styles.statCard}>
          <h3>Blocked Requests</h3>
          <div className={styles.statValue}>{stats.blockedRequests.toLocaleString()}</div>
          <div className={styles.statLabel}>Rate Limited</div>
        </div>

        <div className={styles.statCard}>
          <h3>Success Rate</h3>
          <div className={styles.statValue}>{stats.hitRate}</div>
          <div className={styles.statLabel}>Allowed Requests</div>
        </div>

        <div className={styles.statCard}>
          <h3>Total Violations</h3>
          <div className={styles.statValue}>{stats.violations.toLocaleString()}</div>
          <div className={styles.statLabel}>Rate Limit Breaches</div>
        </div>

        <div className={styles.statCard}>
          <h3>Active Users</h3>
          <div className={styles.statValue}>{Object.keys(stats.userViolations).length}</div>
          <div className={styles.statLabel}>With Violations</div>
        </div>

        <div className={styles.statCard}>
          <h3>Blocked Users</h3>
          <div className={styles.statValue}>{blockedUsers.length}</div>
          <div className={styles.statLabel}>Currently Blocked</div>
        </div>
      </div>

      {/* Rate Limit Controls */}
      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <h3>Rate Limit Controls</h3>
          <div className={styles.buttonGroup}>
            <button 
              onClick={handleClearAllLimits}
              className={styles.dangerButton}
            >
              Clear All Limits
            </button>
            <button 
              onClick={() => setShowBlockedUsers(!showBlockedUsers)}
              className={styles.secondaryButton}
            >
              {showBlockedUsers ? 'Hide' : 'Show'} Blocked Users
            </button>
          </div>
        </div>

        <div className={styles.controlGroup}>
          <h3>Refresh Interval</h3>
          <select 
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className={styles.select}
          >
            <option value={1000}>1 second</option>
            <option value={5000}>5 seconds</option>
            <option value={10000}>10 seconds</option>
            <option value={30000}>30 seconds</option>
          </select>
        </div>
      </div>

      {/* Blocked Users */}
      {showBlockedUsers && blockedUsers.length > 0 && (
        <div className={styles.section}>
          <h3>Blocked Users ({blockedUsers.length})</h3>
          <div className={styles.userList}>
            {blockedUsers.map(([userId, violations]) => (
              <div key={userId} className={styles.userCard}>
                <div className={styles.userInfo}>
                  <h4>User ID: {userId}</h4>
                  <p>Violations: {violations}</p>
                  <p>Status: <span className={styles.blocked}>BLOCKED</span></p>
                </div>
                <div className={styles.userActions}>
                  <button
                    onClick={() => handleUnblockUser(userId)}
                    className={styles.unblockButton}
                  >
                    Unblock User
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Violators */}
      <div className={styles.section}>
        <h3>Top Rate Limit Violators</h3>
        {topViolators.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No violations recorded</p>
          </div>
        ) : (
          <div className={styles.violationsList}>
            {topViolators.map(([userId, violations]) => (
              <div key={userId} className={`${styles.violationItem} ${styles[getViolationLevel(violations)]}`}>
                <div className={styles.violationInfo}>
                  <span className={styles.userId}>{userId}</span>
                  <span className={styles.violationCount}>{violations} violations</span>
                  <span className={styles.violationLevel}>{getViolationLevel(violations)}</span>
                </div>
                {violations > 10 && (
                  <button
                    onClick={() => handleUnblockUser(userId)}
                    className={styles.unblockButton}
                  >
                    Unblock
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rate Limit Configuration */}
      <div className={styles.section}>
        <h3>Rate Limit Configuration</h3>
        <div className={styles.configGrid}>
          <div className={styles.configCard}>
            <h4>Basic Tier</h4>
            <ul>
              <li>1,000 requests/day</li>
              <li>20 requests/minute</li>
              <li>50 burst allowance</li>
            </ul>
          </div>
          <div className={styles.configCard}>
            <h4>Professional Tier</h4>
            <ul>
              <li>2,000 requests/day</li>
              <li>40 requests/minute</li>
              <li>100 burst allowance</li>
            </ul>
          </div>
          <div className={styles.configCard}>
            <h4>Enterprise Tier</h4>
            <ul>
              <li>5,000 requests/day</li>
              <li>100 requests/minute</li>
              <li>200 burst allowance</li>
            </ul>
          </div>
          <div className={styles.configCard}>
            <h4>Admin Tier</h4>
            <ul>
              <li>10,000 requests/day</li>
              <li>200 requests/minute</li>
              <li>500 burst allowance</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Endpoint Limits */}
      <div className={styles.section}>
        <h3>Endpoint-Specific Limits</h3>
        <div className={styles.endpointGrid}>
          <div className={styles.endpointCard}>
            <h4>Authentication</h4>
            <ul>
              <li>Login: 5 requests/5min</li>
              <li>Register: 3 requests/10min</li>
              <li>Reset Password: 3 requests/10min</li>
            </ul>
          </div>
          <div className={styles.endpointCard}>
            <h4>Heavy Operations</h4>
            <ul>
              <li>Load Search: 30 requests/min</li>
              <li>Bulk Update: 10 requests/min</li>
              <li>Reports: 5 requests/min</li>
            </ul>
          </div>
          <div className={styles.endpointCard}>
            <h4>File Operations</h4>
            <ul>
              <li>Upload: 10 requests/min</li>
              <li>Download: 50 requests/min</li>
            </ul>
          </div>
          <div className={styles.endpointCard}>
            <h4>Light Operations</h4>
            <ul>
              <li>User Profile: 100 requests/min</li>
              <li>Load List: 100 requests/min</li>
              <li>Notifications: 200 requests/min</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Performance Tips */}
      <div className={styles.tips}>
        <h3>Rate Limiting Best Practices</h3>
        <ul>
          <li><strong>High Success Rate:</strong> Aim for &gt;95% request success rate</li>
          <li><strong>Monitor Violations:</strong> Watch for patterns in rate limit violations</li>
          <li><strong>Adjust Limits:</strong> Modify limits based on user behavior and business needs</li>
          <li><strong>User Communication:</strong> Provide clear feedback when limits are hit</li>
        </ul>
      </div>
    </div>
  );
};

export default RateLimitManager;
