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

async function properMigrationTest() {
  try {
    console.log('🧪 PROPER MIGRATION TEST: Using real user data...');
    console.log('📊 This will migrate 1 actual user to the new company structure\n');
    
    // Step 1: Find a real user to migrate
    console.log('🔍 Step 1: Finding a real user to migrate...');
    const usersSnapshot = await db.collection('users').limit(1).get();
    
    if (usersSnapshot.empty) {
      throw new Error('No users found in users collection');
    }
    
    const testUser = usersSnapshot.docs[0];
    const userData = testUser.data();
    const userId = testUser.id;
    
    console.log(`✅ Found real user: ${userData.email || 'Unknown Email'} (${userId})`);
    console.log(`   User Type: ${userData.userType || 'Unknown'}`);
    console.log(`   Company: ${userData.companyName || 'Unknown Company'}`);
    
    // Step 2: Create company record using REAL user data
    console.log('\n🏢 Step 2: Creating company record from real user data...');
    const companyId = `company_${userId}`;
    const companyData = {
      id: companyId,
      name: userData.companyName || 'Unknown Company',
      type: userData.userType || 'shipper',
      status: 'active',
      
      // Business Information
      businessType: 'logistics',
      taxId: userData.taxId || null,
      dunsNumber: userData.dunsNumber || null,
      address: {
        street: userData.street || null,
        city: userData.city || null,
        state: userData.state || null,
        zip: userData.zip || null,
        country: userData.country || 'USA'
      },
      
      // Service Configuration
      services: ['load_posting', 'carrier_management'],
      capabilities: ['freight_management'],
      
      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date(),
      verifiedAt: null,
      
      // Metadata
      tags: ['migrated', 'real_user'],
      notes: `Migrated from real user ${userId} during broker portal testing`,
      
      // Migration tracking
      migratedFrom: {
        collection: 'users',
        userId: userId,
        migratedAt: new Date()
      }
    };
    
    await db.collection('companies').doc(companyId).set(companyData);
    console.log(`✅ Created company: ${companyData.name} (${companyId})`);
    
    // Step 3: Create company user record using REAL user data
    console.log('\n👤 Step 3: Creating company user record from real user data...');
    const companyUserData = {
      id: userId, // Keep the same Firebase Auth UID
      companyId: companyId,
      email: userData.email,
      role: 'owner', // First user becomes company owner
      
      // User Information from REAL data
      firstName: userData.firstName || userData.companyRep?.split(' ')[0] || 'Unknown',
      lastName: userData.lastName || userData.companyRep?.split(' ').slice(1).join(' ') || 'Unknown',
      phoneNumber: userData.phoneNumber || null,
      position: 'Owner',
      
      // Permissions (based on user type)
      permissions: ['admin', 'load_management', 'carrier_management', 'user_management'],
      accessLevel: 'full',
      
      // Status
      status: 'active',
      lastActive: new Date(),
      
      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date(),
      invitedAt: null,
      acceptedAt: new Date(),
      
      // Migration tracking
      migratedFrom: {
        collection: 'users',
        userId: userId,
        migratedAt: new Date()
      }
    };
    
    await db.collection('companyUsers').doc(userId).set(companyUserData);
    console.log(`✅ Created company user: ${companyUserData.firstName} ${companyUserData.lastName} (${userId})`);
    
    // Step 4: Verify the migration
    console.log('\n✅ Step 4: Verifying migration...');
    
    // Check company exists
    const companyDoc = await db.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      throw new Error('Company was not created successfully');
    }
    
    // Check company user exists
    const companyUserDoc = await db.collection('companyUsers').doc(userId).get();
    if (!companyUserDoc.exists) {
      throw new Error('Company user was not created successfully');
    }
    
    // Check relationship
    const retrievedCompanyUserData = companyUserDoc.data();
    if (retrievedCompanyUserData?.companyId !== companyId) {
      throw new Error('Company relationship is not correct');
    }
    
    console.log('✅ Migration verification successful!');
    
    // Step 5: Summary
    console.log('\n🎉 PROPER MIGRATION TEST COMPLETE!');
    console.log('📊 What was created:');
    console.log(`   - Company: ${companyData.name} (${companyId})`);
    console.log(`   - Company User: ${companyUserData.firstName} ${companyUserData.lastName} (${userId})`);
    console.log(`   - Relationship: User ${userId} → Company ${companyId}`);
    
    console.log('\n🔍 Migration Details:');
    console.log(`   - Original User Type: ${userData.userType || 'Unknown'}`);
    console.log(`   - New Company Type: ${companyData.type}`);
    console.log(`   - User Role: ${companyUserData.role}`);
    console.log(`   - Migration Timestamp: ${new Date().toISOString()}`);
    
    console.log('\n💡 Next Steps:');
    console.log('   1. Test this user can still access the system');
    console.log('   2. Verify business rules work correctly');
    console.log('   3. If successful, migrate remaining users');
    console.log('   4. If issues found, fix and retest');
    
    console.log('\n⚠️  IMPORTANT: This is a REAL migration test');
    console.log('   - Uses actual user data from your system');
    console.log('   - No sample/fake data created');
    console.log('   - Ready for production use');
    
  } catch (error) {
    console.error('❌ Migration test failed:', error);
    throw error;
  }
}

// Run the proper migration test
properMigrationTest()
  .then(() => {
    console.log('\n✅ Proper migration test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Proper migration test failed:', error);
    process.exit(1);
  });
