// Subscription Tier Manager - Utility for managing user subscription tiers
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { rateLimitService } from '../services/rateLimitService';

export interface SubscriptionTier {
  tier: 'basic' | 'professional' | 'enterprise' | 'admin';
  name: string;
  description: string;
  requestsPerDay: number;
  requestsPerMinute: number;
  burstAllowance: number;
  monthlyPrice?: number; // For future subscription billing
}

export const SUBSCRIPTION_TIERS: Record<string, SubscriptionTier> = {
  basic: {
    tier: 'basic',
    name: 'Basic',
    description: 'Essential features for small operations',
    requestsPerDay: 1000,
    requestsPerMinute: 20,
    burstAllowance: 50,
    monthlyPrice: 0 // Free tier
  },
  professional: {
    tier: 'professional',
    name: 'Professional',
    description: 'Enhanced features for growing businesses',
    requestsPerDay: 2000,
    requestsPerMinute: 40,
    burstAllowance: 100,
    monthlyPrice: 99
  },
  enterprise: {
    tier: 'enterprise',
    name: 'Enterprise',
    description: 'Full features for large operations',
    requestsPerDay: 5000,
    requestsPerMinute: 100,
    burstAllowance: 200,
    monthlyPrice: 299
  },
  admin: {
    tier: 'admin',
    name: 'Administrator',
    description: 'System administrator with full access',
    requestsPerDay: 10000,
    requestsPerMinute: 200,
    burstAllowance: 500,
    monthlyPrice: 0 // No charge for admins
  }
};

/**
 * Assign a subscription tier to a user
 * @param userId - The user's Firebase UID
 * @param tier - The tier to assign ('basic', 'professional', 'enterprise', 'admin')
 * @param reason - Optional reason for the tier assignment
 */
export const assignUserTier = async (
  userId: string, 
  tier: 'basic' | 'professional' | 'enterprise' | 'admin',
  reason?: string
): Promise<void> => {
  try {
    // Validate tier
    if (!SUBSCRIPTION_TIERS[tier]) {
      throw new Error(`Invalid tier: ${tier}. Valid tiers are: ${Object.keys(SUBSCRIPTION_TIERS).join(', ')}`);
    }

    // Get user document
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error(`User ${userId} not found`);
    }

    const userData = userDoc.data();
    
    // Update user document with subscription tier
    await updateDoc(userRef, {
      subscriptionTier: tier,
      tierAssignedAt: new Date(),
      tierAssignedBy: 'admin', // You can modify this to track who assigned it
      tierAssignmentReason: reason || 'Manual assignment',
      updatedAt: new Date()
    });

    console.log(`✅ Successfully assigned ${tier} tier to user ${userId}`);
    
    // Log the assignment for audit purposes
    console.log(`📋 Tier Assignment Log:
      User: ${userId}
      Email: ${userData.email || 'N/A'}
      Company: ${userData.companyName || 'N/A'}
      Previous Tier: ${userData.subscriptionTier || 'none'}
      New Tier: ${tier}
      Reason: ${reason || 'Manual assignment'}
      Date: ${new Date().toISOString()}
    `);

  } catch (error) {
    console.error('❌ Failed to assign tier:', error);
    throw error;
  }
};

/**
 * Get current tier information for a user
 * @param userId - The user's Firebase UID
 */
export const getUserTierInfo = async (userId: string): Promise<{
  currentTier: string;
  tierInfo: SubscriptionTier;
  userData: any;
}> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error(`User ${userId} not found`);
    }

    const userData = userDoc.data();
    const currentTier = userData.subscriptionTier || 'basic';
    const tierInfo = SUBSCRIPTION_TIERS[currentTier];

    return {
      currentTier,
      tierInfo,
      userData
    };
  } catch (error) {
    console.error('❌ Failed to get user tier info:', error);
    throw error;
  }
};

/**
 * Get all users with their current tiers
 * @param limit - Maximum number of users to return (default: 50)
 */
export const getAllUsersWithTiers = async (limit: number = 50): Promise<Array<{
  userId: string;
  email: string;
  companyName: string;
  userType: string;
  subscriptionTier: string;
  tierAssignedAt?: Date;
}>> => {
  try {
    // Note: This is a simplified version. In production, you'd want to use a proper query
    // with pagination. For now, we'll return a message about how to implement this.
    console.log('📋 To get all users with tiers, you can:');
    console.log('1. Go to Firebase Console > Firestore > users collection');
    console.log('2. Look for the "subscriptionTier" field in each user document');
    console.log('3. Or implement a Cloud Function for this query');
    
    return [];
  } catch (error) {
    console.error('❌ Failed to get users with tiers:', error);
    throw error;
  }
};

/**
 * Bulk assign tier to multiple users
 * @param userIds - Array of user IDs
 * @param tier - The tier to assign
 * @param reason - Optional reason for the bulk assignment
 */
export const bulkAssignTier = async (
  userIds: string[],
  tier: 'basic' | 'professional' | 'enterprise' | 'admin',
  reason?: string
): Promise<{ success: string[], failed: string[] }> => {
  const results = { success: [] as string[], failed: [] as string[] };

  for (const userId of userIds) {
    try {
      await assignUserTier(userId, tier, reason);
      results.success.push(userId);
    } catch (error) {
      console.error(`Failed to assign tier to ${userId}:`, error);
      results.failed.push(userId);
    }
  }

  console.log(`📊 Bulk Assignment Results:
    Total: ${userIds.length}
    Success: ${results.success.length}
    Failed: ${results.failed.length}
  `);

  return results;
};

/**
 * Get tier limits and pricing information
 */
export const getTierLimits = (): SubscriptionTier[] => {
  return Object.values(SUBSCRIPTION_TIERS);
};

/**
 * Check if a user can be upgraded to a higher tier
 * @param currentTier - Current tier
 * @param targetTier - Target tier
 */
export const canUpgradeTier = (
  currentTier: string, 
  targetTier: string
): boolean => {
  const tierOrder = ['basic', 'professional', 'enterprise', 'admin'];
  const currentIndex = tierOrder.indexOf(currentTier);
  const targetIndex = tierOrder.indexOf(targetTier);
  
  return targetIndex > currentIndex;
};

// Make functions available in browser console for easy testing
if (typeof window !== 'undefined') {
  (window as any).subscriptionTierManager = {
    assignUserTier,
    getUserTierInfo,
    getAllUsersWithTiers,
    bulkAssignTier,
    getTierLimits,
    canUpgradeTier,
    SUBSCRIPTION_TIERS
  };
  
  console.log('🔧 Subscription Tier Manager loaded!');
  console.log('Available functions:');
  console.log('- subscriptionTierManager.assignUserTier(userId, tier, reason)');
  console.log('- subscriptionTierManager.getUserTierInfo(userId)');
  console.log('- subscriptionTierManager.getTierLimits()');
  console.log('- subscriptionTierManager.SUBSCRIPTION_TIERS');
}
