import { collection, addDoc, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// Test function to create a test load for a carrier
export const createTestLoadForCarrier = async (carrierId: string) => {
  console.log('Creating test load for carrier:', carrierId);
  
  try {
    // Check if carrier exists
    const usersQuery = query(collection(db, 'users'), where('uid', '==', carrierId));
    const userSnapshot = await getDocs(usersQuery);
    
    if (userSnapshot.empty) {
      console.error('Carrier not found:', carrierId);
      return null;
    }

    const testLoad = {
      poNumber: 'PO-TEST-2024-001',
      shipper: 'Test Manufacturing Co',
      shipperId: 'test-shipper-id',
      carrierId: carrierId,
      pickup: {
        location: '123 Factory St, Detroit, MI',
        time: '2024-01-15 08:00 AM',
        status: 'pending'
      },
      delivery: {
        location: '456 Warehouse Ave, Chicago, IL',
        time: '2024-01-16 02:00 PM',
        status: 'pending'
      },
      status: 'active',
      payment: 2500,
      weight: '45,000 lbs',
      dimensions: '48ft x 8.5ft x 8.5ft',
      productDescription: 'Automotive parts - Engine components',
      notes: 'Handle with care. Temperature controlled shipment required.',
      title: 'Test Load - Automotive Parts',
      pickupLocation: {
        address: '123 Factory St, Detroit, MI',
        position: [-83.0458, 42.3314],
        date: '2024-01-15 08:00 AM'
      },
      deliveryLocation: {
        address: '456 Warehouse Ave, Chicago, IL',
        position: [-87.6298, 41.8781],
        date: '2024-01-16 02:00 PM'
      },
      rate: 2500,
      isMarketplace: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await addDoc(collection(db, 'loads'), testLoad);
    console.log('✅ Test load created successfully:', docRef.id);
    
    return {
      id: docRef.id,
      ...testLoad
    };
  } catch (error) {
    console.error('❌ Error creating test load:', error);
    return null;
  }
};

// Test function to clean up test loads
export const cleanupTestLoads = async (carrierId: string) => {
  console.log('Cleaning up test loads for carrier:', carrierId);
  
  try {
    const loadsQuery = query(
      collection(db, 'loads'), 
      where('carrierId', '==', carrierId),
      where('poNumber', '==', 'PO-TEST-2024-001')
    );
    const loadsSnapshot = await getDocs(loadsQuery);
    
    const deletePromises = loadsSnapshot.docs.map(doc => 
      deleteDoc(doc.ref)
    );
    
    await Promise.all(deletePromises);
    console.log(`✅ Cleaned up ${loadsSnapshot.size} test loads`);
  } catch (error) {
    console.error('❌ Error cleaning up test loads:', error);
  }
}; 