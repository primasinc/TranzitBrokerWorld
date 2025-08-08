// Feature Flag Service - Non-intrusive implementation
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface FeatureFlag {
  enabled: boolean;
  rolloutPercentage?: number; // 0-100
  userTypes?: string[]; // ['shipper', 'carrier', 'driver']
  regions?: string[]; // ['OH', 'MI', etc.]
  maxUsers?: number;
  startDate?: string;
  endDate?: string;
  metadata?: {
    description?: string;
    owner?: string;
    version?: string;
  };
}

export interface FeatureFlags {
  [key: string]: FeatureFlag;
}

class FeatureFlagService {
  private flags: FeatureFlags = {};
  private listeners: (() => void)[] = [];
  private isInitialized = false;

  // Default flags - safe fallbacks
  private defaultFlags: FeatureFlags = {
    // Core features - always enabled
    'loadBooking': { enabled: true },
    'driverManagement': { enabled: true },
    'shipperDashboard': { enabled: true },
    'carrierDashboard': { enabled: true },
    
    // New features - disabled by default
    'enhancedLoadMatching': { enabled: false },
    'realTimeTracking': { enabled: false },
    'advancedAnalytics': { enabled: false },
    'newMapInterface': { enabled: false }
  };

  constructor() {
    this.initializeFlags();
  }

  private async initializeFlags() {
    try {
      // Load flags from Firestore
      const flagsDoc = await getDoc(doc(db, 'system', 'featureFlags'));
      
      if (flagsDoc.exists()) {
        this.flags = { ...this.defaultFlags, ...flagsDoc.data() };
      } else {
        // Initialize with defaults if no flags exist
        this.flags = { ...this.defaultFlags };
        // Only try to save if we have admin permissions
        try {
          await this.saveFlags();
        } catch (saveError) {
          // In production, this is expected for non-admin users
          console.debug('Feature flags: Using local defaults (non-admin user)');
        }
      }

      // Set up real-time listener
      this.setupRealtimeListener();
      this.isInitialized = true;
      
      // Notify listeners
      this.notifyListeners();
         } catch (error) {
       // In production, gracefully fall back to defaults
       const errorMessage = error instanceof Error ? error.message : 'Unknown error';
       console.debug('Feature flags: Fallback to defaults due to:', errorMessage);
       this.flags = { ...this.defaultFlags };
       this.isInitialized = true;
     }
  }

  private setupRealtimeListener() {
    const unsubscribe = onSnapshot(
      doc(db, 'system', 'featureFlags'),
      (doc) => {
        if (doc.exists()) {
          this.flags = { ...this.defaultFlags, ...doc.data() };
          this.notifyListeners();
        }
      },
      (error) => {
        console.warn('Feature flags listener error:', error);
      }
    );

    // Store unsubscribe function
    this.listeners.push(unsubscribe);
  }

  private async saveFlags() {
    try {
      await setDoc(doc(db, 'system', 'featureFlags'), this.flags);
    } catch (error) {
      console.error('Failed to save feature flags:', error);
    }
  }

  // Check if a feature is enabled for a specific user
  isFeatureEnabled(
    featureName: string, 
    userData?: { 
      userType?: string; 
      region?: string; 
      userId?: string;
    }
  ): boolean {
    const flag = this.flags[featureName];
    
    if (!flag) {
      // If flag doesn't exist, default to disabled for safety
      return false;
    }

    if (!flag.enabled) {
      return false;
    }

    // Check user type restrictions
    if (flag.userTypes && userData?.userType) {
      if (!flag.userTypes.includes(userData.userType)) {
        return false;
      }
    }

    // Check regional restrictions
    if (flag.regions && userData?.region) {
      if (!flag.regions.includes(userData.region)) {
        return false;
      }
    }

    // Check rollout percentage
    if (flag.rolloutPercentage !== undefined && userData?.userId) {
      const hash = this.hashUserId(userData.userId);
      const percentage = hash % 100;
      if (percentage >= flag.rolloutPercentage) {
        return false;
      }
    }

    // Check date restrictions
    if (flag.startDate && new Date() < new Date(flag.startDate)) {
      return false;
    }

    if (flag.endDate && new Date() > new Date(flag.endDate)) {
      return false;
    }

    return true;
  }

  // Simple hash function for consistent user assignment
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Get all flags (for admin interface)
  getAllFlags(): FeatureFlags {
    return { ...this.flags };
  }

  // Update a specific flag (admin only)
  async updateFlag(featureName: string, flag: FeatureFlag): Promise<void> {
    this.flags[featureName] = flag;
    await this.saveFlags();
  }

  // Add listener for flag changes
  addListener(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('Feature flag listener error:', error);
      }
    });
  }

  // Check if service is ready
  isReady(): boolean {
    return this.isInitialized;
  }

  // Cleanup
  destroy(): void {
    this.listeners.forEach(listener => {
      if (typeof listener === 'function') {
        listener();
      }
    });
    this.listeners = [];
  }
}

// Create singleton instance
export const featureFlagService = new FeatureFlagService();

// Export helper functions
export const isFeatureEnabled = (
  featureName: string, 
  userData?: { userType?: string; region?: string; userId?: string; }
): boolean => {
  return featureFlagService.isFeatureEnabled(featureName, userData);
};

export const getAllFlags = (): FeatureFlags => {
  return featureFlagService.getAllFlags();
};

export const updateFlag = async (featureName: string, flag: FeatureFlag): Promise<void> => {
  return featureFlagService.updateFlag(featureName, flag);
};
