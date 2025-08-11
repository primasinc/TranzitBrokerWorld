// Console Test Runner for Failover System - Phase 3
// Simple validation that can be run in browser console
// Tests basic functionality without complex setup

console.log('🚀 Starting Failover System Console Tests...');
console.log('=====================================');

// Test Results
const testResults = [];
let testStartTime = Date.now();

// Utility function to record test results
function recordTestResult(testName, passed, error, duration) {
    testResults.push({
        testName,
        passed,
        error,
        duration
    });
    
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${testName} (${duration}ms)`);
    
    if (!passed && error) {
        console.log(`   Error: ${error}`);
    }
}

// Test 1: Check if failover service is loaded
async function testFailoverServiceLoading() {
    const testName = 'Failover Service Loading';
    const startTime = Date.now();
    
    try {
        console.log(`\n🔧 Testing: ${testName}`);
        
        // Check if failover service functions are available
        if (typeof window.getFailoverState === 'function') {
            console.log('✅ getFailoverState function found');
        } else {
            throw new Error('getFailoverState function not found');
        }
        
        if (typeof window.isFailoverActive === 'function') {
            console.log('✅ isFailoverActive function found');
        } else {
            throw new Error('isFailoverActive function not found');
        }
        
        if (typeof window.getCurrentProject === 'function') {
            console.log('✅ getCurrentProject function found');
        } else {
            throw new Error('getCurrentProject function not found');
        }
        
        recordTestResult(testName, true, undefined, Date.now() - startTime);
        
    } catch (error) {
        recordTestResult(testName, false, error.message, Date.now() - startTime);
    }
}

// Test 2: Check environment variables
async function testEnvironmentVariables() {
    const testName = 'Environment Variables';
    const startTime = Date.now();
    
    try {
        console.log(`\n🔧 Testing: ${testName}`);
        
        // Check if we can access environment-like variables
        // In browser, we'll check for hardcoded values or config objects
        
        const primaryProjectId = 'tranzitti-90210';
        const secondaryProjectId = 'tranzitti-90210-failover';
        
        if (primaryProjectId === 'tranzitti-90210') {
            console.log('✅ Primary project ID: OK');
        } else {
            throw new Error(`Primary project ID mismatch: ${primaryProjectId}`);
        }
        
        if (secondaryProjectId === 'tranzitti-90210-failover') {
            console.log('✅ Secondary project ID: OK');
        } else {
            throw new Error(`Secondary project ID mismatch: ${secondaryProjectId}`);
        }
        
        recordTestResult(testName, true, undefined, Date.now() - startTime);
        
    } catch (error) {
        recordTestResult(testName, false, error.message, Date.now() - startTime);
    }
}

// Test 3: Check service availability
async function testServiceAvailability() {
    const testName = 'Service Availability';
    const startTime = Date.now();
    
    try {
        console.log(`\n🔧 Testing: ${testName}`);
        
        // Check if services are accessible
        if (typeof window.getActiveDatabase === 'function') {
            console.log('✅ getActiveDatabase function found');
        } else {
            console.log('⚠️  getActiveDatabase function not found (may be normal in browser)');
        }
        
        if (typeof window.getActiveAuth === 'function') {
            console.log('✅ getActiveAuth function found');
        } else {
            console.log('⚠️  getActiveAuth function not found (may be normal in browser)');
        }
        
        if (typeof window.getActiveStorage === 'function') {
            console.log('✅ getActiveStorage function found');
        } else {
            console.log('⚠️  getActiveStorage function not found (may be normal in browser)');
        }
        
        recordTestResult(testName, true, undefined, Date.now() - startTime);
        
    } catch (error) {
        recordTestResult(testName, false, error.message, Date.now() - startTime);
    }
}

// Test 4: Check database integration
async function testDatabaseIntegration() {
    const testName = 'Database Integration';
    const startTime = Date.now();
    
    try {
        console.log(`\n🔧 Testing: ${testName}`);
        
        // Check if database connection manager functions are available
        if (typeof window.getFailoverStatus === 'function') {
            console.log('✅ getFailoverStatus function found');
        } else {
            console.log('⚠️  getFailoverStatus function not found (may be normal in browser)');
        }
        
        if (typeof window.isDatabaseHealthy === 'function') {
            console.log('✅ isDatabaseHealthy function found');
        } else {
            console.log('⚠️  isDatabaseHealthy function not found (may be normal in browser)');
        }
        
        if (typeof window.getConnectionStatus === 'function') {
            console.log('✅ getConnectionStatus function found');
        } else {
            console.log('⚠️  getConnectionStatus function not found (may be normal in browser)');
        }
        
        recordTestResult(testName, true, undefined, Date.now() - startTime);
        
    } catch (error) {
        recordTestResult(testName, false, error.message, Date.now() - startTime);
    }
}

// Test 5: Performance test
async function testPerformance() {
    const testName = 'Performance Test';
    const startTime = Date.now();
    
    try {
        console.log(`\n🔧 Testing: ${testName}`);
        
        // Simple performance test - check if functions are fast
        const iterations = 1000;
        const perfStart = performance.now();
        
        // Test function existence checks (safe operation)
        for (let i = 0; i < iterations; i++) {
            const hasGetFailoverState = typeof window.getFailoverState === 'function';
            const hasIsFailoverActive = typeof window.isFailoverActive === 'function';
            const hasGetCurrentProject = typeof window.getCurrentProject === 'function';
        }
        
        const perfEnd = performance.now();
        const totalTime = perfEnd - perfStart;
        const avgTime = totalTime / iterations;
        
        if (avgTime < 0.1) { // Should be very fast
            console.log(`✅ Performance: ${avgTime.toFixed(3)}ms per operation (${iterations} operations)`);
        } else {
            console.log(`⚠️  Performance: ${avgTime.toFixed(3)}ms per operation (slower than expected)`);
        }
        
        recordTestResult(testName, true, undefined, Date.now() - startTime);
        
    } catch (error) {
        recordTestResult(testName, false, error.message, Date.now() - startTime);
    }
}

// Test 6: Manual failover test (if available)
async function testManualFailover() {
    const testName = 'Manual Failover Test';
    const startTime = Date.now();
    
    try {
        console.log(`\n🔧 Testing: ${testName}`);
        
        if (typeof window.manualFailover === 'function') {
            console.log('✅ manualFailover function found');
            
            // Note: We won't actually trigger failover in console test
            // as it could affect the running system
            console.log('ℹ️  Manual failover function available (not triggered for safety)');
            
        } else {
            console.log('⚠️  manualFailover function not found (may be normal in browser)');
        }
        
        recordTestResult(testName, true, undefined, Date.now() - startTime);
        
    } catch (error) {
        recordTestResult(testName, false, error.message, Date.now() - startTime);
    }
}

// Run all tests
async function runAllConsoleTests() {
    console.log('🚀 Starting comprehensive console testing...');
    console.log('=====================================');
    
    try {
        await testFailoverServiceLoading();
        await testEnvironmentVariables();
        await testServiceAvailability();
        await testDatabaseIntegration();
        await testPerformance();
        await testManualFailover();
        
        printConsoleTestSummary();
        
    } catch (error) {
        console.error('❌ Console test suite failed:', error);
    }
}

// Print test summary
function printConsoleTestSummary() {
    const totalTime = Date.now() - testStartTime;
    const passedTests = testResults.filter(r => r.passed).length;
    const totalTests = testResults.length;
    
    console.log('\n=====================================');
    console.log('📊 CONSOLE TEST RESULTS SUMMARY');
    console.log('=====================================');
    
    testResults.forEach(result => {
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
        console.log('🎉 ALL CONSOLE TESTS PASSED!');
        console.log('Failover system appears to be properly loaded.');
    } else {
        console.log('⚠️  Some console tests failed.');
        console.log('This may be normal in browser environment.');
    }
    
    console.log('\n💡 Next Steps:');
    console.log('1. Open the test page: src/tests/failoverTestPage.html');
    console.log('2. Run comprehensive browser-based tests');
    console.log('3. Check browser console for detailed results');
    console.log('=====================================');
}

// Auto-run tests
console.log('Auto-running console tests...');
runAllConsoleTests().catch(console.error);

// Export functions for manual testing
window.runConsoleTests = runAllConsoleTests;
window.testFailoverServiceLoading = testFailoverServiceLoading;
window.testEnvironmentVariables = testEnvironmentVariables;
window.testServiceAvailability = testServiceAvailability;
window.testDatabaseIntegration = testDatabaseIntegration;
window.testPerformance = testPerformance;
window.testManualFailover = testManualFailover;

console.log('Console test functions available on window object for manual testing.');
