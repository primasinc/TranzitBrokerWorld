import { Timestamp } from 'firebase/firestore';

export type CarrierStatus = 'active' | 'inactive' | 'pending' | 'suspended';
export type InsuranceType = 'liability' | 'cargo' | 'physical_damage' | 'workers_comp';
export type EquipmentType = 'dry_van' | 'reefer' | 'flatbed' | 'step_deck' | 'box_truck' | 'other';
export type DocumentStatus = 'valid' | 'expired' | 'pending' | 'rejected';

export interface CarrierDocument {
  id: string;
  type: string;
  name: string;
  url: string;
  uploadedAt: Timestamp;
  expiresAt?: Timestamp;
  status: DocumentStatus;
  verifiedAt?: Timestamp;
  verifiedBy?: string;
}

export interface Insurance {
  type: InsuranceType;
  provider: string;
  policyNumber: string;
  coverage: number;
  expiresAt: Timestamp;
  document?: CarrierDocument;
}

export interface Equipment {
  type: EquipmentType;
  count: number;
  capacity: number; // in pounds
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
}

export interface ServiceArea {
  state: string;
  preferred: boolean;
  restrictions?: string[];
}

export interface CarrierProfile {
  id: string;
  userId: string; // Firebase Auth UID
  companyName: string;
  mcNumber: string;
  dotNumber: string;
  status: CarrierStatus;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  insurance: Insurance[];
  equipment: Equipment[];
  serviceAreas: ServiceArea[];
  documents: CarrierDocument[];
  
  // Performance metrics
  totalLoads: number;
  completedLoads: number;
  onTimeDeliveries: number;
  averageTransitTime: number; // in hours
  averageResponseTime: number; // in minutes
  rating: number; // 1-5 scale
  
  // Preferences
  preferredLoadTypes: string[];
  minimumRate: number; // per mile
  preferredLaneRates: {
    [fromState: string]: {
      [toState: string]: number; // rate per mile
    };
  };
  
  // ELD Integration
  eldCompany?: string;
  eldApiKey?: string;
  eldApiId?: string;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastActive: Timestamp;
}

export interface CarrierMetrics {
  carrierId: string;
  // Monthly metrics
  monthlyLoads: number;
  monthlyMiles: number;
  monthlyRevenue: number;
  monthlyOnTimeRate: number;
  
  // All-time metrics
  totalLoads: number;
  totalMiles: number;
  totalRevenue: number;
  averageLoadRate: number;
  averageMileRate: number;
  onTimeDeliveryRate: number;
  
  // Performance scores (0-100)
  safetyScore: number;
  reliabilityScore: number;
  communicationScore: number;
  overallScore: number;
  
  // Timestamps
  lastUpdated: Timestamp;
  lastLoad: Timestamp;
} 