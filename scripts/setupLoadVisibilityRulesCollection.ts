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

// Load visibility rules for different user types
const loadVisibilityRules = [
  {
    id: 'shipper_visibility',
    userTypeId: 'shipper',
    canSeeShipperLoads: false, // Shippers can't see other shipper loads
    canSeeBrokerLoads: false,  // Shippers can't see broker loads
    canSeeCarrierLoads: false, // Shippers can't see carrier loads
    competitionProtection: [],
    loadFilters: ['own_loads_only'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'carrier_visibility',
    userTypeId: 'carrier',
    canSeeShipperLoads: true,  // Carriers can see shipper loads
    canSeeBrokerLoads: true,   // Carriers can see broker loads
    canSeeCarrierLoads: false, // Carriers can't see other carrier loads
    competitionProtection: [],
    loadFilters: ['available_loads', 'marketplace_loads'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'broker_visibility',
    userTypeId: 'broker',
    canSeeShipperLoads: true,  // Brokers can see shipper loads
    canSeeBrokerLoads: false,  // Brokers CANNOT see other broker loads (competition protection)
    canSeeCarrierLoads: false, // Brokers can't see carrier loads
    competitionProtection: ['broker_competition_protection'],
    loadFilters: ['shipper_loads_only', 'exclude_broker_loads'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'broker_carrier_visibility',
    userTypeId: 'broker_carrier',
    canSeeShipperLoads: true,  // Broker-carriers can see shipper loads
    canSeeBrokerLoads: false,  // Broker-carriers CANNOT see other broker loads (competition protection)
    canSeeCarrierLoads: false, // Broker-carriers can't see carrier loads
    competitionProtection: ['broker_competition_protection'],
    loadFilters: ['shipper_loads_only', 'exclude_broker_loads'],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function setupLoadVisibilityRulesCollection() {
  try {
    console.log('🚀 Setting up loadVisibilityRules collection for broker portal...');
    
    // Create all load visibility rules
    for (const rule of loadVisibilityRules) {
      await db.collection('loadVisibilityRules').doc(rule.id).set(rule);
      console.log(`✅ Created visibility rule: ${rule.id} for userType: ${rule.userTypeId}`);
    }
    
    console.log('\n🎉 loadVisibilityRules collection setup complete!');
    console.log(`📊 Created ${loadVisibilityRules.length} visibility rules`);
    
    console.log('\n📋 Business Rules Implemented:');
    console.log('  - Shippers: Can only see their own loads');
    console.log('  - Carriers: Can see shipper and broker loads');
    console.log('  - Brokers: Can see shipper loads ONLY (competition protection)');
    console.log('  - Broker-Carriers: Same as brokers (competition protection)');
    
    console.log('\n🔒 Competition Protection:');
    console.log('  - Brokers cannot see other broker loads');
    console.log('  - Prevents conflict of interest');
    console.log('  - Maintains fair competition');
    
    console.log('\n💡 Next: This collection will:');
    console.log('  - Control what loads each user type can see');
    console.log('  - Enforce business rules automatically');
    console.log('  - Support dynamic rule changes');
    
  } catch (error) {
    console.error('❌ Error setting up loadVisibilityRules collection:', error);
    throw error;
  }
}

// Run the setup
setupLoadVisibilityRulesCollection()
  .then(() => {
    console.log('\n✅ Setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });
