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

async function checkUserFields() {
  try {
    console.log('🔍 EXAMINING USER FIELD STRUCTURE...\n');
    
    // Get all users to see field patterns
    const usersSnapshot = await db.collection('users').get();
    
    if (usersSnapshot.empty) {
      console.log('❌ No users found');
      return;
    }
    
    console.log(`📊 Found ${usersSnapshot.size} users. Analyzing field structure...\n`);
    
    // Track all unique fields across all users
    const allFields = new Set<string>();
    const fieldTypes = new Map<string, Set<string>>();
    const fieldExamples = new Map<string, any[]>();
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      const userId = doc.id;
      
      console.log(`👤 User: ${userData.email || 'No Email'} (${userId})`);
      
      // Collect all fields and their types
      Object.entries(userData).forEach(([fieldName, fieldValue]) => {
        allFields.add(fieldName);
        
        // Track field types
        if (!fieldTypes.has(fieldName)) {
          fieldTypes.set(fieldName, new Set());
        }
        fieldTypes.get(fieldName)!.add(typeof fieldValue);
        
        // Track example values (limit to 3 per field)
        if (!fieldExamples.has(fieldName)) {
          fieldExamples.set(fieldName, []);
        }
        if (fieldExamples.get(fieldName)!.length < 3) {
          fieldExamples.get(fieldName)!.push(fieldValue);
        }
      });
      
      console.log(`   Fields: ${Object.keys(userData).join(', ')}`);
      console.log('');
    });
    
    // Display comprehensive field analysis
    console.log('📋 COMPREHENSIVE FIELD ANALYSIS:');
    console.log('================================\n');
    
    const sortedFields = Array.from(allFields).sort();
    
    sortedFields.forEach(fieldName => {
      const types = Array.from(fieldTypes.get(fieldName)!).join(', ');
      const examples = fieldExamples.get(fieldName)!.slice(0, 2);
      
      console.log(`🔹 ${fieldName}:`);
      console.log(`   Type: ${types}`);
      console.log(`   Examples: ${examples.map(ex => JSON.stringify(ex)).join(', ')}`);
      console.log('');
    });
    
    console.log(`📊 Total unique fields found: ${allFields.size}`);
    console.log('💡 This shows exactly what fields we need to preserve in migration!');
    
  } catch (error) {
    console.error('❌ Error checking user fields:', error);
    throw error;
  }
}

// Run the field analysis
checkUserFields()
  .then(() => {
    console.log('\n✅ Field analysis completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Field analysis failed:', error);
    process.exit(1);
  });
