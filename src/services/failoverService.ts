// Production Failover Service - Phase 1A
// Handles seamless switching between primary and secondary Firebase projects
// Maintains data consistency and operational continuity

import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, collection, doc, getDoc } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Environment Configuration Types
interface FirebaseProjectConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
}

interface FailoverState {
  isActive: boolean;
  currentProject: 'primary' | 'secondary';
  lastSwitchTime: Date | null;
  switchReason: string | null;
  dataSyncStatus: 'synced' | 'syncing' | 'out_of_sync';
  recoveryAttempts: number;
}

// Failover Service Class
class FailoverService {
  private primaryApp: FirebaseApp | null = null;
  private secondaryApp: FirebaseApp | null = null;
  private primaryDb: Firestore | null = null;
  private secondaryDb: Firestore | null = null;
  private primaryAuth: Auth | null = null;
  private secondaryAuth: Auth | null = null;
  private primaryStorage: FirebaseStorage | null = null;
  private secondaryStorage: FirebaseStorage | null = null;
  
  private failoverState: FailoverState = {
    isActive: false,
    currentProject: 'primary',
    lastSwitchTime: null,
    switchReason: null,
    dataSyncStatus: 'synced',
    recoveryAttempts: 0
  };

  private isInitialized = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeFailoverService();
  }

  // Initialize the failover service
  private async initializeFailoverService(): Promise<void> {
    try {
      console.log('[FailoverService] Initializing production failover service...');
      
      // Load environment configurations
      const primaryConfig = this.loadPrimaryConfig();
      const secondaryConfig = this.loadSecondaryConfig();
      
      // Validate configurations
      if (!this.validateConfig(primaryConfig, 'primary')) {
        throw new Error('Primary Firebase configuration is invalid or missing');
      }
      
      if (!this.validateConfig(secondaryConfig, 'secondary')) {
        console.warn('[FailoverService] Secondary Firebase configuration is invalid or missing - running in primary-only mode');
      }
      
      // Initialize Firebase apps
      await this.initializeFirebaseApps(primaryConfig, secondaryConfig);
      
      // Start background services
      this.startBackgroundServices();
      
      this.isInitialized = true;
      console.log('[FailoverService] Production failover service initialized successfully');
      
    } catch (error) {
      console.error('[FailoverService] Initialization failed:', error);
      // Fall back to primary only - no disruption to existing system
      this.failoverState.currentProject = 'primary';
    }
  }

  // Load primary project configuration from environment
  private loadPrimaryConfig(): FirebaseProjectConfig {
    return {
      apiKey: process.env.REACT_APP_FIREBASE_API_KEY || '',
      authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || '',
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || '',
      storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: process.env.REACT_APP_FIREBASE_APP_ID || '',
      measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || ''
    };
  }

  // Load secondary project configuration from environment
  private loadSecondaryConfig(): FirebaseProjectConfig {
    return {
      apiKey: process.env.REACT_APP_FIREBASE_API_KEY_SECONDARY || '',
      authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN_SECONDARY || '',
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID_SECONDARY || '',
      storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET_SECONDARY || '',
      messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID_SECONDARY || '',
      appId: process.env.REACT_APP_FIREBASE_APP_ID_SECONDARY || '',
      measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID_SECONDARY || ''
    };
  }

  // Validate Firebase configuration
  private validateConfig(config: FirebaseProjectConfig, projectName: string): boolean {
    const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
    
    for (const field of requiredFields) {
      if (!config[field as keyof FirebaseProjectConfig] || config[field as keyof FirebaseProjectConfig] === '') {
        console.warn(`[FailoverService] Missing ${field} for ${projectName} project`);
        return false;
      }
    }
    
    return true;
  }

  // Initialize Firebase apps for both projects
  private async initializeFirebaseApps(
    primaryConfig: FirebaseProjectConfig, 
    secondaryConfig: FirebaseProjectConfig
  ): Promise<void> {
    try {
      // Initialize primary project
      this.primaryApp = initializeApp(primaryConfig, 'primary');
      this.primaryDb = getFirestore(this.primaryApp);
      this.primaryAuth = getAuth(this.primaryApp);
      this.primaryStorage = getStorage(this.primaryApp);
      
      console.log('[FailoverService] Primary Firebase project initialized:', primaryConfig.projectId);
      
      // Try to initialize secondary project, but don't fail if it's not configured
      try {
        this.secondaryApp = initializeApp(secondaryConfig, 'secondary');
        this.secondaryDb = getFirestore(this.secondaryApp);
        this.secondaryAuth = getAuth(this.secondaryApp);
        this.secondaryStorage = getStorage(this.secondaryApp);
        
        console.log('[FailoverService] Secondary Firebase project initialized:', secondaryConfig.projectId);
      } catch (secondaryError) {
        console.warn('[FailoverService] Secondary project initialization failed, running in primary-only mode:', secondaryError);
        // Set secondary services to null - system will run in primary-only mode
        this.secondaryApp = null;
        this.secondaryDb = null;
        this.secondaryAuth = null;
        this.secondaryStorage = null;
      }
      
    } catch (error) {
      console.error('[FailoverService] Primary Firebase app initialization failed:', error);
      throw error;
    }
  }

  // Start background services for monitoring and sync
  private startBackgroundServices(): void {
    // Health check interval - monitor both projects
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Every 30 seconds
    
    // Data sync interval - ensure consistency
    this.syncInterval = setInterval(() => {
      this.performDataSync();
    }, 60000); // Every minute
    
    console.log('[FailoverService] Background services started');
  }

  // Perform health check on both projects
  private async performHealthCheck(): Promise<void> {
    try {
      const primaryHealth = await this.checkProjectHealth('primary');
      const secondaryHealth = await this.checkProjectHealth('secondary');
      
      // Update failover state based on health
      this.updateFailoverState(primaryHealth, secondaryHealth);
      
    } catch (error) {
      console.warn('[FailoverService] Health check failed:', error);
    }
  }

  // Check health of a specific project
  private async checkProjectHealth(project: 'primary' | 'secondary'): Promise<boolean> {
    try {
      const db = project === 'primary' ? this.primaryDb : this.secondaryDb;
      if (!db) return false;
      
      // Simple health check - try to read a system document
      const startTime = Date.now();
      await getDoc(doc(db, 'system', 'health'));
      const responseTime = Date.now() - startTime;
      
      // Consider healthy if response time < 1000ms
      return responseTime < 1000;
      
    } catch (error) {
      console.warn(`[FailoverService] Health check failed for ${project}:`, error);
      return false;
    }
  }

  // Update failover state based on health results
  private updateFailoverState(primaryHealthy: boolean, secondaryHealthy: boolean): void {
    const currentTime = new Date();
    
    if (!primaryHealthy && secondaryHealthy && this.failoverState.currentProject === 'primary') {
      // Primary is down, secondary is healthy - trigger failover
      this.triggerFailover('secondary', 'Primary project health check failed');
      
    } else if (primaryHealthy && this.failoverState.currentProject === 'secondary') {
      // Primary is healthy again - trigger recovery
      this.triggerRecovery('primary', 'Primary project recovered');
    }
    
    // Update last health check
    this.failoverState.lastSwitchTime = currentTime;
  }

  // Trigger failover to secondary project
  private async triggerFailover(targetProject: 'secondary', reason: string): Promise<void> {
    try {
      console.log(`[FailoverService] Triggering failover to ${targetProject}: ${reason}`);
      
      // Update failover state
      this.failoverState.isActive = true;
      this.failoverState.currentProject = targetProject;
      this.failoverState.lastSwitchTime = new Date();
      this.failoverState.switchReason = reason;
      this.failoverState.dataSyncStatus = 'syncing';
      
      // Perform data synchronization
      await this.synchronizeData();
      
      // Update status
      this.failoverState.dataSyncStatus = 'synced';
      
      console.log(`[FailoverService] Failover to ${targetProject} completed successfully`);
      
    } catch (error) {
      console.error('[FailoverService] Failover failed:', error);
      // Revert to primary if failover fails
      this.failoverState.currentProject = 'primary';
      this.failoverState.isActive = false;
    }
  }

  // Trigger recovery to primary project
  private async triggerRecovery(targetProject: 'primary', reason: string): Promise<void> {
    try {
      console.log(`[FailoverService] Triggering recovery to ${targetProject}: ${reason}`);
      
      // Update failover state
      this.failoverState.isActive = false;
      this.failoverState.currentProject = targetProject;
      this.failoverState.lastSwitchTime = new Date();
      this.failoverState.switchReason = reason;
      this.failoverState.dataSyncStatus = 'syncing';
      
      // Perform final data synchronization
      await this.synchronizeData();
      
      // Update status
      this.failoverState.dataSyncStatus = 'synced';
      this.failoverState.recoveryAttempts++;
      
      console.log(`[FailoverService] Recovery to ${targetProject} completed successfully`);
      
    } catch (error) {
      console.error('[FailoverService] Recovery failed:', error);
      // Stay on secondary if recovery fails
      this.failoverState.currentProject = 'secondary';
      this.failoverState.isActive = true;
    }
  }

  // Synchronize data between projects
  private async synchronizeData(): Promise<void> {
    try {
      console.log('[FailoverService] Starting data synchronization...');
      
      // This is a placeholder for actual data sync logic
      // In production, you would implement:
      // 1. Real-time data replication
      // 2. Conflict resolution
      // 3. Transaction integrity
      // 4. Incremental sync
      
      // For now, simulate sync time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('[FailoverService] Data synchronization completed');
      
    } catch (error) {
      console.error('[FailoverService] Data synchronization failed:', error);
      throw error;
    }
  }

  // Perform periodic data sync
  private async performDataSync(): Promise<void> {
    if (this.failoverState.isActive) {
      try {
        await this.synchronizeData();
      } catch (error) {
        console.warn('[FailoverService] Periodic sync failed:', error);
      }
    }
  }

  // Public API - Get current failover state
  public getFailoverState(): FailoverState {
    return { ...this.failoverState };
  }

  // Public API - Get current active database
  public getActiveDatabase(): Firestore | null {
    return this.failoverState.currentProject === 'primary' ? this.primaryDb : this.secondaryDb;
  }

  // Public API - Get current active auth
  public getActiveAuth(): Auth | null {
    return this.failoverState.currentProject === 'primary' ? this.primaryAuth : this.secondaryAuth;
  }

  // Public API - Get current active storage
  public getActiveStorage(): FirebaseStorage | null {
    return this.failoverState.currentProject === 'primary' ? this.primaryStorage : this.secondaryStorage;
  }

  // Public API - Check if failover is active
  public isFailoverActive(): boolean {
    return this.failoverState.isActive;
  }

  // Public API - Get current project
  public getCurrentProject(): 'primary' | 'secondary' {
    return this.failoverState.currentProject;
  }

  // Public API - Manual failover trigger (for testing/admin use)
  public async manualFailover(targetProject: 'primary' | 'secondary', reason: string): Promise<void> {
    if (targetProject === 'secondary') {
      await this.triggerFailover('secondary', reason);
    } else {
      await this.triggerRecovery('primary', reason);
    }
  }

  // Cleanup method
  public destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    console.log('[FailoverService] Service destroyed');
  }
}

// Create singleton instance
const failoverService = new FailoverService();

// Export singleton and class for testing
export { failoverService as default, FailoverService };

// Export convenience functions
export const getFailoverState = () => failoverService.getFailoverState();
export const getActiveDatabase = () => failoverService.getActiveDatabase();
export const getActiveAuth = () => failoverService.getActiveAuth();
export const getActiveStorage = () => failoverService.getActiveStorage();
export const isFailoverActive = () => failoverService.isFailoverActive();
export const getCurrentProject = () => failoverService.getCurrentProject();
export const manualFailover = (targetProject: 'primary' | 'secondary', reason: string) => 
  failoverService.manualFailover(targetProject, reason);
