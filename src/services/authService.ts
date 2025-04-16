import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../config/firebase';

const functions = getFunctions(app);

export const setUserRole = async (role: 'shipper' | 'carrier') => {
  try {
    const setRole = httpsCallable(functions, 'setUserRole');
    const result = await setRole({ role });
    return result.data;
  } catch (error) {
    console.error('Error setting user role:', error);
    throw error;
  }
};

export const getUserRole = async () => {
  try {
    const getRole = httpsCallable(functions, 'getUserRole');
    const result = await getRole();
    return result.data;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}; 