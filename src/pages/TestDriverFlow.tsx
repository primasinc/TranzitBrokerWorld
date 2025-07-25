import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { testDriverRegistrationFlow, testCompanyLoads } from '../utils/testDriverFlow';

const TestDriverFlow: React.FC = () => {
  const { user } = useAuth();
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runTest = async () => {
    if (!user?.uid) {
      setTestResult({
        success: false,
        message: 'No user logged in'
      });
      return;
    }

    setLoading(true);
    try {
      const result = await testDriverRegistrationFlow(user.uid);
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: `Test failed: ${error}`
      });
    } finally {
      setLoading(false);
    }
  };

  const runCompanyLoadsTest = async () => {
    if (!user?.uid) {
      setTestResult({
        success: false,
        message: 'No user logged in'
      });
      return;
    }

    setLoading(true);
    try {
      const result = await testCompanyLoads(user.uid);
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: `Company loads test failed: ${error}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Phase 3: Driver Registration Flow Test</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Test Instructions:</h2>
        <ol>
          <li>Log in as a company owner</li>
          <li>Go to Settings → Security → Additional Drivers</li>
          <li>Invite a driver with a new email</li>
          <li>Check the email and click the invite link</li>
          <li>Register the driver account</li>
          <li>Log in as the driver and verify the portal shows company name</li>
          <li>Run this test to verify the flow worked correctly</li>
        </ol>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={runTest}
          disabled={loading}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Running Test...' : 'Test Driver Registration Flow'}
        </button>

        <button 
          onClick={runCompanyLoadsTest}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          Test Company Loads
        </button>
      </div>

      {testResult && (
        <div style={{
          padding: '15px',
          borderRadius: '4px',
          backgroundColor: testResult.success ? '#d4edda' : '#f8d7da',
          border: `1px solid ${testResult.success ? '#c3e6cb' : '#f5c6cb'}`,
          color: testResult.success ? '#155724' : '#721c24'
        }}>
          <h3>Test Result:</h3>
          <p><strong>Status:</strong> {testResult.success ? '✅ PASSED' : '❌ FAILED'}</p>
          <p><strong>Message:</strong> {testResult.message}</p>
          {testResult.details && (
            <div>
              <h4>Details:</h4>
              <pre style={{ backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px' }}>
                {JSON.stringify(testResult.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <h3>Phase 3 Implementation Status:</h3>
        <ul>
          <li>✅ Company owner can invite drivers</li>
          <li>✅ Email sending works with Gmail API</li>
          <li>✅ Driver registration attaches to parent company</li>
          <li>✅ Portal shows company name (not "Company - Driver Name")</li>
          <li>✅ Driver accounts show "Driver Account" label</li>
          <li>✅ Loads query updated to show company loads</li>
          <li>✅ Role-based permissions implemented</li>
          <li>✅ Complete flow from invite to driver registration</li>
        </ul>
      </div>
    </div>
  );
};

export default TestDriverFlow; 