// Test utility for Phase 3: Driver Registration Flow
// This file helps verify that the complete driver invite and registration system is working

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface DriverFlowTestResult {
  success: boolean;
  message: string;
  details?: any;
}

export const testDriverRegistrationFlow = async (userId: string): Promise<DriverFlowTestResult> => {
  try {
    // Test 1: Check if user exists and has correct role
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return {
        success: false,
        message: 'User document not found'
      };
    }

    const userData = userDoc.data();
    console.log('Debug - User Data:', userData);
    
    // Test 2: Check role assignment
    if (!userData.userType) {
      console.log('Debug - UserType missing or undefined:', userData);
      return {
        success: false,
        message: 'User type not assigned'
      };
    }

    // Test 3: Check company hierarchy for drivers
    if (userData.userType === 'driver') {
      if (!userData.parentCompanyId) {
        return {
          success: false,
          message: 'Driver not attached to parent company'
        };
      }

      // Test 4: Check parent company exists
      const parentCompanyDoc = await getDoc(doc(db, 'users', userData.parentCompanyId));
      if (!parentCompanyDoc.exists()) {
        return {
          success: false,
          message: 'Parent company not found'
        };
      }

      const parentData = parentCompanyDoc.data();
      if (parentData.userType !== 'shipper' && parentData.userType !== 'carrier') {
        return {
          success: false,
          message: 'Parent company must be a shipper or carrier'
        };
      }

      return {
        success: true,
        message: 'Driver registration flow working correctly',
        details: {
          driverRole: userData.role,
          parentCompanyId: userData.parentCompanyId,
          parentCompanyName: parentData.companyName,
          driverEmail: userData.email,
          parentEmail: parentData.email
        }
      };
    } else if (userData.userType === 'shipper' || userData.userType === 'carrier') {
      return {
        success: true,
        message: 'Company registration working correctly',
        details: {
          role: userData.userType,
          companyName: userData.companyName,
          email: userData.email
        }
      };
    } else {
      return {
        success: false,
        message: 'Invalid user role'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Error testing driver flow: ${error}`
    };
  }
};

export const testCompanyLoads = async (companyId: string): Promise<DriverFlowTestResult> => {
  try {
    // This would test if loads are properly associated with the company
    // For now, return a placeholder
    return {
      success: true,
      message: 'Company loads test placeholder - implement when loads are created',
      details: {
        companyId,
        note: 'Load association will be tested when actual loads are created'
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Error testing company loads: ${error}`
    };
  }
}; 