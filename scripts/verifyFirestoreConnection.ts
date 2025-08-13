import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

// Initialize Firebase Admin
const serviceAccountPath = join(__dirname, '../auth-functions/lib/service-account.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

console.log('🔍 VERIFYING FIRESTORE CONNECTION...');
console.log('📁 Service Account Path:', serviceAccountPath);
console.log('🏢 Project ID:', serviceAccount.project_id);
console.log('📧 Client Email:', serviceAccount.client_email);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function verifyConnection() {
  try {
    console.log('\n🚀 Testing Firestore connection...');
    
    // Test 1: List all collections
    console.log('\n📊 Step 1: Listing all collections...');
    const collections = await db.listCollections();
    console.log(`✅ Found ${collections.length} collections:`);
    
    collections.forEach(collection => {
      console.log(`   - ${collection.id}`);
    });
    
    // Test 2: Check if our new collections exist
    console.log('\n🔍 Step 2: Checking for new collections...');
    const expectedCollections = ['userTypes', 'companies', 'companyUsers', 'loadVisibilityRules'];
    
    for (const collectionName of expectedCollections) {
      try {
        const collectionRef = db.collection(collectionName);
        const snapshot = await collectionRef.limit(1).get();
        console.log(`   ✅ ${collectionName}: EXISTS (${snapshot.size} documents)`);
        
        // Show first document if exists
        if (!snapshot.empty) {
          const firstDoc = snapshot.docs[0];
          console.log(`      First document: ${firstDoc.id}`);
        }
      } catch (error) {
        console.log(`   ❌ ${collectionName}: ERROR - ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // Test 3: Check users collection (existing)
    console.log('\n👥 Step 3: Checking existing users collection...');
    const usersSnapshot = await db.collection('users').limit(3).get();
    console.log(`✅ Users collection: EXISTS (${usersSnapshot.size} documents)`);
    
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`   - ${doc.id}: ${data.email || 'No email'} (${data.userType || 'No type'})`);
    });
    
    console.log('\n🎉 Connection verification complete!');
    
  } catch (error) {
    console.error('❌ Connection verification failed:', error);
    throw error;
  }
}

// Run the verification
verifyConnection()
  .then(() => {
    console.log('\n✅ Verification completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });
