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

// Sample company data structure (this will be populated during migration)
const sampleCompany = {
  id: 'sample_company_001',
  name: 'Sample Company',
  type: 'shipper', // 'shipper' | 'broker' | 'carrier' | 'broker_carrier'
  status: 'active', // 'active' | 'inactive' | 'suspended' | 'pending'
  
  // Business Information
  businessType: 'logistics', // 'logistics' | 'manufacturing' | 'retail' | etc.
  taxId: '12-3456789',
  dunsNumber: '123456789',
  address: {
    street: '123 Business St',
    city: 'Business City',
    state: 'BS',
    zip: '12345',
    country: 'USA'
  },
  
  // Service Configuration
  services: ['load_posting', 'carrier_management'],
  capabilities: ['freight_management', 'logistics_planning'],
  
  // Broker-Specific Fields (optional)
  brokerLicense: null,
  suretyBond: null,
  commissionRates: [],
  
  // Carrier-Specific Fields (optional)
  carrierOperations: null,
  
  // Timestamps
  createdAt: new Date(),
  updatedAt: new Date(),
  verifiedAt: null,
  
  // Metadata
  tags: ['sample', 'template'],
  notes: 'Sample company template for migration testing'
};

async function setupCompaniesCollection() {
  try {
    console.log('🚀 Setting up companies collection for broker portal...');
    
    // Create the sample company document
    await db.collection('companies').doc(sampleCompany.id).set(sampleCompany);
    console.log(`✅ Created sample company: ${sampleCompany.name} (${sampleCompany.id})`);
    
    console.log('\n🎉 companies collection setup complete!');
    console.log('📊 Collection structure created');
    console.log('\n📋 Company Structure:');
    console.log('  - Company profile information');
    console.log('  - Business type and services');
    console.log('  - Address and contact details');
    console.log('  - Broker/carrier specific fields');
    console.log('  - Timestamps and metadata');
    
    console.log('\n💡 Next: This collection will store:');
    console.log('  - All existing companies (shippers, carriers)');
    console.log('  - New broker companies');
    console.log('  - Company relationships and partnerships');
    
  } catch (error) {
    console.error('❌ Error setting up companies collection:', error);
    throw error;
  }
}

// Run the setup
setupCompaniesCollection()
  .then(() => {
    console.log('\n✅ Setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });
