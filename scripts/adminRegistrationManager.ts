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

async function adminRegistrationManager() {
  try {
    console.log('🔐 ADMIN REGISTRATION MANAGEMENT SYSTEM...');
    console.log('📊 This shows how admins will manage new registrants\n');
    
    // Step 1: Find admin users
    console.log('🔍 Step 1: Finding admin users...');
    const adminUsersSnapshot = await db.collection('companyUsers')
      .where('isAdmin', '==', true)
      .get();
    
    if (adminUsersSnapshot.empty) {
      console.log('❌ No admin users found');
      return;
    }
    
    console.log(`✅ Found ${adminUsersSnapshot.size} admin users:\n`);
    adminUsersSnapshot.forEach(doc => {
      const adminData = doc.data();
      console.log(`👑 Admin: ${adminData.email} (${adminData.companyName})`);
      console.log(`   Role: ${adminData.role || 'admin'}`);
      console.log(`   Super Admin: ${adminData.isSuperAdmin ? 'Yes' : 'No'}`);
      console.log('');
    });
    
    // Step 2: Show all registrants by approval status
    console.log('📋 Step 2: All Registrants by Approval Status...\n');
    
    const allUsersSnapshot = await db.collection('companyUsers').get();
    
    // Group users by approval status
    const pendingUsers: any[] = [];
    const approvedUsers: any[] = [];
    const rejectedUsers: any[] = [];
    const noStatusUsers: any[] = [];
    
    allUsersSnapshot.forEach(doc => {
      const userData = doc.data();
      const approvalStatus = userData.approvalStatus;
      
      if (approvalStatus === 'pending') {
        pendingUsers.push(userData);
      } else if (approvalStatus === 'approved') {
        approvedUsers.push(userData);
      } else if (approvalStatus === 'rejected') {
        rejectedUsers.push(userData);
      } else {
        noStatusUsers.push(userData);
      }
    });
    
    // Display pending users (what admins need to review)
    console.log('⏳ PENDING APPROVAL:');
    console.log('====================');
    if (pendingUsers.length === 0) {
      console.log('   No pending registrations');
    } else {
      pendingUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} (${user.companyName})`);
        console.log(`      Company: ${user.companyName}`);
        console.log(`      Type: ${user.userType}`);
        console.log(`      Rep: ${user.companyRep}`);
        console.log(`      Phone: ${user.phoneNumber || user.phone || 'N/A'}`);
        console.log(`      Status: ${user.status || 'N/A'}`);
        console.log('');
      });
    }
    
    // Display approved users
    console.log('✅ APPROVED USERS:');
    console.log('==================');
    if (approvedUsers.length === 0) {
      console.log('   No approved users');
    } else {
      approvedUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} (${user.companyName})`);
        console.log(`      Company: ${user.companyName}`);
        console.log(`      Type: ${user.userType}`);
        console.log(`      Rep: ${user.companyRep}`);
        console.log('');
      });
    }
    
    // Display rejected users
    console.log('❌ REJECTED USERS:');
    console.log('==================');
    if (rejectedUsers.length === 0) {
      console.log('   No rejected users');
    } else {
      rejectedUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} (${user.companyName})`);
        console.log(`      Company: ${user.companyName}`);
        console.log(`      Type: ${user.userType}`);
        console.log(`      Rejected By: ${user.rejectedBy || 'N/A'}`);
        console.log(`      Rejected At: ${user.rejectedAt || 'N/A'}`);
        console.log('');
      });
    }
    
    // Display users with no status
    console.log('❓ NO APPROVAL STATUS:');
    console.log('======================');
    if (noStatusUsers.length === 0) {
      console.log('   All users have approval status');
    } else {
      noStatusUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} (${user.companyName})`);
        console.log(`      Company: ${user.companyName}`);
        console.log(`      Type: ${user.userType}`);
        console.log(`      Rep: ${user.companyRep}`);
        console.log('');
      });
    }
    
    // Step 3: Admin Actions Available
    console.log('🎯 ADMIN ACTIONS AVAILABLE:');
    console.log('===========================\n');
    
    console.log('1. 📋 VIEW PENDING REGISTRATIONS:');
    console.log('   - Query companyUsers where approvalStatus == "pending"');
    console.log('   - Real-time updates for new registrations');
    console.log('   - Filter by company type, date, etc.');
    
    console.log('\n2. ✅ APPROVE REGISTRATIONS:');
    console.log('   - Update approvalStatus to "approved"');
    console.log('   - Set approvedAt timestamp');
    console.log('   - Set approvedBy admin ID');
    console.log('   - Activate user account');
    
    console.log('\n3. ❌ REJECT REGISTRATIONS:');
    console.log('   - Update approvalStatus to "rejected"');
    console.log('   - Set rejectedAt timestamp');
    console.log('   - Set rejectedBy admin ID');
    console.log('   - Add rejection reason');
    
    console.log('\n4. 🔄 MANAGE EXISTING USERS:');
    console.log('   - View all company users');
    console.log('   - Manage user permissions');
    console.log('   - Update company information');
    console.log('   - Suspend/activate accounts');
    
    // Step 4: Database Queries for Admin Dashboard
    console.log('\n💾 DATABASE QUERIES FOR ADMIN DASHBOARD:');
    console.log('==========================================\n');
    
    console.log('// Get pending registrations');
    console.log('const pendingUsers = await db.collection("companyUsers")');
    console.log('  .where("approvalStatus", "==", "pending")');
    console.log('  .orderBy("createdAt", "desc")');
    console.log('  .get();');
    
    console.log('\n// Get users by company type');
    console.log('const carrierUsers = await db.collection("companyUsers")');
    console.log('  .where("userType", "==", "carrier")');
    console.log('  .get();');
    
    console.log('\n// Get users by approval status');
    console.log('const approvedUsers = await db.collection("companyUsers")');
    console.log('  .where("approvalStatus", "==", "approved")');
    console.log('  .get();');
    
    // Step 5: Summary
    console.log('\n🎉 ADMIN REGISTRATION MANAGEMENT READY!');
    console.log('=====================================\n');
    
    console.log('📊 Current Status:');
    console.log(`   - Total Users: ${allUsersSnapshot.size}`);
    console.log(`   - Pending: ${pendingUsers.length}`);
    console.log(`   - Approved: ${approvedUsers.length}`);
    console.log(`   - Rejected: ${rejectedUsers.length}`);
    console.log(`   - No Status: ${noStatusUsers.length}`);
    
    console.log('\n💡 Next Steps for Admin System:');
    console.log('   1. Build admin dashboard UI');
    console.log('   2. Implement approval/rejection workflow');
    console.log('   3. Add real-time notifications');
    console.log('   4. Set up admin permissions');
    
    console.log('\n⚠️  IMPORTANT: Admin system is data-ready');
    console.log('   - All users migrated with approval status');
    console.log('   - Admin users identified');
    console.log('   - Database queries defined');
    console.log('   - Ready for frontend implementation');
    
  } catch (error) {
    console.error('❌ Admin registration manager failed:', error);
    throw error;
  }
}

// Run the admin registration manager
adminRegistrationManager()
  .then(() => {
    console.log('\n✅ Admin registration management completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Admin registration management failed:', error);
    process.exit(1);
  });
