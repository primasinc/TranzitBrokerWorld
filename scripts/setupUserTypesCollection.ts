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

// User Types data for broker portal
const userTypes = [
  {
    id: 'shipper',
    name: 'Shipper',
    description: 'Company that needs freight transported',
    canPostLoads: true,
    canViewLoads: false,
    canManageCarriers: true,
    canManagePartners: true,
    defaultRoute: '/shipper/dashboard',
    allowedRoutes: ['/shipper/*', '/carrier-directory', '/partnerships'],
    features: ['load_posting', 'carrier_management', 'shipment_tracking'],
    restrictions: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'carrier',
    name: 'Carrier',
    description: 'Company that transports freight',
    canPostLoads: false,
    canViewLoads: true,
    canManageCarriers: false,
    canManagePartners: true,
    defaultRoute: '/carrier/home',
    allowedRoutes: ['/carrier/*', '/available-loads', '/partnerships'],
    features: ['load_viewing', 'load_bidding', 'shipment_management'],
    restrictions: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'broker',
    name: 'Broker',
    description: 'Company that brokers freight to carriers',
    canPostLoads: true,
    canViewLoads: false,
    canManageCarriers: true,
    canManagePartners: true,
    defaultRoute: '/shipper/dashboard', // Same as shipper portal
    allowedRoutes: ['/shipper/*', '/carrier-directory', '/partnerships'],
    features: ['load_posting', 'carrier_management', 'shipment_tracking'],
    restrictions: ['cannot_see_broker_loads'], // Competition protection
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'broker_carrier',
    name: 'Broker with Carrier Operations',
    description: 'Company that brokers freight and also operates as a carrier',
    canPostLoads: true,
    canViewLoads: true,
    canManageCarriers: true,
    canManagePartners: true,
    defaultRoute: '/shipper/dashboard', // Same as shipper portal
    allowedRoutes: ['/shipper/*', '/carrier/*', '/carrier-directory', '/partnerships'],
    features: ['load_posting', 'carrier_management', 'shipment_tracking', 'load_viewing', 'load_bidding'],
    restrictions: ['cannot_see_broker_loads'], // Competition protection
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function setupUserTypesCollection() {
  try {
    console.log('🚀 Setting up userTypes collection for broker portal...');
    
    // Create userTypes collection and add documents
    for (const userType of userTypes) {
      await db.collection('userTypes').doc(userType.id).set(userType);
      console.log(`✅ Created userType: ${userType.name} (${userType.id})`);
    }
    
    console.log('\n🎉 userTypes collection setup complete!');
    console.log(`📊 Created ${userTypes.length} user types`);
    console.log('\n📋 User Types Created:');
    userTypes.forEach(ut => {
      console.log(`  - ${ut.name}: ${ut.description}`);
      if (ut.restrictions.length > 0) {
        console.log(`    Restrictions: ${ut.restrictions.join(', ')}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error setting up userTypes collection:', error);
    throw error;
  }
}

// Run the setup
setupUserTypesCollection()
  .then(() => {
    console.log('\n✅ Setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });
