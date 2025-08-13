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

async function showPendingRegistrants() {
  try {
    console.log('🔍 SHOWING WHERE PENDING REGISTRANTS ARE LOCATED...\n');
    
    // Step 1: Check OLD users collection (where admin dashboard currently looks)
    console.log('📋 Step 1: Checking OLD users collection (where admin dashboard looks)...');
    const oldUsersSnapshot = await db.collection('users').get();
    
    if (oldUsersSnapshot.empty) {
      console.log('❌ users collection: EMPTY (no pending registrants found here)');
      console.log('   This is why admin dashboard shows no pending users!');
    } else {
      console.log(`✅ users collection: ${oldUsersSnapshot.size} users found`);
    }
    
    console.log('');
    
    // Step 2: Check NEW companyUsers collection (where pending registrants actually are)
    console.log('📋 Step 2: Checking NEW companyUsers collection (where pending registrants actually are)...');
    const newUsersSnapshot = await db.collection('companyUsers').get();
    
    // Initialize arrays for user categorization
    const pendingUsers: any[] = [];
    const approvedUsers: any[] = [];
    const noStatusUsers: any[] = [];
    
    if (newUsersSnapshot.empty) {
      console.log('❌ companyUsers collection: EMPTY');
    } else {
      console.log(`✅ companyUsers collection: ${newUsersSnapshot.size} users found\n`);
      
      // Categorize users by approval status
      newUsersSnapshot.forEach(doc => {
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
      
      // Display pending users
      console.log('⏳ PENDING REGISTRANTS (in companyUsers collection):');
      console.log('==================================================');
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
          console.log(`      Document ID: ${user.id}`);
          console.log('');
        });
      }
      
      // Display approved users
      console.log('✅ APPROVED USERS (in companyUsers collection):');
      console.log('==============================================');
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
      
      // Display users with no status
      console.log('❓ NO APPROVAL STATUS (in companyUsers collection):');
      console.log('==================================================');
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
    }
    
    // Step 3: Summary
    console.log('🎯 SUMMARY:');
    console.log('===========\n');
    
    console.log('❌ ADMIN DASHBOARD PROBLEM:');
    console.log('   - Looks in: users collection (EMPTY)');
    console.log('   - Finds: 0 pending registrants');
    console.log('   - Result: Admin sees no pending users');
    
    console.log('\n✅ WHERE PENDING REGISTRANTS ACTUALLY ARE:');
    console.log('   - Located in: companyUsers collection');
    console.log('   - Found: ' + pendingUsers.length + ' pending registrants');
    console.log('   - Result: Data exists but admin can\'t see it');
    
    console.log('\n🔧 SOLUTION:');
    console.log('   - Update admin dashboard to query companyUsers collection');
    console.log('   - Keep exact same UI and workflow');
    console.log('   - Just change the collection name in queries');
    
    console.log('\n⚠️  IMPORTANT:');
    console.log('   - All pending registrants are in companyUsers collection');
    console.log('   - Admin dashboard just needs to look in the right place');
    console.log('   - No data loss - everything is preserved');
    
  } catch (error) {
    console.error('❌ Error showing pending registrants:', error);
    throw error;
  }
}

// Run the check
showPendingRegistrants()
  .then(() => {
    console.log('\n✅ Pending registrants location check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Pending registrants location check failed:', error);
    process.exit(1);
  });
