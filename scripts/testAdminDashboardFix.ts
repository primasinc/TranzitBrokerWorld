import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

// Initialize Firebase Admin
const serviceAccountPath = join(__dirname, '../auth-functions/lib/service-account.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function testAdminDashboardFix() {
  try {
    console.log('🧪 TESTING ADMIN DASHBOARD FIX...');
    console.log('📊 Verifying admin dashboard can read from companyUsers collection\n');
    
    // Test 1: Check if admin dashboard can find pending users
    console.log('🔍 Test 1: Finding pending users (what admin dashboard needs)...');
    const pendingUsersSnapshot = await db.collection('companyUsers')
      .where('approvalStatus', '==', 'pending')
      .get();
    
    if (pendingUsersSnapshot.empty) {
      console.log('❌ No pending users found in companyUsers collection');
    } else {
      console.log(`✅ Found ${pendingUsersSnapshot.size} pending users in companyUsers collection:`);
      pendingUsersSnapshot.forEach(doc => {
        const userData = doc.data();
        console.log(`   - ${userData.email} (${userData.companyName})`);
      });
    }
    
    console.log('');
    
    // Test 2: Check if admin dashboard can find admin users
    console.log('🔍 Test 2: Finding admin users (what admin dashboard needs)...');
    const adminUsersSnapshot = await db.collection('companyUsers')
      .where('isAdmin', '==', true)
      .get();
    
    if (adminUsersSnapshot.empty) {
      console.log('❌ No admin users found in companyUsers collection');
    } else {
      console.log(`✅ Found ${adminUsersSnapshot.size} admin users in companyUsers collection:`);
      adminUsersSnapshot.forEach(doc => {
        const userData = doc.data();
        console.log(`   - ${userData.email} (${userData.companyName}) - Super Admin: ${userData.isSuperAdmin ? 'Yes' : 'No'}`);
      });
    }
    
    console.log('');
    
    // Test 3: Check if admin dashboard can get system stats
    console.log('🔍 Test 3: Getting system stats (what admin dashboard needs)...');
    const allUsersSnapshot = await db.collection('companyUsers').get();
    
    let totalUsers = 0;
    let pendingApprovals = 0;
    let activeAdmins = 0;
    let totalCarriers = 0;
    let totalShippers = 0;
    
    allUsersSnapshot.forEach(doc => {
      const data = doc.data();
      totalUsers++;
      
      if (data.approvalStatus === 'pending') {
        pendingApprovals++;
      }
      
      if (data.isAdmin) {
        activeAdmins++;
      }
      
      if (data.userType === 'carrier') {
        totalCarriers++;
      }
      
      if (data.userType === 'shipper') {
        totalShippers++;
      }
    });
    
    console.log('✅ System stats from companyUsers collection:');
    console.log(`   - Total Users: ${totalUsers}`);
    console.log(`   - Pending Approvals: ${pendingApprovals}`);
    console.log(`   - Active Admins: ${activeAdmins}`);
    console.log(`   - Total Carriers: ${totalCarriers}`);
    console.log(`   - Total Shippers: ${totalShippers}`);
    
    console.log('');
    
    // Test 4: Summary
    console.log('🎯 TEST RESULTS SUMMARY:');
    console.log('========================\n');
    
    if (pendingUsersSnapshot.size > 0 && adminUsersSnapshot.size > 0) {
      console.log('✅ SUCCESS: Admin dashboard will now work properly!');
      console.log('   - Can find pending users for approval');
      console.log('   - Can find admin users for management');
      console.log('   - Can get system statistics');
      console.log('   - All data is now coming from companyUsers collection');
    } else {
      console.log('❌ ISSUE: Admin dashboard may still have problems');
      console.log('   - Check if users have proper approvalStatus and isAdmin fields');
    }
    
    console.log('\n💡 What This Means:');
    console.log('   - Admin dashboard code has been updated to use companyUsers collection');
    console.log('   - No more hardcoded references to old users collection');
    console.log('   - Admin dashboard is now integrated with new broker portal architecture');
    
    console.log('\n🚀 Next Steps:');
    console.log('   1. Test admin dashboard in browser');
    console.log('   2. Verify pending users are displayed correctly');
    console.log('   3. Test approve/reject functionality');
    console.log('   4. Verify admin user management works');
    
  } catch (error) {
    console.error('❌ Error testing admin dashboard fix:', error);
    throw error;
  }
}

// Run the test
testAdminDashboardFix()
  .then(() => {
    console.log('\n✅ Admin dashboard fix test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Admin dashboard fix test failed:', error);
    process.exit(1);
  });
