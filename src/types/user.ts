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

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  username: string;
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