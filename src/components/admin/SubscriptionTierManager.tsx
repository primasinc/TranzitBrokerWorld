import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  assignUserTier, 
  getUserTierInfo, 
  getTierLimits, 
  SUBSCRIPTION_TIERS,
  SubscriptionTier 
} from '../../utils/subscriptionTierManager';
import { quickAdminSetup, checkAdminStatus } from '../../utils/quickAdminSetup';
import styles from './SubscriptionTierManager.module.css';

const SubscriptionTierManager: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userId, setUserId] = useState('');
  const [selectedTier, setSelectedTier] = useState<'basic' | 'professional' | 'enterprise' | 'admin'>('basic');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [userTierInfo, setUserTierInfo] = useState<any>(null);
  const [tierLimits, setTierLimits] = useState<SubscriptionTier[]>([]);
  const [adminStatus, setAdminStatus] = useState<{
    isAdmin: boolean;
    isSuperAdmin: boolean;
    userEmail: string | null;
  } | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    setTierLimits(getTierLimits());
  }, []);

  useEffect(() => {
    const checkAdmin = async () => {
      if (user) {
        try {
          const status = await checkAdminStatus();
          setAdminStatus(status);
        } catch (error) {
          console.error('Error checking admin status:', error);
        }
      }
      setCheckingAdmin(false);
    };

    checkAdmin();
  }, [user]);

  const handleAssignTier = async () => {
    if (!userId.trim()) {
      setMessage('❌ Please enter a user ID');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      await assignUserTier(userId, selectedTier, reason);
      setMessage(`✅ Successfully assigned ${selectedTier} tier to user ${userId}`);
      setUserId('');
      setReason('');
    } catch (error: any) {
      setMessage(`❌ Failed to assign tier: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGetUserTier = async () => {
    if (!userId.trim()) {
      setMessage('❌ Please enter a user ID');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const info = await getUserTierInfo(userId);
      setUserTierInfo(info);
      setMessage(`✅ Found user tier information`);
    } catch (error: any) {
      setMessage(`❌ Failed to get user tier: ${error.message}`);
      setUserTierInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignToCurrentUser = async () => {
    if (!user?.uid) {
      setMessage('❌ No user logged in');
      return;
    }

    setUserId(user.uid);
    setLoading(true);
    setMessage('');

    try {
      await assignUserTier(user.uid, selectedTier, reason);
      setMessage(`✅ Successfully assigned ${selectedTier} tier to your account`);
      setReason('');
    } catch (error: any) {
      setMessage(`❌ Failed to assign tier: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGetAdminAccess = async () => {
    if (!user) {
      setMessage('❌ Please log in first');
      return;
    }

    setLoading(true);
    setMessage('Getting admin access...');

    try {
      await quickAdminSetup();
      setMessage('✅ Admin access granted! Please refresh the page.');
      
      // Recheck admin status
      const status = await checkAdminStatus();
      setAdminStatus(status);
    } catch (error: any) {
      setMessage(`❌ Failed to get admin access: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (checkingAdmin) {
    return (
      <div className={styles.container}>
        <h1>Subscription Tier Manager</h1>
        <div className={styles.section}>
          <p>Checking admin status...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <h1>Subscription Tier Manager</h1>
        <div className={styles.section}>
          <p>❌ Please log in to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Subscription Tier Manager</h1>
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
      
      {/* Admin Status Section */}
      <div className={styles.section}>
        <h2>Admin Status</h2>
        {adminStatus ? (
          <div className={styles.adminStatus}>
            <p><strong>Is Admin:</strong> {adminStatus.isAdmin ? '✅ Yes' : '❌ No'}</p>
            <p><strong>Is Super Admin:</strong> {adminStatus.isSuperAdmin ? '✅ Yes' : '❌ No'}</p>
            <p><strong>Email:</strong> {adminStatus.userEmail || 'N/A'}</p>
          </div>
        ) : (
          <p>Checking admin status...</p>
        )}
        
        {adminStatus && !adminStatus.isAdmin && (
          <div className={styles.adminWarning}>
            <p><strong>⚠️ Warning:</strong> You don't have admin privileges.</p>
            <button
              onClick={handleGetAdminAccess}
              disabled={loading}
              className={styles.adminButton}
            >
              {loading ? 'Getting Access...' : 'Get Admin Access'}
            </button>
          </div>
        )}
      </div>
      
      <div className={styles.section}>
        <h2>Available Tiers</h2>
        <div className={styles.tierGrid}>
          {tierLimits.map((tier) => (
            <div key={tier.tier} className={styles.tierCard}>
              <h3>{tier.name}</h3>
              <p className={styles.description}>{tier.description}</p>
              <div className={styles.limits}>
                <div><strong>Daily Requests:</strong> {tier.requestsPerDay.toLocaleString()}</div>
                <div><strong>Per Minute:</strong> {tier.requestsPerMinute}</div>
                <div><strong>Burst Allowance:</strong> {tier.burstAllowance}</div>
                {tier.monthlyPrice !== undefined && (
                  <div><strong>Monthly Price:</strong> ${tier.monthlyPrice}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <h2>Assign Tier to User</h2>
        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label>User ID:</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter Firebase UID"
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Subscription Tier:</label>
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value as any)}
              className={styles.select}
            >
              {Object.entries(SUBSCRIPTION_TIERS).map(([key, tier]) => (
                <option key={key} value={key}>
                  {tier.name} - {tier.description}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Reason (Optional):</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Premium customer, Beta tester"
              className={styles.input}
            />
          </div>

          <div className={styles.buttonGroup}>
            <button
              onClick={handleAssignTier}
              disabled={loading}
              className={styles.primaryButton}
            >
              {loading ? 'Assigning...' : 'Assign Tier'}
            </button>

            <button
              onClick={handleGetUserTier}
              disabled={loading}
              className={styles.secondaryButton}
            >
              {loading ? 'Loading...' : 'Get User Tier Info'}
            </button>

            <button
              onClick={handleAssignToCurrentUser}
              disabled={loading || !user?.uid}
              className={styles.tertiaryButton}
            >
              {loading ? 'Assigning...' : 'Assign to Current User'}
            </button>
          </div>
        </div>
      </div>

      {message && (
        <div className={`${styles.message} ${message.includes('❌') ? styles.error : styles.success}`}>
          {message}
        </div>
      )}

      {userTierInfo && (
        <div className={styles.section}>
          <h2>User Tier Information</h2>
          <div className={styles.userInfo}>
            <div><strong>User ID:</strong> {userTierInfo.userData.id || 'N/A'}</div>
            <div><strong>Email:</strong> {userTierInfo.userData.email || 'N/A'}</div>
            <div><strong>Company:</strong> {userTierInfo.userData.companyName || 'N/A'}</div>
            <div><strong>User Type:</strong> {userTierInfo.userData.userType || 'N/A'}</div>
            <div><strong>Current Tier:</strong> {userTierInfo.currentTier}</div>
            <div><strong>Daily Limit:</strong> {userTierInfo.tierInfo.requestsPerDay.toLocaleString()}</div>
            <div><strong>Per Minute Limit:</strong> {userTierInfo.tierInfo.requestsPerMinute}</div>
            <div><strong>Burst Allowance:</strong> {userTierInfo.tierInfo.burstAllowance}</div>
          </div>
        </div>
      )}

      <div className={styles.section}>
        <h2>Quick Actions</h2>
        <div className={styles.quickActions}>
          <button
            onClick={() => {
              setUserId(user?.uid || '');
              setSelectedTier('admin');
              setReason('System administrator');
            }}
            className={styles.quickButton}
          >
            Make Current User Admin
          </button>
          
          <button
            onClick={() => {
              setUserId(user?.uid || '');
              setSelectedTier('enterprise');
              setReason('Premium testing');
            }}
            className={styles.quickButton}
          >
            Give Current User Enterprise
          </button>
        </div>
      </div>

      <div className={styles.section}>
        <h2>Console Commands</h2>
        <p>You can also use these commands in the browser console:</p>
        <div className={styles.codeBlock}>
          <code>
            // Assign tier to a user<br/>
            subscriptionTierManager.assignUserTier('USER_ID', 'enterprise', 'Premium customer')<br/><br/>
            
            // Get user tier info<br/>
            subscriptionTierManager.getUserTierInfo('USER_ID')<br/><br/>
            
            // View all tier limits<br/>
            subscriptionTierManager.getTierLimits()<br/><br/>
            
            // View tier definitions<br/>
            subscriptionTierManager.SUBSCRIPTION_TIERS
          </code>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionTierManager;
