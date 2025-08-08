import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { quickAdminSetup, checkAdminStatus } from '../utils/quickAdminSetup';
import { useNavigate } from 'react-router-dom';
import styles from './AdminAccess.module.css';

const AdminAccess: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [adminStatus, setAdminStatus] = useState<{
    isAdmin: boolean;
    isSuperAdmin: boolean;
    userEmail: string | null;
  } | null>(null);

  const handleGetAdminAccess = async () => {
    if (!user) {
      setMessage('❌ Please log in first');
      return;
    }

    setLoading(true);
    setMessage('Setting up admin access...');

    try {
      await quickAdminSetup();
      setMessage('✅ Admin access granted! Please refresh the page to see changes.');
      
      // Check status after setup
      const status = await checkAdminStatus();
      setAdminStatus(status);
    } catch (error: any) {
      setMessage(`❌ Failed to get admin access: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    setLoading(true);
    try {
      const status = await checkAdminStatus();
      setAdminStatus(status);
      setMessage(status.isAdmin ? '✅ You have admin access!' : '❌ You do not have admin access');
    } catch (error: any) {
      setMessage(`❌ Error checking status: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Admin Access Setup</h1>
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
      
      <div className={styles.section}>
        <h2>Current User</h2>
        {user ? (
          <div className={styles.userInfo}>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>User ID:</strong> {user.uid}</p>
          </div>
        ) : (
          <p>❌ No user logged in</p>
        )}
      </div>

      <div className={styles.section}>
        <h2>Admin Status</h2>
        <button
          onClick={handleCheckStatus}
          disabled={loading || !user}
          className={styles.checkButton}
        >
          {loading ? 'Checking...' : 'Check Admin Status'}
        </button>

        {adminStatus && (
          <div className={styles.statusInfo}>
            <p><strong>Is Admin:</strong> {adminStatus.isAdmin ? '✅ Yes' : '❌ No'}</p>
            <p><strong>Is Super Admin:</strong> {adminStatus.isSuperAdmin ? '✅ Yes' : '❌ No'}</p>
            <p><strong>Email:</strong> {adminStatus.userEmail || 'N/A'}</p>
          </div>
        )}
      </div>

      <div className={styles.section}>
        <h2>Get Admin Access</h2>
        <p>Click the button below to grant yourself admin privileges:</p>
        
        <button
          onClick={handleGetAdminAccess}
          disabled={loading || !user}
          className={styles.adminButton}
        >
          {loading ? 'Setting up...' : 'Make Me Admin'}
        </button>

        <div className={styles.warning}>
          <p><strong>⚠️ Warning:</strong> This will give you full admin access to the system.</p>
          <p>Only use this if you are the system administrator.</p>
        </div>
      </div>

      <div className={styles.section}>
        <h2>Admin Pages</h2>
        <p>Once you have admin access, you can visit these pages:</p>
        <ul className={styles.adminLinks}>
          <li><a href="/admin">Admin Dashboard</a></li>
          <li><a href="/admin/monitoring">System Monitoring</a></li>
          <li><a href="/admin/feature-flags">Feature Flags</a></li>
          <li><a href="/admin/cache">Cache Management</a></li>
          <li><a href="/admin/rate-limits">Rate Limits</a></li>
          <li><a href="/subscription-tiers">Subscription Tiers</a></li>
        </ul>
      </div>

      {message && (
        <div className={`${styles.message} ${message.includes('❌') ? styles.error : styles.success}`}>
          {message}
        </div>
      )}

      <div className={styles.section}>
        <h2>Console Commands</h2>
        <p>You can also use these commands in the browser console (F12):</p>
        <div className={styles.codeBlock}>
          <code>
            // Make current user admin<br/>
            quickAdminSetup()<br/><br/>
            
            // Check admin status<br/>
            checkAdminStatus()<br/><br/>
            
            // Assign subscription tier<br/>
            subscriptionTierManager.assignUserTier('USER_ID', 'enterprise', 'Premium customer')
          </code>
        </div>
      </div>
    </div>
  );
};

export default AdminAccess;
