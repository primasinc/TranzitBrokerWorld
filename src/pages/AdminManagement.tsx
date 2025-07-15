import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../contexts/AuthContext';
import styles from './AdminDashboard.module.css';

interface AdminUser {
  uid: string;
  email: string;
  displayName?: string;
}

const AdminManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const { user } = useAuth();
  
  const functions = getFunctions();
  const setupAdminRole = httpsCallable(functions, 'setupAdminRole');
  const getAdminUsers = httpsCallable(functions, 'getAdminUsers');

  useEffect(() => {
    if (user?.email === 'srose@norwalkls.com') {
      loadAdminUsers();
    }
  }, [user]);

  const loadAdminUsers = async () => {
    try {
      setLoading(true);
      const result = await getAdminUsers({});
      const { adminUsers } = result.data as { adminUsers: AdminUser[] };
      setAdminUsers(adminUsers);
    } catch (error) {
      console.error('Error loading admin users:', error);
      setMessage('Failed to load admin users');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupAdmin = async () => {
    if (!user) {
      setMessage('Please log in first');
      return;
    }

    if (user.email !== 'srose@norwalkls.com') {
      setMessage('Only srose@norwalkls.com can set up admin role');
      return;
    }

    try {
      setLoading(true);
      setMessage('Setting up admin role...');
      
      await setupAdminRole({ email: 'srose@norwalkls.com' });
      
      setMessage('Admin role set successfully! You can now access /admin');
      
      // Reload admin users
      await loadAdminUsers();
    } catch (error) {
      console.error('Error setting admin role:', error);
      setMessage('Failed to set admin role. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className={styles.adminDashboard}>
        <h1>Admin Management</h1>
        <p>Please log in first.</p>
      </div>
    );
  }

  if (user.email !== 'srose@norwalkls.com') {
    return (
      <div className={styles.adminDashboard}>
        <h1>Admin Management</h1>
        <p>Access denied. Only srose@norwalkls.com can access this page.</p>
      </div>
    );
  }

  return (
    <div className={styles.adminDashboard}>
      <h1>Admin Management</h1>
      
      <div style={{ marginBottom: '30px' }}>
        <h2>Setup Admin Role</h2>
        <p>Click the button below to set up admin role for: {user.email}</p>
        <button 
          onClick={handleSetupAdmin}
          disabled={loading}
          className={styles.approveBtn}
          style={{ marginTop: '10px' }}
        >
          {loading ? 'Setting up...' : 'Set Admin Role'}
        </button>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>Current Admin Users</h2>
        {loading ? (
          <p>Loading admin users...</p>
        ) : adminUsers.length === 0 ? (
          <p>No admin users found.</p>
        ) : (
          <div className={styles.usersList}>
            {adminUsers.map((adminUser) => (
              <div key={adminUser.uid} className={styles.userCard}>
                <div className={styles.userInfo}>
                  <h3>{adminUser.displayName || 'No Name'}</h3>
                  <p><strong>Email:</strong> {adminUser.email}</p>
                  <p><strong>UID:</strong> {adminUser.uid}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>Quick Links</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <a 
            href="/admin" 
            className={styles.approveBtn}
            style={{ textDecoration: 'none', display: 'inline-block' }}
          >
            Go to Admin Dashboard
          </a>
          <button 
            onClick={loadAdminUsers}
            className={styles.refreshBtn}
          >
            Refresh Admin Users
          </button>
        </div>
      </div>
      
      {message && (
        <div style={{ 
          marginTop: '10px', 
          padding: '10px', 
          backgroundColor: message.includes('success') ? '#d4edda' : '#f8d7da',
          border: `1px solid ${message.includes('success') ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '4px'
        }}>
          {message}
        </div>
      )}
    </div>
  );
};

export default AdminManagement; 