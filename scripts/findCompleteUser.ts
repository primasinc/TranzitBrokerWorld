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

async function findCompleteUser() {
  try {
    console.log('🔍 FINDING USER WITH COMPLETE REGISTRATION INFORMATION...\n');
    
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    
    if (usersSnapshot.empty) {
      console.log('❌ No users found');
      return;
    }
    
    console.log(`📊 Found ${usersSnapshot.size} users. Checking completeness...\n`);
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      const userId = doc.id;
      
      // Calculate completeness score
      let score = 0;
      const requiredFields = ['email', 'userType', 'companyName', 'companyRep'];
      const optionalFields = ['firstName', 'lastName', 'phoneNumber', 'address'];
      
      requiredFields.forEach(field => {
        if (userData[field]) score += 2; // Required fields worth more
      });
      
      optionalFields.forEach(field => {
        if (userData[field]) score += 1; // Optional fields worth less
      });
      
      console.log(`👤 ${userData.email || 'No Email'}:`);
      console.log(`   Score: ${score}/10`);
      console.log(`   Company: ${userData.companyName || 'NOT SET'}`);
      console.log(`   Rep: ${userData.companyRep || 'NOT SET'}`);
      console.log(`   Type: ${userData.userType || 'NOT SET'}`);
      console.log(`   Name: ${userData.firstName || 'NOT SET'} ${userData.lastName || 'NOT SET'}`);
      console.log(`   Phone: ${userData.phoneNumber || 'NOT SET'}`);
      console.log(`   User ID: ${userId}`);
      console.log('');
    });
    
    console.log('💡 Look for users with high scores (6-10) for migration.');
    console.log('   Users with company names and rep info are best candidates.');
    
  } catch (error) {
    console.error('❌ Error finding complete user:', error);
    throw error;
  }
}

// Run the search
findCompleteUser()
  .then(() => {
    console.log('\n✅ User search completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ User search failed:', error);
    process.exit(1);
  });
