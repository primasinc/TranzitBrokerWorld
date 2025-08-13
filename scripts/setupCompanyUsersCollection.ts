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

// Sample company user data structure
const sampleCompanyUser = {
  id: 'sample_user_001', // This will be the Firebase Auth UID
  companyId: 'sample_company_001', // Reference to companies collection
  email: 'user@samplecompany.com',
  role: 'owner', // 'owner' | 'admin' | 'manager' | 'user' | 'driver'
  
  // User Information
  firstName: 'John',
  lastName: 'Doe',
  phoneNumber: '555-1234',
  position: 'CEO',
  
  // Permissions
  permissions: ['admin', 'load_management', 'carrier_management', 'user_management'],
  accessLevel: 'full', // 'full' | 'limited' | 'readonly'
  
  // Status
  status: 'active', // 'active' | 'inactive' | 'suspended'
  lastActive: new Date(),
  
  // Timestamps
  createdAt: new Date(),
  updatedAt: new Date(),
  invitedAt: null,
  acceptedAt: new Date()
};

async function setupCompanyUsersCollection() {
  try {
    console.log('🚀 Setting up companyUsers collection for broker portal...');
    
    // Create the sample company user document
    await db.collection('companyUsers').doc(sampleCompanyUser.id).set(sampleCompanyUser);
    console.log(`✅ Created sample company user: ${sampleCompanyUser.firstName} ${sampleCompanyUser.lastName} (${sampleCompanyUser.id})`);
    
    console.log('\n🎉 companyUsers collection setup complete!');
    console.log('📊 Collection structure created');
    console.log('\n📋 Company User Structure:');
    console.log('  - User profile information');
    console.log('  - Company relationship (companyId)');
    console.log('  - Role and permissions');
    console.log('  - Access level and status');
    console.log('  - Timestamps and audit trail');
    
    console.log('\n💡 Next: This collection will store:');
    console.log('  - All existing users linked to companies');
    console.log('  - New broker users');
    console.log('  - User roles and permissions within companies');
    console.log('  - Multi-user company support');
    
    console.log('\n🔗 Relationship Created:');
    console.log(`  - User: ${sampleCompanyUser.email} (${sampleCompanyUser.id})`);
    console.log(`  - Company: ${sampleCompanyUser.companyId}`);
    console.log(`  - Role: ${sampleCompanyUser.role}`);
    
  } catch (error) {
    console.error('❌ Error setting up companyUsers collection:', error);
    throw error;
  }
}

// Run the setup
setupCompanyUsersCollection()
  .then(() => {
    console.log('\n✅ Setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });
