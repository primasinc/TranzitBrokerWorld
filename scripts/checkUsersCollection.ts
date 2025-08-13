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

async function checkUsersCollection() {
  try {
    console.log('🔍 CHECKING WHAT\'S ACTUALLY IN THE USERS COLLECTION...\n');
    
    // Check users collection
    const usersSnapshot = await db.collection('users').get();
    
    if (usersSnapshot.empty) {
      console.log('❌ users collection: EMPTY');
      return;
    }
    
    console.log(`✅ users collection: ${usersSnapshot.size} users found\n`);
    
    // Check each user's approval status
    const pendingUsers: any[] = [];
    const approvedUsers: any[] = [];
    const noStatusUsers: any[] = [];
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      const approvalStatus = userData.approvalStatus;
      
      if (approvalStatus === 'pending') {
        pendingUsers.push({ id: doc.id, ...userData });
      } else if (approvalStatus === 'approved') {
        approvedUsers.push({ id: doc.id, ...userData });
      } else {
        noStatusUsers.push({ id: doc.id, ...userData });
      }
    });
    
    // Display pending users in users collection
    console.log('⏳ PENDING USERS (in users collection):');
    console.log('=======================================');
    if (pendingUsers.length === 0) {
      console.log('   No pending users found');
    } else {
      pendingUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} (${user.companyName})`);
        console.log(`      Company: ${user.companyName}`);
        console.log(`      Type: ${user.userType}`);
        console.log(`      Rep: ${user.companyRep}`);
        console.log(`      Phone: ${user.phoneNumber || user.phone || 'N/A'}`);
        console.log(`      Status: ${user.status || 'N/A'}`);
        console.log(`      Document ID: ${user.id}`);
        console.log('');
      });
    }
    
    // Display approved users in users collection
    console.log('✅ APPROVED USERS (in users collection):');
    console.log('=======================================');
    if (approvedUsers.length === 0) {
      console.log('   No approved users found');
    } else {
      approvedUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} (${user.companyName})`);
        console.log(`      Company: ${user.companyName}`);
        console.log(`      Type: ${user.userType}`);
        console.log(`      Rep: ${user.companyRep}`);
        console.log('');
      });
    }
    
    // Display users with no status in users collection
    console.log('❓ NO APPROVAL STATUS (in users collection):');
    console.log('============================================');
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
    
    // Summary
    console.log('🎯 SUMMARY:');
    console.log('===========\n');
    
    console.log('📊 Users Collection Status:');
    console.log(`   - Total users: ${usersSnapshot.size}`);
    console.log(`   - Pending: ${pendingUsers.length}`);
    console.log(`   - Approved: ${approvedUsers.length}`);
    console.log(`   - No Status: ${noStatusUsers.length}`);
    
    console.log('\n💡 What This Means:');
    if (pendingUsers.length > 0) {
      console.log('   ✅ Admin dashboard IS working because users collection still has pending users');
      console.log('   ⚠️  But it\'s using OLD data structure, not the new companyUsers collection');
      console.log('   🔄 This explains why you see pending registrants in the UI');
    } else {
      console.log('   ❌ Admin dashboard would NOT work - no pending users in users collection');
    }
    
    console.log('\n⚠️  IMPORTANT:');
    console.log('   - Migration copied users to companyUsers but didn\'t delete from users');
    console.log('   - Admin dashboard still reads from users collection (old architecture)');
    console.log('   - UI works but isn\'t using the new broker portal structure');
    
  } catch (error) {
    console.error('❌ Error checking users collection:', error);
    throw error;
  }
}

// Run the check
checkUsersCollection()
  .then(() => {
    console.log('\n✅ Users collection check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Users collection check failed:', error);
    process.exit(1);
  });
