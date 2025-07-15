import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../contexts/AuthContext';

const AdminSetup: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { user } = useAuth();
  
  const functions = getFunctions();
  const setupAdminRole = httpsCallable(functions, 'setupAdminRole');

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
      
      await setupAdminRole({});
      
      setMessage('Admin role set successfully! You can now access /admin');
    } catch (error) {
      console.error('Error setting admin role:', error);
      setMessage('Failed to set admin role. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Admin Setup</h1>
      
      {!user ? (
        <p>Please log in first with srose@norwalkls.com</p>
      ) : user.email !== 'srose@norwalkls.com' ? (
        <p>Only srose@norwalkls.com can set up admin role</p>
      ) : (
        <div>
          <p>Click the button below to set up admin role for: {user.email}</p>
          <button 
            onClick={handleSetupAdmin}
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Setting up...' : 'Set Admin Role'}
          </button>
          
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
      )}
    </div>
  );
};

export default AdminSetup; 