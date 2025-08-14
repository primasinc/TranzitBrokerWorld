// Base user interface for the new broker portal architecture
export interface CompanyUser {
  id: string;
  companyId: string;
  
  // User Information
  email: string;
  companyName: string;
  companyRep: string;
  phoneNumber?: string;
  phone?: string;
  
  // User Type and Role
  userType: 'shipper' | 'carrier' | 'broker' | 'broker_carrier' | 'admin';
  companyUserRole: 'owner' | 'admin' | 'manager' | 'user';
  role: 'company_owner' | 'company_admin' | 'company_manager' | 'company_user' | 'driver';
  
  // Status and Permissions
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  isAdmin: boolean;
  isSuperAdmin: boolean;
  
  // Permissions and Access
  permissions: string[];
  accessLevel: 'full' | 'limited' | 'readonly';
  
  // Company Hierarchy (for invited users)
  parentCompanyId?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastActive?: Date;
  lastChanged?: Date;
  
  // Admin tracking
  addedBy?: string;
  addedAt?: Date;
  updatedBy?: string;
  tierAssignedAt?: Date;
  tierAssignedBy?: string;
  tierAssignmentReason?: string;
  
  // Rejection tracking
  rejectedBy?: string;
  rejectedAt?: Date;
  
  // Migration tracking
  migratedFrom?: {
    collection: string;
    userId?: string;
    migratedAt: Date;
    fieldsPreserved?: number;
    originalFieldCount?: number;
    source?: string;
  };
}

// Company interface for the new broker portal architecture
export interface Company {
  id: string;
  name: string;
  type: 'shipper' | 'carrier' | 'broker' | 'broker_carrier' | 'admin';
  status: 'active' | 'inactive' | 'pending' | 'suspended' | 'verified';
  
  // Business Information
  mcNumber?: string;
  dotNumber?: string;
  insurance?: any;
  equipment?: any;
  eldCompany?: string;
  eldApiId?: string;
  eldApiKey?: string;
  
  // Address fields
  address?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  
  // Service areas
  serviceAreas: string[];
  primaryServiceArea?: string;
  
  // Business Information
  businessType: string;
  taxId?: string;
  dunsNumber?: string;
  
  // Service Configuration
  services: string[];
  capabilities: string[];
  
  // Carrier Operations (if applicable)
  hasCarrierOperations?: boolean;
  carrierEquipment?: string[];
  carrierInsurance?: boolean;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  verifiedAt?: Date;
  
  // Metadata
  tags: string[];
  notes?: string;
  
  // Migration tracking
  migratedFrom?: {
    collection: string;
    userId?: string;
    migratedAt: Date;
    fieldsPreserved?: number;
  };
}

// Legacy user interface (for backward compatibility)
export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
  // New fields for company hierarchy (optional for backward compatibility)
  role?: 'company_owner' | 'driver';
  parentCompanyId?: string;
  companyName?: string;
  companyRep?: string;
  phoneNumber?: string;
  userType?: 'shipper' | 'carrier';
}

// Auth state interface
export interface AuthState {
  user: CompanyUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Login credentials interface
export interface LoginCredentials {
  email: string;
  password: string;
}

// Register credentials interface
export interface RegisterCredentials extends LoginCredentials {
  username: string;
  confirmPassword: string;
}

// Broker registration data interface
export interface BrokerRegistrationData {
  // Company Information
  companyName: string;
  businessType: 'broker' | 'broker_carrier';
  services: 'freight_brokerage' | 'carrier_operations' | 'both';
  
  // Company Representative
  companyRep: string;
  email: string;
  phoneNumber: string;
  
  // Business Details
  mcNumber?: string;
  dotNumber?: string;
  taxId?: string;
  dunsNumber?: string;
  
  // Service Configuration
  primaryServiceArea: string;
  serviceAreas: string[];
  
  // Carrier Operations (if applicable)
  hasCarrierOperations: boolean;
  carrierEquipment?: string[];
  carrierInsurance?: boolean;
  
  // Password
  password: string;
  confirmPassword: string;
}

// New interfaces for invitation system
export interface InviteData {
  name: string;
  phone: string;
  email: string;
  companyName: string;
  companyRep: string;
  inviterId: string;
  createdAt: Date;
  used: boolean;
  usedAt?: Date;
}

export interface DriverInviteForm {
  name: string;
  phone: string;
  email: string;
}

// User type definitions for the broker portal
export interface UserType {
  id: string;
  name: string;
  description: string;
  canPostLoads: boolean;
  canViewLoads: boolean;
  canManageCarriers: boolean;
  canManagePartners: boolean;
  defaultRoute: string;
  allowedLoadTypes: string[];
  restrictions?: string[];
  competitionProtection?: string[];
}

// Load visibility rules for competition protection
export interface LoadVisibilityRule {
  id: string;
  userTypeId: string;
  ruleType: 'include' | 'exclude';
  loadType: 'shipper' | 'broker';
  conditions: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'not_contains';
    value: any;
  }[];
  description: string;
  active: boolean;
} 