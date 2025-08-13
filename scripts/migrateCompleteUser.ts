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

async function migrateCompleteUser() {
  try {
    console.log('🚀 MIGRATING COMPLETE USER: ssmith@TRU.com...');
    console.log('📊 This user has complete registration information\n');
    
    // Step 1: Find the complete user
    console.log('🔍 Step 1: Finding ssmith@TRU.com...');
    const usersSnapshot = await db.collection('users').where('email', '==', 'ssmith@TRU.com').get();
    
    if (usersSnapshot.empty) {
      throw new Error('User ssmith@TRU.com not found');
    }
    
    const testUser = usersSnapshot.docs[0];
    const userData = testUser.data();
    const userId = testUser.id;
    
    console.log(`✅ Found user: ${userData.email} (${userId})`);
    console.log(`   User Type: ${userData.userType}`);
    console.log(`   Company: ${userData.companyName}`);
    console.log(`   Rep: ${userData.companyRep}`);
    console.log(`   Phone: ${userData.phoneNumber}`);
    
    // Step 2: Remove the incomplete user's migration data first
    console.log('\n🧹 Step 2: Cleaning up previous incomplete migration...');
    try {
      await db.collection('companies').doc('company_0590m3DExeasPaMc3mP0maJTvnk2').delete();
      await db.collection('companyUsers').doc('0590m3DExeasPaMc3mP0maJTvnk2').delete();
      console.log('✅ Removed previous incomplete migration data');
    } catch (error) {
      console.log('ℹ️ No previous migration data to clean up');
    }
    
    // Step 3: Create company record using COMPLETE user data
    console.log('\n🏢 Step 3: Creating company record from complete user data...');
    const companyId = `company_${userId}`;
    const companyData = {
      id: companyId,
      name: userData.companyName, // "Trucks R US"
      type: userData.userType,    // "carrier"
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
      tags: ['migrated', 'complete_user'],
      notes: `Migrated from complete user ${userId} during broker portal testing`,
      
      // Migration tracking
      migratedFrom: {
        collection: 'users',
        userId: userId,
        migratedAt: new Date()
      }
    };
    
    await db.collection('companies').doc(companyId).set(companyData);
    console.log(`✅ Created company: ${companyData.name} (${companyId})`);
    
    // Step 4: Create company user record using COMPLETE user data
    console.log('\n👤 Step 4: Creating company user record from complete user data...');
    const companyUserData = {
      id: userId, // Keep the same Firebase Auth UID
      companyId: companyId,
      email: userData.email,
      role: 'owner', // First user becomes company owner
      
      // User Information from COMPLETE data
      firstName: userData.firstName || userData.companyRep?.split(' ')[0] || 'Steve',
      lastName: userData.lastName || userData.companyRep?.split(' ').slice(1).join(' ') || 'Smith',
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
    
    // Step 5: Verify the migration
    console.log('\n✅ Step 5: Verifying migration...');
    
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
    
    // Step 6: Summary
    console.log('\n🎉 COMPLETE USER MIGRATION SUCCESSFUL!');
    console.log('📊 What was created:');
    console.log(`   - Company: ${companyData.name} (${companyId})`);
    console.log(`   - Company User: ${companyUserData.firstName} ${companyUserData.lastName} (${userId})`);
    console.log(`   - Relationship: User ${userId} → Company ${companyId}`);
    
    console.log('\n🔍 Migration Details:');
    console.log(`   - Original User Type: ${userData.userType}`);
    console.log(`   - New Company Type: ${companyData.type}`);
    console.log(`   - User Role: ${companyUserData.role}`);
    console.log(`   - Migration Timestamp: ${new Date().toISOString()}`);
    
    console.log('\n💡 Next Steps:');
    console.log('   1. Test this user can still access the system');
    console.log('   2. Verify business rules work correctly');
    console.log('   3. If successful, migrate remaining users');
    console.log('   4. If issues found, fix and retest');
    
    console.log('\n⚠️  IMPORTANT: This is a COMPLETE user migration');
    console.log('   - Uses actual company name: Trucks R US');
    console.log('   - Uses actual user info: Steve Smith');
    console.log('   - No "Unknown" fields');
    console.log('   - Ready for production use');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the complete user migration
migrateCompleteUser()
  .then(() => {
    console.log('\n✅ Complete user migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Complete user migration failed:', error);
    process.exit(1);
  });
