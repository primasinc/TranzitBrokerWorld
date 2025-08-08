// Admin Setup Utility for Production
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface AdminSetupOptions {
  userId: string;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  userType?: string;
  companyName?: string;
}

/**
 * Set up admin permissions for a user
 * This should only be used during initial production setup
 */
export const setupAdminUser = async (options: AdminSetupOptions): Promise<void> => {
  const { userId, isAdmin = false, isSuperAdmin = false, userType = 'admin', companyName = 'System Admin' } = options;

  try {
    // Check if user exists
    const userDoc = await getDoc(doc(db, 'users', userId));

    if (!userDoc.exists()) {
      throw new Error(`User ${userId} does not exist`);
    }

    // Update user with admin permissions
    await setDoc(doc(db, 'users', userId), {
      isAdmin,
      isSuperAdmin,
      userType,
      companyName,
      role: 'admin', // Legacy support
      updatedAt: new Date()
    }, { merge: true });

    console.log(`✅ Admin setup complete for user: ${userId}`);
    console.log(`   - Admin: ${isAdmin}`);
    console.log(`   - Super Admin: ${isSuperAdmin}`);
    console.log(`   - User Type: ${userType}`);
  } catch (error) {
    console.error('❌ Admin setup failed:', error);
    throw error;
  }
};

/**
 * Verify admin permissions for a user
 */
export const verifyAdminPermissions = async (userId: string): Promise<{
  isAdmin: boolean;
  isSuperAdmin: boolean;
  userType: string;
}> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));

    if (!userDoc.exists()) {
      return { isAdmin: false, isSuperAdmin: false, userType: 'unknown' };
    }

    const userData = userDoc.data();
    return {
      isAdmin: userData.isAdmin || false,
      isSuperAdmin: userData.isSuperAdmin || false,
      userType: userData.userType || 'unknown'
    };
  } catch (error) {
    console.error('Failed to verify admin permissions:', error);
    return { isAdmin: false, isSuperAdmin: false, userType: 'error' };
  }
};

/**
 * List all admin users
 */
export const listAdminUsers = async (): Promise<Array<{
  userId: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  userType: string;
  companyName?: string;
}>> => {
  // Note: This would require a collection query in a real implementation
  // For now, this is a placeholder for admin management
  console.log('Admin user listing would be implemented with proper collection queries');
  return [];
};

/**
 * Quick admin setup for current user (run in browser console)
 * This function can be called directly from the browser console
 */
export const quickAdminSetup = async (): Promise<void> => {
  try {
    // Get current user from Firebase Auth
    const { getAuth, onAuthStateChanged } = await import('firebase/auth');
    const auth = getAuth();

    return new Promise((resolve, reject) => {
      onAuthStateChanged(auth, async (user) => {
        if (!user) {
          reject(new Error('No user logged in'));
          return;
        }

        try {
          await setupAdminUser({
            userId: user.uid,
            isAdmin: true,
            isSuperAdmin: true,
            userType: 'admin',
            companyName: 'System Administrator'
          });
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error('Quick admin setup failed:', error);
    throw error;
  }
};

// Make quickAdminSetup available globally for browser console access
if (typeof window !== 'undefined') {
  (window as any).quickAdminSetup = quickAdminSetup;
  (window as any).setupAdminUser = setupAdminUser;
  (window as any).verifyAdminPermissions = verifyAdminPermissions;
}
