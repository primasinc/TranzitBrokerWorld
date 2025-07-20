import React, { useState } from 'react';
import { testAdminApprovalSystem, createTestUser, cleanupTestUsers } from '../utils/testAdminApproval';

const TestAdminApproval: React.FC = () => {
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    try {
      const results = await testAdminApprovalSystem();
      setTestResults(results);
    } catch (error) {
      console.error('Test failed:', error);
      setTestResults({ success: false, error: error });
    } finally {
      setLoading(false);
    }
  };

  const createTest = async () => {
    setLoading(true);
    try {
      const results = await createTestUser();
      setTestResults(results);
    } catch (error) {
      console.error('Create test failed:', error);
      setTestResults({ success: false, error: error });
    } finally {
      setLoading(false);
    }
  };

  const cleanup = async () => {
    setLoading(true);
    try {
      const results = await cleanupTestUsers();
      setTestResults(results);
    } catch (error) {
      console.error('Cleanup failed:', error);
      setTestResults({ success: false, error: error });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Admin Approval System Test</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={runTests}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          {loading ? 'Running Tests...' : 'Run Admin Approval Tests'}
        </button>
        
        <button 
          onClick={createTest}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          {loading ? 'Creating...' : 'Create Test User'}
        </button>
        
        <button 
          onClick={cleanup}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {loading ? 'Cleaning...' : 'Cleanup Test Users'}
        </button>
      </div>

      {testResults && (
        <div style={{
          padding: '15px',
          backgroundColor: testResults.success ? '#d4edda' : '#f8d7da',
          border: `1px solid ${testResults.success ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '4px',
          color: testResults.success ? '#155724' : '#721c24'
        }}>
          <h3>Test Results:</h3>
          <pre>{JSON.stringify(testResults, null, 2)}</pre>
        </div>
      )}

      <div style={{ marginTop: '30px' }}>
        <h2>Instructions:</h2>
        <ol>
          <li>Click "Run Admin Approval Tests" to check the current state of the admin approval system</li>
          <li>Click "Create Test User" to create a test user for approval testing</li>
          <li>Go to the Admin Dashboard to test the approve/reject functionality</li>
          <li>Click "Cleanup Test Users" to remove test users</li>
        </ol>
        
        <h3>Expected Results:</h3>
        <ul>
          <li>✅ Pending users should appear in the admin dashboard</li>
          <li>✅ Admin users should be able to approve/reject users</li>
          <li>✅ Security rules should allow admin operations</li>
          <li>✅ Registration should create users with 'pending' status</li>
        </ul>
      </div>
    </div>
  );
};

export default TestAdminApproval; 