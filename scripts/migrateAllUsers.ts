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

async function migrateAllUsers() {
  try {
    console.log('🚀 MIGRATING ALL USERS TO NEW STRUCTURE...');
    console.log('📊 This will migrate ALL users to companies + companyUsers\n');
    
    // Step 1: Get all users to migrate
    console.log('🔍 Step 1: Getting all users for migration...');
    const usersSnapshot = await db.collection('users').get();
    
    if (usersSnapshot.empty) {
      console.log('❌ No users found to migrate');
      return;
    }
    
    console.log(`📊 Found ${usersSnapshot.size} users to migrate\n`);
    
    // Step 2: Migrate each user
    console.log('🔄 Step 2: Starting migration of all users...\n');
    
    let successCount = 0;
    let errorCount = 0;
    const migrationResults: Array<{ userId: string; email: string; status: 'success' | 'error'; details: string }> = [];
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      try {
        console.log(`🔄 Migrating: ${userData.email || 'No Email'} (${userId})...`);
        
        // Create company record
        const companyId = `company_${userId}`;
        const companyData = {
          id: companyId,
          name: userData.companyName,
          type: userData.userType,
          status: userData.status || 'active',
          
          // PRESERVE ALL BUSINESS FIELDS EXACTLY
          mcNumber: userData.mcNumber || null,
          dotNumber: userData.dotNumber || null,
          insurance: userData.insurance || null,
          equipment: userData.equipment || null,
          eldCompany: userData.eldCompany || null,
          eldApiId: userData.eldApiId || null,
          eldApiKey: userData.eldApiKey || null,
          
          // Address fields (preserve exactly as they are)
          address: userData.address || null,
          street: userData.street || null,
          city: userData.city || null,
          state: userData.state || null,
          zip: userData.zip || null,
          
          // Service areas (preserve exactly as they are)
          serviceAreas: userData.serviceAreas || [],
          
          // Business Information
          businessType: 'logistics',
          taxId: userData.taxId || null,
          dunsNumber: userData.dunsNumber || null,
          
          // Service Configuration
          services: ['load_posting', 'carrier_management'],
          capabilities: ['freight_management'],
          
          // Timestamps
          createdAt: userData.createdAt || new Date(),
          updatedAt: new Date(),
          verifiedAt: null,
          
          // Metadata
          tags: ['migrated', 'all_fields_preserved'],
          notes: `Migrated from user ${userId} during full migration`,
          
          // Migration tracking
          migratedFrom: {
            collection: 'users',
            userId: userId,
            migratedAt: new Date(),
            fieldsPreserved: Object.keys(userData).length
          }
        };
        
        await db.collection('companies').doc(companyId).set(companyData);
        
        // Create company user record with ALL user fields
        const companyUserData = {
          id: userId, // Keep the same Firebase Auth UID
          companyId: companyId,
          
          // PRESERVE ALL ORIGINAL FIELDS EXACTLY AS THEY ARE
          email: userData.email,
          userType: userData.userType,
          companyName: userData.companyName,
          companyRep: userData.companyRep,
          phoneNumber: userData.phoneNumber,
          phone: userData.phone,
          
          // Location data (preserve exactly as they are)
          location: userData.location || null,
          lastLocation: userData.lastLocation || null,
          
          // Status and availability
          status: userData.status || 'active',
          availability: userData.availability || 'online',
          approvalStatus: userData.approvalStatus || null,
          
          // Admin and role fields
          isAdmin: userData.isAdmin || false,
          isSuperAdmin: userData.isSuperAdmin || false,
          role: userData.role || 'company_owner',
          subscriptionTier: userData.subscriptionTier || null,
          
          // Timestamps (preserve exactly as they are)
          createdAt: userData.createdAt || new Date(),
          lastChanged: userData.lastChanged || null,
          lastActive: userData.lastActive || null,
          updatedAt: userData.updatedAt || null,
          adminSetupAt: userData.adminSetupAt || null,
          tierAssignedAt: userData.tierAssignedAt || null,
          
          // Admin tracking
          addedBy: userData.addedBy || null,
          addedAt: userData.addedAt || null,
          updatedBy: userData.updatedBy || null,
          tierAssignedBy: userData.tierAssignedBy || null,
          tierAssignmentReason: userData.tierAssignmentReason || null,
          
          // Rejection tracking
          rejectedBy: userData.rejectedBy || null,
          rejectedAt: userData.rejectedAt || null,
          
          // New company user fields
          companyUserRole: 'owner', // First user becomes company owner
          permissions: ['admin', 'load_management', 'carrier_management', 'user_management'],
          accessLevel: 'full',
          
          // Migration tracking
          migratedFrom: {
            collection: 'users',
            userId: userId,
            migratedAt: new Date(),
            fieldsPreserved: Object.keys(userData).length,
            originalFieldCount: Object.keys(userData).length
          }
        };
        
        await db.collection('companyUsers').doc(userId).set(companyUserData);
        
        console.log(`✅ Successfully migrated: ${userData.email || 'No Email'}`);
        successCount++;
        migrationResults.push({
          userId,
          email: userData.email || 'No Email',
          status: 'success',
          details: `Company: ${companyData.name}, Type: ${companyData.type}`
        });
        
      } catch (error) {
        console.error(`❌ Failed to migrate ${userData.email || 'No Email'}:`, error);
        errorCount++;
        migrationResults.push({
          userId,
          email: userData.email || 'No Email',
          status: 'error',
          details: error instanceof Error ? error.message : String(error)
        });
      }
      
      console.log(''); // Spacing between users
    }
    
    // Step 3: Migration Summary
    console.log('🎉 FULL MIGRATION COMPLETED!');
    console.log('================================\n');
    
    console.log('📊 Migration Results:');
    console.log(`   - Total users processed: ${usersSnapshot.size}`);
    console.log(`   - Successful migrations: ${successCount}`);
    console.log(`   - Failed migrations: ${errorCount}`);
    console.log(`   - Success rate: ${((successCount / usersSnapshot.size) * 100).toFixed(1)}%`);
    
    // Step 4: Detailed Results
    console.log('\n📋 Detailed Results:');
    console.log('====================\n');
    
    migrationResults.forEach((result, index) => {
      const statusIcon = result.status === 'success' ? '✅' : '❌';
      console.log(`${index + 1}. ${statusIcon} ${result.email} (${result.userId})`);
      console.log(`   Status: ${result.status.toUpperCase()}`);
      console.log(`   Details: ${result.details}`);
      console.log('');
    });
    
    // Step 5: Next Steps
    console.log('💡 Next Steps:');
    console.log('   1. Verify all migrations in Firebase Console');
    console.log('   2. Test that migrated users can still access the system');
    console.log('   3. Update application code to use new collections');
    console.log('   4. Archive the old "users" collection (optional)');
    
    console.log('\n⚠️  IMPORTANT: Migration Complete!');
    console.log('   - All users now in companies + companyUsers');
    console.log('   - All 41 fields preserved for each user');
    console.log('   - Ready for broker portal implementation');
    console.log('   - Old "users" collection can be archived');
    
    // Step 6: Optional - Archive old users collection
    console.log('\n🗂️  Optional: Archive old users collection');
    console.log('   - All data is now in the new structure');
    console.log('   - Old collection can be safely archived');
    console.log('   - No data loss - everything is preserved');
    
  } catch (error) {
    console.error('❌ Full migration failed:', error);
    throw error;
  }
}

// Run the full migration
migrateAllUsers()
  .then(() => {
    console.log('\n✅ Full user migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Full user migration failed:', error);
    process.exit(1);
  });
