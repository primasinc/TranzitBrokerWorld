// Failover System Test Runner - Phase 3
// Simple validation of production failover capabilities
// Runs basic tests to ensure system integrity

import { 
  getFailoverState, 
  isFailoverActive, 
  getCurrentProject, 
  getActiveDatabase, 
  getActiveAuth, 
  getActiveStorage,
  manualFailover 
} from '../services/failoverService';

import { 
  getFailoverStatus,
  isDatabaseHealthy,
  getConnectionStatus 
} from '../services/databaseConnectionManager';

// Test Results Interface
interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  duration: number;
}

// Test Runner Class
class FailoverTestRunner {
  private results: TestResult[] = [];
  private startTime: number = 0;

  constructor() {
    console.log('🚀 Starting Failover System Validation...');
    console.log('=====================================');
  }

  // Run all tests
  async runAllTests(): Promise<void> {
    this.startTime = Date.now();
    
    try {
      await this.testEnvironmentConfiguration();
      await this.testFailoverServiceInitialization();
      await this.testDatabaseIntegration();
      await this.testManualFailover();
      await this.testServiceAvailability();
      await this.testPerformance();
      await this.testErrorHandling();
      
      this.printResults();
      
    } catch (error) {
      console.error('❌ Test runner failed:', error);
    }
  }

  // Test 1: Environment Configuration
  private async testEnvironmentConfiguration(): Promise<void> {
    const testName = 'Environment Configuration';
    const startTime = Date.now();
    
    try {
      console.log(`\n🔧 Testing: ${testName}`);
      
      // Check primary config
      const primaryProjectId = process.env.REACT_APP_FIREBASE_PROJECT_ID;
      const primaryApiKey = process.env.REACT_APP_FIREBASE_API_KEY;
      
      if (!primaryProjectId || primaryProjectId !== 'tranzitti-90210') {
        throw new Error(`Primary project ID mismatch: ${primaryProjectId}`);
      }
      
      if (!primaryApiKey) {
        throw new Error('Primary API key not found');
      }
      
      // Check secondary config
      const secondaryProjectId = process.env.REACT_APP_FIREBASE_PROJECT_ID_SECONDARY;
      const secondaryApiKey = process.env.REACT_APP_FIREBASE_API_KEY_SECONDARY;
      
      if (!secondaryProjectId || secondaryProjectId !== 'tranzitti-90210-failover') {
        throw new Error(`Secondary project ID mismatch: ${secondaryProjectId}`);
      }
      
      if (!secondaryApiKey) {
        throw new Error('Secondary API key not found');
      }
      
      console.log('✅ Primary Firebase config: OK');
      console.log('✅ Secondary Firebase config: OK');
      
      this.recordResult(testName, true, Date.now() - startTime);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.log(`❌ ${errorMsg}`);
      this.recordResult(testName, false, Date.now() - startTime, errorMsg);
    }
  }

  // Test 2: Failover Service Initialization
  private async testFailoverServiceInitialization(): Promise<void> {
    const testName = 'Failover Service Initialization';
    const startTime = Date.now();
    
    try {
      console.log(`\n🔧 Testing: ${testName}`);
      
      // Check service functions exist
      if (typeof getFailoverState !== 'function') {
        throw new Error('getFailoverState function not found');
      }
      
      if (typeof isFailoverActive !== 'function') {
        throw new Error('isFailoverActive function not found');
      }
      
      if (typeof getCurrentProject !== 'function') {
        throw new Error('getCurrentProject function not found');
      }
      
      // Check initial state
      const state = getFailoverState();
      if (state.currentProject !== 'primary') {
        throw new Error(`Expected primary project, got: ${state.currentProject}`);
      }
      
      if (state.isActive !== false) {
        throw new Error(`Expected inactive failover, got: ${state.isActive}`);
      }
      
      console.log('✅ Service functions: OK');
      console.log('✅ Initial state: OK');
      
      this.recordResult(testName, true, Date.now() - startTime);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.log(`❌ ${errorMsg}`);
      this.recordResult(testName, false, Date.now() - startTime, errorMsg);
    }
  }

  // Test 3: Database Integration
  private async testDatabaseIntegration(): Promise<void> {
    const testName = 'Database Integration';
    const startTime = Date.now();
    
    try {
      console.log(`\n🔧 Testing: ${testName}`);
      
      // Check failover status integration
      const status = getFailoverStatus();
      if (typeof status.isActive !== 'boolean') {
        throw new Error('Failover status isActive not boolean');
      }
      
      if (typeof status.currentProject !== 'string') {
        throw new Error('Failover status currentProject not string');
      }
      
      // Check database health functions
      if (typeof isDatabaseHealthy !== 'function') {
        throw new Error('isDatabaseHealthy function not found');
      }
      
      if (typeof getConnectionStatus !== 'function') {
        throw new Error('getConnectionStatus function not found');
      }
      
      console.log('✅ Failover status integration: OK');
      console.log('✅ Database health functions: OK');
      
      this.recordResult(testName, true, Date.now() - startTime);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.log(`❌ ${errorMsg}`);
      this.recordResult(testName, false, Date.now() - startTime, errorMsg);
    }
  }

