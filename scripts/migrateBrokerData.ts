import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../src/config/firebase';

interface PurchaseOrder {
  id: string;
  brokerId: string;
  [key: string]: any;
}

interface Load {
  id: string;
  brokerId: string;
  [key: string]: any;
}

interface Notification {
  id: string;
  brokerId: string;
  [key: string]: any;
}

async function migrateBrokerPurchaseOrders() {
  console.log('🔄 Starting migration of broker purchase orders...');
  
  try {
    // Get all purchase orders with brokerId
    const purchaseOrdersSnapshot = await getDocs(
      query(collection(db, 'purchaseOrders'), where('brokerId', '!=', null))
    );
    
    console.log(`Found ${purchaseOrdersSnapshot.size} broker purchase orders to migrate`);
    
    const batch = writeBatch(db);
    let migratedCount = 0;
    
    for (const docSnap of purchaseOrdersSnapshot.docs) {
      const data = docSnap.data() as PurchaseOrder;
      
      // Create new document in brokerPurchaseOrders collection
      const newDocRef = doc(collection(db, 'brokerPurchaseOrders'), docSnap.id);
      batch.set(newDocRef, {
        ...data,
        migratedAt: serverTimestamp(),
        originalCollection: 'purchaseOrders'
      });
      
      migratedCount++;
    }
    
    // Commit the batch
    await batch.commit();
    console.log(`✅ Successfully migrated ${migratedCount} broker purchase orders`);
    
  } catch (error) {
    console.error('❌ Error migrating broker purchase orders:', error);
    throw error;
  }
}

async function migrateBrokerLoads() {
  console.log('🔄 Starting migration of broker loads...');
  
  try {
    // Get all loads with brokerId
    const loadsSnapshot = await getDocs(
      query(collection(db, 'loads'), where('brokerId', '!=', null))
    );
    
    console.log(`Found ${loadsSnapshot.size} broker loads to migrate`);
    
    const batch = writeBatch(db);
    let migratedCount = 0;
    
    for (const docSnap of loadsSnapshot.docs) {
      const data = docSnap.data() as Load;
      
      // Create new document in brokerLoads collection
      const newDocRef = doc(collection(db, 'brokerLoads'), docSnap.id);
      batch.set(newDocRef, {
        ...data,
        migratedAt: serverTimestamp(),
        originalCollection: 'loads'
      });
      
      migratedCount++;
    }
    
    // Commit the batch
    await batch.commit();
    console.log(`✅ Successfully migrated ${migratedCount} broker loads`);
    
  } catch (error) {
    console.error('❌ Error migrating broker loads:', error);
    throw error;
  }
}

async function migrateBrokerNotifications() {
  console.log('🔄 Starting migration of broker notifications...');
  
  try {
    // Get all notifications with brokerId
    const notificationsSnapshot = await getDocs(
      query(collection(db, 'notifications'), where('brokerId', '!=', null))
    );
    
    console.log(`Found ${notificationsSnapshot.size} broker notifications to migrate`);
    
    const batch = writeBatch(db);
    let migratedCount = 0;
    
    for (const docSnap of notificationsSnapshot.docs) {
      const data = docSnap.data() as Notification;
      
      // Create new document in brokerNotifications collection
      const newDocRef = doc(collection(db, 'brokerNotifications'), docSnap.id);
      batch.set(newDocRef, {
        ...data,
        migratedAt: serverTimestamp(),
        originalCollection: 'notifications'
      });
      
      migratedCount++;
    }
    
    // Commit the batch
    await batch.commit();
    console.log(`✅ Successfully migrated ${migratedCount} broker notifications`);
    
  } catch (error) {
    console.error('❌ Error migrating broker notifications:', error);
    throw error;
  }
}

async function createBrokerMetrics() {
  console.log('🔄 Creating broker metrics collection...');
  
  try {
    // Get all broker users
    const brokerUsersSnapshot = await getDocs(
      query(collection(db, 'users'), where('userType', '==', 'broker'))
    );
    
    console.log(`Found ${brokerUsersSnapshot.size} broker users to create metrics for`);
    
    const batch = writeBatch(db);
    
    for (const docSnap of brokerUsersSnapshot.docs) {
      const brokerId = docSnap.id;
      
      // Create metrics document for each broker
      const metricsRef = doc(collection(db, 'brokerMetrics'), brokerId);
      batch.set(metricsRef, {
        brokerId,
        totalPurchaseOrders: 0,
        totalLoads: 0,
        totalRevenue: 0,
        activeCarriers: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    
    // Commit the batch
    await batch.commit();
    console.log(`✅ Successfully created metrics for ${brokerUsersSnapshot.size} brokers`);
    
  } catch (error) {
    console.error('❌ Error creating broker metrics:', error);
    throw error;
  }
}

async function migrateBrokerCompanies() {
  console.log('🔄 Starting migration of broker companies...');
  
  try {
    // Get all companies owned by brokers
    const companiesSnapshot = await getDocs(
      query(collection(db, 'companies'), where('ownerType', '==', 'broker'))
    );
    
    console.log(`Found ${companiesSnapshot.size} broker companies to migrate`);
    
    const batch = writeBatch(db);
    let migratedCount = 0;
    
    for (const docSnap of companiesSnapshot.docs) {
      const data = docSnap.data();
      
      // Create new document in brokerCompanies collection
      const newDocRef = doc(collection(db, 'brokerCompanies'), docSnap.id);
      batch.set(newDocRef, {
        ...data,
        migratedAt: serverTimestamp(),
        originalCollection: 'companies'
      });
      
      migratedCount++;
    }
    
    // Commit the batch
    await batch.commit();
    console.log(`✅ Successfully migrated ${migratedCount} broker companies`);
    
  } catch (error) {
    console.error('❌ Error migrating broker companies:', error);
    throw error;
  }
}

async function runMigration() {
  console.log('🚀 Starting broker data migration...');
  console.log('=====================================');
  
  try {
    // Run migrations in order
    await migrateBrokerPurchaseOrders();
    await migrateBrokerLoads();
    await migrateBrokerNotifications();
    await createBrokerMetrics();
    await migrateBrokerCompanies();
    
    console.log('=====================================');
    console.log('🎉 All broker data migrations completed successfully!');
    console.log('📊 New collections created:');
    console.log('   - brokerPurchaseOrders');
    console.log('   - brokerLoads');
    console.log('   - brokerNotifications');
    console.log('   - brokerMetrics');
    console.log('   - brokerCompanies');
    console.log('');
    console.log('⚠️  Note: Original data remains in general collections for backward compatibility');
    console.log('🔄 Next step: Update application code to use new collections');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration();
}

export {
  migrateBrokerPurchaseOrders,
  migrateBrokerLoads,
  migrateBrokerNotifications,
  createBrokerMetrics,
  migrateBrokerCompanies,
  runMigration
};
