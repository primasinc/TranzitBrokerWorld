import { setUserRole } from './adminService';

// Test function to set role for test user
async function testSetRole() {
  const testUserId = 'fgP6uApE2bOlsmh1MJqr8vu5onw2'; // Your test user's ID
  try {
    const result = await setUserRole(testUserId, 'shipper');
    console.log('Role set result:', result);
  } catch (error) {
    console.error('Error setting role:', error);
  }
}

// Run the test
testSetRole(); 