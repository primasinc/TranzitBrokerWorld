// Quick Admin Setup Utility
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

/**
 * Quick function to make the current logged-in user an admin
 * This can be run from the browser console for easy admin setup
 */
export const quickAdminSetup = async (): Promise<void> => {
  try {
    const auth = getAuth();
    
    return new Promise((resolve, reject) => {
      onAuthStateChanged(auth, async (user) => {
        if (!user) {
          reject(new Error('No user logged in'));
          return;
        }

        try {
          console.log('Setting up admin for user:', user.email);
          
          // Update user document with admin privileges
          const userRef = doc(db, 'users', user.uid);
          await setDoc(userRef, {
            isAdmin: true,
            isSuperAdmin: true,
            userType: 'admin',
            subscriptionTier: 'admin',
            companyName: 'System Administrator',
            role: 'admin',
            tierAssignedAt: new Date(),
            tierAssignedBy: 'system',
            tierAssignmentReason: 'Quick admin setup',
            updatedAt: new Date()
          }, { merge: true });

          console.log('✅ Admin setup complete! You now have admin privileges.');
          console.log('Refresh the page to see changes.');
          resolve();
        } catch (error) {
          console.error('❌ Admin setup failed:', error);
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error('Quick admin setup failed:', error);
    throw error;
  }
};

/**
 * Check if current user has admin privileges
 */
export const checkAdminStatus = async (): Promise<{
  isAdmin: boolean;
  isSuperAdmin: boolean;
  userEmail: string | null;
}> => {
  try {
    const auth = getAuth();
    
    return new Promise((resolve) => {
      onAuthStateChanged(auth, async (user) => {
        if (!user) {
          resolve({ isAdmin: false, isSuperAdmin: false, userEmail: null });
          return;
        }

        try {
          const userRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userRef);
          const userData = userDoc.data();

          const result = {
            isAdmin: userData?.isAdmin || false,
            isSuperAdmin: userData?.isSuperAdmin || false,
            userEmail: user.email
          };

          console.log('Admin Status Check:', result);
          resolve(result);
        } catch (error) {
          console.error('Error checking admin status:', error);
          resolve({ isAdmin: false, isSuperAdmin: false, userEmail: user.email });
        }
      });
    });
  } catch (error) {
    console.error('Check admin status failed:', error);
    return { isAdmin: false, isSuperAdmin: false, userEmail: null };
  }
};

// Make functions available in browser console for easy access
if (typeof window !== 'undefined') {
  (window as any).quickAdminSetup = quickAdminSetup;
  (window as any).checkAdminStatus = checkAdminStatus;
  
  console.log('🔧 Quick Admin Setup loaded!');
  console.log('Available functions:');
  console.log('- quickAdminSetup() - Make current user an admin');
  console.log('- checkAdminStatus() - Check current user admin status');
}
