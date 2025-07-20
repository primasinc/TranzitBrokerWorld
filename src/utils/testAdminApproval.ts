import { collection, query, where, getDocs, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// Test function to verify admin approval system
export const testAdminApprovalSystem = async () => {
  console.log('Testing Admin Approval System...');
  
  try {
    // 1. Check if there are any pending users
    const usersRef = collection(db, 'users');
    const pendingQuery = query(usersRef, where('approvalStatus', '==', 'pending'));
    const pendingSnapshot = await getDocs(pendingQuery);
    
    console.log(`Found ${pendingSnapshot.size} pending users`);
    
    pendingSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('Pending user:', {
        id: doc.id,
        email: data.email,
        companyName: data.companyName,
        userType: data.userType,
        approvalStatus: data.approvalStatus
      });
    });

    // 2. Check if there are any admin users
    const adminQuery = query(usersRef, where('isAdmin', '==', true));
    const adminSnapshot = await getDocs(adminQuery);
    
    console.log(`Found ${adminSnapshot.size} admin users`);
    
    adminSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('Admin user:', {
        id: doc.id,
        email: data.email,
        isAdmin: data.isAdmin,
        isSuperAdmin: data.isSuperAdmin
      });
    });

    // 3. Test approval function (if there are pending users)
    if (pendingSnapshot.size > 0) {
      const firstPendingUser = pendingSnapshot.docs[0];
      console.log('Testing approval for user:', firstPendingUser.id);
      
      try {
        await updateDoc(doc(db, 'users', firstPendingUser.id), {
          status: 'approved',
          approvalStatus: 'approved',
          approvedAt: new Date(),
          approvedBy: 'test-admin@tranzit.io'
        });
        console.log('✅ Approval test successful');
        
        // Revert back to pending for testing
        await updateDoc(doc(db, 'users', firstPendingUser.id), {
          status: 'pending',
          approvalStatus: 'pending',
          approvedAt: null,
          approvedBy: null
        });
        console.log('✅ Reverted back to pending for testing');
      } catch (error) {
        console.error('❌ Approval test failed:', error);
      }
    }

    return {
      pendingUsers: pendingSnapshot.size,
      adminUsers: adminSnapshot.size,
      success: true
    };
  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      pendingUsers: 0,
      adminUsers: 0,
      success: false,
      error: error
    };
  }
};

// Test function to create a test user for approval testing
export const createTestUser = async () => {
  console.log('Creating test user for approval testing...');
  
  try {
    const testUser = {
      email: `test-user-${Date.now()}@example.com`,
      companyName: 'Test Company',
      phoneNumber: '555-123-4567',
      userType: 'shipper',
      approvalStatus: 'pending',
      status: 'pending',
      createdAt: new Date()
    };

    const docRef = await addDoc(collection(db, 'users'), testUser);
    console.log('✅ Test user created with ID:', docRef.id);
    
    return {
      success: true,
      userId: docRef.id,
      userData: testUser
    };
  } catch (error) {
    console.error('❌ Failed to create test user:', error);
    return {
      success: false,
      error: error
    };
  }
};

// Function to clean up test users
export const cleanupTestUsers = async () => {
  console.log('Cleaning up test users...');
  
  try {
    const usersRef = collection(db, 'users');
    const testQuery = query(usersRef, where('email', '>=', 'test-user-'));
    const testSnapshot = await getDocs(testQuery);
    
    let deletedCount = 0;
    for (const docSnapshot of testSnapshot.docs) {
      await deleteDoc(docSnapshot.ref);
      deletedCount++;
    }
    
    console.log(`✅ Cleaned up ${deletedCount} test users`);
    return { success: true, deletedCount };
  } catch (error) {
    console.error('❌ Failed to clean up test users:', error);
    return { success: false, error };
  }
}; 