import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createTestLoadForCarrier, cleanupTestLoads } from '../utils/testCurrentLoad';

const TestCurrentLoad: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleCreateTestLoad = async () => {
    if (!user?.uid) {
      setMessage('Please log in as a carrier first');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const result = await createTestLoadForCarrier(user.uid);
      if (result) {
        setMessage('✅ Test load created successfully! Refresh the carrier home page to see it.');
      } else {
        setMessage('❌ Failed to create test load');
      }
    } catch (error) {
      setMessage(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupTestLoads = async () => {
    if (!user?.uid) {
      setMessage('Please log in as a carrier first');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      await cleanupTestLoads(user.uid);
      setMessage('✅ Test loads cleaned up successfully!');
    } catch (error) {
      setMessage(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Test Current Load Functionality</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <p><strong>Current User:</strong> {user?.email || 'Not logged in'}</p>
        <p><strong>User ID:</strong> {user?.uid || 'N/A'}</p>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={handleCreateTestLoad}
          disabled={loading || !user?.uid}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Creating...' : 'Create Test Load'}
        </button>

        <button 
          onClick={handleCleanupTestLoads}
          disabled={loading || !user?.uid}
          style={{
            padding: '10px 20px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Cleaning...' : 'Cleanup Test Loads'}
        </button>
      </div>

      {message && (
        <div style={{
          padding: '10px',
          backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da',
          border: `1px solid ${message.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '4px',
          color: message.includes('✅') ? '#155724' : '#721c24'
        }}>
          {message}
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        <h3>Instructions:</h3>
        <ol>
          <li>Log in as a carrier user</li>
          <li>Click "Create Test Load" to create a test load for the current user</li>
          <li>Go to the carrier home page to see the current load information</li>
          <li>Use "Cleanup Test Loads" to remove test loads when done</li>
        </ol>
      </div>
    </div>
  );
};

export default TestCurrentLoad; 