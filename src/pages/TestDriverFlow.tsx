import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { testDriverRegistrationFlow, testCompanyLoads } from '../utils/testDriverFlow';
import { useMonitoring } from '../hooks/useMonitoring';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { useCache } from '../hooks/useCache';
import { useRateLimit } from '../hooks/useRateLimit';
import { 
  usePerformanceOptimization
} from '../hooks/usePerformanceOptimization';

const TestDriverFlow: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { monitorAsyncOperation, monitorUserAction, getMonitoringData } = useMonitoring();
  const { isEnabled } = useFeatureFlags();
  const { setUserData, getUserData, stats: cacheStats } = useCache();
  const { checkLimit, getUserStatus, userTier } = useRateLimit();
  
  // Phase 5: Performance Optimization Hooks
  const { 
    metrics: performanceConfig, 
    getPerformanceScore: renderCount,
    executeQuery: monitorApiCall
  } = usePerformanceOptimization();
  
  // Mock functions for now - will be implemented in Phase 2
  const startInteraction = (name: string) => console.log(`Started interaction: ${name}`);
  const endInteraction = (name: string) => console.log(`Ended interaction: ${name}`);
  
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [monitoringData, setMonitoringData] = useState<any>(null);

  const runTest = async () => {
    if (!user?.uid) {
      setTestResult({
        success: false,
        message: 'No user logged in'
      });
      return;
    }

    setLoading(true);
    monitorUserAction('test_driver_flow_started');
    
    try {
      const result = await monitorAsyncOperation('test_driver_registration_flow', () => 
        testDriverRegistrationFlow(user.uid)
      );
      setTestResult(result);
      monitorUserAction('test_driver_flow_completed', { success: true });
    } catch (error) {
      setTestResult({
        success: false,
        message: `Test failed: ${error}`
      });
      monitorUserAction('test_driver_flow_completed', { success: false, error: error });
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
    monitorUserAction('test_company_loads_started');
    
    try {
      const result = await monitorAsyncOperation('test_company_loads', () => 
        testCompanyLoads(user.uid)
      );
      setTestResult(result);
      monitorUserAction('test_company_loads_completed', { success: true });
    } catch (error) {
      setTestResult({
        success: false,
        message: `Company loads test failed: ${error}`
      });
      monitorUserAction('test_company_loads_completed', { success: false, error: error });
    } finally {
      setLoading(false);
    }
  };

  const checkMonitoringData = () => {
    const data = getMonitoringData();
    setMonitoringData(data);
  };

  return (
    <div style={{ 
      padding: '30px', 
      maxWidth: '1200px', 
      margin: '0 auto',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '30px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        marginBottom: '30px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ 
            margin: 0,
            color: '#333',
            fontSize: '28px',
            fontWeight: '600'
          }}>
            Driver Registration Flow Test
          </h1>
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
        
        <div style={{ 
          backgroundColor: '#e3f2fd', 
          padding: '20px', 
          borderRadius: '8px',
          border: '1px solid #bbdefb',
          marginBottom: '30px'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#1976d2' }}>Test Instructions:</h3>
          <ol style={{ margin: 0, paddingLeft: '20px', color: '#424242' }}>
            <li>Log in as a shipper or carrier</li>
            <li>Go to Settings → Security → Additional Drivers</li>
            <li>Invite a driver with a new email</li>
            <li>Check the email and click the invite link</li>
            <li>Register the driver account</li>
            <li>Log in as the driver and verify the portal shows company name</li>
            <li>Run this test to verify the flow worked correctly</li>
          </ol>
        </div>
      </div>

      {/* Test Categories */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '30px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        marginBottom: '30px'
      }}>
        <h2 style={{ 
          margin: '0 0 25px 0',
          color: '#333',
          fontSize: '24px',
          fontWeight: '600',
          borderBottom: '2px solid #e9ecef',
          paddingBottom: '10px'
        }}>
          System Tests
        </h2>

        {/* Core Functionality Tests */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ 
            margin: '0 0 15px 0',
            color: '#495057',
            fontSize: '18px',
            fontWeight: '500'
          }}>
            Core Functionality
          </h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button 
              onClick={runTest}
              disabled={loading}
              style={{
                padding: '12px 20px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                opacity: loading ? 0.6 : 1
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#0056b3')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#007bff')}
            >
              {loading ? 'Running Test...' : '🚛 Test Driver Registration Flow'}
            </button>

            <button 
              onClick={runCompanyLoadsTest}
              disabled={loading}
              style={{
                padding: '12px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                opacity: loading ? 0.6 : 1
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#1e7e34')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#28a745')}
            >
              📦 Test Company Loads
            </button>
          </div>
        </div>

        {/* System Monitoring Tests */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ 
            margin: '0 0 15px 0',
            color: '#495057',
            fontSize: '18px',
            fontWeight: '500'
          }}>
            System Monitoring
          </h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button 
              onClick={checkMonitoringData}
              style={{
                padding: '12px 20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
                             onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#545b62'}
               onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6c757d'}
            >
              📊 Check Monitoring Data
            </button>

            <button 
              onClick={() => alert(`Enhanced Load Matching: ${isEnabled('enhancedLoadMatching') ? 'Enabled' : 'Disabled'}`)}
              style={{
                padding: '12px 20px',
                backgroundColor: '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
                             onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#138496'}
               onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#17a2b8'}
            >
              🚩 Test Feature Flag
            </button>
          </div>
        </div>

        {/* Performance & Optimization Tests */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ 
            margin: '0 0 15px 0',
            color: '#495057',
            fontSize: '18px',
            fontWeight: '500'
          }}>
            Performance & Optimization
          </h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => {
                if (user?.uid) {
                  setUserData(user.uid, { testData: 'cached', timestamp: Date.now() });
                  alert('User data cached! Check /admin/cache to see it.');
                }
              }}
              style={{
                padding: '12px 20px',
                backgroundColor: '#ffc107',
                color: '#212529',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
                             onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e0a800'}
               onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffc107'}
            >
              💾 Test Cache
            </button>

            <button 
              onClick={async () => {
                const result = await checkLimit(
                  { endpoint: 'test/rate-limit', retryAttempts: 1 },
                  () => Promise.resolve('Rate limit test successful!')
                );
                alert(`Rate Limit Test: ${result.success ? 'PASSED' : 'BLOCKED'}\nUser Tier: ${userTier}\nCheck /admin/rate-limits for details.`);
              }}
              style={{
                padding: '12px 20px',
                backgroundColor: '#fd7e14',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
                             onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e8690b'}
               onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fd7e14'}
            >
              ⚡ Test Rate Limit
            </button>

            <button 
              onClick={async () => {
                startInteraction('performance_test');
                const result = await monitorApiCall(
                  () => new Promise(resolve => setTimeout(() => resolve('Performance test completed!'), 1000)),
                  'test/performance'
                );
                endInteraction('performance_test');
                alert(`Performance Test: ${result}\nComponent renders: ${renderCount()}\nCheck /admin/advanced-performance for details.`);
              }}
              style={{
                padding: '12px 20px',
                backgroundColor: '#6f42c1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
                             onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5a32a3'}
               onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6f42c1'}
            >
              🚀 Test Performance
            </button>
          </div>
        </div>
      </div>

      {/* Test Results */}
      {testResult && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '25px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          marginBottom: '30px',
          border: `2px solid ${testResult.success ? '#d4edda' : '#f8d7da'}`
        }}>
          <h3 style={{ 
            margin: '0 0 15px 0',
            color: testResult.success ? '#155724' : '#721c24'
          }}>
            Test Result:
          </h3>
          <p style={{ margin: '0 0 10px 0' }}>
            <strong>Status:</strong> {testResult.success ? '✅ PASSED' : '❌ FAILED'}
          </p>
          <p style={{ margin: '0 0 15px 0' }}>
            <strong>Message:</strong> {testResult.message}
          </p>
          {testResult.details && (
            <div>
              <h4 style={{ margin: '0 0 10px 0' }}>Details:</h4>
              <pre style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '15px', 
                borderRadius: '8px',
                overflow: 'auto',
                fontSize: '12px',
                border: '1px solid #e9ecef'
              }}>
                {JSON.stringify(testResult.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Monitoring Data */}
      {monitoringData && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '25px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          marginBottom: '30px',
          border: '2px solid #e3f2fd'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#1976d2' }}>Monitoring Data:</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <strong>Total Operations:</strong> {monitoringData.summary.totalOperations}
            </div>
            <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <strong>Success Rate:</strong> {monitoringData.summary.totalOperations > 0 
                ? `${((monitoringData.summary.successfulOperations / monitoringData.summary.totalOperations) * 100).toFixed(1)}%`
                : '0%'}
            </div>
            <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <strong>Avg Response Time:</strong> {monitoringData.summary.averageResponseTime.toFixed(2)}ms
            </div>
            <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <strong>Total Errors:</strong> {monitoringData.summary.totalErrors}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestDriverFlow; 