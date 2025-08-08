import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  featureFlagService, 
  isFeatureEnabled, 
  getAllFlags, 
  updateFlag,
  FeatureFlag,
  FeatureFlags 
} from '../services/featureFlagService';

export const useFeatureFlags = () => {
  const { user } = useAuth();
  const [flags, setFlags] = useState<FeatureFlags>({});
  const [isReady, setIsReady] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    // Load user profile data
    const loadUserProfile = async () => {
      if (user?.uid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data());
          }
        } catch (error) {
          console.warn('Failed to load user profile:', error);
        }
      }
    };

    loadUserProfile();
  }, [user?.uid]);

  useEffect(() => {
    // Wait for feature flag service to be ready
    const checkReady = () => {
      if (featureFlagService.isReady()) {
        setFlags(getAllFlags());
        setIsReady(true);
      } else {
        // Check again in 100ms
        setTimeout(checkReady, 100);
      }
    };
    checkReady();

    // Listen for flag changes
    const unsubscribe = featureFlagService.addListener(() => {
      setFlags(getAllFlags());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Check if a specific feature is enabled for current user
  const isEnabled = useCallback((featureName: string): boolean => {
    if (!isReady || !user) {
      return false; // Default to disabled for safety
    }

    return isFeatureEnabled(featureName, {
      userId: user.uid,
      userType: userProfile?.userType,
      region: userProfile?.state
    });
  }, [isReady, user, userProfile]);

  // Get user data for feature flag checks
  const getUserData = useCallback(() => {
    if (!user) return undefined;
    
    return {
      userId: user.uid,
      userType: userProfile?.userType,
      region: userProfile?.state
    };
  }, [user, userProfile]);

  // Update a feature flag (admin only)
  const updateFeatureFlag = useCallback(async (
    featureName: string, 
    flag: FeatureFlag
  ): Promise<void> => {
    // Check if user has admin permissions
    if (!userProfile?.isAdmin && !userProfile?.isSuperAdmin) {
      throw new Error('Insufficient permissions: Admin access required');
    }
    await updateFlag(featureName, flag);
  }, [userProfile]);

  // Get all flags (for admin interface)
  const getAllFeatureFlags = useCallback((): FeatureFlags => {
    return getAllFlags();
  }, []);

  return {
    isEnabled,
    flags,
    isReady,
    getUserData,
    updateFeatureFlag,
    getAllFeatureFlags
  };
};
