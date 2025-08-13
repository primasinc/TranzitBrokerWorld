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

async function cleanupSampleData() {
  try {
    console.log('🧹 CLEANING UP SAMPLE DATA...');
    
    // Remove sample company
    console.log('\n🗑️ Removing sample company...');
    await db.collection('companies').doc('sample_company_001').delete();
    console.log('✅ Removed sample company');
    
    // Remove sample company user
    console.log('\n🗑️ Removing sample company user...');
    await db.collection('companyUsers').doc('sample_user_001').delete();
    console.log('✅ Removed sample company user');
    
    // Remove migrated test data (from previous test)
    console.log('\n🗑️ Removing previous test migration data...');
    await db.collection('companies').doc('migrated_company_0590m3DExeasPaMc3mP0maJTvnk2').delete();
    await db.collection('companyUsers').doc('0590m3DExeasPaMc3mP0maJTvnk2').delete();
    console.log('✅ Removed previous test migration data');
    
    console.log('\n🎉 Sample data cleanup complete!');
    console.log('📊 Collections are now clean and ready for proper migration');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
}

// Run the cleanup
cleanupSampleData()
  .then(() => {
    console.log('\n✅ Cleanup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  });