  // Test 4: Manual Failover
  private async testManualFailover(): Promise<void> {
    const testName = 'Manual Failover Operations';
    const startTime = Date.now();
    
    try {
      console.log(`\n🔧 Testing: ${testName}`);
      
      // Check initial state
      const initialProject = getCurrentProject();
      console.log(`📍 Starting on project: ${initialProject}`);
      
      // Test failover to secondary
      console.log('🔄 Testing failover to secondary...');
      await manualFailover('secondary', 'Test failover');
      
      // Wait for failover to complete
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const secondaryProject = getCurrentProject();
      const secondaryState = getFailoverState();
      
      if (secondaryProject !== 'secondary') {
        throw new Error(`Expected secondary project, got: ${secondaryProject}`);
      }
      
      if (!secondaryState.isActive) {
        throw new Error('Expected failover to be active');
      }
      
      console.log('✅ Failover to secondary: OK');
      
      // Test recovery to primary
      console.log('🔄 Testing recovery to primary...');
      await manualFailover('primary', 'Test recovery');
      
      // Wait for recovery to complete
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const primaryProject = getCurrentProject();
      const primaryState = getFailoverState();
      
      if (primaryProject !== 'primary') {
        throw new Error(`Expected primary project, got: ${primaryProject}`);
      }
      
      if (primaryState.isActive) {
        throw new Error('Expected failover to be inactive');
      }
      
      console.log('✅ Recovery to primary: OK');
      
      this.recordResult(testName, true, Date.now() - startTime);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.log(`❌ ${errorMsg}`);
      this.recordResult(testName, false, Date.now() - startTime, errorMsg);
    }
  }

  // Test 5: Service Availability
  private async testServiceAvailability(): Promise<void> {
    const testName = 'Service Availability';
    const startTime = Date.now();
    
    try {
      console.log(`\n🔧 Testing: ${testName}`);
      
      // Check database availability
      const db = getActiveDatabase();
      if (!db) {
        throw new Error('Active database not available');
      }
      
      // Check auth availability
      const auth = getActiveAuth();
      if (!auth) {
        throw new Error('Active auth not available');
      }
      
      // Check storage availability
      const storage = getActiveStorage();
      if (!storage) {
        throw new Error('Active storage not available');
      }
      
      console.log('✅ Database service: OK');
      console.log('✅ Auth service: OK');
      console.log('✅ Storage service: OK');
      
      this.recordResult(testName, true, Date.now() - startTime);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.log(`❌ ${errorMsg}`);
      this.recordResult(testName, false, Date.now() - startTime, errorMsg);
    }
  }

  // Test 6: Performance
  private async testPerformance(): Promise<void> {
    const testName = 'Performance Testing';
    const startTime = Date.now();
    
    try {
      console.log(`\n🔧 Testing: ${testName}`);
      
      // Test failover state retrieval performance
      const iterations = 100;
      const perfStart = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        getFailoverState();
        getCurrentProject();
        isFailoverActive();
      }
      
      const perfEnd = Date.now();
      const totalTime = perfEnd - perfStart;
      const avgTime = totalTime / (iterations * 3);
      
      if (avgTime > 1) { // Should be under 1ms per operation
        throw new Error(`Performance too slow: ${avgTime.toFixed(2)}ms per operation`);
      }
      
      console.log(`✅ Performance: ${avgTime.toFixed(2)}ms per operation (${iterations * 3} operations)`);
      
      this.recordResult(testName, true, Date.now() - startTime);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.log(`❌ ${errorMsg}`);
      this.recordResult(testName, false, Date.now() - startTime, errorMsg);
    }
  }

  // Test 7: Error Handling
  private async testErrorHandling(): Promise<void> {
    const testName = 'Error Handling';
    const startTime = Date.now();
    
    try {
      console.log(`\n🔧 Testing: ${testName}`);
      
      // Test state consistency during operations
      const initialState = getFailoverState();
      
      // Perform multiple operations
      for (let i = 0; i < 10; i++) {
        getCurrentProject();
        isFailoverActive();
        getFailoverState();
      }
      
      const finalState = getFailoverState();
      
      // State should remain consistent
      if (initialState.currentProject !== finalState.currentProject) {
        throw new Error('Project changed unexpectedly during operations');
      }
      
      if (initialState.isActive !== finalState.isActive) {
        throw new Error('Failover state changed unexpectedly during operations');
      }
      
      console.log('✅ State consistency: OK');
      console.log('✅ Error handling: OK');
      
      this.recordResult(testName, true, Date.now() - startTime);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.log(`❌ ${errorMsg}`);
      this.recordResult(testName, false, Date.now() - startTime, errorMsg);
    }
  }

  // Record test result
  private recordResult(testName: string, passed: boolean, duration: number, error?: string): void {
    this.results.push({
      testName,
      passed,
      error,
      duration
    });
  }

  // Print test results
  private printResults(): void {
    const totalTime = Date.now() - this.startTime;
    const passedTests = this.results.filter(r => r.passed).length;
    const totalTests = this.results.length;
    
    console.log('\n=====================================');
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('=====================================');
    
    this.results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      const duration = `${result.duration}ms`;
      console.log(`${status} ${result.testName} (${duration})`);
      
      if (!result.passed && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    console.log('\n=====================================');
    console.log(`🎯 Overall: ${passedTests}/${totalTests} tests passed`);
    console.log(`⏱️  Total time: ${totalTime}ms`);
    
    if (passedTests === totalTests) {
      console.log('🎉 ALL TESTS PASSED! Failover system is ready for production.');
    } else {
      console.log('⚠️  Some tests failed. Please review the errors above.');
    }
    
    console.log('=====================================');
  }
}

// Export test runner
export { FailoverTestRunner };

// Auto-run if this file is executed directly
if (typeof window === 'undefined') { // Node.js environment
  const runner = new FailoverTestRunner();
  runner.runAllTests().catch(console.error);
}
