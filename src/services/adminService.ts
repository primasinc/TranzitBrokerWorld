import { getAuth } from 'firebase-admin/auth';
import { app } from '../config/firebase-admin';

export const setUserRole = async (uid: string, role: 'shipper' | 'carrier') => {
  try {
    await getAuth(app).setCustomUserClaims(uid, { role });
    return { success: true };
  } catch (error) {
    console.error('Error setting custom claims:', error);
    return { success: false, error };
  }
};

export const getUserRole = async (uid: string) => {
  try {
    const user = await getAuth(app).getUser(uid);
    return user.customClaims?.role || null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}; 