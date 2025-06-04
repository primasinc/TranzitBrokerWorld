import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  orderBy,
  limit 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { CarrierProfile, CarrierMetrics, CarrierDocument } from '../types/carrier';

const CARRIERS_COLLECTION = 'carriers';
const CARRIER_METRICS_COLLECTION = 'carrier_metrics';

export const createCarrier = async (
  userId: string,
  carrierData: Omit<CarrierProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'lastActive'>
): Promise<CarrierProfile> => {
  try {
    // Create a new carrier document with a generated ID
    const carrierRef = doc(collection(db, CARRIERS_COLLECTION));
    
    const now = Timestamp.now();
    const carrier: CarrierProfile = {
      id: carrierRef.id,
      userId,
      ...carrierData,
      createdAt: now,
      updatedAt: now,
      lastActive: now,
      // Initialize metrics
      totalLoads: 0,
      completedLoads: 0,
      onTimeDeliveries: 0,
      averageTransitTime: 0,
      averageResponseTime: 0,
      rating: 0
    };

    await setDoc(carrierRef, carrier, { merge: true });

    // Initialize carrier metrics
    const metricsRef = doc(db, CARRIER_METRICS_COLLECTION, carrier.id);
    const initialMetrics: CarrierMetrics = {
      carrierId: carrier.id,
      monthlyLoads: 0,
      monthlyMiles: 0,
      monthlyRevenue: 0,
      monthlyOnTimeRate: 0,
      totalLoads: 0,
      totalMiles: 0,
      totalRevenue: 0,
      averageLoadRate: 0,
      averageMileRate: 0,
      onTimeDeliveryRate: 0,
      safetyScore: 100,
      reliabilityScore: 100,
      communicationScore: 100,
      overallScore: 100,
      lastUpdated: now,
      lastLoad: now
    };

    await setDoc(metricsRef, initialMetrics);

    return carrier;
  } catch (error) {
    console.error('Error creating carrier:', error);
    throw error;
  }
};

export const getCarrier = async (carrierId: string): Promise<CarrierProfile | null> => {
  try {
    const carrierRef = doc(db, CARRIERS_COLLECTION, carrierId);
    const carrierSnap = await getDoc(carrierRef);
    
    if (carrierSnap.exists()) {
      return carrierSnap.data() as CarrierProfile;
    }
    return null;
  } catch (error) {
    console.error('Error fetching carrier:', error);
    throw error;
  }
};

export const getCarrierByUserId = async (userId: string): Promise<CarrierProfile | null> => {
  try {
    const carriersQuery = query(
      collection(db, CARRIERS_COLLECTION),
      where('userId', '==', userId),
      limit(1)
    );
    
    const querySnapshot = await getDocs(carriersQuery);
    
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data() as CarrierProfile;
    }
    return null;
  } catch (error) {
    console.error('Error fetching carrier by user ID:', error);
    throw error;
  }
};

export const updateCarrier = async (
  carrierId: string,
  updates: Partial<CarrierProfile>
): Promise<void> => {
  try {
    const carrierRef = doc(db, CARRIERS_COLLECTION, carrierId);
    
    // Remove readonly fields from updates
    const { id, userId, createdAt, ...validUpdates } = updates;
    
    await updateDoc(carrierRef, {
      ...validUpdates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating carrier:', error);
    throw error;
  }
};

export const getCarrierMetrics = async (carrierId: string): Promise<CarrierMetrics | null> => {
  try {
    const metricsRef = doc(db, CARRIER_METRICS_COLLECTION, carrierId);
    const metricsSnap = await getDoc(metricsRef);
    
    if (metricsSnap.exists()) {
      return metricsSnap.data() as CarrierMetrics;
    }
    return null;
  } catch (error) {
    console.error('Error fetching carrier metrics:', error);
    throw error;
  }
};

export const updateCarrierMetrics = async (
  carrierId: string,
  updates: Partial<CarrierMetrics>
): Promise<void> => {
  try {
    const metricsRef = doc(db, CARRIER_METRICS_COLLECTION, carrierId);
    
    await updateDoc(metricsRef, {
      ...updates,
      lastUpdated: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating carrier metrics:', error);
    throw error;
  }
};

export const searchCarriers = async (
  filters: {
    equipmentType?: string;
    serviceArea?: string;
    status?: string;
    searchTerm?: string;
  }
): Promise<CarrierProfile[]> => {
  try {
    let baseQuery = query(
      collection(db, CARRIERS_COLLECTION),
      orderBy('companyName')
    );

    if (filters.status) {
      baseQuery = query(
        baseQuery,
        where('status', '==', filters.status)
      );
    }

    const querySnapshot = await getDocs(baseQuery);
    let carriers = querySnapshot.docs.map(doc => doc.data() as CarrierProfile);

    // Apply additional filters in memory
    if (filters.equipmentType) {
      carriers = carriers.filter(carrier =>
        carrier.equipment.some(eq => eq.type === filters.equipmentType)
      );
    }

    if (filters.serviceArea) {
      carriers = carriers.filter(carrier =>
        carrier.serviceAreas.some(area => area.state === filters.serviceArea)
      );
    }

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      carriers = carriers.filter(carrier =>
        carrier.companyName.toLowerCase().includes(searchLower) ||
        carrier.mcNumber.toLowerCase().includes(searchLower) ||
        carrier.dotNumber.toLowerCase().includes(searchLower)
      );
    }

    return carriers;
  } catch (error) {
    console.error('Error searching carriers:', error);
    throw error;
  }
};

export const addCarrierDocument = async (
  carrierId: string,
  document: Omit<CarrierDocument, 'id' | 'uploadedAt' | 'status'>
): Promise<CarrierDocument> => {
  try {
    const carrierRef = doc(db, CARRIERS_COLLECTION, carrierId);
    const carrierSnap = await getDoc(carrierRef);
    
    if (!carrierSnap.exists()) {
      throw new Error('Carrier not found');
    }
    
    const carrier = carrierSnap.data() as CarrierProfile;
    const newDocument: CarrierDocument = {
      id: `doc_${Date.now()}`,
      uploadedAt: Timestamp.now(),
      status: 'pending',
      ...document
    };
    
    await updateDoc(carrierRef, {
      documents: [...carrier.documents, newDocument],
      updatedAt: Timestamp.now()
    });
    
    return newDocument;
  } catch (error) {
    console.error('Error adding carrier document:', error);
    throw error;
  }
}; 