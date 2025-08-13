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

async function cleanupPartialUsers() {
  try {
    console.log('🧹 CLEANING UP PARTIAL/INCOMPLETE USERS...\n');
    
    // Step 1: Get all users and analyze their completeness
    console.log('🔍 Step 1: Analyzing all users for completeness...');
    const usersSnapshot = await db.collection('users').get();
    
    if (usersSnapshot.empty) {
      console.log('❌ No users found');
      return;
    }
    
    console.log(`📊 Found ${usersSnapshot.size} users. Analyzing completeness...\n`);
    
    const usersToKeep: Array<{ userId: string; userData: any; score: number; reason: string }> = [];
    const usersToDelete: Array<{ userId: string; userData: any; reason: string }> = [];
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      const userId = doc.id;
      
      // Calculate completeness score
      let score = 0;
      const requiredFields = ['email', 'userType', 'companyName', 'companyRep'];
      const optionalFields = ['firstName', 'lastName', 'phoneNumber', 'address', 'city', 'state', 'zip'];
      
      requiredFields.forEach(field => {
        if (userData[field]) score += 2; // Required fields worth more
      });
      
      optionalFields.forEach(field => {
        if (userData[field]) score += 1; // Optional fields worth less
      });
      
      // Determine if user should be kept or deleted
      if (score >= 6) {
        usersToKeep.push({ userId, userData, score, reason: 'Complete user - good for migration' });
      } else {
        usersToDelete.push({ userId, userData, reason: 'Incomplete user - not suitable for migration' });
      }
      
      console.log(`👤 ${userData.email || 'No Email'} (${userId}):`);
      console.log(`   Score: ${score}/10`);
      console.log(`   Company: ${userData.companyName || 'NOT SET'}`);
      console.log(`   Rep: ${userData.companyRep || 'NOT SET'}`);
      console.log(`   Type: ${userData.userType || 'NOT SET'}`);
      console.log(`   Decision: ${score >= 6 ? 'KEEP' : 'DELETE'}`);
      console.log('');
    });
    
    // Step 2: Display summary
    console.log('📋 CLEANUP SUMMARY:');
    console.log('====================\n');
    
    console.log(`✅ Users to KEEP (${usersToKeep.length}):`);
    usersToKeep.forEach(user => {
      console.log(`   - ${user.userData.email || 'No Email'} (${user.userId})`);
      console.log(`     Score: ${user.score}/10 | ${user.reason}`);
    });
    
    console.log(`\n🗑️  Users to DELETE (${usersToDelete.length}):`);
    usersToDelete.forEach(user => {
      console.log(`   - ${user.userData.email || 'No Email'} (${user.userId})`);
      console.log(`     Score: ${user.score}/10 | ${user.reason}`);
    });
    
    // Step 3: Confirm before deletion
    console.log('\n⚠️  WARNING: This will permanently delete incomplete users!');
    console.log('   Only proceed if you are sure about the cleanup.');
    
    if (usersToDelete.length === 0) {
      console.log('\n✅ No users to delete. All users are complete!');
      return;
    }
    
    // Step 4: Delete incomplete users
    console.log('\n🗑️  Step 2: Deleting incomplete users...');
    let deletedCount = 0;
    
    for (const user of usersToDelete) {
      try {
        await db.collection('users').doc(user.userId).delete();
        console.log(`✅ Deleted: ${user.userData.email || 'No Email'} (${user.userId})`);
        deletedCount++;
      } catch (error) {
        console.error(`❌ Failed to delete ${user.userData.email || 'No Email'}:`, error);
      }
    }
    
    // Step 5: Final summary
    console.log('\n🎉 CLEANUP COMPLETED!');
    console.log('📊 Results:');
    console.log(`   - Users kept: ${usersToKeep.length}`);
    console.log(`   - Users deleted: ${deletedCount}`);
    console.log(`   - Total users after cleanup: ${usersToKeep.length}`);
    
    console.log('\n💡 Next Steps:');
    console.log('   1. Verify cleanup in Firebase Console');
    console.log('   2. Test migration with remaining users');
    console.log('   3. If successful, migrate all remaining users');
    
    console.log('\n⚠️  IMPORTANT: Only complete users remain for migration');
    console.log('   - All users have company names and rep info');
    console.log('   - All users have proper user types');
    console.log('   - Ready for full migration');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
}

// Run the cleanup
cleanupPartialUsers()
  .then(() => {
    console.log('\n✅ User cleanup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ User cleanup failed:', error);
    process.exit(1);
  });
