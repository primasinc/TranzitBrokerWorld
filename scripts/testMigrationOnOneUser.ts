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

async function testMigrationOnOneUser() {
  try {
    console.log('🧪 TESTING MIGRATION: Migrating 1 user to new company structure...');
    console.log('📊 This will validate our migration approach before affecting all users\n');
    
    // Step 1: Find a user to migrate (let's get the first user from users collection)
    console.log('🔍 Step 1: Finding a user to migrate...');
    const usersSnapshot = await db.collection('users').limit(1).get();
    
    if (usersSnapshot.empty) {
      throw new Error('No users found in users collection');
    }
    
    const testUser = usersSnapshot.docs[0];
    const userData = testUser.data();
    const userId = testUser.id;
    
    console.log(`✅ Found test user: ${userData.email || 'Unknown Email'} (${userId})`);
    console.log(`   User Type: ${userData.userType || 'Unknown'}`);
    console.log(`   Company: ${userData.companyName || 'Unknown Company'}`);
    
    // Step 2: Create company record
    console.log('\n🏢 Step 2: Creating company record...');
    const companyId = `migrated_company_${userId}`;
    const companyData = {
      id: companyId,
      name: userData.companyName || 'Migrated Company',
      type: userData.userType || 'shipper', // Default to shipper if unknown
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
      tags: ['migrated', 'test'],
      notes: `Migrated from user ${userId} during broker portal testing`,
      
      // Migration tracking
      migratedFrom: {
        collection: 'users',
        userId: userId,
        migratedAt: new Date()
      }
    };
    
    await db.collection('companies').doc(companyId).set(companyData);
    console.log(`✅ Created company: ${companyData.name} (${companyId})`);
    
    // Step 3: Create company user record
    console.log('\n👤 Step 3: Creating company user record...');
    const companyUserData = {
      id: userId, // Keep the same Firebase Auth UID
      companyId: companyId,
      email: userData.email,
      role: 'owner', // First user becomes company owner
      
      // User Information
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
    console.log('\n🎉 MIGRATION TEST COMPLETE!');
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
    console.log('   3. If successful, migrate remaining 14 users');
    console.log('   4. If issues found, fix and retest');
    
    console.log('\n⚠️  IMPORTANT: This is a TEST migration');
    console.log('   - Only 1 user was affected');
    console.log('   - Original user data still exists in users collection');
    console.log('   - Easy to rollback if needed');
    
  } catch (error) {
    console.error('❌ Migration test failed:', error);
    throw error;
  }
}

// Run the migration test
testMigrationOnOneUser()
  .then(() => {
    console.log('\n✅ Migration test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration test failed:', error);
    process.exit(1);
  });
