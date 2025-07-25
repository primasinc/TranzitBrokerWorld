import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface UserPermissions {
  isCompanyOwner: boolean;
  isDriver: boolean;
  canInviteDrivers: boolean;
  canModifyCompanySettings: boolean;
  canViewCompanySettings: boolean;
  canManageLoads: boolean;
  canViewPayments: boolean;
}

export const getUserPermissions = async (userId: string): Promise<UserPermissions> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return getDefaultPermissions();
    }

    const userData = userDoc.data();
    const role = userData.role || 'company_owner'; // Default to company_owner for existing users

    return {
      isCompanyOwner: role === 'company_owner',
      isDriver: role === 'driver',
      canInviteDrivers: role === 'company_owner',
      canModifyCompanySettings: role === 'company_owner',
      canViewCompanySettings: true, // Both can view, but only owners can modify
      canManageLoads: true, // Both can manage loads
      canViewPayments: true, // Both can view payments
    };
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return getDefaultPermissions();
  }
};

const getDefaultPermissions = (): UserPermissions => ({
  isCompanyOwner: true,
  isDriver: false,
  canInviteDrivers: true,
  canModifyCompanySettings: true,
  canViewCompanySettings: true,
  canManageLoads: true,
  canViewPayments: true,
});

// Helper function to check if user is a driver
export const isDriver = (role?: string): boolean => {
  return role === 'driver';
};

// Helper function to check if user is a company owner
export const isCompanyOwner = (role?: string): boolean => {
  return role === 'company_owner';
}; 