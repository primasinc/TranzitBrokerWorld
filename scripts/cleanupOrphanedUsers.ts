import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import serviceAccount from '../auth-functions/lib/service-account.json';

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert(serviceAccount as any)
});

const db = getFirestore(app);
const auth = getAuth(app);

async function cleanupOrphanedUsers() {
  try {
    console.log('🧹 Cleaning up orphaned users...\n');

    // Get all Firebase Auth users
    const listUsersResult = await auth.listUsers();
    console.log(`📊 Found ${listUsersResult.users.length} Firebase Auth users`);

    let orphanedCount = 0;
    let cleanedCount = 0;

    for (const userRecord of listUsersResult.users) {
      try {
        // Check if user exists in companyUsers collection
        const companyUserDoc = await db.collection('companyUsers').doc(userRecord.uid).get();
        
        // Check if user exists in users collection
        const userDoc = await db.collection('users').doc(userRecord.uid).get();

        if (!companyUserDoc.exists && !userDoc.exists) {
          console.log(`🚨 Orphaned user found: ${userRecord.email} (${userRecord.uid})`);
          orphanedCount++;

          // Check if user was created recently (within last hour)
          const userCreationTime = userRecord.metadata.creationTime;
          const creationDate = new Date(userCreationTime);
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

          if (creationDate > oneHourAgo) {
            console.log(`   ⏰ User created recently (${creationDate.toISOString()}) - likely failed registration`);
            
            // Ask for confirmation before deletion
            console.log(`   ❓ Delete orphaned user ${userRecord.email}? (y/n)`);
            
            // For now, just log - you can manually delete if needed
            console.log(`   💡 To delete manually: Use Firebase Console > Authentication > Users > Find ${userRecord.email} > Delete`);
          } else {
            console.log(`   ⏰ User created ${creationDate.toISOString()} - may be legitimate`);
          }
        } else {
          if (companyUserDoc.exists) {
            const data = companyUserDoc.data();
            console.log(`✅ User ${userRecord.email} found in companyUsers collection with status: ${data?.approvalStatus || 'N/A'}`);
          }
          if (userDoc.exists) {
            const data = userDoc.data();
            console.log(`✅ User ${userRecord.email} found in users collection with status: ${data?.approvalStatus || 'N/A'}`);
          }
        }
      } catch (error) {
        console.error(`❌ Error checking user ${userRecord.uid}:`, error);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total Firebase Auth users: ${listUsersResult.users.length}`);
    console.log(`   Orphaned users found: ${orphanedCount}`);
    console.log(`   Users with Firestore data: ${listUsersResult.users.length - orphanedCount}`);

    if (orphanedCount > 0) {
      console.log(`\n🔧 To clean up orphaned users:`);
      console.log(`   1. Go to Firebase Console > Authentication > Users`);
      console.log(`   2. Find users without corresponding Firestore data`);
      console.log(`   3. Delete them manually`);
      console.log(`   4. Or run this script with deletion enabled`);
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    process.exit(0);
  }
}

cleanupOrphanedUsers();
