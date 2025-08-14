import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as serviceAccount from '../auth-functions/lib/service-account.json';

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert(serviceAccount as any)
});

const db = getFirestore(app);

async function checkCurrentUsers() {
  try {
    console.log('🔍 Checking current users in both collections...\n');

    // Check old users collection
    console.log('📁 OLD users collection:');
    const oldUsersSnapshot = await db.collection('users').get();
    if (oldUsersSnapshot.empty) {
      console.log('   No users found');
    } else {
      oldUsersSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   ID: ${doc.id}`);
        console.log(`   Email: ${data.email || 'N/A'}`);
        console.log(`   Company: ${data.companyName || 'N/A'}`);
        console.log(`   Type: ${data.userType || 'N/A'}`);
        console.log(`   Status: ${data.status || 'N/A'}`);
        console.log(`   Approval: ${data.approvalStatus || 'N/A'}`);
        console.log('   ---');
      });
    }

    console.log('\n📁 NEW companyUsers collection:');
    const newUsersSnapshot = await db.collection('companyUsers').get();
    if (newUsersSnapshot.empty) {
      console.log('   No users found');
    } else {
      newUsersSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   ID: ${doc.id}`);
        console.log(`   Email: ${data.email || 'N/A'}`);
        console.log(`   Company: ${data.companyName || 'N/A'}`);
        console.log(`   Type: ${data.userType || 'N/A'}`);
        console.log(`   Status: ${data.status || 'N/A'}`);
        console.log(`   Approval: ${data.approvalStatus || 'N/A'}`);
        console.log('   ---');
      });
    }

    console.log('\n📁 companies collection:');
    const companiesSnapshot = await db.collection('companies').get();
    if (companiesSnapshot.empty) {
      console.log('   No companies found');
    } else {
      companiesSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   ID: ${doc.id}`);
        console.log(`   Name: ${data.name || 'N/A'}`);
        console.log(`   Type: ${data.type || 'N/A'}`);
        console.log(`   Status: ${data.status || 'N/A'}`);
        console.log('   ---');
      });
    }

  } catch (error) {
    console.error('❌ Error checking users:', error);
  } finally {
    process.exit(0);
  }
}

checkCurrentUsers();
