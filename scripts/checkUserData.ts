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

async function checkUserData() {
  try {
    console.log('🔍 CHECKING USER DATA FOR msmith@gmail.com...\n');
    
    // Find msmith@gmail.com in users collection
    const usersSnapshot = await db.collection('users').where('email', '==', 'msmith@gmail.com').get();
    
    if (usersSnapshot.empty) {
      console.log('❌ No user found with email msmith@gmail.com');
      return;
    }
    
    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;
    
    console.log(`✅ Found user: ${userId}`);
    console.log('📊 User Data:');
    console.log(JSON.stringify(userData, null, 2));
    
    console.log('\n🔍 Key Fields Analysis:');
    console.log(`   - Email: ${userData.email}`);
    console.log(`   - User Type: ${userData.userType}`);
    console.log(`   - Company Name: ${userData.companyName || 'NOT SET'}`);
    console.log(`   - Company Rep: ${userData.companyRep || 'NOT SET'}`);
    console.log(`   - First Name: ${userData.firstName || 'NOT SET'}`);
    console.log(`   - Last Name: ${userData.lastName || 'NOT SET'}`);
    console.log(`   - Phone: ${userData.phoneNumber || 'NOT SET'}`);
    
    // Check what fields exist
    console.log('\n📋 All Available Fields:');
    Object.keys(userData).forEach(key => {
      console.log(`   - ${key}: ${userData[key]}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking user data:', error);
    throw error;
  }
}

// Run the check
checkUserData()
  .then(() => {
    console.log('\n✅ User data check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ User data check failed:', error);
    process.exit(1);
  });
